import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { WATER_LEVEL } from './Ocean';
import { VEHICLE_TYPES, vehicleLocalToWorld } from './Vehicles';

// "Pelontar" energy launcher: a small launcher hovering at Twini's right shoulder (mounted on the vehicle
// while driving) lobs glowing plasma orbs in a ballistic arc. It auto-locks the nearest pollution drone in
// front (red reticle) and solves the throw so locked shots land. Hits / misses burst into sparks, or into a
// water splash on the sea. Everything runs from one frame loop with fixed object pools (no allocations).
//
// The game screen requests shots by incrementing `controlRef.current.fireSeq`, and receives results via
// `controlRef.current.onCombat({ type: 'hit', name })`.

const GRAVITY = 14;
const SHOT_SPEED = 18;
// Statistik cadangan bila komponen dipakai tanpa loadout (mis. preview scene).
const DEFAULT_WEAPON = { damage: 1, speed: SHOT_SPEED, color: '#5fe8ff', tier: 1 };
const MAX_SHOTS = 12;
const MAX_BURSTS = 8;
const TRAIL = 7;
const LOCK_RANGE = 30;
const LOCK_COS = Math.cos((42 * Math.PI) / 180);
const RESPAWN_S = 18;

const LAND_DRONES = [[-14, 8], [16, 10], [-20, -6], [10, -18], [24, 24], [-28, 26], [30, -8], [-8, 34], [-36, -26], [38, 20]];
const SEA_DRONES = [[18, -64], [-26, -62], [44, -40], [-50, 30], [60, 4], [-62, -14]];
export const droneSpots = (envId) => [...LAND_DRONES.map((p) => ({ p, sea: false })), ...(envId === 'coastal' ? SEA_DRONES.map((p) => ({ p, sea: true })) : [])];

function makeGlowTexture() {
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const d = Math.hypot(x / (N - 1) * 2 - 1, y / (N - 1) * 2 - 1);
      const a = Math.max(0, 1 - d) ** 2.2;
      const i = (y * N + x) * 4;
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------------------------- pollution drone
// One drone = 2 draw calls: a merged vertex-coloured body and one mesh of four translucent rotor discs
// (spinning blades read as blurred discs anyway).
let DRONE = null;
function droneAssets() {
  if (DRONE) return DRONE;
  const paint = (g, hex) => {
    const n = g.index ? g.toNonIndexed() : g;
    const col = new THREE.Color(hex);
    const arr = new Float32Array(n.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) { arr[i] = col.r; arr[i + 1] = col.g; arr[i + 2] = col.b; }
    n.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return n;
  };
  const arms = [0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return paint(new THREE.BoxGeometry(0.56, 0.05, 0.06).rotateY(-a).translate(Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5), '#3a3f47'); });
  const hubs = [0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return paint(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8).translate(Math.cos(a) * 0.74, 0.08, Math.sin(a) * 0.74), '#7a5bd6'); });
  const body = mergeBufferGeometries([
    paint(new THREE.SphereGeometry(0.38, 16, 12), '#3a3f47'),
    paint(new THREE.CylinderGeometry(0.46, 0.4, 0.12, 16).translate(0, -0.08, 0), '#7a5bd6'),
    paint(new THREE.SphereGeometry(0.12, 10, 8).translate(0, 0, 0.33), '#ff2244'),
    ...arms, ...hubs,
  ], false);
  const discs = mergeBufferGeometries([0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return new THREE.CircleGeometry(0.3, 14).rotateX(-Math.PI / 2).translate(Math.cos(a) * 0.74, 0.14, Math.sin(a) * 0.74).toNonIndexed(); }), false);
  DRONE = {
    body,
    discs,
    bodyMat: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.35 }),
    discMat: new THREE.MeshBasicMaterial({ color: '#cfc4ff', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  };
  return DRONE;
}
function DroneModel({ register }) {
  const A = droneAssets();
  return <group ref={(g) => register(g)}>
    <mesh geometry={A.body} material={A.bodyMat} castShadow />
    <mesh geometry={A.discs} material={A.discMat} />
  </group>;
}

// ------------------------------------------------------------------------------------- launcher
// Pistol laser Twini. Detail: rel atas, sight depan-belakang, scope (tier 2+), grip + trigger guard,
// heat-sink fins, energy cell, muzzle brake berventilasi, side rail, dan mount bahu.
// Warna glow + ukuran mengikuti senjata yang dipakai (Pulse/Ion/Plasma/Quantum/Nova).
function LauncherModel({ groupRef, barrelRef, color = '#5fe8ff', tier = 1 }) {
  const M = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#e8eef5', metalness: 0.6, roughness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: '#25303d', metalness: 0.6, roughness: 0.35 }),
    accent: new THREE.MeshStandardMaterial({ color: '#8f9bb0', metalness: 0.85, roughness: 0.22 }),
    glow: new THREE.MeshBasicMaterial({ color }),
  }), [color]);
  return <group ref={groupRef}>
    <group ref={barrelRef} scale={0.72 + tier * 0.045}>
      {/* barrel shroud + muzzle brake */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.092, 0.44, 16]} /><primitive object={M.body} attach="material" /></mesh>
      <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.095, 0.085, 0.1, 12]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[0, 0, 0.31]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.075, 0.016, 8, 18]} /><primitive object={M.glow} attach="material" /></mesh>
      <mesh position={[0, 0.055, 0.27]}><boxGeometry args={[0.15, 0.022, 0.07]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[0, -0.055, 0.27]}><boxGeometry args={[0.15, 0.022, 0.07]} /><primitive object={M.dark} attach="material" /></mesh>

      {/* top rail + sights */}
      <mesh position={[0, 0.088, 0.0]}><boxGeometry args={[0.062, 0.028, 0.4]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[0, 0.115, 0.19]}><boxGeometry args={[0.018, 0.045, 0.02]} /><primitive object={M.accent} attach="material" /></mesh>
      <mesh position={[0, 0.112, -0.16]}><boxGeometry args={[0.058, 0.035, 0.02]} /><primitive object={M.accent} attach="material" /></mesh>

      {/* receiver + grip + trigger */}
      <mesh position={[0, 0, -0.16]}><boxGeometry args={[0.14, 0.13, 0.24]} /><primitive object={M.body} attach="material" /></mesh>
      <mesh position={[0, -0.145, -0.17]} rotation={[0.34, 0, 0]}><boxGeometry args={[0.07, 0.17, 0.085]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[0, -0.072, -0.085]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.014, 0.05, 0.018]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[0, 0.01, -0.31]}><boxGeometry args={[0.05, 0.11, 0.06]} /><primitive object={M.dark} attach="material" /></mesh>
      {/* vented barrel ports */}
      {[0.11, -0.11].map((x) => <mesh key={`vent-${x}`} position={[x, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.16, 8]} /><primitive object={M.glow} attach="material" /></mesh>)}
      {/* scope (tier 2+) */}
      {tier >= 2 ? <group position={[0, 0.155, 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.042, 0.042, 0.2, 14]} /><primitive object={M.dark} attach="material" /></mesh>
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.042, 0.03, 14]} /><primitive object={M.accent} attach="material" /></mesh>
        <mesh position={[0, 0, 0.126]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.034, 14]} /><primitive object={M.glow} attach="material" /></mesh>
        <mesh position={[0, -0.05, 0]}><boxGeometry args={[0.03, 0.05, 0.06]} /><primitive object={M.accent} attach="material" /></mesh>
      </group> : null}
      {/* side rails + trigger guard + heat sink + energy cell */}
      {[0.078, -0.078].map((x) => <mesh key={`rail-${x}`} position={[x, 0.005, -0.14]}><boxGeometry args={[0.018, 0.06, 0.17]} /><primitive object={M.accent} attach="material" /></mesh>)}
      <mesh position={[0, -0.085, -0.085]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} /><primitive object={M.accent} attach="material" /></mesh>
      {[0, 1, 2].map((i) => <mesh key={`fin-${i}`} position={[0.083, 0.03 + i * 0.028, -0.19]}><boxGeometry args={[0.026, 0.012, 0.15]} /><primitive object={M.accent} attach="material" /></mesh>)}
      <mesh position={[-0.083, 0.0, -0.16]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.14, 12]} /><primitive object={M.dark} attach="material" /></mesh>
      <mesh position={[-0.083, 0.0, -0.09]} rotation={[0, 0, Math.PI / 2]}><circleGeometry args={[0.03, 12]} /><primitive object={M.glow} attach="material" /></mesh>
      <mesh position={[0, -0.045, -0.235]}><boxGeometry args={[0.11, 0.035, 0.06]} /><primitive object={M.glow} attach="material" /></mesh>
      <mesh position={[0, -0.12, 0.04]}><boxGeometry args={[0.06, 0.09, 0.1]} /><primitive object={M.dark} attach="material" /></mesh>
      {/* tier extras: twin barrels, glow rings, muzzle claws */}
      {tier >= 3 ? <group>
        {[0.072, -0.072].map((x) => <mesh key={`twin-${x}`} position={[x, -0.005, 0.16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.026, 0.3, 10]} /><primitive object={M.dark} attach="material" /></mesh>)}
        <mesh position={[0, 0.145, -0.25]}><boxGeometry args={[0.02, 0.06, 0.12]} /><primitive object={M.glow} attach="material" /></mesh>
      </group> : null}
      {tier >= 4 ? [0.06, 0.13, 0.2].map((z) => <mesh key={`ring-${z}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.082, 0.008, 6, 16]} /><primitive object={M.glow} attach="material" /></mesh>) : null}
      {tier >= 5 ? [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return <mesh key={`claw-${i}`} position={[Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.33]} rotation={[Math.PI / 2, 0, a]}><coneGeometry args={[0.028, 0.13, 6]} /><primitive object={M.glow} attach="material" /></mesh>; }) : null}

    </group>
  </group>;
}


export function CombatLayer({ controlRef, envId, groundAt, surfaceAt, weapon }) {
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const spots = useMemo(() => droneSpots(envId), [envId]);
  const sim = useRef(null);
  if (!sim.current || sim.current.envId !== envId) {
    sim.current = {
      envId,
      lastSeq: controlRef?.current?.fireSeq || 0,
      shots: Array.from({ length: MAX_SHOTS }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), age: 0, trail: new Float32Array(TRAIL * 3) })),
      bursts: Array.from({ length: MAX_BURSTS }, () => ({ on: false, t: 0, kind: 'spark', p: new THREE.Vector3() })),
      drones: spots.map((s, i) => ({ ...s, alive: true, back: 0, cur: new THREE.Vector3(), phase: i * 1.37, spawnT: -10 })),
      lock: null,
      recoil: 0,
    };
  }
  const drones = useRef([]);
  const shotRefs = useRef([]);
  const burstRefs = useRef([]);
  const trail = useRef(null);
  const reticle = useRef(null);
  const launcher = useRef(null);
  const barrel = useRef(null);
  const trailPos = useMemo(() => new Float32Array(MAX_SHOTS * TRAIL * 3), []);
  const trailCol = useMemo(() => new Float32Array(MAX_SHOTS * TRAIL * 3), []);
  const shardSeeds = useMemo(() => Array.from({ length: 14 }, (_, i) => { const a = i * 2.39996; const up = 0.35 + ((i * 37) % 10) / 14; return [Math.cos(a) * (1 - up * 0.5), up, Math.sin(a) * (1 - up * 0.5)]; }), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3() }), []);
  const tint = useMemo(() => new THREE.Color((weapon && weapon.color) || '#7cf5ff'), [weapon && weapon.color]);

  const spawnBurst = (p, kind, t) => {
    const s = sim.current;
    const slot = s.bursts.find((b) => !b.on) || s.bursts.reduce((o, b) => (b.t < o.t ? b : o), s.bursts[0]);
    slot.on = true; slot.kind = kind; slot.t = t; slot.p.copy(p);
  };

  useFrame(({ clock }, delta) => {
    const s = sim.current;
    const live = controlRef?.current;
    if (!live) return;
    const t = clock.elapsedTime;
    const dt = Math.min(delta || 1 / 60, 0.05);
    const veh = live.vehicle;
    const ground = (x, z) => (groundAt ? groundAt(x, z) : 0);
    const wp = weapon || DEFAULT_WEAPON;
    const shotSpeed = wp.speed || SHOT_SPEED;
    const shotDamage = Math.max(1, Math.round(wp.damage || 1));

    // ---- drones: hover, respawn
    s.drones.forEach((d, i) => {
      if (!d.alive && t >= d.back) { d.alive = true; d.spawnT = t; }
      const base = d.sea ? WATER_LEVEL : ground(d.p[0], d.p[1]);
      d.cur.set(d.p[0] + Math.cos(t * 0.4 + d.phase) * 0.8, base + 3.1 + Math.sin(t * 1.6 + d.phase) * 0.25, d.p[1] + Math.sin(t * 0.4 + d.phase) * 0.8);
      const g = drones.current[i];
      if (!g) return;
      // Far-away drones are not drawn at all.
      g.visible = d.alive && Math.hypot(d.p[0] - live.pos[0], d.p[1] - live.pos[1]) < 75;
      if (!g.visible) return;
      const grow = Math.min(1, (t - d.spawnT) / 0.6);
      g.position.copy(d.cur);
      g.scale.setScalar(0.2 + grow * 0.8);
      g.rotation.y = t * 0.6 + d.phase;
      g.rotation.z = Math.sin(t * 1.3 + d.phase) * 0.08;
    });

    // ---- launcher pose (shoulder on foot, mount point in a vehicle)
    const facing = veh ? { dx: Math.sin(veh.yaw), dz: Math.cos(veh.yaw) } : live.facing || { dx: 0, dz: 1 };
    let lp;
    if (veh) lp = vehicleLocalToWorld(veh, VEHICLE_TYPES[veh.type].mount);
    else {
      const gy = live.groundY ?? ground(live.pos[0], live.pos[1]);
      // right side of Twini: right = (-facing.dz, facing.dx)
      lp = [live.pos[0] - facing.dz * 0.34 + facing.dx * 0.05, gy + 0.84 + Math.sin(t * 2.2) * 0.03, live.pos[1] + facing.dx * 0.34 + facing.dz * 0.05];
    }

    // ---- auto lock: nearest live drone inside the forward cone
    let best = null;
    let bestScore = Infinity;
    s.drones.forEach((d) => {
      if (!d.alive) return;
      const dx = d.cur.x - lp[0];
      const dz = d.cur.z - lp[2];
      const dist = Math.hypot(dx, dz);
      if (dist > LOCK_RANGE || dist < 0.8) return;
      const cos = (dx * facing.dx + dz * facing.dz) / dist;
      if (cos < LOCK_COS) return;
      const score = dist * (2 - cos);
      if (score < bestScore) { bestScore = score; best = d; }
    });
    // Wabah digital (WabahLayer) ikut dalam sistem lock-on yang sama. They hover near the ground and
    // get a small preference so a wabah hunt never gets stuck behind a pollution drone.
    (Array.isArray(live.wabah) ? live.wabah : []).forEach((entry) => {
      if (!entry.alive) return;
      const dx = entry.pos.x - lp[0];
      const dz = entry.pos.z - lp[2];
      const dist = Math.hypot(dx, dz);
      if (dist > LOCK_RANGE || dist < 0.8) return;
      const cos = (dx * facing.dx + dz * facing.dz) / dist;
      if (cos < LOCK_COS) return;
      const score = dist * (2 - cos) * 0.85;
      if (score < bestScore) { bestScore = score; best = { cur: entry.pos, wabah: entry }; }
    });
    s.lock = best;
    if (reticle.current) {
      reticle.current.visible = !!best;
      if (best) {
        reticle.current.position.copy(best.cur);
        reticle.current.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
      }
    }

    // ---- fire requests
    const seq = live.fireSeq || 0;
    while (s.lastSeq < seq) {
      s.lastSeq += 1;
      const shot = s.shots.find((x) => !x.on) || s.shots.reduce((o, x) => (x.age > o.age ? x : o), s.shots[0]);
      let aim = facing;
      const muzzle = tmp.a.set(lp[0] + facing.dx * 0.3, lp[1], lp[2] + facing.dz * 0.3);
      shot.on = true; shot.age = 0;
      shot.p.copy(muzzle);
      if (best) {
        const dx = best.cur.x - muzzle.x;
        const dy = best.cur.y - muzzle.y;
        const dz = best.cur.z - muzzle.z;
        const dist = Math.hypot(dx, dz);
        const T = Math.max(0.3, Math.min(1.7, dist / shotSpeed));
        shot.v.set(dx / T, (dy + 0.5 * GRAVITY * T * T) / T, dz / T);
        aim = { dx: dx / dist, dz: dz / dist };
        if (!veh) live.facing = aim; // Twini turns towards the locked drone
      } else {
        const vv = veh ? veh.vel : [0, 0];
        shot.v.set(facing.dx * shotSpeed + vv[0], 5.2, facing.dz * shotSpeed + vv[1]);
      }
      for (let k = 0; k < TRAIL; k += 1) { shot.trail[k * 3] = muzzle.x; shot.trail[k * 3 + 1] = muzzle.y; shot.trail[k * 3 + 2] = muzzle.z; }
      spawnBurst(muzzle, 'muzzle', t);
      s.recoil = 1;
      s.aimYaw = Math.atan2(aim.dx, aim.dz);
    }

    if (launcher.current) {
      launcher.current.rotation.order = 'YXZ'; // yaw first, then barrel elevation around its own axis
      launcher.current.position.set(lp[0], lp[1], lp[2]);
      const target = s.lock ? Math.atan2(s.lock.cur.x - lp[0], s.lock.cur.z - lp[2]) : Math.atan2(facing.dx, facing.dz);
      const cur = launcher.current.rotation.y;
      launcher.current.rotation.y = cur + Math.atan2(Math.sin(target - cur), Math.cos(target - cur)) * (1 - Math.exp(-14 * dt));
      launcher.current.rotation.x = s.lock ? -0.35 : -0.18;
    }
    s.recoil = Math.max(0, s.recoil - dt * 6);
    if (barrel.current) barrel.current.position.z = -s.recoil * 0.12;

    // ---- projectiles
    s.shots.forEach((shot, i) => {
      const m = shotRefs.current[i];
      if (shot.on) {
        shot.age += dt;
        shot.v.y -= GRAVITY * dt;
        shot.p.addScaledVector(shot.v, dt);
        for (let k = TRAIL - 1; k > 0; k -= 1) { shot.trail[k * 3] = shot.trail[(k - 1) * 3]; shot.trail[k * 3 + 1] = shot.trail[(k - 1) * 3 + 1]; shot.trail[k * 3 + 2] = shot.trail[(k - 1) * 3 + 2]; }
        shot.trail[0] = shot.p.x; shot.trail[1] = shot.p.y; shot.trail[2] = shot.p.z;
        // Wabah digital: damage mengikuti pistol yang dipakai; WabahLayer owns the hit points/respawn.
        const wabahHit = (Array.isArray(live.wabah) ? live.wabah : [])
          .find((entry) => entry.alive && entry.pos.distanceTo(shot.p) < (entry.def ? entry.def.hitRadius : 1.3));
        if (wabahHit) {
          const result = live.wabahSim ? live.wabahSim.damage(wabahHit.id, shotDamage) : null;
          shot.on = false;
          spawnBurst(wabahHit.pos, result && result.down ? 'boom' : 'spark', t);
          live.onWabah?.({ type: result && result.down ? 'down' : 'hit', id: wabahHit.id, kind: wabahHit.kind, zone: wabahHit.zone });
          return;
        }
        // hit test against drones (generous radius for touch play)
        const hit = s.drones.find((d) => d.alive && d.cur.distanceTo(shot.p) < 1.05);
        if (hit) {
          hit.alive = false; hit.back = t + RESPAWN_S;
          shot.on = false;
          spawnBurst(hit.cur, 'boom', t);
          live.onCombat?.({ type: 'hit', sea: hit.sea });
        } else {
          const surf = surfaceAt ? surfaceAt(shot.p.x, shot.p.z, t) : { y: ground(shot.p.x, shot.p.z), water: false };
          if (shot.p.y <= surf.y) {
            shot.on = false;
            shot.p.y = surf.y + 0.02;
            spawnBurst(shot.p, surf.water ? 'splash' : 'spark', t);
          } else if (shot.age > 4) shot.on = false;
        }
      }
      if (m) {
        m.visible = shot.on;
        if (shot.on) m.position.copy(shot.p);
      }
      for (let k = 0; k < TRAIL; k += 1) {
        const o = (i * TRAIL + k) * 3;
        trailPos[o] = shot.trail[k * 3]; trailPos[o + 1] = shot.trail[k * 3 + 1]; trailPos[o + 2] = shot.trail[k * 3 + 2];
        const f = shot.on ? (1 - k / TRAIL) : 0;
        trailCol[o] = tint.r * f; trailCol[o + 1] = tint.g * f; trailCol[o + 2] = tint.b * f;
      }
    });
    if (trail.current) {
      trail.current.geometry.attributes.position.needsUpdate = true;
      trail.current.geometry.attributes.color.needsUpdate = true;
    }

    // ---- bursts
    s.bursts.forEach((b, i) => {
      const g = burstRefs.current[i];
      if (!g) return;
      const dur = b.kind === 'muzzle' ? 0.18 : b.kind === 'boom' ? 0.9 : 0.7;
      const k = (t - b.t) / dur;
      if (!b.on || k >= 1) { b.on = false; g.visible = false; return; }
      g.visible = true;
      g.position.copy(b.p);
      const [flash, ring, shards, column] = g.children;
      const big = b.kind === 'boom' ? 1.8 : b.kind === 'muzzle' ? 0.35 : 1;
      const water = b.kind === 'splash';
      flash.visible = !water;
      flash.scale.setScalar((0.3 + k * 1.4) * big);
      flash.material.opacity = (1 - k) * 0.9;
      flash.material.color.set(b.kind === 'boom' ? '#ffb347' : '#8ff4ff');
      ring.visible = b.kind !== 'muzzle';
      ring.scale.setScalar(0.2 + k * 2.6 * big);
      ring.material.opacity = (1 - k) * 0.8;
      ring.material.color.set(water ? '#e8fbff' : b.kind === 'boom' ? '#ffd27a' : '#7fe9ff');
      ring.rotation.x = b.kind === 'boom' ? 0 : -Math.PI / 2;
      shards.visible = b.kind !== 'muzzle';
      const arr = shards.geometry.attributes.position.array;
      const spread = (water ? 1.4 : 2.4) * big;
      shardSeeds.forEach((sd, j) => {
        const tt = k * dur;
        arr[j * 3] = sd[0] * spread * tt * 2.2;
        arr[j * 3 + 1] = sd[1] * (water ? 7 : 5) * tt - 0.5 * GRAVITY * tt * tt * (b.kind === 'boom' ? 0.25 : 1);
        arr[j * 3 + 2] = sd[2] * spread * tt * 2.2;
      });
      shards.geometry.attributes.position.needsUpdate = true;
      shards.material.opacity = 1 - k;
      shards.material.color.set(water ? '#ffffff' : b.kind === 'boom' ? '#ffcf6b' : '#a6f6ff');
      column.visible = water;
      column.scale.set(1 - k * 0.4, Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k) * 2.2 + 0.01, 1 - k * 0.4);
      column.material.opacity = (1 - k) * 0.7;
    });
  });

  return <>
    {sim.current.drones.map((d, i) => <DroneModel key={`drone-${envId}-${i}`} register={(g) => { drones.current[i] = g; }} />)}
    <LauncherModel groupRef={launcher} barrelRef={barrel} color={(weapon || DEFAULT_WEAPON).color} tier={(weapon || DEFAULT_WEAPON).tier || 1} />
    {Array.from({ length: MAX_SHOTS }, (_, i) => <group key={`shot-${i}`} ref={(g) => { shotRefs.current[i] = g; }} visible={false}>
      <mesh><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color="#e9fdff" /></mesh>
      <sprite scale={[0.9, 0.9, 0.9]}><spriteMaterial map={glowTex} color="#4fdcff" transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>)}
    <points ref={trail} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[trailPos, 3]} count={MAX_SHOTS * TRAIL} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[trailCol, 3]} count={MAX_SHOTS * TRAIL} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={glowTex} size={0.42} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
    {Array.from({ length: MAX_BURSTS }, (_, i) => <group key={`burst-${i}`} ref={(g) => { burstRefs.current[i] = g; }} visible={false}>
      <mesh><sphereGeometry args={[0.5, 16, 12]} /><meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh><ringGeometry args={[0.42, 0.55, 32]} /><meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <points frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(14 * 3), 3]} count={14} itemSize={3} /></bufferGeometry>
        <pointsMaterial map={glowTex} size={0.32} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.18, 0.5, 1.2, 14, 1, true]} /><meshBasicMaterial color="#f2fdff" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </group>)}
    <Reticle refObj={reticle} />
  </>;
}

// Lock-on reticle that always faces the camera (position/visibility come from CombatLayer's previous frame).
function Reticle({ refObj }) {
  const inner = useRef(null);
  useFrame(({ camera }) => {
    if (refObj.current) {
      refObj.current.quaternion.copy(camera.quaternion);
      if (inner.current) inner.current.rotation.z += 0.06;
    }
  });
  return <group ref={refObj} visible={false}>
    <group ref={inner}>
      {[0, 1, 2, 3].map((i) => <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[Math.cos((i * Math.PI) / 2) * 0.78, Math.sin((i * Math.PI) / 2) * 0.78, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.01]} /><meshBasicMaterial color="#ff3d5f" depthTest={false} transparent opacity={0.95} />
      </mesh>)}
    </group>
    <mesh><ringGeometry args={[0.62, 0.68, 40]} /><meshBasicMaterial color="#ff3d5f" depthTest={false} transparent opacity={0.85} side={THREE.DoubleSide} /></mesh>
  </group>;
}

// ------------------------------------------------------------------------------------- teleport effect
// Reads `controlRef.current.teleport = { seq, from: [x, y, z], to: [x, y, z] }` written by the screen.
export function TeleportFx({ controlRef }) {
  const seen = useRef(controlRef?.current?.teleport?.seq || 0);
  const start = useRef(-10);
  const from = useRef(null);
  const to = useRef(null);
  const spiralPos = useMemo(() => new Float32Array(28 * 3), []);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const spiral = useRef(null);
  useFrame(({ clock }) => {
    const live = controlRef?.current;
    const tp = live?.teleport;
    const t = clock.elapsedTime;
    if (tp && tp.seq !== seen.current) { seen.current = tp.seq; start.current = t; }
    const k = (t - start.current) / 1.1;
    const on = k >= 0 && k < 1 && tp;
    [from.current, to.current].forEach((g, idx) => {
      if (!g) return;
      g.visible = !!on;
      if (!on) return;
      const p = idx === 0 ? tp.from : tp.to;
      g.position.set(p[0], p[1], p[2]);
      const [beam, ring1, ring2] = g.children;
      if (idx === 0) { // departure: beam collapses inwards
        beam.scale.set(Math.max(0.01, 1 - k * 1.3), 1 + k * 0.8, Math.max(0.01, 1 - k * 1.3));
        beam.material.opacity = (1 - k) * 0.6;
      } else { // arrival: beam drops in and widens out
        beam.scale.set(0.4 + k * 0.9, Math.min(1, k * 3), 0.4 + k * 0.9);
        beam.material.opacity = (1 - k) * 0.7;
      }
      ring1.scale.setScalar(0.4 + k * 2.4);
      ring1.material.opacity = (1 - k) * 0.9;
      ring2.position.y = 0.1 + k * 2.4;
      ring2.scale.setScalar(1.1 - k * 0.6);
      ring2.material.opacity = (1 - k) * 0.8;
    });
    if (spiral.current) {
      spiral.current.visible = !!on;
      if (on) {
        const p = tp.to;
        for (let i = 0; i < 28; i += 1) {
          const a = i * 0.9 + t * 7;
          const r = 0.75 * (1 - k * 0.6);
          spiralPos[i * 3] = p[0] + Math.cos(a) * r;
          spiralPos[i * 3 + 1] = p[1] + ((i / 28) * 2.6 + k * 1.6) % 2.8;
          spiralPos[i * 3 + 2] = p[2] + Math.sin(a) * r;
        }
        spiral.current.geometry.attributes.position.needsUpdate = true;
        spiral.current.material.opacity = 1 - k;
      }
    }
  });
  const fxGroup = (ref) => <group ref={ref} visible={false}>
    <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.7, 0.7, 3.2, 24, 1, true]} /><meshBasicMaterial color="#8a7bff" transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.55, 0.72, 40]} /><meshBasicMaterial color="#5fe8ff" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.6, 0.68, 40]} /><meshBasicMaterial color="#d9b8ff" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>;
  return <>
    {fxGroup(from)}
    {fxGroup(to)}
    <points ref={spiral} visible={false} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[spiralPos, 3]} count={28} itemSize={3} /></bufferGeometry>
      <pointsMaterial map={glowTex} color="#bfa8ff" size={0.35} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  </>;
}
