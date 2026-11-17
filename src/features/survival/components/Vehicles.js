import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { oceanHeight, oceanSlope } from './Ocean';

// Rideable vehicles: an SUV (mobil), a motorbike (motor) and a V-hull speedboat (perahu, coastal only).
// Fully procedural meshes (no extra assets). Arcade physics run inside the scene's frame loop from the same
// shared control ref as walking: stick up = gas, down = brake/reverse, left/right = steer, RUN = turbo.
//
// Local vehicle space: +z forward, +y up, +x = LEFT side (so the driver of the right-hand-drive car sits at -x).

export const VEHICLE_LIMIT = 136;
// Vehicles are modelled for a ~1.2-unit driver; the compact Twini (~0.9) gets slightly smaller vehicles.
export const VEHICLE_SCALE = 0.82;
export const VEHICLE_TYPES = {
  car: {
    label: 'Mobil', emoji: '🚙', maxSpeed: 13, reverse: 5, accel: 7.5, brake: 17, drag: 3.2, turn: 1.75, grip: 9, wheelR: 0.33,
    water: false, seat: [-0.36, 0.2, -0.15], mount: [0, 1.6, -0.3], reach: 2.8, exit: 1.6,
  },
  motor: {
    label: 'Motor', emoji: '🏍️', maxSpeed: 16, reverse: 2.5, accel: 10.5, brake: 19, drag: 3.6, turn: 2.35, grip: 12, wheelR: 0.3,
    water: false, seat: [0, 0.3, -0.16], mount: [-0.34, 1.0, 0.25], reach: 2.0, exit: 1.0,
  },
  boat: {
    label: 'Perahu', emoji: '🚤', maxSpeed: 11.5, reverse: 3.5, accel: 4.8, brake: 6.5, drag: 1.3, turn: 1.3, grip: 2.3, wheelR: 1,
    water: true, seat: [-0.3, 0.12, -0.05], mount: [0, 1.15, 0.95], reach: 3.2, exit: 1.7,
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A small fleet in every environment, parked on open ground clear of every mission object / Energy Core
// (all within the 52-unit coastal island). The first car and motorbike stand right and left of the start
// plaza. Boats are moored at the coastal pier and beach.
export const VEHICLE_SPOTS = [
  { id: 'car-1', type: 'car', name: 'Mobil Merah', pos: [10.6, 2.5], yaw: Math.PI, color: '#c4122c' },
  { id: 'motor-1', type: 'motor', name: 'Motor Biru', pos: [-10.6, 2.5], yaw: Math.PI, color: '#1f6feb' },
  { id: 'car-2', type: 'car', name: 'Mobil Biru', pos: [14, -13], yaw: Math.PI / 2, color: '#1557c0' },
  { id: 'motor-2', type: 'motor', name: 'Motor Oranye', pos: [-15, -13], yaw: -Math.PI / 2, color: '#ff7a1a' },
  { id: 'car-3', type: 'car', name: 'Mobil Kuning', pos: [-12, 13], yaw: 0, color: '#f2b705' },
  { id: 'motor-3', type: 'motor', name: 'Motor Hijau', pos: [12, 13], yaw: 0, color: '#1fa85a' },
  { id: 'car-4', type: 'car', name: 'Mobil Putih', pos: [30, -3], yaw: Math.PI / 2, color: '#eef1f4' },
  { id: 'motor-4', type: 'motor', name: 'Motor Ungu', pos: [-30, -3], yaw: -Math.PI / 2, color: '#8a4be0' },
];
export const BOAT_SPOTS = [
  { id: 'boat-1', type: 'boat', name: 'Speedboat Merah', pos: [5.2, -60], yaw: Math.PI, color: '#e23b3b' },
  { id: 'boat-2', type: 'boat', name: 'Speedboat Biru', pos: [-5.2, -70], yaw: Math.PI, color: '#1f6feb' },
  { id: 'boat-3', type: 'boat', name: 'Speedboat Kuning', pos: [40.5, -41], yaw: Math.PI * 0.75, color: '#f2b705' },
];
export function spawnVehicles(envId) {
  const list = envId === 'coastal' ? [...VEHICLE_SPOTS, ...BOAT_SPOTS] : VEHICLE_SPOTS;
  return list.map((v) => ({ ...v, pos: [...v.pos], vel: [0, 0], speed: 0, steer: 0, y: 0, pitch: 0, roll: 0, wheel: 0 }));
}

// Local (x = left, y, z = forward) → world, ignoring pitch/roll.
export function vehicleLocalToWorld(v, local) {
  const [lx, ly, lz] = local.map((n) => n * VEHICLE_SCALE);
  const hx = Math.sin(v.yaw);
  const hz = Math.cos(v.yaw);
  return [v.pos[0] + lx * hz + lz * hx, v.y + ly, v.pos[1] - lx * hx + lz * hz];
}
export function seatOf(v) {
  const [x, y, z] = vehicleLocalToWorld(v, VEHICLE_TYPES[v.type].seat);
  return { x, y, z, yaw: v.yaw, roll: v.roll };
}

// One physics step. `input` is the raw screen-space stick ({dx, dz}, dz < 0 = up) or null when nobody drives.
// Returns the distance travelled.
export function stepVehicle(v, input, boost, dt, t, world, stats = null) {
  const T = VEHICLE_TYPES[v.type];
  const speedK = (stats && stats.speed) || 1;
  const gripK = (stats && stats.grip) || 1;
  const armor = (stats && stats.armor) || 0;
  let throttle = 0;
  let steerIn = 0;
  if (input) {
    const ix = input.dx || 0;
    const iz = input.dz || 0;
    throttle = Math.abs(iz) > 0.12 ? clamp(-iz * 1.25, -1, 1) : 0;
    steerIn = Math.abs(ix) > 0.12 ? clamp(ix * 1.15, -1, 1) : 0;
  }
  const maxF = T.maxSpeed * speedK * (boost ? 1.4 : 1);
  const target = throttle > 0 ? throttle * maxF : throttle < 0 ? throttle * T.reverse : 0;
  const braking = target !== 0 && Math.abs(v.speed) > 0.2 && Math.sign(target) !== Math.sign(v.speed);
  const rate = braking ? T.brake : target === 0 ? T.drag : T.accel * speedK * (boost ? 1.3 : 1);
  v.speed += clamp(target - v.speed, -rate * dt, rate * dt);
  v.steer += (steerIn - v.steer) * (1 - Math.exp(-7 * dt));
  const sp = Math.abs(v.speed);
  const steerK = Math.min(1, sp / 3) * (1 - 0.4 * Math.min(1, sp / T.maxSpeed));
  v.yaw -= v.steer * T.turn * steerK * (v.speed < 0 ? -1 : 1) * dt;
  const hx = Math.sin(v.yaw);
  const hz = Math.cos(v.yaw);
  // Grip: land vehicles follow their heading almost instantly, the boat drifts through turns.
  const g = 1 - Math.exp(-T.grip * gripK * dt);
  v.vel[0] += (hx * v.speed - v.vel[0]) * g;
  v.vel[1] += (hz * v.speed - v.vel[1]) * g;
  if (!input && sp < 0.05 && Math.hypot(v.vel[0], v.vel[1]) < 0.05) { v.speed = 0; v.vel[0] = 0; v.vel[1] = 0; }
  let moved = 0;
  if (v.vel[0] || v.vel[1]) {
    const ox = v.pos[0];
    const oz = v.pos[1];
    const nx = clamp(ox + v.vel[0] * dt, -VEHICLE_LIMIT, VEHICLE_LIMIT);
    const nz = clamp(oz + v.vel[1] * dt, -VEHICLE_LIMIT, VEHICLE_LIMIT);
    const ok = (x, z) => !world || world.canDrive(v.type, x, z);
    if (ok(nx, nz)) { v.pos[0] = nx; v.pos[1] = nz; }
    else if (ok(nx, oz)) { v.pos[0] = nx; v.vel[1] *= 0.3; v.speed *= 0.8 + armor * 0.05; }
    else if (ok(ox, nz)) { v.pos[1] = nz; v.vel[0] *= 0.3; v.speed *= 0.8 + armor * 0.05; }
    else { v.speed *= -0.3 * (1 - armor * 0.15); v.vel[0] *= -0.3; v.vel[1] *= -0.3; v.bump = t; }
    moved = Math.hypot(v.pos[0] - ox, v.pos[1] - oz);
  }
  v.wheel += (v.speed * dt) / (T.wheelR * VEHICLE_SCALE);
  const k = 1 - Math.exp(-8 * dt);
  const speedRatio = Math.min(1, sp / T.maxSpeed);
  if (T.water) {
    const [sx, sz] = oceanSlope(v.pos[0], v.pos[1], t);
    const along = sx * hx + sz * hz;
    const right = -sx * hz + sz * hx;
    v.y = oceanHeight(v.pos[0], v.pos[1], t) + 0.02;
    v.pitch += (-Math.atan(along) * 0.85 - 0.11 * speedRatio * (v.speed > 0 ? 1 : 0) - v.pitch) * k;
    v.roll += (-Math.atan(right) * 0.85 + v.steer * speedRatio * 0.14 - v.roll) * k;
  } else {
    v.y = world ? world.groundAt(v.pos[0], v.pos[1]) : 0;
    const lean = v.type === 'motor' ? v.steer * Math.min(1, sp / 7) * 0.48 : -v.steer * speedRatio * 0.05;
    v.roll += (lean - v.roll) * k;
    v.pitch += ((v.type === 'car' ? -0.025 : -0.015) * clamp(target - v.speed, -3, 3) / 3 - v.pitch) * k;
  }
  return moved;
}

// ------------------------------------------------------------------------------------------- geometry kit
// Every vehicle is built from a handful of MERGED geometries (one per material), so a whole car costs
// ~11 draw calls instead of ~60 separate meshes. Wheels use one vertex-coloured geometry (tyre + rim).

function place(geometry, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  return g;
}
const box = (w, h, d, p, r) => place(new THREE.BoxGeometry(w, h, d), p, r);
const cyl = (rt, rb, h, seg, p, r) => place(new THREE.CylinderGeometry(rt, rb, h, seg), p, r);
const ball = (rad, p, s) => place(new THREE.SphereGeometry(rad, 16, 12), p, [0, 0, 0], s);
const ring = (R, tube, p, r, s) => place(new THREE.TorusGeometry(R, tube, 10, 22), p, r, s);
function merge(list) {
  const clean = list.map((g) => { Object.keys(g.attributes).forEach((k) => { if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); }); return g; });
  return mergeBufferGeometries(clean, false);
}
function tint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
// Side profile (shape x = forward, y = up) extruded across the vehicle's width with rounded edges.
function profile(points, width, bevel, build) {
  const shape = new THREE.Shape();
  if (build) build(shape); else { shape.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x, y]) => shape.lineTo(x, y)); shape.closePath(); }
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, 0, -width / 2);
  g.rotateY(-Math.PI / 2); // shape x → +z (forward), extrusion → x (width)
  return g;
}
// Smooth lofted surface through rows of [x, y, z] points (all rows the same length).
function loft(rows) {
  const n = rows[0].length;
  const pos = [];
  rows.forEach((row) => row.forEach((pt) => pos.push(pt[0], pt[1], pt[2])));
  const idx = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    for (let j = 0; j < n - 1; j += 1) {
      const a = i * n + j;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MATS = {
    carPaint: std({ color: '#c4122c', metalness: 0.6, roughness: 0.22 }),
    motoPaint: std({ color: '#1f6feb', metalness: 0.6, roughness: 0.22 }),
    hullWhite: std({ color: '#f6f8f9', metalness: 0.08, roughness: 0.28, side: THREE.DoubleSide }),
    hullNavy: std({ color: '#12335a', metalness: 0.2, roughness: 0.35, side: THREE.DoubleSide }),
    stripe: std({ color: '#e23b3b', metalness: 0.2, roughness: 0.3, side: THREE.DoubleSide }),
    teak: std({ color: '#a8743f', roughness: 0.7, side: THREE.DoubleSide }),
    cream: std({ color: '#efe4cf', roughness: 0.6, side: THREE.DoubleSide }),
    dark: std({ color: '#1f252b', metalness: 0.3, roughness: 0.6 }),
    chrome: std({ color: '#e3e8ee', metalness: 0.95, roughness: 0.14, side: THREE.DoubleSide }),
    glass: std({ color: '#9fcdf0', metalness: 0.4, roughness: 0.03, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }),
    wheel: std({ vertexColors: true, metalness: 0.4, roughness: 0.5 }),
    head: std({ color: '#fffbe8', emissive: '#fff0b3', emissiveIntensity: 1.3 }),
    tail: std({ color: '#ff3b3b', emissive: '#ff1a1a', emissiveIntensity: 1.0 }),
    navRed: new THREE.MeshBasicMaterial({ color: '#ff4040' }),
    navGreen: new THREE.MeshBasicMaterial({ color: '#40ff7a' }),
    shadow: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }),
    marker: new THREE.MeshBasicMaterial({ color: '#7dffb5', transparent: true, opacity: 0.9, depthWrite: false }),
  };
  return MATS;
}

// Tyre (rounded torus) + alloy rim with five spokes, axis along x.
function wheelGeometry(radius, width) {
  const tube = radius * 0.3;
  const tyre = tint(ring(radius - tube, tube, [0, 0, 0], [0, Math.PI / 2, 0], [1, 1, width / (tube * 2)]), '#121416');
  // (the torus is scaled along its own axis before the rotation is applied by `place`, so fix the width here)
  const rim = tint(cyl(radius * 0.58, radius * 0.58, width * 0.72, 18, [0, 0, 0], [0, 0, Math.PI / 2]), '#aeb6bf');
  const hub = tint(cyl(radius * 0.16, radius * 0.16, width * 0.86, 10, [0, 0, 0], [0, 0, Math.PI / 2]), '#e6ebf0');
  const spokes = [0, 1, 2, 3, 4].map((i) => tint(box(width * 0.8, radius * 1.1, radius * 0.13, [0, 0, 0], [(i * Math.PI) / 5, 0, 0]), '#dfe5ea'));
  return merge([tyre, rim, hub, ...spokes]);
}

const GEO = {};
function carGeometries() {
  if (GEO.car) return GEO.car;
  const arch = 0.42;
  // Lower body: nose, bonnet, belt line, boot — with two wheel arches cut out of the sill.
  const body = profile(null, 1.44, 0.06, (s) => {
    s.moveTo(-1.8, 0.52);
    s.lineTo(-1.74, 0.3);
    s.lineTo(-1.05 - arch, 0.3);
    s.absarc(-1.05, 0.3, arch, Math.PI, 0, true);
    s.lineTo(1.05 - arch, 0.3);
    s.absarc(1.05, 0.3, arch, Math.PI, 0, true);
    s.lineTo(1.76, 0.3);
    s.lineTo(1.85, 0.48);
    s.lineTo(1.83, 0.7);
    s.quadraticCurveTo(1.6, 0.84, 0.82, 0.93);
    s.lineTo(-1.38, 0.96);
    s.quadraticCurveTo(-1.74, 0.95, -1.8, 0.82);
    s.closePath();
  });
  const paint = merge([
    body,
    box(1.34, 0.05, 1.16, [0, 1.385, -0.26], [0.02, 0, 0]), // roof
    ...[-1, 1].flatMap((side) => [
      box(0.06, 0.68, 0.08, [side * 0.67, 1.135, 0.56], [-0.9, 0, 0]), // A pillar
      box(0.06, 0.44, 0.09, [side * 0.68, 1.16, -0.25]), // B pillar
      box(0.06, 0.72, 0.1, [side * 0.67, 1.165, -1.09], [0.955, 0, 0]), // C pillar
      box(0.15, 0.09, 0.08, [side * 0.85, 0.99, 0.6]), // mirror
    ]),
  ]);
  const glass = profile([[0.82, 0.93], [0.3, 1.35], [-0.8, 1.38], [-1.38, 0.96]], 1.26, 0.03);
  const dark = merge([
    box(1.58, 0.09, 1.2, [0, 0.3, 0]), // sills
    box(1.3, 0.16, 0.06, [0, 0.42, 1.86]), // front intake
    box(0.92, 0.13, 0.05, [0, 0.64, 1.85]), // grille
    box(1.3, 0.13, 0.06, [0, 0.4, -1.83]), // rear diffuser
    cyl(0.41, 0.41, 1.5, 18, [0, 0.3, 1.05], [0, 0, Math.PI / 2]), // wheel wells
    cyl(0.41, 0.41, 1.5, 18, [0, 0.3, -1.05], [0, 0, Math.PI / 2]),
    box(1.3, 0.16, 0.3, [0, 0.94, 0.62]), // dashboard
    ...[-1, 1].flatMap((side) => [box(0.46, 0.12, 0.46, [side * 0.36, 0.8, -0.1]), box(0.46, 0.5, 0.1, [side * 0.36, 1.05, -0.36], [-0.12, 0, 0])]),
    box(1.24, 0.12, 0.42, [0, 0.8, -0.95]), box(1.24, 0.42, 0.1, [0, 1.02, -1.18], [-0.1, 0, 0]),
    ring(0.14, 0.022, [-0.36, 1.03, 0.42], [-1.0, 0, 0]), // steering wheel (right-hand drive)
    // ---- spare parts / detail pass (all merged into the same draw call) ----
    box(1.18, 0.05, 0.05, [0, 1.44, 0.42]), box(1.18, 0.05, 0.05, [0, 1.44, -0.9]), // roof rack rails
    box(0.05, 0.04, 1.24, [0.53, 1.46, -0.24]), box(0.05, 0.04, 1.24, [-0.53, 1.46, -0.24]), // rack crossbars
    box(0.86, 0.09, 0.5, [0, 1.5, -0.28]), // roof cargo box
    ...[-1, 1].flatMap((side) => [
      box(0.05, 0.15, 0.46, [side * 0.72, 0.32, 1.15]), box(0.05, 0.15, 0.46, [side * 0.72, 0.32, -1.15]), // mudflaps
      box(0.06, 0.42, 0.26, [side * 0.66, 0.28, -0.32]), // side skirt vent
      box(0.05, 0.2, 0.42, [side * 0.52, 0.74, -0.28]), // rear seat bench
      box(0.05, 0.03, 0.38, [side * 0.44, 1.0, 0.78], [-0.42, 0, 0]), // wiper arms
    ]),
    box(0.44, 0.1, 0.06, [0, 0.34, 1.9]), // tow hook housing
    box(0.9, 0.04, 0.28, [0, 1.18, -1.12]), // parcel shelf
    box(0.28, 0.16, 0.3, [0.3, 0.9, 0.02]), // centre console / shifter base
    cyl(0.012, 0.012, 0.85, 6, [0.56, 1.62, -0.95], [0.32, 0, 0]), // roof antenna
    ...[-1, 1].map((side) => box(0.42, 0.02, 0.03, [side * 0.55, 1.1, -0.98])), // rear speaker grilles
  ]);
  const chrome = merge([
    box(0.92, 0.025, 0.06, [0, 0.66, 1.86]),
    ...[-1, 1].flatMap((side) => [box(0.02, 0.03, 0.15, [side * 0.785, 0.86, 0.12]), box(0.02, 0.03, 0.15, [side * 0.785, 0.86, -0.72])]),
    cyl(0.045, 0.045, 0.14, 10, [0.5, 0.36, -1.86], [Math.PI / 2, 0, 0]), cyl(0.045, 0.045, 0.14, 10, [-0.5, 0.36, -1.86], [Math.PI / 2, 0, 0]),
    // ---- spare parts ----
    ...[-1, 1].flatMap((side) => [
      box(0.03, 0.03, 0.24, [side * 0.72, 0.96, 0.34]), box(0.03, 0.03, 0.24, [side * 0.72, 0.96, -0.52]), // door handles
      box(0.03, 0.14, 0.03, [side * 0.44, 0.3, -1.04]), box(0.03, 0.14, 0.03, [side * 0.44, 0.3, 1.04]), // brake calipers
      cyl(0.028, 0.028, 0.16, 8, [side * 0.46, 0.56, 1.86], [Math.PI / 2, 0, 0]), // fog light trims
    ]),
    box(0.36, 0.11, 0.02, [0, 0.52, -1.89]), box(0.36, 0.11, 0.02, [0, 0.52, 1.91]), // license plates
    box(0.9, 0.03, 0.03, [0, 0.9, -1.87]), // boot trim
    box(0.06, 0.02, 0.9, [0.63, 1.4, -0.24]), box(0.06, 0.02, 0.9, [-0.63, 1.4, -0.24]), // roof rack side rails
    cyl(0.02, 0.02, 0.5, 6, [0, 1.3, 0.9], [0, 0, Math.PI / 2]), // light bar
  ]);
  const head = merge([
    ...[-1, 1].map((side) => box(0.36, 0.1, 0.1, [side * 0.55, 0.72, 1.8], [0, side * 0.3, 0])),
    ...[-1, 1].map((side) => box(0.16, 0.07, 0.05, [side * 0.5, 0.55, 1.9])), // fog lamps
  ]);
  const tail = merge([
    ...[-1, 1].map((side) => box(0.38, 0.09, 0.08, [side * 0.55, 0.84, -1.79])),
    box(1.02, 0.035, 0.03, [0, 0.9, -1.84]), // brake light strip
  ]);
  GEO.car = { paint, glass, dark, chrome, head, tail, wheel: wheelGeometry(0.33, 0.24) };
  return GEO.car;
}

function motorGeometries() {
  if (GEO.motor) return GEO.motor;
  const paint = merge([
    ball(0.22, [0, 0.79, 0.2], [0.88, 0.62, 1.45]), // tank
    box(0.26, 0.14, 0.42, [0, 0.74, -0.62], [0.2, 0, 0]), // tail
    box(0.2, 0.05, 0.38, [0, 0.62, -0.72], [0.35, 0, 0]), // rear fender
    box(0.34, 0.3, 0.5, [0, 0.62, 0.34], [0.5, 0, 0]), // front fairing
  ]);
  const dark = merge([
    box(0.3, 0.3, 0.46, [0, 0.44, 0.02]), // engine
    box(0.08, 0.08, 0.95, [0, 0.66, 0.02], [0.18, 0, 0]), // frame
    box(0.3, 0.09, 0.62, [0, 0.77, -0.27]), // seat
    ...[-1, 1].map((side) => box(0.05, 0.06, 0.62, [side * 0.09, 0.34, -0.32])), // swing arm
    // ---- spare parts ----
    ...[-1, 1].map((side) => box(0.19, 0.3, 0.34, [side * 0.35, 0.66, -0.5])), // side panniers
    box(0.3, 0.24, 0.3, [0, 0.92, -0.66]), // top box
    box(0.46, 0.04, 0.05, [0, 0.87, -0.76]), // rear rack
    box(0.09, 0.05, 0.46, [-0.17, 0.52, -0.24]), // chain guard
    box(0.06, 0.02, 0.22, [0, 0.55, -0.92]), // plate bracket
    box(0.24, 0.18, 0.02, [0, 0.6, -0.94]), // plate
  ]);
  const chrome = merge([
    ...[-1, 1].map((side) => cyl(0.1, 0.1, 0.04, 14, [side * 0.16, 0.44, 0.02], [0, 0, Math.PI / 2])),
    cyl(0.05, 0.065, 0.66, 12, [-0.17, 0.32, -0.38], [Math.PI / 2 - 0.12, 0, 0]), // exhaust
    // ---- spare parts ----
    ...[-1, 1].flatMap((side) => [
      cyl(0.02, 0.02, 0.34, 8, [side * 0.29, 0.8, -0.12], [0, 0, Math.PI / 2]), // mirror stalk
      box(0.03, 0.13, 0.04, [side * 0.4, 0.6, 0.2]), // crash bar
      cyl(0.15, 0.15, 0.02, 16, [side * 0.1, 0.31, -0.62], [0, 0, Math.PI / 2]), // brake disc
      box(0.2, 0.02, 0.03, [side * 0.16, 0.33, 0.02]), // foot peg
    ]),
    cyl(0.03, 0.03, 0.2, 8, [0.17, 0.4, -0.7], [Math.PI / 2, 0, 0]), // exhaust tip
    box(0.14, 0.03, 0.03, [0, 0.6, -0.5]), // exhaust heat shield
  ]);
  const tail = box(0.14, 0.06, 0.04, [0, 0.76, -0.84]);
  // steering assembly, origin at the front axle
  const steerPaint = box(0.16, 0.04, 0.5, [0, 0.34, 0.02], [-0.1, 0, 0]);
  const steerChrome = merge([-1, 1].map((side) => cyl(0.028, 0.028, 0.72, 10, [side * 0.085, 0.33, -0.13], [-0.37, 0, 0])));
  const steerDark = merge([
    cyl(0.022, 0.022, 0.72, 10, [0, 0.69, -0.27], [0, 0, Math.PI / 2]),
    ...[-1, 1].map((side) => cyl(0.032, 0.032, 0.12, 10, [side * 0.33, 0.69, -0.27], [0, 0, Math.PI / 2])),
    ball(0.1, [0, 0.55, -0.12], [1, 1, 1]),
  ]);
  const steerHead = cyl(0.075, 0.075, 0.03, 16, [0, 0.55, -0.03], [Math.PI / 2, 0, 0]);
  GEO.motor = { paint, dark, chrome, tail, steerPaint, steerChrome, steerDark, steerHead, wheel: wheelGeometry(0.3, 0.13) };
  return GEO.motor;
}

// Speedboat hull lofted through 14 stations: deep-V bottom, hard chine, flared bow with rising sheer,
// recessed cockpit with gunwales, wrap-around windshield, bow rail and an outboard engine.
function boatGeometries() {
  if (GEO.boat) return GEO.boat;
  const Z = [-2.1, -1.8, -1.4, -1.0, -0.6, -0.2, 0.2, 0.7, 1.1, 1.5, 1.85, 2.1, 2.3, 2.42];
  const st = Z.map((z) => {
    const t = (z + 2.1) / 4.52;
    const b = Math.max(0.002, 0.9 * (t < 0.5 ? 0.92 + 0.16 * t : Math.cos(((t - 0.5) / 0.5) * Math.PI * 0.5) ** 0.75));
    const d = 0.42 + 0.24 * t * t; // sheer line rises towards the bow
    const k = -0.34 + 0.56 * Math.max(0, (t - 0.55) / 0.45) ** 2; // keel sweeps up into the stem
    const c = Math.min(d - 0.08, k + 0.28);
    return { z, b, d, k, c, bc: b * 0.8 };
  });
  const FLOOR = 0.12;
  const IN = 0.14;
  const cockpit = st.slice(1, 8);
  const sideAt = (s, y, out = 1.012) => { const f = (y - s.c) / (s.d - s.c); return (s.bc + (s.b - s.bc) * f) * out; };
  const navy = loft(st.map((s) => [[-s.bc, s.c, s.z], [0, s.k, s.z], [s.bc, s.c, s.z]]));
  const s0 = st[0];
  const white = merge([
    loft(st.map((s) => [[s.bc, s.c, s.z], [s.b, s.d, s.z]])),
    loft(st.map((s) => [[-s.bc, s.c, s.z], [-s.b, s.d, s.z]])),
    loft([[[-s0.b, s0.d, s0.z], [-s0.bc, s0.c, s0.z], [0, s0.k, s0.z], [s0.bc, s0.c, s0.z], [s0.b, s0.d, s0.z]], [[-s0.b * 0.5, s0.d, s0.z], [-s0.bc * 0.5, s0.d, s0.z], [0, s0.d, s0.z], [s0.bc * 0.5, s0.d, s0.z], [s0.b * 0.5, s0.d, s0.z]]]), // transom
    loft(st.slice(0, 2).map((s) => [[-s.b, s.d, s.z], [s.b, s.d, s.z]])), // aft deck
    loft(st.slice(7).map((s) => [[-s.b, s.d, s.z], [0, s.d + 0.06, s.z], [s.b, s.d, s.z]])), // foredeck
    loft(cockpit.map((s) => [[s.b, s.d, s.z], [s.b - IN, s.d, s.z]])), // gunwale caps
    loft(cockpit.map((s) => [[-s.b, s.d, s.z], [-s.b + IN, s.d, s.z]])),
    box(0.5, 0.42, 0.3, [-0.3, FLOOR + 0.21, 0.5]), // helm console
  ]);
  const stripe = merge([
    loft(st.map((s) => [[sideAt(s, s.d - 0.05), s.d - 0.05, s.z], [sideAt(s, s.d - 0.13), s.d - 0.13, s.z]])),
    loft(st.map((s) => [[-sideAt(s, s.d - 0.05), s.d - 0.05, s.z], [-sideAt(s, s.d - 0.13), s.d - 0.13, s.z]])),
  ]);
  const wall = (s) => loft([[[-s.b + IN, FLOOR, s.z], [s.b - IN, FLOOR, s.z]], [[-s.b + IN, s.d, s.z], [s.b - IN, s.d, s.z]]]);
  const cream = merge([
    loft(cockpit.map((s) => [[s.b - IN, s.d, s.z], [s.b - IN, FLOOR, s.z]])), // inner walls
    loft(cockpit.map((s) => [[-s.b + IN, s.d, s.z], [-s.b + IN, FLOOR, s.z]])),
    wall(st[1]), wall(st[7]),
    ...[-1, 1].flatMap((side) => [box(0.42, 0.12, 0.4, [side * 0.3, FLOOR + 0.3, -0.3]), box(0.42, 0.4, 0.08, [side * 0.3, FLOOR + 0.5, -0.52], [-0.1, 0, 0])]),
    box(1.3, 0.22, 0.36, [0, FLOOR + 0.11, -1.52]), box(1.3, 0.3, 0.08, [0, FLOOR + 0.32, -1.7], [-0.1, 0, 0]),
  ]);
  const teak = loft(cockpit.map((s) => [[-s.b + IN, FLOOR, s.z], [s.b - IN, FLOOR, s.z]]));
  // wrap-around windshield
  const arc = Array.from({ length: 13 }, (_, j) => -Math.PI / 2 + (Math.PI * j) / 12);
  const glass = loft(arc.map((a) => [[0.74 * Math.sin(a), 0.48, 0.52 + 0.36 * Math.cos(a)], [0.66 * Math.sin(a), 0.9, 0.36 + 0.3 * Math.cos(a)]]));
  // bow rail following the sheer line
  const railPts = [...st.slice(8, 13).map((s) => new THREE.Vector3(-s.b * 0.9, s.d + 0.22, s.z)), ...st.slice(8, 13).reverse().map((s) => new THREE.Vector3(s.b * 0.9, s.d + 0.22, s.z))];
  const rail = place(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 28, 0.018, 6, false));
  const chrome = merge([
    rail,
    ...[8, 10, 12].flatMap((i) => [-1, 1].map((side) => cyl(0.014, 0.014, 0.22, 6, [side * st[i].b * 0.9, st[i].d + 0.11, st[i].z]))),
    loft(arc.map((a) => [[0.66 * Math.sin(a), 0.9, 0.36 + 0.3 * Math.cos(a)], [0.655 * Math.sin(a), 0.935, 0.35 + 0.3 * Math.cos(a)]])), // windshield rail
    ring(0.12, 0.02, [-0.3, FLOOR + 0.5, 0.3], [-0.9, 0, 0]), // helm wheel
    cyl(0.03, 0.03, 0.3, 8, [0.3, FLOOR + 0.12, -0.3]), cyl(0.03, 0.03, 0.3, 8, [-0.3, FLOOR + 0.12, -0.3]), // seat pedestals
    // ---- spare parts / deck hardware ----
    ...[1, 7, 11].flatMap((i) => [-1, 1].map((side) => cyl(0.022, 0.022, 0.14, 6, [side * st[i].b * 0.92, st[i].d + 0.02, st[i].z], [0, 0, Math.PI / 2]))), // cleats
    cyl(0.016, 0.016, 0.4, 6, [0.42, FLOOR + 0.62, 0.0], [0, 0, Math.PI / 2]), cyl(0.016, 0.016, 0.4, 6, [-0.42, FLOOR + 0.62, 0.0], [0, 0, Math.PI / 2]), // grab rails
    ...[-1, 1].map((side) => cyl(0.014, 0.014, 0.34, 6, [side * 0.62, FLOOR + 0.55, -0.2], [0.25, 0, 0])), // rod holders
    cyl(0.035, 0.035, 0.1, 8, [0, FLOOR + 0.55, 1.9], [Math.PI / 2, 0, 0]), // bow spotlight housing
    cyl(0.012, 0.012, 0.5, 6, [-0.55, FLOOR + 0.75, -1.2]), // antenna
    cyl(0.05, 0.06, 0.05, 10, [0.3, FLOOR + 0.52, 0.42], [0, 0, Math.PI / 2]), // horn
  ]);
  const dark = merge([
    ball(0.2, [0, 0.74, -2.3], [1, 1.2, 1.35]), // outboard cowl
    box(0.13, 0.8, 0.17, [0, 0.2, -2.32]), // leg
    box(0.3, 0.2, 0.16, [0, 0.46, -2.17]), // bracket
    box(0.02, 0.2, 0.26, [0, -0.2, -2.32]), // skeg
    box(0.24, 0.14, 0.02, [0, 0.62, -2.46]), // outboard plate
    box(0.2, 0.18, 0.02, [0.34, FLOOR + 0.28, -1.72]), // fuel cap / filler
  ]);
  // V-shaped wake trailing from the stern: RGBA vertex colours fade it out.
  const wake = new THREE.BufferGeometry();
  const pos = [];
  const col = [];
  [-1, 1].forEach((side) => {
    for (let i = 0; i <= 8; i += 1) {
      const dd = i / 8;
      const z = -2.05 - dd * 7;
      const x = side * (0.7 + dd * 2.6);
      const w = 0.25 + dd * 0.9;
      pos.push(x - side * w * 0.5, 0, z, x + side * w * 0.5, 0, z);
      const a = (1 - dd) * (1 - dd);
      col.push(1, 1, 1, a, 1, 1, 1, a * 0.6);
    }
  });
  const idx = [];
  for (let s = 0; s < 2; s += 1) for (let i = 0; i < 8; i += 1) { const a = s * 18 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  wake.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wake.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  wake.setIndex(idx);
  GEO.boat = { navy, white, stripe, cream, teak, glass, chrome, dark, wake };
  return GEO.boat;
}

// One paint material per body colour (shared by every vehicle of that colour).
const PAINTS = {};
function paintOf(hex, doubleSide = false) {
  const key = `${hex}${doubleSide ? 'd' : ''}`;
  if (!PAINTS[key]) PAINTS[key] = new THREE.MeshStandardMaterial({ color: hex, metalness: 0.6, roughness: 0.22, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
  return PAINTS[key];
}

const Part = ({ g, m, cast = true, ...rest }) => <mesh geometry={g} material={m} castShadow={cast} {...rest} />;

function ContactShadow({ w, l }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[w, l, 1]} renderOrder={1} material={mats().shadow}><circleGeometry args={[0.5, 24]} /></mesh>;
}

function CarModel({ parts, color }) {
  const M = mats();
  const G = useMemo(() => carGeometries(), []);
  const wheelAt = [[0.68, 1.05, true], [-0.68, 1.05, true], [0.68, -1.05, false], [-0.68, -1.05, false]];
  return <group>
    <ContactShadow w={1.9} l={3.9} />
    <Part g={G.paint} m={paintOf(color || '#c4122c')} />
    <Part g={G.dark} m={M.dark} cast={false} />
    <Part g={G.chrome} m={M.chrome} cast={false} />
    <Part g={G.head} m={M.head} cast={false} />
    <Part g={G.tail} m={M.tail} cast={false} />
    {wheelAt.map(([x, z, front], i) => <group key={i} position={[x, 0.33, z]} ref={(g) => { if (front) parts.current[`steer${i}`] = g; }}>
      <mesh geometry={G.wheel} material={M.wheel} ref={(g) => { parts.current[`spin${i}`] = g; }} />
    </group>)}
    <Part g={G.glass} m={M.glass} cast={false} renderOrder={3} />
  </group>;
}

function MotorModel({ parts, color }) {
  const M = mats();
  const G = useMemo(() => motorGeometries(), []);
  return <group>
    <ContactShadow w={0.7} l={1.9} />
    <Part g={G.paint} m={paintOf(color || '#1f6feb')} />
    <Part g={G.dark} m={M.dark} />
    <Part g={G.chrome} m={M.chrome} cast={false} />
    <Part g={G.tail} m={M.tail} cast={false} />
    <group position={[0, 0.3, -0.62]}><mesh geometry={G.wheel} material={M.wheel} ref={(g) => { parts.current.spin0 = g; }} /></group>
    <group position={[0, 0.3, 0.66]} ref={(g) => { parts.current.steer0 = g; }}>
      <mesh geometry={G.wheel} material={M.wheel} ref={(g) => { parts.current.spin1 = g; }} />
      <Part g={G.steerPaint} m={paintOf(color || '#1f6feb')} cast={false} />
      <Part g={G.steerChrome} m={M.chrome} cast={false} />
      <Part g={G.steerDark} m={M.dark} cast={false} />
      <Part g={G.steerHead} m={M.head} cast={false} />
    </group>
  </group>;
}

function BoatModel({ parts, color }) {
  const M = mats();
  const G = useMemo(() => boatGeometries(), []);
  const wakeMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), []);
  const sprayCount = 18;
  const sprayPos = useMemo(() => new Float32Array(sprayCount * 3), []);
  return <group>
    <Part g={G.navy} m={M.hullNavy} />
    <Part g={G.white} m={M.hullWhite} />
    <Part g={G.stripe} m={paintOf(color || '#e23b3b', true)} cast={false} />
    <Part g={G.cream} m={M.cream} cast={false} />
    <Part g={G.teak} m={M.teak} cast={false} />
    <Part g={G.chrome} m={M.chrome} cast={false} />
    <Part g={G.dark} m={M.dark} />
    <mesh position={[0.5, 0.6, 1.5]} material={M.navRed}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
    <mesh position={[-0.5, 0.6, 1.5]} material={M.navGreen}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
    <Part g={G.glass} m={M.glass} cast={false} renderOrder={3} />
    <mesh ref={(m) => { parts.current.wake = m; }} geometry={G.wake} material={wakeMat} position={[0, -0.02, 0]} renderOrder={2} />
    <points ref={(pt) => { parts.current.spray = pt; }} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[sprayPos, 3]} count={sprayCount} itemSize={3} /></bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.16} sizeAttenuation transparent opacity={0} depthWrite={false} />
    </points>
  </group>;
}

function VehicleBody({ vehicle, controlRef }) {
  const group = useRef(null);
  const marker = useRef(null);
  const parts = useRef({});
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // Vehicles far from the player are not drawn (they keep their place in the simulation).
    const lp = controlRef?.current?.pos;
    const near = !lp || Math.hypot(vehicle.pos[0] - lp[0], vehicle.pos[1] - lp[1]) < 85;
    g.visible = near;
    if (!near) { if (marker.current) marker.current.visible = false; return; }
    g.rotation.order = 'YXZ';
    g.position.set(vehicle.pos[0], vehicle.y, vehicle.pos[1]);
    g.rotation.set(vehicle.pitch, vehicle.yaw, vehicle.roll);
    const p = parts.current;
    for (let i = 0; i < 4; i += 1) {
      if (p[`spin${i}`]) p[`spin${i}`].rotation.x = vehicle.wheel;
      if (p[`steer${i}`]) p[`steer${i}`].rotation.y = -vehicle.steer * 0.5;
    }
    // "Ride me" beacon above a free vehicle.
    if (marker.current) {
      const free = controlRef?.current?.vehicle !== vehicle;
      marker.current.visible = free;
      if (free) {
        marker.current.position.set(vehicle.pos[0], vehicle.y + (vehicle.type === 'motor' ? 1.75 : 2.05) + Math.sin(t * 3) * 0.12, vehicle.pos[1]);
        marker.current.rotation.y = t * 1.6;
      }
    }
    if (vehicle.type === 'boat') {
      const ratio = Math.min(1, Math.abs(vehicle.speed) / VEHICLE_TYPES.boat.maxSpeed);
      if (p.wake) p.wake.material.opacity = ratio * 0.85;
      if (p.spray) {
        const arr = p.spray.geometry.attributes.position.array;
        for (let i = 0; i < arr.length / 3; i += 1) {
          const ph = (t * 2.6 + i * 0.37) % 1;
          const side = i % 2 ? 1 : -1;
          arr[i * 3] = side * (0.35 + ph * 1.1);
          arr[i * 3 + 1] = 0.05 + Math.sin(ph * Math.PI) * 0.55 * ratio;
          arr[i * 3 + 2] = 1.6 - ph * 1.4;
        }
        p.spray.geometry.attributes.position.needsUpdate = true;
        p.spray.material.opacity = ratio > 0.25 ? (ratio - 0.25) * 1.1 : 0;
      }
    }
  });
  return <>
    <group ref={group}><group scale={VEHICLE_SCALE}>
      {vehicle.type === 'car' ? <CarModel parts={parts} color={vehicle.color} /> : vehicle.type === 'motor' ? <MotorModel parts={parts} color={vehicle.color} /> : <BoatModel parts={parts} color={vehicle.color} />}
    </group></group>
    <group ref={marker}>
      <mesh rotation={[Math.PI, 0, 0]} material={mats().marker}><coneGeometry args={[0.2, 0.42, 4]} /></mesh>
      <mesh position={[0, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats().marker}><ringGeometry args={[0.26, 0.31, 20]} /></mesh>
    </group>
  </>;
}

export function VehiclesLayer({ vehicles, controlRef }) {
  return vehicles.map((vehicle) => <VehicleBody key={vehicle.id} vehicle={vehicle} controlRef={controlRef} />);
}
