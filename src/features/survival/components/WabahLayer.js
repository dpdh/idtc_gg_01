import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { WABAH_SPAWNS, wabahType } from '../data/wabah';

// "Wabah Digital" obstacles: low-poly corrupted data nodes that hover above the ground and respawn.
// One frame loop owns their animation, hit points and respawn timers; the same objects are published
// through `controlRef.current.wabah` so the launcher (CombatLayer) can lock on and hit them without
// any per-frame React state.
const RESPAWN_S = 24;

function WabahBody({ kind }) {
  if (kind === 'glitch_node') return <octahedronGeometry args={[0.62, 0]} />;
  if (kind === 'algae_bloom') return <icosahedronGeometry args={[0.6, 1]} />;
  if (kind === 'emission_swarm') return <torusGeometry args={[0.48, 0.2, 10, 20]} />;
  if (kind === 'kernel_virus') return <icosahedronGeometry args={[0.58, 0]} />;
  return <sphereGeometry args={[0.52, 16, 12]} />;
}

function WabahModel({ kind, register }) {
  const def = wabahType(kind);
  return <group ref={register}>
    <mesh>
      <WabahBody kind={kind} />
      <meshStandardMaterial color={def.shell} emissive={def.color} emissiveIntensity={0.55} roughness={0.35} metalness={0.5} />
    </mesh>
    <mesh scale={1.28}>
      <icosahedronGeometry args={[0.6, 0]} />
      <meshBasicMaterial color={def.color} wireframe transparent opacity={0.55} depthWrite={false} />
    </mesh>
    <mesh scale={0.42}>
      <sphereGeometry args={[0.4, 12, 10]} />
      <meshBasicMaterial color={def.color} />
    </mesh>
  </group>;
}

export default function WabahLayer({ controlRef, groundAt }) {
  const groupRefs = useRef([]);
  const sim = useRef(null);

  if (!sim.current) {
    const entries = WABAH_SPAWNS.map((spawn, index) => {
      const def = wabahType(spawn.kind);
      const groundY = groundAt ? groundAt(spawn.position[0], spawn.position[1]) : 0;
      const hoverY = groundY + 1.5 + (index % 3) * 0.22;
      return {
        id: spawn.id,
        kind: spawn.kind,
        zone: spawn.zone,
        def,
        home: new THREE.Vector3(spawn.position[0], hoverY, spawn.position[1]),
        pos: new THREE.Vector3(spawn.position[0], hoverY, spawn.position[1]),
        alive: true,
        hp: def.hp,
        maxHp: def.hp,
        back: 0,
        phase: index * 0.83,
        spawnT: -10,
        hitT: -10,
      };
    });
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    sim.current = {
      t: 0,
      entries,
      // Called by CombatLayer when a plasma orb reaches an obstacle. Returns the live entry plus
      // whether this shot destroyed it. One-way dependency: no allocation per shot.
      damage(id, amount = 1) {
        const entry = byId.get(id);
        if (!entry || !entry.alive) return null;
        entry.hp -= Math.max(1, Math.round(amount));
        entry.hitT = sim.current.t;
        const down = entry.hp <= 0;
        if (down) {
          entry.alive = false;
          entry.back = sim.current.t + RESPAWN_S;
        }
        return { entry, down };
      },
    };
  }

  // Publish before the first frame so the launcher can already lock on this tick.
  if (controlRef?.current) {
    controlRef.current.wabah = sim.current.entries;
    controlRef.current.wabahSim = sim.current;
  }

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = sim.current;
    s.t = t;
    s.entries.forEach((entry, index) => {
      const group = groupRefs.current[index];
      if (!group) return;
      if (!entry.alive && t >= entry.back) {
        entry.alive = true;
        entry.hp = entry.maxHp;
        entry.spawnT = t;
      }
      if (!entry.alive) { group.visible = false; return; }
      // Cull far obstacles: only the ones around Twini need a draw call (same idea as the drones).
      const player = controlRef?.current?.pos;
      if (player && Math.hypot(entry.home.x - player[0], entry.home.z - player[1]) > 80) {
        group.visible = false;
        return;
      }
      entry.pos.set(entry.home.x, entry.home.y + Math.sin(t * 1.4 + entry.phase) * 0.16, entry.home.z);
      const grow = Math.min(1, (t - entry.spawnT) / 0.45);
      const flash = Math.max(0, 1 - (t - entry.hitT) * 6);
      group.visible = true;
      group.position.copy(entry.pos);
      group.scale.setScalar(entry.def.scale * (0.25 + grow * 0.75) * (1 + flash * 0.2));
      group.rotation.y = t * 0.9 + entry.phase;
      group.rotation.x = Math.sin(t * 0.8 + entry.phase) * 0.16;
    });
  });

  return <>
    {WABAH_SPAWNS.map((spawn, index) => (
      <WabahModel key={spawn.id} kind={spawn.kind} register={(group) => { groupRefs.current[index] = group; }} />
    ))}
  </>;
}
