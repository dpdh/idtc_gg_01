import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { SAFE_ZONES, WORLD_OBJECTS } from '../../game/engine/worldRules';
import Ocean, { Beach, oceanHeight, oceanSlope } from './Ocean';
import { groundMaterial } from './Materials';
import TreeInstances from './Trees';
import { VEHICLE_SPOTS } from './Vehicles';

// Procedural scenery for the non-Monas environments. All repeated props are InstancedMeshes (one draw call
// per prop type) and are scattered with a seeded RNG that keeps every mission object, Energy Core, landmark
// and the two cross-shaped walkways clear, so the shared mission scenario stays fully playable.

const PICKUPS = [[5, -7.5], [-7.5, 7.5], [7, 0], [-7, -5], [6.25, 7.5], [-2, -7], [8, 5], [-8, 0], [3, 8], [-6, 7]];
const LANDMARK_POINTS = [[0, 7.5], [-7.5, -7.5], [7, 6], [-7, 3], [6, -7]];
const CLEAR = [
  ...WORLD_OBJECTS.map((o) => o.position),
  ...PICKUPS,
  ...LANDMARK_POINTS,
  ...SAFE_ZONES.map((z) => z.center),
  [0, 8], [-6, 33], // spawn & respawn
  ...VEHICLE_SPOTS.map((v) => v.pos), // vehicle parking
];

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(seed, count, { rMin, rMax, gap = 3.6, roads = 3, extra = [] }) {
  const rand = rng(seed);
  const out = [];
  const clear = [...CLEAR, ...extra];
  for (let tries = 0; out.length < count && tries < count * 60; tries += 1) {
    const a = rand() * Math.PI * 2;
    const r = rMin + Math.sqrt(rand()) * (rMax - rMin);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (roads && (Math.abs(x) < roads || Math.abs(z) < roads)) continue;
    if (clear.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < gap)) continue;
    if (out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < gap * 0.7)) continue;
    out.push([x, z, rand(), rand()]);
  }
  return out;
}

function Instances({ items, geometry, material, place, colors, shadow = false }) {
  const mesh = useRef(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(item, dummy, i);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (colors) m.setColorAt(i, color.set(colors(item, i)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow={shadow} />;
}

const useGeo = (factory) => useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps

// Instanced mesh whose matrices are rewritten every frame (cars, birds, drones…) — still one draw call.
function MovingInstances({ count, geometry, material, update, colors }) {
  const mesh = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m || !colors) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) m.setColorAt(i, c.set(colors(i)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      update(i, dummy, clock.elapsedTime);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// Sky life for every environment: drifting clouds and a few birds circling (2 draw calls).
export function AmbientSky({ cloudColor = '#ffffff', birds = true, cloudHeight = 46 }) {
  const cloudGeo = useGeo(() => new THREE.IcosahedronGeometry(1, 1));
  const cloudMat = useGeo(() => new THREE.MeshStandardMaterial({ color: cloudColor, roughness: 1, flatShading: true, transparent: true, opacity: 0.92, fog: false }));
  const birdGeo = useGeo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -0.55, 0.12, -0.1, 0, 0, -0.05, 0, 0, 0.25, 0.55, 0.12, -0.1, 0, 0, -0.05], 3)); g.computeVertexNormals(); return g; });
  const birdMat = useGeo(() => new THREE.MeshBasicMaterial({ color: '#2b3340', side: THREE.DoubleSide }));
  const clouds = useMemo(() => Array.from({ length: 30 }, (_, i) => { const r = rng(900 + i); return { x: (r() - 0.5) * 260, z: (r() - 0.5) * 260, y: cloudHeight + r() * 14, s: 4 + r() * 6, k: i % 3 }; }), [cloudHeight]);
  return <>
    <MovingInstances count={clouds.length} geometry={cloudGeo} material={cloudMat} update={(i, d, t) => {
      const c = clouds[i]; const x = ((c.x + t * 1.2 + 130) % 260) - 130;
      d.position.set(x + (c.k - 1) * c.s * 0.9, c.y + (c.k === 1 ? c.s * 0.25 : 0), c.z); d.scale.set(c.s * (c.k === 1 ? 1.3 : 1), c.s * 0.45, c.s * 0.8);
    }} />
    {birds ? <MovingInstances count={9} geometry={birdGeo} material={birdMat} update={(i, d, t) => {
      const a = t * 0.25 + i * 0.32; const r = 30 + (i % 3) * 3;
      d.position.set(Math.cos(a) * r + 6, 20 + (i % 4) * 0.8 + Math.sin(t * 2 + i) * 0.4, Math.sin(a) * r - 4);
      d.rotation.set(Math.sin(t * 9 + i) * 0.35, -a, 0); d.scale.setScalar(1.3);
    }} /> : null}
  </>;
}

// ----------------------------------------------------------------------------- Smart City
function SmartCity() {
  // (details: SmartCityLife)
  const buildings = useMemo(() => scatter(11, 110, { rMin: 13, rMax: 78, gap: 4.6, roads: 3.4 }), []);
  const trees = useMemo(() => scatter(12, 50, { rMin: 11, rMax: 60, gap: 3.2, roads: 2.6, extra: buildings }), [buildings]);
  const box = useGeo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const glass = useGeo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.28 }));
  const roofLight = useGeo(() => new THREE.MeshBasicMaterial({ color: '#7fe7ff' }));
  const asphalt = useGeo(() => groundMaterial('asphalt', [1.25, 37.5], { color: '#9aa3b5' }));
  const plaza = useGeo(() => groundMaterial('concrete', [5.5, 5.5], { color: '#aab4c6', roughness: 0.55 }));
  const palette = ['#9fb7d6', '#6f8fb8', '#b9c9dc', '#5e7d9e', '#8aa6c4', '#c7d6e6', '#4f6f93'];
  const ring = useRef(null);
  const beacon = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.5;
    if (beacon.current) beacon.current.material.opacity = 0.55 + Math.sin(t * 3) * 0.35;
  });
  const size = (b) => 2.4 + b[2] * 3.2;
  const tall = (b) => 4 + Math.pow(b[3], 1.6) * (Math.hypot(b[0], b[1]) > 40 ? 28 : 16);
  return <>
    <gridHelper args={[300, 75, '#3fd0ff', '#2a4565']} position={[0, 0.01, 0]} />
    {/* Walkways (the shared mission route) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><planeGeometry args={[5, 150]} /><primitive object={asphalt} attach="material" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.021, 0]}><planeGeometry args={[5, 150]} /><primitive object={asphalt} attach="material" /></mesh>
    {/* Plaza + Twin Hub tower (same footprint as the Monas tower: solid within ±5.8) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><circleGeometry args={[11, 48]} /><primitive object={plaza} attach="material" /></mesh>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><ringGeometry args={[9.6, 10.1, 64, 1, 0, Math.PI * 1.5]} /><meshBasicMaterial color="#5fd3ff" transparent opacity={0.85} /></mesh>
    <mesh position={[0, 0.6, 0]}><boxGeometry args={[11, 1.2, 11]} /><meshStandardMaterial color="#26324a" metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, 10, 0]}><boxGeometry args={[6.2, 18, 6.2]} /><meshStandardMaterial color="#9db8d8" metalness={0.7} roughness={0.18} /></mesh>
    <mesh position={[0, 23, 0]}><boxGeometry args={[4.2, 8, 4.2]} /><meshStandardMaterial color="#b8cde6" metalness={0.7} roughness={0.15} /></mesh>
    {[3, 6, 9, 12, 15, 18, 21, 24].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[y > 19 ? 4.35 : 6.35, 0.25, y > 19 ? 4.35 : 6.35]} /><meshBasicMaterial color="#5fd3ff" /></mesh>)}
    <mesh position={[0, 30, 0]}><cylinderGeometry args={[0.15, 0.6, 6, 12]} /><meshStandardMaterial color="#dfe9f5" metalness={0.8} roughness={0.2} /></mesh>
    <mesh ref={beacon} position={[0, 33.2, 0]}><sphereGeometry args={[0.7, 16, 12]} /><meshBasicMaterial color="#ffd56e" transparent opacity={0.8} /></mesh>
    <Instances items={buildings} geometry={box} material={glass} place={(b, d) => { const s = size(b); d.position.set(b[0], 0, b[1]); d.scale.set(s, tall(b), s * (0.8 + b[3] * 0.4)); d.rotation.y = Math.round(b[2] * 4) * (Math.PI / 2); }} colors={(b, i) => palette[i % palette.length]} shadow />
    <Instances items={buildings} geometry={box} material={roofLight} place={(b, d) => { const s = size(b); d.position.set(b[0], tall(b), b[1]); d.scale.set(s * 0.5, 0.2, s * 0.5); }} />
    <TreeInstances items={trees} kind="broadleaf" size={0.82} />
    <SmartCityLife buildings={buildings} size={size} tall={tall} />
  </>;
}

function SmartCityLife({ buildings, size, tall }) {
  const box = useGeo(() => new THREE.BoxGeometry(1, 1, 1));
  const windows = useGeo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
  const carBody = useGeo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.3 }));
  const lampPole = useGeo(() => new THREE.MeshStandardMaterial({ color: '#2b3a4c', metalness: 0.8, roughness: 0.25 }));
  const lampHead = useGeo(() => new THREE.MeshBasicMaterial({ color: '#bff3ff' }));
  const droneMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#e9f1f7', metalness: 0.5, roughness: 0.3, emissive: '#5fd3ff', emissiveIntensity: 0.6 }));
  const billMat = useGeo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  // Window light bands on every building (two per building).
  const bands = useMemo(() => buildings.flatMap((b, i) => [0.35, 0.7].map((f) => ({ b, f, i }))), [buildings]);
  const neon = ['#7fe7ff', '#ffd56e', '#ff8fd8', '#a7ff9f', '#c6a7ff'];
  // Lamps along both walkways.
  const lamps = useMemo(() => { const out = []; for (let k = -64; k <= 64; k += 8) { if (Math.abs(k) < 12) continue; out.push([3.2, k], [-3.2, k], [k, 3.2], [k, -3.2]); } return out; }, []);
  const billboards = useMemo(() => buildings.filter((b) => tall(b) > 12).slice(0, 10), [buildings, tall]);
  const ringRoad = useGeo(() => groundMaterial('asphalt', [45, 45], { color: '#7f8796' }));
  const carColors = ['#ff5a5f', '#ffd166', '#06d6a0', '#118ab2', '#f7f7f7', '#ef476f', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b', '#e9f1f7', '#2ec4b6'];
  return <>
    <Instances items={bands} geometry={box} material={windows} place={({ b, f }, d) => { const s = size(b); const h = tall(b); d.position.set(b[0], h * f, b[1]); d.scale.set(s * 1.02, Math.max(0.25, h * 0.06), s * (0.8 + b[3] * 0.4) * 1.02); d.rotation.y = Math.round(b[2] * 4) * (Math.PI / 2); }} colors={({ i, f }) => neon[(i + (f > 0.5 ? 2 : 0)) % neon.length]} />
    <Instances items={lamps} geometry={box} material={lampPole} place={(l, d) => { d.position.set(l[0], 1.6, l[1]); d.scale.set(0.1, 3.2, 0.1); }} />
    <Instances items={lamps} geometry={box} material={lampHead} place={(l, d) => { d.position.set(l[0], 3.25, l[1]); d.scale.set(0.5, 0.1, 0.5); }} />
    <Instances items={billboards} geometry={box} material={billMat} place={(b, d) => { const s = size(b); d.position.set(b[0] + s * 0.52, tall(b) * 0.82, b[1]); d.scale.set(0.05, 2.2, s * 0.8); d.rotation.y = Math.round(b[2] * 4) * (Math.PI / 2); }} colors={(b, i) => neon[i % neon.length]} />
    {/* Outer ring road with traffic */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[84, 90, 96]} /><primitive object={ringRoad} attach="material" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[86.9, 87.1, 96]} /><meshBasicMaterial color="#ffd56e" /></mesh>
    <MovingInstances count={12} geometry={box} material={carBody} colors={(i) => carColors[i]} update={(i, d, t) => {
      const lane = i % 2 ? 85.5 : 88.5; const dir = i % 2 ? 1 : -1; const a = dir * t * (7 / lane) + (i / 12) * Math.PI * 2;
      d.position.set(Math.cos(a) * lane, 0.45, Math.sin(a) * lane); d.rotation.y = -a + (dir > 0 ? 0 : Math.PI); d.scale.set(1.1, 0.7, 2.3);
    }} />
    {/* Drones circling the Twin Hub */}
    <MovingInstances count={5} geometry={box} material={droneMat} update={(i, d, t) => {
      const a = t * 0.6 + (i / 5) * Math.PI * 2; const r = 9 + (i % 2) * 3;
      d.position.set(Math.cos(a) * r, 14 + i * 2.2 + Math.sin(t * 2 + i) * 0.5, Math.sin(a) * r); d.rotation.y = -a; d.scale.set(0.7, 0.18, 0.7);
    }} />
  </>;
}

// ----------------------------------------------------------------------------- Coastal
function Coastal({ skyColor, sunIntensity }) {
  const palms = useMemo(() => scatter(21, 80, { rMin: 12, rMax: 47, gap: 3.4, roads: 2.6 }), []);
  const huts = useMemo(() => scatter(22, 14, { rMin: 20, rMax: 44, gap: 5, roads: 3, extra: palms }), [palms]);
  const hutGeo = useGeo(() => new THREE.BoxGeometry(2.6, 1.8, 2.6).translate(0, 0.9, 0));
  const hutMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#d8b98a', roughness: 0.8 }));
  const roofGeo = useGeo(() => new THREE.ConeGeometry(2.3, 1.4, 4).rotateY(Math.PI / 4).translate(0, 2.5, 0));
  const roofMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#c0603f', roughness: 0.7 }));
  const beam = useRef(null);
  const boardZ = useGeo(() => groundMaterial('wood', [1, 42]));
  const boardX = useGeo(() => groundMaterial('wood', [42, 1], { rotate: Math.PI / 2 }));
  const pierWood = useGeo(() => groundMaterial('wood', [1, 12.5], { color: '#d8c4ae' }));
  const boats = useRef([]);
  const mooring = [[-9, -62], [8, -70], [-4, -78]];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (beam.current) beam.current.rotation.y = t * 0.8;
    // Moored sailboats ride the same waves as the shader surface.
    boats.current.forEach((b, i) => {
      if (!b) return;
      const [x, z] = mooring[i];
      const [sx, sz] = oceanSlope(x, z, t);
      b.position.y = oceanHeight(x, z, t);
      b.rotation.x = Math.atan(sz) * 0.9;
      b.rotation.z = -Math.atan(sx) * 0.9;
    });
  });
  return <>
    <Ocean skyColor={skyColor} sunIntensity={sunIntensity} />
    <Beach />
    {/* Boardwalk cross (mission route) */}
    <mesh position={[0, 0.06, 0]}><boxGeometry args={[4, 0.12, 100]} /><primitive object={boardZ} attach="material" /></mesh>
    <mesh position={[0, 0.07, 0]}><boxGeometry args={[100, 0.12, 4]} /><primitive object={boardX} attach="material" /></mesh>
    {/* Pier into the sea */}
    <mesh position={[0, 0.25, -66]}><boxGeometry args={[4, 0.3, 30]} /><primitive object={pierWood} attach="material" /></mesh>
    {[-1, 1].map((s) => [52, 58, 64, 70, 76].map((z) => <mesh key={`${s}-${z}`} position={[s * 1.8, -0.6, -z]}><cylinderGeometry args={[0.18, 0.18, 1.8, 8]} /><meshStandardMaterial color="#6e4d2f" /></mesh>))}
    {mooring.map(([x, z], i) => <group key={i} ref={(g) => { boats.current[i] = g; }} position={[x, 0, z]}>
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[1.6, 0.6, 4]} /><meshStandardMaterial color={['#e9f1f7', '#ffcf6e', '#ff8a7a'][i]} roughness={0.5} /></mesh>
      <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.05, 0.05, 3.2, 6]} /><meshStandardMaterial color="#5a4630" /></mesh>
      <mesh position={[0.6, 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.4, 2.6]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
    </group>)}
    {/* Lighthouse (solid footprint ±5.8) */}
    <mesh position={[0, 1, 0]}><cylinderGeometry args={[6, 6.8, 2, 10]} /><meshStandardMaterial color="#7e8a92" roughness={0.95} flatShading /></mesh>
    <mesh position={[0, 9, 0]}><cylinderGeometry args={[1.7, 2.6, 14, 24]} /><meshStandardMaterial color="#f4f4f0" roughness={0.5} /></mesh>
    {[4.5, 9, 13.5].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[2.62 - y * 0.065, 2.68 - y * 0.065, 1.6, 24]} /><meshStandardMaterial color="#d94a3d" roughness={0.5} /></mesh>)}
    <mesh position={[0, 16.6, 0]}><cylinderGeometry args={[1.5, 1.5, 1.8, 16]} /><meshBasicMaterial color="#fff2b0" /></mesh>
    <mesh position={[0, 18, 0]}><coneGeometry args={[1.9, 1.6, 16]} /><meshStandardMaterial color="#2c3e50" metalness={0.5} /></mesh>
    <group ref={beam} position={[0, 16.6, 0]}><mesh rotation={[0, 0, Math.PI / 2]} position={[9, 0, 0]}><coneGeometry args={[2.4, 18, 16, 1, true]} /><meshBasicMaterial color="#fff6c8" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} /></mesh></group>
    <TreeInstances items={palms} kind="palm" size={1.05} tilt={0.3} />
    <Instances items={huts} geometry={hutGeo} material={hutMat} place={(h, d) => { d.position.set(h[0], 0, h[1]); d.rotation.y = h[2] * 6.28; }} shadow />
    <Instances items={huts} geometry={roofGeo} material={roofMat} place={(h, d) => { d.position.set(h[0], 0, h[1]); d.rotation.y = h[2] * 6.28; }} shadow />
    <CoastalLife palms={palms} huts={huts} />
  </>;
}

function CoastalLife({ palms, huts }) {
  const umbrellas = useMemo(() => scatter(23, 18, { rMin: 36, rMax: 48, gap: 3.4, roads: 3, extra: [...palms, ...huts] }), [palms, huts]);
  const rocks = useMemo(() => Array.from({ length: 26 }, (_, i) => { const r = rng(400 + i); const a = (i / 26) * Math.PI * 2 + r() * 0.2; const d = 51 + r() * 4; return [Math.cos(a) * d, Math.sin(a) * d, r(), r()]; }), []);
  const poleGeo = useGeo(() => new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6).translate(0, 1.2, 0));
  const poleMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.5 }));
  const canopyGeo = useGeo(() => new THREE.ConeGeometry(1.4, 0.6, 8).translate(0, 2.5, 0));
  const canopyMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  const towelGeo = useGeo(() => new THREE.BoxGeometry(0.9, 0.04, 1.8).translate(0.9, 0.03, 0));
  const rockGeo = useGeo(() => new THREE.DodecahedronGeometry(1, 0));
  const rockMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#7e8a92', roughness: 0.95, flatShading: true }));
  const buoyGeo = useGeo(() => new THREE.SphereGeometry(0.45, 12, 8));
  const buoyMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#ff6b3d', roughness: 0.5, emissive: '#7a2a10', emissiveIntensity: 0.3 }));
  const towerMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#eef3f8', metalness: 0.4, roughness: 0.3 }));
  const bladeMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.2, roughness: 0.4 }));
  const blades = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    blades.current.forEach((b, i) => { if (b) b.rotation.z = t * (1.4 + i * 0.2); });
  });
  const stripes = ['#ff5a5f', '#ffd166', '#06d6a0', '#3a86ff', '#ff8fd8', '#fb5607'];
  const turbines = [[62, 34], [70, 12], [64, -10]];
  return <>
    <Instances items={umbrellas} geometry={poleGeo} material={poleMat} place={(u, d) => { d.position.set(u[0], 0, u[1]); d.rotation.z = (u[2] - 0.5) * 0.2; }} />
    <Instances items={umbrellas} geometry={canopyGeo} material={canopyMat} place={(u, d) => { d.position.set(u[0], 0, u[1]); d.rotation.set(0, u[3] * 6.28, (u[2] - 0.5) * 0.2); }} colors={(u, i) => stripes[i % stripes.length]} />
    <Instances items={umbrellas} geometry={towelGeo} material={canopyMat} place={(u, d) => { d.position.set(u[0], 0, u[1]); d.rotation.y = u[3] * 6.28; }} colors={(u, i) => stripes[(i + 3) % stripes.length]} />
    <Instances items={rocks} geometry={rockGeo} material={rockMat} place={(r, d) => { d.position.set(r[0], 0.2 - Math.max(0, Math.hypot(r[0], r[1]) - 52) * 0.12, r[1]); d.scale.set(1 + r[2] * 1.6, 0.6 + r[3] * 0.9, 1 + r[3] * 1.4); d.rotation.set(r[2], r[3] * 6, 0); }} shadow />
    <MovingInstances count={6} geometry={buoyGeo} material={buoyMat} update={(i, d, t) => { const a = (i / 6) * Math.PI * 2 + 0.4; const x = Math.cos(a) * 66; const z = Math.sin(a) * 66; d.position.set(x, oceanHeight(x, z, t) + 0.12, z); }} />
    {turbines.map(([x, z], i) => <group key={i} position={[x, 0, z]}>
      <mesh position={[0, 7, 0]}><cylinderGeometry args={[0.25, 0.5, 14, 10]} /><primitive object={towerMat} attach="material" /></mesh>
      <mesh position={[0, 14.1, 0.3]}><boxGeometry args={[0.7, 0.6, 1.4]} /><primitive object={towerMat} attach="material" /></mesh>
      <group ref={(g) => { blades.current[i] = g; }} position={[0, 14.1, 1.05]}>
        {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI * 2) / 3]} position={[0, 0, 0]}><boxGeometry args={[0.35, 5.5, 0.08]} /><primitive object={bladeMat} attach="material" /></mesh>)}
      </group>
    </group>)}
  </>;
}

// ----------------------------------------------------------------------------- Highland
function Highland() {
  const pines = useMemo(() => scatter(31, 170, { rMin: 12, rMax: 80, gap: 3.2, roads: 2.6, extra: [[-48, 42]] }), []);
  const rocks = useMemo(() => scatter(32, 34, { rMin: 12, rMax: 60, gap: 3, roads: 2.6, extra: pines }), [pines]);
  const hills = useMemo(() => Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.2; const r = 70 + (i % 5) * 9; return [Math.cos(a) * r, Math.sin(a) * r, (i * 37 % 10) / 10, (i * 53 % 10) / 10]; }), []);
  const peaks = useMemo(() => Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2 + 0.3; return [Math.cos(a) * 128, Math.sin(a) * 128, (i * 29 % 10) / 10, 0]; }), []);
  const rockGeo = useGeo(() => new THREE.DodecahedronGeometry(0.8, 0));
  const rockMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#8d9297', roughness: 0.95, flatShading: true }));
  const hillGeo = useGeo(() => new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const hillMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#5c9a4c', roughness: 0.95, flatShading: true }));
  const peakGeo = useGeo(() => new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0));
  const peakMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#7a8a8f', roughness: 0.9, flatShading: true }));
  const snowGeo = useGeo(() => new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0));
  const snowMat = useGeo(() => new THREE.MeshStandardMaterial({ color: '#f4f8fb', roughness: 0.6, flatShading: true }));
  const trail = useGeo(() => groundMaterial('dirt', [1, 42]));
  const lake = useGeo(() => new THREE.MeshStandardMaterial({ color: '#2c6a86', roughness: 0.07, metalness: 0.35 }));
  const dome = useRef(null);
  useFrame(({ clock }) => { if (dome.current) dome.current.rotation.y = clock.elapsedTime * 0.15; });
  return <>
    {/* Dirt trails (mission route) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><planeGeometry args={[3.6, 150]} /><primitive object={trail} attach="material" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.021, 0]}><planeGeometry args={[3.6, 150]} /><primitive object={trail} attach="material" /></mesh>
    {/* Lake */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-48, 0.03, 42]}><circleGeometry args={[10, 40]} /><primitive object={lake} attach="material" /></mesh>
    {/* Observatory (solid footprint ±5.8) */}
    <mesh position={[0, 1, 0]}><cylinderGeometry args={[6.2, 6.8, 2, 12]} /><meshStandardMaterial color="#9a9a8f" roughness={0.95} flatShading /></mesh>
    <mesh position={[0, 4, 0]}><cylinderGeometry args={[4, 4, 4, 24]} /><meshStandardMaterial color="#eef1f3" roughness={0.45} /></mesh>
    <group ref={dome} position={[0, 6, 0]}>
      <mesh><sphereGeometry args={[4.1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c9d3db" metalness={0.75} roughness={0.25} /></mesh>
      <mesh position={[0, 2.2, 2.6]} rotation={[0.7, 0, 0]}><cylinderGeometry args={[0.55, 0.7, 4.2, 12]} /><meshStandardMaterial color="#2d3a46" metalness={0.6} /></mesh>
    </group>
    <Instances items={hills} geometry={hillGeo} material={hillMat} place={(h, d) => { d.position.set(h[0], -0.5, h[1]); d.scale.set(14 + h[2] * 14, 6 + h[3] * 10, 14 + h[3] * 12); }} />
    <Instances items={peaks} geometry={peakGeo} material={peakMat} place={(p, d) => { d.position.set(p[0], -1, p[1]); d.scale.set(26 + p[2] * 10, 40 + p[2] * 26, 26 + p[2] * 10); }} />
    <Instances items={peaks} geometry={snowGeo} material={snowMat} place={(p, d) => { const h = 40 + p[2] * 26; d.position.set(p[0], -1 + h * 0.62, p[1]); d.scale.set((26 + p[2] * 10) * 0.39, h * 0.4, (26 + p[2] * 10) * 0.39); }} />
    <TreeInstances items={pines} kind="pine" size={1.1} vary={0.7} />
    <Instances items={rocks} geometry={rockGeo} material={rockMat} place={(r, d) => { d.position.set(r[0], 0.3, r[1]); d.scale.set(0.6 + r[2], 0.5 + r[3] * 0.6, 0.6 + r[3]); d.rotation.set(r[2], r[3] * 6, 0); }} shadow />
    <HighlandLife pines={pines} />
  </>;
}

function HighlandLife({ pines }) {
  const flowers = useMemo(() => scatter(33, 260, { rMin: 6, rMax: 70, gap: 1.6, roads: 2.2, extra: pines }), [pines]);
  const grass = useMemo(() => scatter(34, 320, { rMin: 6, rMax: 75, gap: 1.2, roads: 2.0 }), []);
  const fence = useMemo(() => { const out = []; for (let k = -68; k <= 68; k += 2.4) { if (Math.abs(k) < 11) continue; out.push([2.3, k], [-2.3, k], [k, 2.3], [k, -2.3]); } return out; }, []);
  const wheel = useRef(null);
  useFrame(({ clock }) => { if (wheel.current) wheel.current.rotation.x = clock.elapsedTime * 0.8; });
  const petals = ['#ff6b8a', '#ffd166', '#ffffff', '#c6a7ff', '#ff9f43', '#7fd3ff'];
  return <>
    <Instances items={flowers} geometry={flowerGeo} material={flowerMat} place={(f, d) => { d.position.set(f[0], 0.18, f[1]); d.scale.setScalar(0.8 + f[2] * 0.8); }} colors={(f, i) => petals[i % petals.length]} />
    <Instances items={grass} geometry={grassGeo} material={grassMat} place={(g, d) => { d.position.set(g[0], 0, g[1]); d.scale.set(1, 0.7 + g[2] * 0.9, 1); d.rotation.y = g[3] * 6; }} />
    <Instances items={fence} geometry={postGeo} material={woodMat} place={(p, d) => { d.position.set(p[0], 0, p[1]); }} />
    {/* Lake details: dock, rocks and a mikrohidro water wheel */}
    <mesh position={[-40.5, 0.18, 38]} rotation={[0, 0.5, 0]}><boxGeometry args={[1.6, 0.14, 6]} /><primitive object={woodMat} attach="material" /></mesh>
    {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <mesh key={i} position={[-48 + Math.cos(a) * 10.4, 0.2, 42 + Math.sin(a) * 10.4]} scale={[0.9 + (i % 3) * 0.3, 0.5, 0.8]}><dodecahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color="#8d9297" roughness={0.95} flatShading /></mesh>; })}
    <group position={[-37, 1.6, 47]}>
      <mesh position={[0, 0.2, -0.9]}><boxGeometry args={[2.4, 2.2, 0.3]} /><primitive object={woodMat} attach="material" /></mesh>
      <group ref={wheel}>{[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} rotation={[(k * Math.PI) / 6, 0, 0]}><boxGeometry args={[0.25, 3.0, 0.3]} /><primitive object={woodMat} attach="material" /></mesh>)}
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[1.4, 0.08, 6, 24]} /><primitive object={woodMat} attach="material" /></mesh></group>
    </group>
  </>;
}

export default function EnvironmentScene({ id, skyColor, sunIntensity }) {
  if (id === 'smartcity') return <><SmartCity /><AmbientSky cloudColor="#dfe8f5" birds={false} cloudHeight={52} /></>;
  if (id === 'coastal') return <><Coastal skyColor={skyColor} sunIntensity={sunIntensity} /><AmbientSky /></>;
  if (id === 'highland') return <><Highland /><AmbientSky cloudHeight={40} /></>;
  return null;
}
