import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, OrbitControls, quietExpoGL, useAnimations, useFrame, useGLTF, useThree } from '../../viewer/components/ThreeDRenderer';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { getGLTFFrame } from '../../viewer/utils/glbBounds';
import { glbSourceFor } from '../../viewer/utils/glbSource';
import { MONAS_MAP_DATA } from '../data/monasMap';
// Kept outside the Monas tower footprint (±5.6) so every item stays reachable.
// Twini at half the old size (~1.2 units) so the 30-unit Monas reads at a more realistic scale.
export const CHARACTER_SCALE = 0.5;
// Locomotion (units / second). Movement is integrated inside the render loop from a shared control ref,
// so walking is frame-synced and never waits for a React re-render.
export const WALK_SPEED = 2.6;
export const RUN_SPEED = 4.8;
const STICK_DEAD = 0.08;    // ignore tiny thumb jitter
const STICK_FULL = 0.78;    // full speed already at ~80 % deflection (easy on small screens)
const WORLD_LIMIT = 138;
const shortestAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Procedural gold matcap (no env map / PMREM needed, safe on every mobile GPU): warm body, bright
// specular hot-spot, sky reflection on top and a dark bronze rim → reads as polished, shiny gold.
function makeGoldMatcap() {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  const L = new THREE.Vector3(-0.45, 0.65, 0.62).normalize();
  const L2 = new THREE.Vector3(0.7, -0.2, 0.68).normalize();
  const H = L.clone().add(new THREE.Vector3(0, 0, 1)).normalize();
  const H2 = L2.clone().add(new THREE.Vector3(0, 0, 1)).normalize();
  const n = new THREE.Vector3();
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const u = (x / (N - 1)) * 2 - 1;
      const v = (y / (N - 1)) * 2 - 1;
      const r2 = Math.min(1, u * u + v * v);
      n.set(u, v, Math.sqrt(1 - r2));
      const diff = Math.max(0, n.dot(L));
      const spec = Math.pow(Math.max(0, n.dot(H)), 60) * 1.6 + Math.pow(Math.max(0, n.dot(H2)), 28) * 0.55;
      const sky = Math.max(0, n.y) * 0.35;
      const rim = Math.pow(1 - n.z, 2.2);
      const base = 0.22 + diff * 0.95 + sky;
      let R = 1.0 * base + spec - rim * 0.35;
      let G = 0.74 * base + spec * 0.95 - rim * 0.3;
      let B = 0.26 * base + spec * 0.75 - rim * 0.15;
      const i = (y * N + x) * 4;
      data[i] = Math.max(0, Math.min(255, R * 235));
      data[i + 1] = Math.max(0, Math.min(255, G * 235));
      data[i + 2] = Math.max(0, Math.min(255, B * 235));
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Star-shaped sprite (DataTexture) for the twinkling sparkles around the golden flame.
function makeSparkTexture() {
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const u = (x / (N - 1)) * 2 - 1;
      const v = (y / (N - 1)) * 2 - 1;
      const d = Math.hypot(u, v);
      const core = Math.exp(-d * d * 18);
      const cross = Math.exp(-Math.abs(u) * 22) * Math.max(0, 1 - Math.abs(v)) + Math.exp(-Math.abs(v) * 22) * Math.max(0, 1 - Math.abs(u));
      const a = Math.min(1, core + cross * 0.85);
      const i = (y * N + x) * 4;
      data[i] = 255; data[i + 1] = 240; data[i + 2] = 190; data[i + 3] = Math.round(a * 255);
    }
  }
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

const pickupPoints = [[5, -7.5], [-7.5, 7.5], [7, 0], [-7, -5], [6.25, 7.5], [-2, -7], [8, 5], [-8, 0], [3, 8], [-6, 7]];

class AvatarModelBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn('[SurvivalWorldScene] GLB model failed to load', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// "monas & kawasan" (SketchUp export, inches) converted + optimised to GLB: Monas tower and its surrounding plaza/park.
const KAWASAN_MODEL = require('../../../assets/glb/mobile/monas_kawasan.glb');
// Stylised game scale: the 132 m tower (5196.85 in) becomes 30 game units (~13x a 2.35-unit character).
const KAWASAN_SCALE = 30 / 5196.85;
const KAWASAN_HALF = 6012 * KAWASAN_SCALE; // half-width of the model footprint (~34.7 units)
// The tower sits at (-22.3, 146.8) in model space; shift so it lands on the world origin like the old Monas.
const KAWASAN_OFFSET = [22.3 * KAWASAN_SCALE, -146.8 * KAWASAN_SCALE];
const insideKawasan = (x, z, margin = 0) => Math.abs(x) <= KAWASAN_HALF + margin && Math.abs(z) <= KAWASAN_HALF + margin;
// Solid tower footprint (game units) — the player cannot walk through it.
export const MONAS_TOWER_HALF = 5.8;
// The Monas podium is a raised square (top 0.92) with steps between 9.3 and 10.4 from the centre.
const PODIUM_TOP = 0.92;
const PODIUM_INNER = 9.3;
const PODIUM_OUTER = 10.4;
export function kawasanGroundHeight(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (d <= PODIUM_INNER) return PODIUM_TOP;
  if (d >= PODIUM_OUTER) return 0;
  return PODIUM_TOP * (PODIUM_OUTER - d) / (PODIUM_OUTER - PODIUM_INNER);
}

function MonasFallback() {
  const marble = '#e4e8e6';
  const gold = '#e8ae37';
  return <group position={[0, 0, 0]}>
    {/* The square museum base, broad ceremonial podium and stepped marble plinth. */}
    <mesh position={[0, 0.035, 0]}><cylinderGeometry args={[3.6, 3.75, 0.12, 48]} /><meshStandardMaterial color="#9a9b91" roughness={0.78} /></mesh>
    <mesh position={[0, 0.14, 0]}><boxGeometry args={[3.15, 0.18, 3.15]} /><meshStandardMaterial color="#c7c8c0" roughness={0.72} /></mesh>
    <mesh position={[0, 0.28, 0]}><boxGeometry args={[2.82, 0.14, 2.82]} /><meshStandardMaterial color="#dedfd9" roughness={0.66} /></mesh>
    <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[2.52, 0.78, 2.52]} /><meshStandardMaterial color={marble} roughness={0.42} /></mesh>
    <mesh position={[0, 1.13, 0]}><boxGeometry args={[2.72, 0.12, 2.72]} /><meshStandardMaterial color="#c4c9c6" roughness={0.48} /></mesh>
    <mesh position={[0, 1.22, 0]}><boxGeometry args={[2.46, 0.08, 2.46]} /><meshStandardMaterial color="#f0f1ed" roughness={0.45} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`museum-corner-${x}-${z}`} position={[x * 1.05, 0.73, z * 1.05]}>
      <mesh castShadow><boxGeometry args={[0.16, 0.6, 0.16]} /><meshStandardMaterial color="#c5cbc7" roughness={0.38} /></mesh>
      <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.24, 0.07, 0.24]} /><meshStandardMaterial color="#f3f3ee" roughness={0.35} /></mesh>
    </group>))}
    {[-0.72, 0, 0.72].flatMap((x) => [-1, 1].map((side) => <mesh key={`museum-window-front-${x}-${side}`} position={[x, 0.75, side * 1.267]}>
      <boxGeometry args={[0.28, 0.48, 0.026]} /><meshStandardMaterial color="#7b9a9b" emissive="#264f5b" emissiveIntensity={0.12} roughness={0.3} />
    </mesh>))}
    {/* The tall tapered shaft and observation deck give Monas its distinct skyline silhouette. */}
    <mesh position={[0, 3.67, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><cylinderGeometry args={[0.31, 0.52, 4.85, 4]} /><meshStandardMaterial color="#f0f1ed" roughness={0.3} metalness={0.08} /></mesh>
    {Array.from({ length: 4 }, (_, index) => <group key={`shaft-rib-${index}`} rotation={[0, index * Math.PI / 2, 0]}>
      <mesh position={[0, 3.65, 0.37]}><boxGeometry args={[0.055, 4.55, 0.035]} /><meshStandardMaterial color="#c4ccc9" roughness={0.38} /></mesh>
    </group>)}
    {[2.0, 3.1, 4.2, 5.25].map((y) => <mesh key={`shaft-band-${y}`} position={[0, y, 0]}><cylinderGeometry args={[0.46 - (y - 1.3) * 0.035, 0.49 - (y - 1.3) * 0.035, 0.055, 4]} /><meshStandardMaterial color="#d2d8d4" roughness={0.4} /></mesh>)}
    <mesh position={[0, 6.2, 0]}><boxGeometry args={[1.16, 0.14, 1.16]} /><meshStandardMaterial color="#d2d7d3" roughness={0.42} /></mesh>
    <mesh position={[0, 6.34, 0]}><cylinderGeometry args={[0.67, 0.67, 0.12, 32]} /><meshStandardMaterial color="#e8ebe7" roughness={0.38} /></mesh>
    <mesh position={[0, 6.43, 0]}><cylinderGeometry args={[0.59, 0.64, 0.08, 32]} /><meshStandardMaterial color="#aeb8b4" metalness={0.25} roughness={0.35} /></mesh>
    {/* Gold flame and needle spire above the viewing platform. */}
    <mesh position={[0, 6.55, 0]}><cylinderGeometry args={[0.39, 0.49, 0.16, 24]} /><meshStandardMaterial color={gold} metalness={0.76} roughness={0.2} /></mesh>
    <mesh position={[0, 6.86, 0]} castShadow><coneGeometry args={[0.4, 0.56, 12]} /><meshStandardMaterial color="#f3c34f" metalness={0.82} roughness={0.18} emissive="#9c6614" emissiveIntensity={0.24} /></mesh>
    <mesh position={[0, 7.22, 0]} rotation={[0, 0, 0.12]}><coneGeometry args={[0.2, 0.62, 10]} /><meshStandardMaterial color="#ffdc73" metalness={0.8} roughness={0.18} emissive="#ffb62e" emissiveIntensity={0.5} /></mesh>
    <mesh position={[0, 7.55, 0]}><sphereGeometry args={[0.055, 24, 18]} /><meshStandardMaterial color="#fff0a4" emissive="#ffbf36" emissiveIntensity={0.9} /></mesh>
    <pointLight position={[0, 7.0, 0]} color="#ffbf4a" intensity={0.8} distance={7} />
  </group>;
}

// Tower body (shaft, pedestal, cup rim) gets one clean plain marble colour; the flame becomes polished gold.
const MONAS_PLAIN_MATERIALS = /^(Monas4|Grade_cima)$/;
const MONAS_GOLD_MATERIALS = /^Gold$/;
const MONAS_GLOW_MATERIALS = /^Lamps$/;

function MonasKawasanModel({ uri, onReady, onScene }) {
  const { scene } = useGLTF(uri);
  const { gl } = useThree();
  const materials = useMemo(() => ({
    plain: new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.42, metalness: 0.04 }),
    gold: new THREE.MeshMatcapMaterial({ matcap: makeGoldMatcap(), color: '#ffffff' }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffe7a3' }),
  }), []);
  useEffect(() => {
    const maxAniso = Math.min(8, gl?.capabilities?.getMaxAnisotropy?.() || 1);
    scene.traverse((child) => {
      if (!child.isMesh) return;
      // Static scenery: skip shadow casting (expensive on phones) and per-frame matrix updates.
      child.castShadow = false;
      child.receiveShadow = true;
      const name = child.material?.name || '';
      if (MONAS_PLAIN_MATERIALS.test(name)) { child.material = materials.plain; }
      else if (MONAS_GOLD_MATERIALS.test(name)) { child.material = materials.gold; child.receiveShadow = false; }
      else if (MONAS_GLOW_MATERIALS.test(name)) child.material = materials.glow;
      else if (child.material?.map && Platform.OS === 'web') {
        // Smoother ground/park textures at grazing camera angles (web only: on phones a re-upload of
        // ~45 textures doubles the loading time).
        child.material.map.anisotropy = maxAniso;
        child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
        child.material.map.needsUpdate = true;
      }
      child.updateMatrix();
      child.matrixAutoUpdate = false;
    });
    scene.updateMatrixWorld(true);
    onScene?.(scene);
    onReady?.(true);
    return () => { onScene?.(null); onReady?.(false); };
  }, [scene, onReady, onScene, materials, gl]);
  return <primitive object={scene} position={[KAWASAN_OFFSET[0], -0.02, KAWASAN_OFFSET[1]]} scale={KAWASAN_SCALE} />;
}

// Golden flame shimmer: a pulsing soft halo plus twinkling star sparkles drifting around the tip.
const FLAME_CENTER = [0, 27.9, 0];
function GoldenFlameSparkle() {
  const halo = useRef(null);
  const points = useRef(null);
  const sparkTexture = useMemo(() => makeSparkTexture(), []);
  const COUNT = 26;
  const seeds = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    a: (i / COUNT) * Math.PI * 2 * 3.7, r: 0.5 + ((i * 37) % 10) / 10 * 0.9, y: -1.7 + ((i * 53) % 17) / 17 * 3.6, s: 0.6 + ((i * 29) % 7) / 7, p: (i * 1.7) % 6.28,
  })), []);
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(COUNT * 3), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (halo.current) {
      const k = 1 + Math.sin(t * 2.2) * 0.08;
      halo.current.scale.set(k, k * 1.4, k);
      halo.current.material.opacity = 0.09 + Math.sin(t * 2.2) * 0.04;
    }
    if (points.current) {
      for (let i = 0; i < COUNT; i += 1) {
        const seed = seeds[i];
        const a = seed.a + t * 0.35 * seed.s;
        positions[i * 3] = Math.cos(a) * seed.r;
        positions[i * 3 + 1] = seed.y + Math.sin(t * 0.8 + seed.p) * 0.25;
        positions[i * 3 + 2] = Math.sin(a) * seed.r;
        const tw = Math.pow(Math.max(0, Math.sin(t * 3.1 * seed.s + seed.p)), 6);
        colors[i * 3] = tw; colors[i * 3 + 1] = tw * 0.86; colors[i * 3 + 2] = tw * 0.55;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
      points.current.geometry.attributes.color.needsUpdate = true;
    }
  });
  return <group position={FLAME_CENTER}>
    <mesh ref={halo}><sphereGeometry args={[0.95, 24, 18]} /><meshBasicMaterial color="#ffb02e" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></mesh>
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={sparkTexture} size={0.9} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </points>
  </group>;
}

function MonasKawasan({ onReady, onScene }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    // Native resolves the bundled module itself (works in Android release builds); web gets the URL.
    setUri(glbSourceFor(KAWASAN_MODEL));
  }, []);

  if (!uri) return null;
  return <Suspense fallback={null}>
    <AvatarModelBoundary fallback={null}>
      <MonasKawasanModel uri={uri} onReady={onReady} onScene={onScene} />
    </AvatarModelBoundary>
  </Suspense>;
}

function ParkLamp({ position }) {
  return <group position={position}>
    <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.045, 0.075, 1.55, 24]} /><meshStandardMaterial color="#344653" metalness={0.65} roughness={0.34} /></mesh>
    <mesh position={[0, 1.58, 0]}><cylinderGeometry args={[0.16, 0.11, 0.14, 24]} /><meshStandardMaterial color="#344653" metalness={0.6} /></mesh>
    <mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.095, 24, 18]} /><meshStandardMaterial color="#ffe4a1" emissive="#ffbd54" emissiveIntensity={0.85} roughness={0.25} /></mesh>
  </group>;
}

function ParkBench({ position, rotation = 0 }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[1.15, 0.1, 0.34]} /><meshStandardMaterial color="#76543d" roughness={0.78} /></mesh>
    <mesh position={[0, 0.65, -0.14]}><boxGeometry args={[1.15, 0.38, 0.08]} /><meshStandardMaterial color="#76543d" roughness={0.78} /></mesh>
    {[-0.42, 0.42].map((x) => <mesh key={x} position={[x, 0.22, 0]}><boxGeometry args={[0.07, 0.42, 0.28]} /><meshStandardMaterial color="#485761" metalness={0.45} /></mesh>)}
  </group>;
}

function ParkTree({ position, scale = 1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.09, 0.14, 0.95, 24]} /><meshStandardMaterial color="#79533d" /></mesh>
    <mesh position={[0, 1.22, 0]} castShadow><coneGeometry args={[0.62, 1.55, 8]} /><meshStandardMaterial color="#237c56" roughness={0.88} /></mesh>
    <mesh position={[0, 1.83, 0]} castShadow><coneGeometry args={[0.42, 1.1, 8]} /><meshStandardMaterial color="#38a66e" roughness={0.84} /></mesh>
  </group>;
}

function ParkPond({ position, size = [8, 4] }) {
  return <group position={[position[0], -0.04, position[1]]}>
    <mesh position={[0, -0.03, 0]} receiveShadow><boxGeometry args={[size[0] + 0.55, 0.08, size[1] + 0.55]} /><meshStandardMaterial color="#b9b49d" roughness={0.86} /></mesh>
    <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[size[0], 0.06, size[1]]} /><meshStandardMaterial color="#3c9bb0" roughness={0.18} metalness={0.16} /></mesh>
    <mesh position={[0, 0.055, 0]}><boxGeometry args={[size[0] * 0.72, 0.012, size[1] * 0.06]} /><meshBasicMaterial color="#8ce4e1" /></mesh>
  </group>;
}

function SportsCourt({ position }) {
  return <group position={[position[0], -0.02, position[1]]}>
    <mesh receiveShadow><boxGeometry args={[10, 0.08, 6]} /><meshStandardMaterial color="#3c8d72" roughness={0.82} /></mesh>
    <mesh position={[0, 0.05, 0]}><boxGeometry args={[9.35, 0.012, 5.35]} /><meshStandardMaterial color="#4d9f88" roughness={0.78} /></mesh>
    <mesh position={[0, 0.065, 0]}><boxGeometry args={[0.07, 0.018, 5.2]} /><meshBasicMaterial color="#eff7dc" /></mesh>
    <mesh position={[0, 0.065, 0]}><boxGeometry args={[9.2, 0.018, 0.07]} /><meshBasicMaterial color="#eff7dc" /></mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * 4.15, 0.08, 0]}>
      <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.035, 0.05, 1.55, 24]} /><meshStandardMaterial color="#d3d9d1" metalness={0.55} /></mesh>
      <mesh position={[0, 1.56, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.035, 8, 18]} /><meshStandardMaterial color="#d3d9d1" metalness={0.55} /></mesh>
    </group>)}
  </group>;
}

function CityBlock({ position, size, color }) {
  return <group position={position}>
    <mesh position={[0, size[1] / 2, 0]} castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.68} /></mesh>
    {Array.from({ length: Math.max(2, Math.floor(size[1] / 0.47)) }, (_, floor) => {
      const y = 0.34 + floor * 0.47;
      return <group key={`floor-${floor}`}>
        {[-1, 1].map((side) => <React.Fragment key={`facade-${side}`}>
          {[-1, 0, 1].map((column) => <mesh key={`front-${column}`} position={[column * size[0] * 0.27, y, side * (size[2] / 2 + 0.012)]}><boxGeometry args={[size[0] * 0.16, 0.23, 0.025]} /><meshStandardMaterial color="#9ccbd8" emissive="#548da5" emissiveIntensity={0.12} roughness={0.28} /></mesh>)}
          {[-1, 1].map((end) => <mesh key={`side-${end}`} position={[side * (size[0] / 2 + 0.012), y, end * size[2] * 0.24]}><boxGeometry args={[0.025, 0.23, size[2] * 0.18]} /><meshStandardMaterial color="#9ccbd8" emissive="#548da5" emissiveIntensity={0.12} roughness={0.28} /></mesh>)}
        </React.Fragment>)}
        <mesh position={[0, y - 0.18, 0]}><boxGeometry args={[size[0] * 1.01, 0.055, size[2] * 1.01]} /><meshStandardMaterial color="#7b8e94" roughness={0.58} /></mesh>
      </group>;
    })}
    <mesh position={[0, size[1] + 0.08, 0]}><boxGeometry args={[size[0] * 1.08, 0.16, size[2] * 1.08]} /><meshStandardMaterial color="#62798c" metalness={0.22} roughness={0.48} /></mesh>
    <mesh position={[0, size[1] + 0.24, 0]}><boxGeometry args={[size[0] * 0.48, 0.18, size[2] * 0.48]} /><meshStandardMaterial color="#536977" metalness={0.25} roughness={0.45} /></mesh>
    <mesh position={[0, size[1] + 0.36, 0]}><boxGeometry args={[size[0] * 0.28, 0.08, size[2] * 0.28]} /><meshStandardMaterial color="#738994" metalness={0.3} roughness={0.4} /></mesh>
    {size[1] > 4.5 && <group position={[size[0] * 0.16, size[1] + 0.48, -size[2] * 0.12]}>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.025, 0.04, 0.42, 24]} /><meshStandardMaterial color="#526573" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.44, 0]}><sphereGeometry args={[0.055, 24, 18]} /><meshStandardMaterial color="#ffca70" emissive="#f3993f" emissiveIntensity={0.35} /></mesh>
    </group>}
  </group>;
}

function MapRoad({ road, isCleared }) {
  return road.points.slice(1).map((point, index) => {
    const previous = road.points[index];
    const midpoint = [(previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2];
    if (isCleared(previous[0], previous[1]) || isCleared(point[0], point[1]) || isCleared(midpoint[0], midpoint[1])) return null;
    const dx = point[0] - previous[0];
    const dz = point[1] - previous[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.1) return null;
    const angle = Math.atan2(dz, dx);
    const color = road.kind === 'primary' || road.kind === 'trunk' ? '#39434b' : road.kind === 'secondary' ? '#4d5960' : road.kind === 'tertiary' ? '#68716e' : '#8a8d82';
    return <mesh key={`${road.id}-${index}`} position={[midpoint[0], -0.012, midpoint[1]]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, 0.04, road.width]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>;
  });
}

function MapBuilding({ building }) {
  const isTall = building.h > 8;
  const color = building.kind === 'mosque' ? '#8f9fa6' : isTall ? '#8798a2' : '#aeb9b6';
  return <group position={[building.x, 0, building.z]}>
    <mesh position={[0, building.h / 2, 0]} castShadow>
      <boxGeometry args={[building.w, building.h, building.d]} />
      <meshStandardMaterial color={color} roughness={0.72} metalness={isTall ? 0.18 : 0.04} />
    </mesh>
    <mesh position={[0, building.h + 0.05, 0]}>
      <boxGeometry args={[building.w * 1.06, 0.1, building.d * 1.06]} />
      <meshStandardMaterial color={isTall ? '#596f7b' : '#7f918e'} roughness={0.62} />
    </mesh>
  </group>;
}

function MonasMapNetwork({ kawasanReady }) {
  const isCleared = kawasanReady
    ? (x, z) => insideKawasan(x, z, 0.5)
    : (x, z) => Math.hypot(x, z) <= 16;
  return <>
    {MONAS_MAP_DATA.roads.map((road) => <MapRoad key={road.id} road={road} isCleared={isCleared} />)}
    {MONAS_MAP_DATA.buildings
      .filter((building) => !isCleared(building.x, building.z))
      .map((building) => <MapBuilding key={building.id} building={building} />)}
  </>;
}

const ANIM_PATTERNS = {
  idle: [/^idle/i, /idle/i, /^stand/i, /breath/i],
  walk: [/^walking$/i, /^walk/i, /walk/i],
  run: [/^running$/i, /^run$/i, /^run_?\d+$/i, /^run/i, /running/i],
  jump: [/^jump/i, /jump/i, /leap/i],
  // Greeting / celebration clips used by the WAVE action ("Hello_Run" is a run, not a greeting).
  emote: [/wave/i, /^(?!.*run).*hello/i, /greet/i, /cheer/i, /agree/i, /dance/i, /spin/i],
};

// Find the frame of a walk/run clip where both feet are closest together (= neutral standing pose),
// by simulating the clip on a throw-away mixer. The real mixer overwrites the pose on its next frame.
function findRestPoseTime(clip, root) {
  if (!clip || !root) return 0;
  const findBone = (side) => {
    let bone = null;
    root.traverse((node) => {
      if (!bone && node.isBone && new RegExp(`${side}foot$`, 'i').test(node.name.replace(/[^a-z]/gi, ''))) bone = node;
    });
    return bone;
  };
  const leftFoot = findBone('left');
  const rightFoot = findBone('right');
  if (!leftFoot || !rightFoot) return 0;
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const SAMPLES = 40;
  let bestTime = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < SAMPLES; i += 1) {
    const t = (clip.duration * i) / SAMPLES;
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    leftFoot.getWorldPosition(a);
    rightFoot.getWorldPosition(b);
    const distance = a.distanceTo(b);
    if (distance < bestDistance) { bestDistance = distance; bestTime = t; }
  }
  action.stop();
  mixer.uncacheRoot(root);
  return bestTime;
}

function TwiniGlbAvatar({ uri, position, movementDirection, moving, running, jumping, groundY = 0, groundRef, emoteSignal = 0, controlRef }) {
  const group = useRef(null);
  const turn = useRef(null);
  const yaw = useRef(null);
  const activeAction = useRef(null);
  const activeState = useRef('idle');
  const spin = useRef(null);
  const { scene, animations } = useGLTF(uri);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, clonedScene);
  const availableActions = Object.entries(actions).filter(([, action]) => action && typeof action.reset === 'function');
  // Try patterns in priority order so e.g. "Hello_Run" is never picked as idle and "Running" wins over "Female_Run_...".
  const findAction = (patterns) => {
    for (const pattern of patterns) {
      const hit = availableActions.find(([name]) => pattern.test(name));
      if (hit) return hit[1];
    }
    return undefined;
  };
  const idleAction = findAction(ANIM_PATTERNS.idle);
  const walkingAction = findAction(ANIM_PATTERNS.walk);
  const runningAction = findAction(ANIM_PATTERNS.run);
  const jumpAction = findAction(ANIM_PATTERNS.jump);
  const emoteAction = findAction(ANIM_PATTERNS.emote);
  const genericAction = availableActions[0]?.[1];

  // WAVE action: play the model's greeting clip once (or a procedural spin-hop when it has none).
  const [emoting, setEmoting] = useState(false);
  const emoteStart = useRef(-1);
  const lastEmote = useRef(emoteSignal);
  useEffect(() => {
    if (!emoteSignal || emoteSignal === lastEmote.current) return undefined;
    lastEmote.current = emoteSignal;
    const ms = emoteAction ? Math.min(3200, Math.max(1200, emoteAction.getClip().duration * 1000)) : 1100;
    emoteStart.current = -1;
    setEmoting(true);
    const timer = setTimeout(() => setEmoting(false), ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emoteSignal]);

  // Locomotion state: diam (idle) → jalan (walk) → lari (run).
  const motionState = jumping ? 'jump' : moving ? (running ? 'run' : 'walk') : emoting && emoteAction ? 'emote' : 'idle';
  // No idle clip? Stand still using the walk clip frozen at its "legs together" frame.
  const restPoseAction = !idleAction ? (walkingAction || runningAction) : null;
  const restPoseTime = useMemo(() => (restPoseAction ? findRestPoseTime(restPoseAction.getClip(), clonedScene) : 0), [restPoseAction, clonedScene]);

  let targetAction;
  let frozen = false;
  if (motionState === 'emote') targetAction = emoteAction;
  else if (motionState === 'jump') targetAction = jumpAction || runningAction || walkingAction || idleAction || genericAction;
  else if (motionState === 'run') targetAction = runningAction || walkingAction || genericAction;
  else if (motionState === 'walk') targetAction = walkingAction || runningAction || genericAction;
  else if (idleAction) targetAction = idleAction;
  else if (restPoseAction) { targetAction = restPoseAction; frozen = true; }
  else { targetAction = genericAction; frozen = true; }

  useEffect(() => {
    if (!targetAction) return;
    const FADE = 0.2;
    availableActions.forEach(([, action]) => { if (action !== targetAction) action.fadeOut?.(FADE); });
    targetAction.reset();
    targetAction.enabled = true;
    targetAction.setEffectiveTimeScale?.(motionState === 'jump' ? 1.2 : motionState === 'walk' || motionState === 'run' ? 1.3 : 1);
    targetAction.setEffectiveWeight?.(1);
    if (motionState === 'emote') { targetAction.setLoop?.(THREE.LoopOnce, 1); targetAction.clampWhenFinished = true; }
    else targetAction.setLoop?.(THREE.LoopRepeat, Infinity);
    if (frozen) {
      targetAction.time = restPoseTime;
      targetAction.paused = true;
    }
    targetAction.fadeIn?.(FADE);
    targetAction.play?.();
    activeAction.current = targetAction;
    activeState.current = motionState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAction, motionState, frozen, restPoseTime, uri]);

  const hasSkeletalLocomotion = !!(walkingAction || runningAction);

  const modelFrame = useMemo(() => {
    if (!scene) return { center: [0, 0, 0], min: [0, 0, 0], scale: 1 };
    return getGLTFFrame(scene);
  }, [scene]);

  // First guess from the bind pose; corrected below with the real (skinned, animated) foot height,
  // because bind-pose bounds don't match the standing pose and left the feet sunk into the ground.
  const avatarScale = modelFrame.scale * CHARACTER_SCALE;
  const originY = -avatarScale * (modelFrame.min[1] - modelFrame.center[1]);
  const footFix = useRef(0);
  const shownGround = useRef(null);
  const frames = useRef(0);
  const measureBox = useMemo(() => new THREE.Box3(), []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta || 1 / 60, 0.05);
    const live = controlRef?.current;
    group.current.position.x = live ? live.pos[0] : position[0];
    group.current.position.z = live ? live.pos[1] : position[1];
    // Smooth turn toward the walking direction (no snapping when the stick changes direction).
    const face = live ? live.facing : movementDirection;
    const targetYaw = Math.atan2(face.dx || 0, face.dz ?? 1);
    if (yaw.current == null) yaw.current = targetYaw;
    yaw.current += shortestAngle(targetYaw - yaw.current) * (1 - Math.exp(-14 * dt));
    if (turn.current) turn.current.rotation.y = yaw.current;
    // Stride speed follows the real ground speed, so a half-pushed stick walks slowly without foot sliding.
    const state = activeState.current;
    if (live && activeAction.current && (state === 'walk' || state === 'run')) {
      const ref = state === 'run' ? RUN_SPEED : WALK_SPEED;
      activeAction.current.setEffectiveTimeScale?.(Math.max(0.55, Math.min(1.6, (live.speed / ref) * 1.3)));
    }
    const ground = groundRef?.current ?? groundY;
    shownGround.current = shownGround.current == null ? ground : shownGround.current + (ground - shownGround.current) * 0.3;
    const phase = clock.elapsedTime * (running ? 14 : 8);
    // Skeletal walk/run clips already move the body; only fake a bob when the model has none.
    const bob = moving && !hasSkeletalLocomotion ? Math.abs(Math.sin(phase)) * 0.05 : 0;
    let hop = 0;
    if (spin.current) {
      if (emoting && !emoteAction) {
        if (emoteStart.current < 0) emoteStart.current = clock.elapsedTime;
        const k = Math.min(1, (clock.elapsedTime - emoteStart.current) / 0.9);
        spin.current.rotation.y = k * Math.PI * 2;
        hop = Math.sin(k * Math.PI) * 0.35;
      } else spin.current.rotation.y = 0;
    }
    group.current.position.y = shownGround.current + footFix.current + (jumping ? 0.2 : 0) + (bob + hop) * CHARACTER_SCALE;
    frames.current += 1;
    // Measure the lowest skinned vertex while standing still (after the idle pose has faded in).
    if ((frames.current === 6 || frames.current === 45) && !moving && !jumping && !emoting) {
      measureBox.setFromObject(clonedScene, true);
      if (!measureBox.isEmpty()) {
        const delta = (shownGround.current + 0.01) - measureBox.min.y;
        footFix.current = Math.max(-1.5, Math.min(1.5, footFix.current + delta));
      }
    }
  });

  const facingAngle = Math.atan2(movementDirection.dx, movementDirection.dz);

  return (
    <group ref={group}>
      <group ref={turn} position={[0, originY, 0]} scale={avatarScale}>
        <group ref={spin}>
          <group position={[-modelFrame.center[0], -modelFrame.center[1], -modelFrame.center[2]]}>
            <primitive object={clonedScene} />
          </group>
        </group>
      </group>
    </group>
  );
}

function TwiniFallbackAvatar({ position, movementDirection, moving, running, jumping, groundY = 0, groundRef, controlRef }) {
  const group = useRef(null);
  const leftArm = useRef(null);
  const rightArm = useRef(null);
  const leftLeg = useRef(null);
  const rightLeg = useRef(null);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * (running ? 11 : 8);
    if (group.current) group.current.position.y = (groundRef?.current ?? groundY) + (jumping ? 0.65 : 0) + (moving ? Math.abs(Math.sin(phase)) * 0.08 : Math.sin(phase) * 0.025);
    const live = controlRef?.current;
    if (group.current && live) {
      group.current.position.x = live.pos[0];
      group.current.position.z = live.pos[1];
      group.current.rotation.y = Math.atan2(live.facing.dx || 0, live.facing.dz ?? 1);
    }
    if (leftArm.current) leftArm.current.rotation.x = moving ? Math.sin(phase) * 0.68 : Math.sin(phase) * 0.08;
    if (rightArm.current) rightArm.current.rotation.x = moving ? -Math.sin(phase) * 0.68 : -Math.sin(phase) * 0.08;
    if (leftLeg.current) leftLeg.current.rotation.x = moving ? -Math.sin(phase) * 0.58 : 0;
    if (rightLeg.current) rightLeg.current.rotation.x = moving ? Math.sin(phase) * 0.58 : 0;
  });
  const blue = '#2f8be8';
  const white = '#eaf3fa';
  const gold = '#f2c45f';
  const facingAngle = Math.atan2(movementDirection.dx, movementDirection.dz);

  return <group ref={group} position={[position[0], 0, position[1]]} rotation={[0, facingAngle, 0]} scale={0.75 * CHARACTER_SCALE}>
    {/* Compact IDTC digital guardian: helmet, glowing face, armored body and gold circuit accents. */}
    <mesh position={[0, 0.42, 0]} castShadow><sphereGeometry args={[0.23, 18, 14]} /><meshStandardMaterial color={blue} roughness={0.38} metalness={0.35} /></mesh>
    <mesh position={[0, 0.47, 0.15]} castShadow><boxGeometry args={[0.3, 0.14, 0.12]} /><meshStandardMaterial color={white} roughness={0.42} metalness={0.28} /></mesh>
    <group ref={leftLeg} position={[-0.115, 0.29, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow><cylinderGeometry args={[0.075, 0.07, 0.25, 24]} /><meshStandardMaterial color="#9db5c8" metalness={0.35} roughness={0.4} /></mesh>
      <mesh position={[0, -0.23, 0.01]}><sphereGeometry args={[0.083, 24, 18]} /><meshStandardMaterial color={gold} metalness={0.68} roughness={0.25} /></mesh>
      <mesh position={[0, -0.25, 0.045]} castShadow><boxGeometry args={[0.16, 0.09, 0.22]} /><meshStandardMaterial color={blue} roughness={0.42} metalness={0.25} /></mesh>
    </group>
    <group ref={rightLeg} position={[0.115, 0.29, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow><cylinderGeometry args={[0.075, 0.07, 0.25, 24]} /><meshStandardMaterial color="#9db5c8" metalness={0.35} roughness={0.4} /></mesh>
      <mesh position={[0, -0.23, 0.01]}><sphereGeometry args={[0.083, 24, 18]} /><meshStandardMaterial color={gold} metalness={0.68} roughness={0.25} /></mesh>
      <mesh position={[0, -0.25, 0.045]} castShadow><boxGeometry args={[0.16, 0.09, 0.22]} /><meshStandardMaterial color={blue} roughness={0.42} metalness={0.25} /></mesh>
    </group>
    <mesh position={[0, 0.38, -0.11]} castShadow><boxGeometry args={[0.36, 0.22, 0.22]} /><meshStandardMaterial color="#253d56" metalness={0.48} roughness={0.35} /></mesh>
    <mesh position={[0, 0.38, -0.235]}><boxGeometry args={[0.22, 0.1, 0.035]} /><meshStandardMaterial color="#65d8ff" emissive="#28bce9" emissiveIntensity={0.72} metalness={0.5} /></mesh>
    <mesh position={[0, 0.76, 0]} castShadow><sphereGeometry args={[0.36, 20, 16]} /><meshStandardMaterial color={white} roughness={0.34} metalness={0.22} /></mesh>
    <mesh position={[0, 0.76, 0.235]}><torusGeometry args={[0.255, 0.045, 8, 24]} /><meshStandardMaterial color={gold} metalness={0.72} roughness={0.25} /></mesh>
    <mesh position={[0, 0.78, 0.285]}><sphereGeometry args={[0.205, 20, 14]} /><meshStandardMaterial color="#17314a" roughness={0.22} metalness={0.2} /></mesh>
    {[-0.082, 0.082].map((x) => <group key={x} position={[x, 0.79, 0.445]}>
      <mesh><sphereGeometry args={[0.066, 14, 12]} /><meshStandardMaterial color="#b8efff" emissive="#72d8ff" emissiveIntensity={0.6} roughness={0.18} /></mesh>
      <mesh position={[0, -0.012, 0.045]}><sphereGeometry args={[0.031, 24, 18]} /><meshStandardMaterial color="#10223a" roughness={0.16} /></mesh>
      <mesh position={[-0.015, 0.018, 0.07]}><sphereGeometry args={[0.012, 24, 18]} /><meshBasicMaterial color="#fff" /></mesh>
    </group>)}
    <mesh position={[0, 0.57, 0.45]}><boxGeometry args={[0.07, 0.018, 0.015]} /><meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.35} /></mesh>
    <mesh position={[0, 0.91, 0.345]}><boxGeometry args={[0.34, 0.17, 0.035]} /><meshStandardMaterial color={blue} metalness={0.62} roughness={0.3} /></mesh>
    <mesh position={[0, 0.91, 0.37]}><torusGeometry args={[0.075, 0.014, 6, 16]} /><meshStandardMaterial color={gold} metalness={0.76} roughness={0.2} /></mesh>
    <mesh position={[0, 0.91, 0.39]}><sphereGeometry args={[0.035, 24, 18]} /><meshStandardMaterial color="#a9f0ff" emissive="#54d5ff" emissiveIntensity={1} /></mesh>
    <mesh position={[0, 1.18, 0]} castShadow><sphereGeometry args={[0.39, 24, 18]} /><meshStandardMaterial color={white} roughness={0.3} metalness={0.27} /></mesh>
    <mesh position={[0, 1.15, 0.32]}><sphereGeometry args={[0.265, 24, 16]} /><meshStandardMaterial color="#12243a" roughness={0.22} metalness={0.25} /></mesh>
    {[-0.105, 0.105].map((x) => <group key={`eye-${x}`} position={[x, 1.16, 0.54]}>
      <mesh><sphereGeometry args={[0.073, 16, 12]} /><meshStandardMaterial color="#b7f2ff" emissive="#5fd3ff" emissiveIntensity={0.72} /></mesh>
      <mesh position={[0, -0.012, 0.045]}><sphereGeometry args={[0.035, 24, 18]} /><meshStandardMaterial color="#12304e" /></mesh>
      <mesh position={[-0.018, 0.024, 0.073]}><sphereGeometry args={[0.014, 24, 18]} /><meshBasicMaterial color="#fff" /></mesh>
    </group>)}
    <mesh position={[0, 1.43, 0]}><torusGeometry args={[0.3, 0.035, 8, 24]} /><meshStandardMaterial color={blue} metalness={0.68} roughness={0.25} /></mesh>
    <mesh position={[0, 1.61, 0]}><cylinderGeometry args={[0.035, 0.045, 0.27, 24]} /><meshStandardMaterial color={gold} metalness={0.78} roughness={0.2} /></mesh>
    <mesh position={[0, 1.76, 0]}><sphereGeometry args={[0.07, 24, 18]} /><meshStandardMaterial color="#70deff" emissive="#42c9ff" emissiveIntensity={1.2} /></mesh>
    <mesh position={[0, 1.12, -0.29]} castShadow><boxGeometry args={[0.33, 0.36, 0.16]} /><meshStandardMaterial color={blue} roughness={0.38} metalness={0.42} /></mesh>
    <mesh position={[0, 1.19, -0.39]}><boxGeometry args={[0.19, 0.09, 0.035]} /><meshStandardMaterial color={gold} emissive="#bd8c2c" emissiveIntensity={0.28} metalness={0.6} /></mesh>
    {[-1, 1].map((side) => <group key={`shoulder-${side}`} position={[side * 0.35, 1.34, 0]}>
      <mesh castShadow><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color={blue} metalness={0.48} roughness={0.32} /></mesh>
      <mesh position={[0, 0.025, 0.095]}><boxGeometry args={[0.12, 0.07, 0.055]} /><meshStandardMaterial color={gold} metalness={0.72} roughness={0.22} /></mesh>
    </group>)}
    <group ref={leftArm} position={[-0.36, 1.2, 0]}>
      <mesh position={[0, -0.19, 0]} rotation={[0, 0, -0.15]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.39, 24]} /><meshStandardMaterial color={white} metalness={0.28} roughness={0.38} /></mesh>
      <mesh position={[0, -0.22, 0.015]}><torusGeometry args={[0.084, 0.018, 6, 12]} /><meshStandardMaterial color="#61c9f0" metalness={0.62} roughness={0.24} /></mesh>
      <mesh position={[0, -0.4, 0.02]}><sphereGeometry args={[0.1, 24, 18]} /><meshStandardMaterial color={gold} metalness={0.65} roughness={0.27} /></mesh>
      <mesh position={[0, -0.49, 0.045]} castShadow><sphereGeometry args={[0.085, 24, 18]} /><meshStandardMaterial color="#dfeaf0" metalness={0.38} roughness={0.33} /></mesh>
    </group>
    <group ref={rightArm} position={[0.36, 1.2, 0]}>
      <mesh position={[0, -0.19, 0]} rotation={[0, 0, 0.15]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.39, 24]} /><meshStandardMaterial color={white} metalness={0.28} roughness={0.38} /></mesh>
      <mesh position={[0, -0.22, 0.015]}><torusGeometry args={[0.084, 0.018, 6, 12]} /><meshStandardMaterial color="#61c9f0" metalness={0.62} roughness={0.24} /></mesh>
      <mesh position={[0, -0.4, 0.02]}><sphereGeometry args={[0.1, 24, 18]} /><meshStandardMaterial color={gold} metalness={0.65} roughness={0.27} /></mesh>
      <mesh position={[0, -0.49, 0.045]} castShadow><sphereGeometry args={[0.085, 24, 18]} /><meshStandardMaterial color="#dfeaf0" metalness={0.38} roughness={0.33} /></mesh>
    </group>
  </group>;
}

function TwiniAvatar({ character, ...props }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    setUri(glbSourceFor(character?.source || require('../../../assets/glb/mobile/twini.glb')));
  }, [character?.id, character?.source]);

  if (!uri) return <TwiniFallbackAvatar {...props} />;
  return <Suspense fallback={<TwiniFallbackAvatar {...props} />}>
    <AvatarModelBoundary key={uri} fallback={<TwiniFallbackAvatar {...props} />}>
      <TwiniGlbAvatar {...props} uri={uri} />
    </AvatarModelBoundary>
  </Suspense>;
}


// Low-poly markers for the interactive Digital Twin objects (no per-object lights: cheap on mobile GPUs).
const WorldObjectMarker = React.memo(function WorldObjectMarker({ object, state = {}, highlighted, groundY }) {
  const spin = useRef(null);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.elapsedTime * 1.2;
  });
  const ok = state.done || state.synced || state.repaired || state.restored;
  const t = object.type;
  const glow = ok ? '#4fe39a' : object.color;
  const ring = highlighted ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[0.85, 1.05, 64]} /><meshBasicMaterial color="#5fd3ff" transparent opacity={0.85} /></mesh> : null;
  let body = null;
  if (t === 'iot_sensor') body = <>
    <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.045, 0.06, 1.44, 24]} /><meshStandardMaterial color="#c9d6e2" metalness={0.85} roughness={0.2} /></mesh>
    <mesh position={[0, 1.48, 0]}><sphereGeometry args={[0.18, 24, 18]} /><meshStandardMaterial color={ok ? '#6ef0a9' : '#b898ff'} emissive={ok ? '#20d974' : '#8965e4'} emissiveIntensity={0.9} /></mesh>
  </>;
  else if (t === 'street_light') body = <>
    <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.07, 2.8, 24]} /><meshStandardMaterial color="#2b3a4c" metalness={0.85} roughness={0.22} /></mesh>
    <mesh position={[0, 2.85, 0]}><boxGeometry args={[0.5, 0.12, 0.22]} /><meshStandardMaterial color="#fff6d0" emissive={ok ? '#ffe9a6' : '#3a3420'} emissiveIntensity={ok ? 1.4 : 0.3} /></mesh>
  </>;
  else if (t === 'cctv') body = <>
    <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.05, 0.06, 2.4, 24]} /><meshStandardMaterial color="#2b3a4c" metalness={0.85} roughness={0.22} /></mesh>
    <mesh position={[0.15, 2.35, 0]}><boxGeometry args={[0.36, 0.18, 0.18]} /><meshStandardMaterial color="#e3e9ee" emissive={glow} emissiveIntensity={0.25} /></mesh>
  </>;
  else if (t === 'drainage') body = <>
    <mesh position={[0, 0.06, 0]}><boxGeometry args={[1.6, 0.12, 0.7]} /><meshStandardMaterial color="#5a6670" /></mesh>
    <mesh position={[0, 0.14, 0]}><boxGeometry args={[1.4, 0.04, 0.5]} /><meshStandardMaterial color={ok ? '#3fb6ff' : '#6b5a3c'} emissive={ok ? '#1a8fd6' : '#000000'} emissiveIntensity={0.5} /></mesh>
  </>;
  else if (t === 'energy_station') body = <>
    <mesh position={[0, 0.7, 0]}><boxGeometry args={[1.0, 1.4, 0.7]} /><meshStandardMaterial color="#1c2b40" metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, 1.1, 0.36]}><boxGeometry args={[0.6, 0.3, 0.02]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ok ? 1.2 : 0.4} /></mesh>
  </>;
  else if (t === 'solar_panel') body = <>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.05, 1, 24]} /><meshStandardMaterial color="#2b3a4c" metalness={0.85} roughness={0.22} /></mesh>
    <mesh position={[0, 1.0, 0]} rotation={[-0.5, 0, 0]}><boxGeometry args={[1.6, 0.05, 0.9]} /><meshStandardMaterial color="#1d3d78" metalness={0.7} roughness={0.25} emissive={ok ? '#2a6dff' : '#000000'} emissiveIntensity={0.3} /></mesh>
  </>;
  else if (t === 'smart_building') body = <mesh position={[0, 1.6, 0]}><boxGeometry args={[2.2, 3.2, 2.2]} /><meshStandardMaterial color="#8fa7c4" metalness={0.5} roughness={0.3} emissive={glow} emissiveIntensity={ok ? 0.35 : 0.08} /></mesh>;
  else if (t === 'weather_station' || t === 'air_quality' || t === 'public_facility') body = <>
    <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.5, 1.2, 0.5]} /><meshStandardMaterial color="#e9f1f7" metalness={0.35} roughness={0.18} /></mesh>
    <group ref={spin} position={[0, 1.35, 0]}><mesh><boxGeometry args={[0.7, 0.05, 0.08]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.6} /></mesh></group>
  </>;
  else if (t === 'pollution') body = ok ? <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshBasicMaterial color="#4fe39a" transparent opacity={0.4} /></mesh> : <>
    <mesh position={[0, 0.25, 0]}><dodecahedronGeometry args={[0.45, 0]} /><meshStandardMaterial color="#6e5a43" roughness={1} /></mesh>
    <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.5, 24, 18]} /><meshStandardMaterial color="#5b5048" transparent opacity={0.45} /></mesh>
  </>;
  else if (t === 'npc') body = ok ? null : <>
    <mesh position={[0, 0.55, 0]}><capsuleGeometry args={[0.22, 0.6, 8, 20]} /><meshStandardMaterial color="#ffa26b" /></mesh>
    <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.2, 24, 18]} /><meshStandardMaterial color="#f1c7a0" /></mesh>
    <group ref={spin} position={[0, 1.65, 0]}><mesh><octahedronGeometry args={[0.14, 0]} /><meshStandardMaterial color="#ffd36e" emissive="#ffb62e" emissiveIntensity={1} /></mesh></group>
  </>;
  else if (t === 'infra_challenge') body = <>
    <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.7, 1.5, 0.4]} /><meshStandardMaterial color="#1d1a33" metalness={0.75} roughness={0.2} /></mesh>
    <mesh position={[0, 1.05, 0.21]}><boxGeometry args={[0.55, 0.5, 0.02]} /><meshStandardMaterial color={ok ? '#4fe39a' : '#ff6bd5'} emissive={ok ? '#20d974' : '#d6309f'} emissiveIntensity={0.9} /></mesh>
  </>;
  else if (t === 'hydration') body = <>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.3, 0.35, 1.0, 24]} /><meshStandardMaterial color="#e3eef6" metalness={0.4} roughness={0.15} /></mesh>
    <mesh position={[0, 1.08, 0]}><sphereGeometry args={[0.18, 24, 18]} /><meshStandardMaterial color="#5ec8ff" emissive="#2b9fe0" emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>
  </>;
  else if (t === 'supply_crate') body = <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color="#c08a40" metalness={0.55} roughness={0.3} emissive="#ffb04a" emissiveIntensity={0.08} /></mesh>;
  else if (t === 'treasure') body = ok ? null : <group ref={spin} position={[0, 0.7, 0]}><mesh><icosahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#ffd700" emissive="#ffb000" emissiveIntensity={1.1} metalness={0.8} roughness={0.2} /></mesh></group>;
  else if (t === 'landmark_core') body = <group ref={spin} position={[0, 1.4, 0]}><mesh><torusGeometry args={[0.55, 0.05, 16, 64]} /><meshStandardMaterial color={ok ? '#4fe39a' : '#f2c45f'} emissive={ok ? '#20d974' : '#d69a2e'} emissiveIntensity={1} /></mesh></group>;
  return <group position={[object.position[0], groundY, object.position[1]]}><HoloPad color={glow} active={highlighted} />{ring}{body}</group>;
});

// Futuristic hex pad: dark glass base, neon rim and a slowly rotating scanner ring (shared look for all objects).
function HoloPad({ color, active }) {
  const ring = useRef(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.rotation.z = clock.elapsedTime * (active ? 1.6 : 0.6);
    ring.current.material.opacity = (active ? 0.75 : 0.42) + Math.sin(clock.elapsedTime * 2.4) * 0.12;
  });
  return <group>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.62, 0.68, 0.06, 24]} /><meshStandardMaterial color="#2a4a6e" metalness={0.25} roughness={0.35} emissive={color} emissiveIntensity={0.28} transparent opacity={0.85} /></mesh>
    <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.56, 0.62, 6]} /><meshBasicMaterial color={color} transparent opacity={0.9} /></mesh>
    <mesh ref={ring} position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.36, 0.42, 48, 1, 0, Math.PI * 1.4]} /><meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>;
}

function EnergyCore() {
  const core = useRef(null);
  const halo = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (core.current) { core.current.rotation.y = t * 1.4; core.current.position.y = Math.sin(t * 2) * 0.08; }
    if (halo.current) { halo.current.rotation.x = Math.PI / 2 + Math.sin(t) * 0.3; halo.current.rotation.z = t * 0.9; }
  });
  return <group scale={0.8}>
    <mesh ref={core}><octahedronGeometry args={[0.32, 1]} /><meshStandardMaterial color="#8af0ff" emissive="#11bde8" emissiveIntensity={1.3} metalness={0.6} roughness={0.12} flatShading /></mesh>
    <mesh ref={halo}><torusGeometry args={[0.52, 0.025, 12, 64]} /><meshBasicMaterial color="#6fe9ff" transparent opacity={0.75} /></mesh>
  </group>;
}

// Soft round contact shadow (one transparent disc) — replaces shadow mapping on phones.
function BlobShadow({ position, groundRef, controlRef }) {
  const mesh = useRef(null);
  useFrame(() => { const p = controlRef?.current?.pos || position; if (mesh.current) mesh.current.position.set(p[0], (groundRef?.current ?? 0) + 0.015, p[1]); });
  return <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
    <circleGeometry args={[0.32, 24]} /><meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
  </mesh>;
}

function ZoneRings({ zones, groundAt }) {
  return zones.map((zone) => <mesh key={zone.id} rotation={[-Math.PI / 2, 0, 0]} position={[zone.center[0], groundAt(zone.center[0], zone.center[1]) + 0.02, zone.center[1]]}>
    <ringGeometry args={[zone.radius - 0.12, zone.radius, 96]} /><meshBasicMaterial color={zone.color} transparent opacity={0.45} />
  </mesh>);
}

// WAVE effect: two expanding neon rings and rising sparkles around Twini.
function EmoteBurst({ signal, position, groundRef, controlRef }) {
  const group = useRef(null);
  const rings = useRef([]);
  const sparks = useRef([]);
  const start = useRef(-1);
  const [active, setActive] = useState(false);
  const first = useRef(signal);
  useEffect(() => {
    if (!signal || signal === first.current) return undefined;
    first.current = signal;
    start.current = -1;
    setActive(true);
    const timer = setTimeout(() => setActive(false), 1500);
    return () => clearTimeout(timer);
  }, [signal]);
  const sparkSeeds = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: 0.5 + (i % 3) * 0.18, v: 1.4 + (i % 4) * 0.35 })), []);
  useFrame(({ clock }) => {
    if (!active || !group.current) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = (clock.elapsedTime - start.current) / 1.4;
    const lp = controlRef?.current?.pos || position;
    group.current.position.set(lp[0], (groundRef?.current ?? 0) + 0.05, lp[1]);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const k = Math.max(0, Math.min(1, t * 1.25 - i * 0.22));
      ring.scale.setScalar(0.3 + k * 2.4);
      ring.material.opacity = (1 - k) * 0.9;
    });
    sparks.current.forEach((spark, i) => {
      if (!spark) return;
      const seed = sparkSeeds[i];
      const r = seed.r + t * 0.9;
      spark.position.set(Math.cos(seed.a + t * 2) * r, 0.3 + t * seed.v * 1.6, Math.sin(seed.a + t * 2) * r);
      spark.rotation.y = t * 8;
      spark.material.opacity = Math.max(0, 1 - t);
    });
  });
  if (!active) return null;
  return <group ref={group} scale={0.65} position={[position[0], (groundRef?.current ?? 0) + 0.05, position[1]]}>
    {['#22e6ff', '#ff3fd2'].map((color, i) => <mesh key={color} ref={(m) => { rings.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} scale={0.3}>
      <ringGeometry args={[0.42, 0.5, 40]} /><meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>)}
    {sparkSeeds.map((_, i) => <mesh key={i} ref={(m) => { sparks.current[i] = m; }}>
      <octahedronGeometry args={[0.07, 0]} /><meshBasicMaterial color={['#ffe36e', '#22e6ff', '#ff7be0', '#7dffb5'][i % 4]} transparent depthWrite={false} />
    </mesh>)}
  </group>;
}

// GUIDE action: a light pillar on the destination plus chevrons on the ground pointing towards it.
function GuideBeam({ guide, playerPosition, groundAt, controlRef }) {
  const pillar = useRef(null);
  const chevrons = useRef([]);
  useFrame(({ clock }) => {
    if (!guide) return;
    if (pillar.current) pillar.current.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.12;
    const p = controlRef?.current?.pos || playerPosition;
    const [tx, tz] = guide.position;
    const dx = tx - p[0];
    const dz = tz - p[1];
    const dist = Math.hypot(dx, dz) || 1;
    const ux = dx / dist;
    const uz = dz / dist;
    const count = Math.max(0, Math.min(5, Math.floor((dist - 1) / 0.9)));
    chevrons.current.forEach((c, i) => {
      if (!c) return;
      c.visible = i < count;
      if (!c.visible) return;
      const d = 1.1 + i * 0.9;
      const x = p[0] + ux * d;
      const z = p[1] + uz * d;
      c.position.set(x, groundAt(x, z) + 0.06, z);
      c.rotation.set(0, Math.atan2(ux, uz), 0);
      c.children[0].material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(clock.elapsedTime * 5 - i * 0.9));
    });
  });
  if (!guide) return null;
  const [tx, tz] = guide.position;
  return <>
    <mesh ref={pillar} position={[tx, groundAt(tx, tz) + 6, tz]}>
      <cylinderGeometry args={[0.35, 0.55, 12, 16, 1, true]} /><meshBasicMaterial color="#ffd36e" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[tx, groundAt(tx, tz) + 0.04, tz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 0.9, 36]} /><meshBasicMaterial color="#ffd36e" transparent opacity={0.85} depthWrite={false} />
    </mesh>
    {[0, 1, 2, 3, 4].map((i) => <group key={i} ref={(g) => { chevrons.current[i] = g; }} visible={false}>
      {/* Flat triangle lying on the ground; its tip points along the walking direction. */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <circleGeometry args={[0.28, 3]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>)}
  </>;
}

// Integrates Twini's movement once per frame. Rendered as the FIRST child of the scene so every other
// frame callback (avatar, shadow, camera, guide arrows) reads the same, already-updated position.
function LocomotionDriver({ controlRef, cameraForwardRef }) {
  useFrame((_state, delta) => {
    const live = controlRef?.current;
    if (!live) return;
    // ---- Locomotion: joystick/keys (screen space, camera relative) or patrol (world space) → smoothed velocity.
    let ix = live.input.dx;
    let iz = live.input.dz;
    let worldSpace = false;
    if (Math.hypot(ix, iz) < 1e-3 && live.auto) { ix = live.auto.dx; iz = live.auto.dz; worldSpace = true; }
    const mag = Math.min(1, Math.hypot(ix, iz));
    let tx = 0;
    let tz = 0;
    if (mag > STICK_DEAD) {
      let wx;
      let wz;
      if (worldSpace) { wx = ix / mag; wz = iz / mag; } else {
        const f = cameraForwardRef?.current || { x: 0, z: -1 };
        wx = -f.z * ix - f.x * iz;
        wz = f.x * ix - f.z * iz;
        const l = Math.hypot(wx, wz) || 1;
        wx /= l; wz /= l;
      }
      const amount = Math.min(1, (mag - STICK_DEAD) / (STICK_FULL - STICK_DEAD));
      // Never lock the player: when exhausted Twini still walks, just slower (and cannot run).
      const speed = (live.running && !live.exhausted ? RUN_SPEED : WALK_SPEED) * (live.exhausted ? 0.65 : 1) * amount;
      tx = wx * speed; tz = wz * speed;
    }
    const v = live.vel;
    // Integrate in <=50 ms sub-steps over the real frame time (up to 0.2 s), so a slow phone still
    // walks at the right speed instead of crawling.
    let remaining = Math.min(delta || 1 / 60, 0.2);
    while (remaining > 1e-4) {
      const sdt = Math.min(remaining, 0.05);
      remaining -= sdt;
      const k = 1 - Math.exp(-(tx || tz ? 11 : 15) * sdt); // quick but soft acceleration / braking
      v[0] += (tx - v[0]) * k;
      v[1] += (tz - v[1]) * k;
      if (!tx && !tz && Math.hypot(v[0], v[1]) < 0.03) { v[0] = 0; v[1] = 0; }
      let vx = v[0];
      let vz = v[1];
      if (live.dashT > 0) { vx += live.dashV[0]; vz += live.dashV[1]; live.dashT -= sdt; }
      if (vx || vz) {
        const pos = live.pos;
        let nx = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, pos[0] + vx * sdt));
        let nz = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, pos[1] + vz * sdt));
        // The Monas tower is solid: slide along its wall.
        const inTower = (x, z) => Math.abs(x) < MONAS_TOWER_HALF && Math.abs(z) < MONAS_TOWER_HALF;
        if (inTower(nx, nz)) {
          if (!inTower(nx, pos[1])) nz = pos[1];
          else if (!inTower(pos[0], nz)) nx = pos[0];
          else { nx = pos[0]; nz = pos[1]; }
        }
        live.distance += Math.hypot(nx - pos[0], nz - pos[1]);
        pos[0] = nx;
        pos[1] = nz;
      }
    }
    live.speed = Math.hypot(v[0], v[1]);
    if (live.speed > 0.15 && !(live.dashT > 0 && live.lockFacing)) live.facing = { dx: v[0] / live.speed, dz: v[1] / live.speed };
    live.__f = (live.__f || 0) + 1; live.__t = (live.__t || 0) + (delta || 0);
    if (live.__t >= 1) { console.log('[MOVEDBG]', 'fps', live.__f, 'pos', live.pos[0].toFixed(2), live.pos[1].toFixed(2), 'speed', live.speed.toFixed(2)); live.__f = 0; live.__t = 0; }
  });
  return null;
}

const DEFAULT_LIGHTING = { ambient: 1.5, sun: 2.3, sky: '#8db5c1', fogNear: 35, fogFar: 140 };

function World({ playerPosition, movementDirection = { dx: 0, dz: 1 }, moving, running, jumping, cameraZoom = 1.0, cameraTilt = 0, foundPickups, character, cameraForwardRef, worldObjects = [], objectState = {}, highlightId = null, zones = [], lighting = DEFAULT_LIGHTING, cameraSensitivity = 1, emoteSignal = 0, focusSignal = 0, guide = null, controlRef }) {
  const orbitControls = useRef(null);
  // Real walkable surface under Twini (ray cast against the kawasan mesh, throttled), so feet stand on the paving.
  const kawasanScene = useRef(null);
  const groundMeshes = useRef([]);
  const setKawasanScene = React.useCallback((scene) => {
    kawasanScene.current = scene;
    const list = [];
    scene?.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const name = o.material?.name || '';
      const tris = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      // Raycasting has no BVH here: skip big decorative meshes so a probe tests a few hundred triangles, not ~47k.
      if (tris > 2500 || /^(Monas4|Gold|Lamps?|Gate|Cawan|Grade_cima|.*Fence.*|Giant_Corpses.*|Pot|_Vegetation.*|PaletteMaterial.*)$/i.test(name)) return;
      list.push(o);
    });
    groundMeshes.current = list;
  }, []);
  const surfaceRef = useRef(null);
  const surfaceProbe = useRef({ t: -1, x: NaN, z: NaN, ready: false });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  // FOCUS action: swing the camera behind Twini's facing direction.
  const focus = useRef({ signal: focusSignal, start: -1 });
  // Smoothed look-ahead target; the camera is translated by its per-frame delta so it follows the player
  // while keeping the orbit angle the user chose (forward on screen stays forward for WASD/joystick).
  const followTarget = useRef(null);
  // Once the real Monas & kawasan model is on screen, hide procedural props that would overlap it.
  const [kawasanReady, setKawasanReady] = useState(false);
  const outsideKawasan = ([x, z]) => !kawasanReady || !insideKawasan(x, z, 1);
  const groundAt = (x, z) => (kawasanReady ? kawasanGroundHeight(x, z) : 0);
  const groundY = groundAt(playerPosition[0], playerPosition[1]);
  if (surfaceRef.current == null) surfaceRef.current = groundY;
  const trees = [[-3, -4], [3, -4], [-4, 1], [4, 2], [-2, 6], [2, 7], [-8, 4], [8, -5], [-6, -7], [6, 6], [-9, -2], [9, 2], [-3, 9], [3, -9], [-7, 0], [7, 0], [0, -8], [0, 8], [-10, -5], [10, 5], [-17, -18], [-10, -19], [0, -18], [10, -18], [18, -16], [-18, -8], [-19, 2], [-18, 13], [-10, 19], [0, 19], [12, 18], [19, 10], [19, -1], [12, -18], [-27, -18], [-25, -8], [-25, 4], [-23, 16], [-16, 24], [-6, 26], [5, 25], [16, 23], [25, 15], [27, 5], [26, -7], [22, -20], [12, -26], [0, -27], [-12, -25]];
  const blocks = [[-12, -10, 2.3, 4, 3], [-8, -12, 2.1, 3, 2.5], [-3, -12, 2.5, 5, 3], [3, -12, 2.5, 3.6, 3], [8, -11, 3, 5.2, 3.2], [12, -8, 2.6, 4.2, 3], [-12, 8, 2.6, 4.5, 3], [-8, 12, 2.2, 3.6, 3], [8, 11, 2.8, 5, 3], [12, 8, 2.5, 4, 3], [-12, 0, 2.4, 5, 3], [12, -1, 2.5, 4.5, 3], [-10, 11, 2.6, 6.5, 3.2], [10, -13, 2.8, 7, 3.4], [-13, -4, 2.5, 6, 3.2], [13, 4, 2.4, 5.5, 3], [-20, -17, 3.5, 7, 4], [-14, -20, 3, 4.5, 4], [-3, -21, 3.5, 8, 4], [8, -21, 4, 6, 4], [18, -20, 3.8, 9, 4], [-21, -5, 4, 6, 4], [-21, 8, 3.5, 8, 4], [-18, 19, 4, 5, 4], [-5, 21, 3.5, 7, 4], [8, 21, 4, 9, 4], [20, 18, 3.8, 6, 4], [21, 4, 4, 7, 4]];
  const lamps = [[-5, -5], [5, -5], [-5, 5], [5, 5], [-10, 0], [10, 0], [0, -10], [0, 10], [-16, -16], [16, -16], [-16, 16], [16, 16]];
  useFrame(({ camera, clock }, delta) => {
    if (!camera) return;
    const dt = Math.min(delta || 1 / 60, 0.05);
    const live = controlRef?.current;
    const p = live ? live.pos : playerPosition;
    const groundY = groundAt(p[0], p[1]);
    // Ground probe: at most ~6x/s and only after Twini moved. Hits far from the analytic height
    // (railings, roofs, trees) are ignored so Twini never climbs onto props.
    const probe = surfaceProbe.current;
    const sceneReady = !!(kawasanScene.current && kawasanReady);
    const moved = Math.hypot(p[0] - probe.x, p[1] - probe.z) > 0.05 || probe.ready !== sceneReady;
    if (moved && clock.elapsedTime - probe.t > 0.18) {
      probe.t = clock.elapsedTime; probe.x = p[0]; probe.z = p[1]; probe.ready = sceneReady;
      let surface = groundY;
      if (sceneReady) {
        rayOrigin.set(p[0], groundY + 0.9, p[1]);
        raycaster.set(rayOrigin, down);
        raycaster.far = 1.6;
        const hit = raycaster.intersectObjects(groundMeshes.current, false)[0];
        if (hit && Math.abs(hit.point.y - groundY) <= 0.45) surface = hit.point.y;
      }
      surfaceRef.current = surface;
    }
    const zoom = cameraZoom ?? 1.0;
    camera.fov = 46 / zoom;
    camera.updateProjectionMatrix();
    const controls = orbitControls.current?.instance || orbitControls.current;
    if (controls?.target) {
      const lookDir = live ? live.facing : movementDirection;
      const ahead = live ? Math.min(1, live.speed / WALK_SPEED) * 1.0 : moving ? 1.2 : 0;
      const frontX = (lookDir.dx || 0) * ahead;
      const frontZ = (lookDir.dz || 0) * ahead;
      const tilt = cameraTilt ?? 0;
      const goal = [p[0] + frontX, groundY + 0.85 + tilt * 0.8, p[1] + frontZ];
      if (!followTarget.current) followTarget.current = [...controls.target.toArray()];
      const prev = followTarget.current;
      const follow = 1 - Math.exp(-9 * dt); // frame-rate independent camera follow
      const next = prev.map((value, index) => value + (goal[index] - value) * follow);
      followTarget.current = next;
      camera.position.x += next[0] - prev[0];
      camera.position.y += next[1] - prev[1];
      camera.position.z += next[2] - prev[2];
      controls.target.set(next[0], next[1], next[2]);
      if (focus.current.signal !== focusSignal) { focus.current = { signal: focusSignal, start: clock.elapsedTime }; }
      if (focus.current.start >= 0) {
        const k = Math.min(1, (clock.elapsedTime - focus.current.start) / 0.45);
        const fd = live ? live.facing : movementDirection;
        const rawLength = Math.hypot(fd.dx || 0, fd.dz || 0);
        const fx = rawLength > 1e-4 ? fd.dx / rawLength : 0;
        const fz = rawLength > 1e-4 ? fd.dz / rawLength : 1;
        const horizontal = Math.max(2.4, Math.hypot(camera.position.x - next[0], camera.position.z - next[2]));
        const goalX = next[0] - fx * horizontal;
        const goalZ = next[2] - fz * horizontal;
        const goalY = next[1] + Math.max(1.1, camera.position.y - next[1]);
        const blend = 0.25 + k * 0.75;
        camera.position.x += (goalX - camera.position.x) * blend;
        camera.position.z += (goalZ - camera.position.z) * blend;
        camera.position.y += (goalY - camera.position.y) * blend;
        if (k >= 1) focus.current.start = -1;
      }
      controls.update?.();
      // Tilt lock: the camera never dips below the surface (no view from under the ground).
      const minCamY = Math.max(groundAt(camera.position.x, camera.position.z), surfaceRef.current ?? 0) + 0.45;
      if (camera.position.y < minCamY) { camera.position.y = minCamY; camera.lookAt(controls.target); }
    }
    if (cameraForwardRef) {
      const target = controls?.target;
      const fx = (target ? target.x : playerPosition[0]) - camera.position.x;
      const fz = (target ? target.z : playerPosition[1]) - camera.position.z;
      const length = Math.hypot(fx, fz);
      if (length > 1e-4) cameraForwardRef.current = { x: fx / length, z: fz / length };
    }
  });
  return <>
    <LocomotionDriver controlRef={controlRef} cameraForwardRef={cameraForwardRef} />
    <color attach="background" args={[lighting.sky]} />
    <fog attach="fog" args={[lighting.sky, lighting.fogNear, lighting.fogFar]} />
    <ambientLight intensity={lighting.ambient} />
    <directionalLight position={[14, 22, 10]} intensity={lighting.sun} castShadow />
    <hemisphereLight args={['#d7f3ff', '#365744', 0.8]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow><planeGeometry args={[300, 300]} /><meshStandardMaterial color="#4a9a70" roughness={0.95} /></mesh>
    {/* Square open park boundary: 280 m across, well beyond the Monas plaza. */}
    {[[-140, 0, 280, 0.34], [140, 0, 280, 0.34], [0, -140, 0.34, 280], [0, 140, 0.34, 280]].map(([x, z, width, depth], index) => (
      <mesh key={`park-boundary-${index}`} position={[x, 0.015, z]}><boxGeometry args={[width, 0.04, depth]} /><meshBasicMaterial color="#b6d4ac" transparent opacity={0.5} /></mesh>
    ))}
    {!kawasanReady && <>
    {/* Medan Merdeka's planted lawns, tiled ceremonial plaza, and radial walks. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}><ringGeometry args={[3.8, 4.45, 64]} /><meshStandardMaterial color="#b9b5a5" roughness={0.82} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.038, 0]}><ringGeometry args={[4.55, 8.4, 64]} /><meshStandardMaterial color="#c6bda7" roughness={0.82} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}><ringGeometry args={[8.35, 9.8, 64]} /><meshStandardMaterial color="#d4c8a8" roughness={0.87} /></mesh>
    {[5.2, 6.2, 7.2, 8.15].map((radius) => <mesh key={`plaza-line-${radius}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.026, 0]}><ringGeometry args={[radius, radius + 0.035, 64]} /><meshStandardMaterial color="#918e83" roughness={0.78} /></mesh>)}
    </>}
    {/* The OSM road network is the only road layer; synthetic paths are intentionally omitted to avoid overlap. */}
    <MonasMapNetwork kawasanReady={kawasanReady} />
    {outsideKawasan([16, -11]) && <ParkPond position={[16, -11]} size={[8, 4.5]} />}
    {outsideKawasan([-17, -11]) && <SportsCourt position={[-17, -11]} />}
    <MonasKawasan onReady={setKawasanReady} onScene={setKawasanScene} />
    {!kawasanReady && <MonasFallback />}
    {kawasanReady && <GoldenFlameSparkle />}
    {trees.map(([x, z], index) => outsideKawasan([x, z]) && <ParkTree key={`tree-${index}`} position={[x, 0, z]} scale={0.72 + (index % 3) * 0.13} />)}
    {lamps.map(([x, z], index) => outsideKawasan([x, z]) && <ParkLamp key={`lamp-${index}`} position={[x, 0, z]} />)}
    {!kawasanReady && [[-5, -2, 0], [5, -2, 0], [-5, 2, Math.PI], [5, 2, Math.PI]].map(([x, z, rotation], index) => <ParkBench key={`bench-${index}`} position={[x, 0, z]} rotation={rotation} />)}
    {pickupPoints.map(([x, z], index) => !foundPickups.includes(index) && <group key={`crystal-${index}`} position={[x, groundAt(x, z) + 0.65, z]}>
      <EnergyCore />
    </group>)}
    <ZoneRings zones={zones} groundAt={groundAt} />
    {worldObjects.map((object) => <WorldObjectMarker key={object.id} object={object} state={objectState[object.id]} highlighted={object.id === highlightId} groundY={groundAt(object.position[0], object.position[1])} />)}
    <TwiniAvatar character={character} position={playerPosition} movementDirection={movementDirection} moving={moving} running={running} jumping={jumping} groundY={groundY} groundRef={surfaceRef} emoteSignal={emoteSignal} controlRef={controlRef} />
    <BlobShadow position={playerPosition} groundRef={surfaceRef} controlRef={controlRef} />
    <EmoteBurst signal={emoteSignal} position={playerPosition} groundRef={surfaceRef} controlRef={controlRef} />
    <GuideBeam guide={guide} playerPosition={playerPosition} groundAt={groundAt} controlRef={controlRef} />
    <OrbitControls ref={orbitControls} makeDefault enablePan={false} enableDamping rotateSpeed={cameraSensitivity} minDistance={1.0} maxDistance={14} minPolarAngle={0.12} maxPolarAngle={Math.PI * 0.46} />
  </>;
}

function SurvivalWorldSceneImpl(props) {
  return <Canvas style={StyleSheet.absoluteFill} camera={{ position: [0, 3.6, 13.4], fov: 46, near: 0.05, far: 300 }} dpr={Platform.OS === 'web' ? [1, 1.15] : [1, 1.25]} shadows={Platform.OS === 'web'} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ camera, gl }) => { quietExpoGL(gl); camera.lookAt(0, 0.85, 8); camera.updateProjectionMatrix(); }}>
    <World {...props} cameraZoom={props.cameraZoom ?? 1.0} cameraTilt={props.cameraTilt ?? 0} />
  </Canvas>;
}

// The screen re-renders a few times per second while Twini walks (HUD, mini map). The live position and
// facing already reach the scene through controlRef every frame, so ignore those props here.
const LIVE_PROPS = new Set(['playerPosition', 'movementDirection']);
export default React.memo(SurvivalWorldSceneImpl, (prev, next) => {
  if (!next.controlRef) return false;
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) if (!LIVE_PROPS.has(key) && prev[key] !== next[key]) return false;
  return true;
});
