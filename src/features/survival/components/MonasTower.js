import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { MONAS_WALK_Y } from '../data/monasTerrace';

// Detailed, watertight National Monument (Monas) built from closed procedural solids, so nothing looks hollow
// or has holes when the camera gets close (the old SketchUp tower had single-sided faces).
// Proportions follow the real monument: 132 m → 30 game units (1 unit ≈ 4.4 m), standing on the kawasan podium.
const BASE_Y = 0.9;      // podium top
const CUP_TOP = 3.95;    // cawan (cup) terrace ≈ 17 m
const SHAFT_TOP = 26.1;  // pelataran puncak ≈ 115 m
export const MONAS_FLAME_CENTER = [0, 28.75, 0];
// Pelataran: tinggi & bentuknya mengikuti data/monasTerrace.js (dipakai juga oleh groundAt + test).
const WALK_Y = MONAS_WALK_Y;

// Square "lathe": 4 radial segments rotated 45° gives a square cross-section; flat-shaded faces.
function squareLathe(profile) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * Math.SQRT2, y)), 4, Math.PI / 4);
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  geo.dispose();
  return flat;
}

// Stylised flame: a bulb that tapers to a tip, with twisting flame tongues.
function flameGeometry() {
  const pts = [];
  const H = 3.15;
  for (let i = 0; i <= 28; i += 1) {
    const t = i / 28;
    const r = 0.72 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.08)), 0.9) * (1 - t * 0.55) + (t < 0.1 ? 0.05 : 0);
    pts.push(new THREE.Vector2(Math.max(0.001, r), t * H));
  }
  pts.push(new THREE.Vector2(0.001, H + 0.05));
  const geo = new THREE.LatheGeometry(pts, 48);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const h = v.y / H;
    const a = Math.atan2(v.z, v.x) + h * 1.6; // twist
    const r = Math.hypot(v.x, v.z) * (1 + 0.2 * Math.sin(a * 5 + h * 7) * Math.min(1, h * 2.2));
    pos.setXYZ(i, Math.cos(a) * r, v.y, Math.sin(a) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function MonasTower({ goldMaterial }) {
  const lampRing = useRef(null);
  const glow = useRef(null);
  const parts = useMemo(() => {
    // Cawan: concave square cup — narrow neck at the podium flaring out to a wide terrace with sharp corners.
    const cupProfile = [[0, BASE_Y], [3.15, BASE_Y], [3.05, BASE_Y + 0.6], [3.15, BASE_Y + 1.25], [3.5, BASE_Y + 1.9], [4.15, BASE_Y + 2.45], [4.95, BASE_Y + 2.82], [5.35, CUP_TOP - 0.06], [5.35, CUP_TOP], [0, CUP_TOP]];
    // Tugu: slender tapered obelisk with a stepped plinth.
    const shaftProfile = [[0, CUP_TOP], [1.6, CUP_TOP], [1.6, CUP_TOP + 0.45], [1.34, CUP_TOP + 0.6], [1.26, CUP_TOP + 1.2], [0.9, SHAFT_TOP - 0.35], [1.0, SHAFT_TOP - 0.2], [1.0, SHAFT_TOP], [0, SHAFT_TOP]];
    // Pelataran puncak: overhanging observation deck + lantern room.
    const deckProfile = [[0, SHAFT_TOP], [1.7, SHAFT_TOP], [1.8, SHAFT_TOP + 0.32], [1.8, SHAFT_TOP + 0.42], [1.1, SHAFT_TOP + 0.48], [1.1, SHAFT_TOP + 1.05], [1.25, SHAFT_TOP + 1.12], [0, SHAFT_TOP + 1.18]];
    const bronzeProfile = [[0.001, SHAFT_TOP + 1.18], [0.55, SHAFT_TOP + 1.18], [0.82, SHAFT_TOP + 1.38], [0.7, SHAFT_TOP + 1.5], [0.001, SHAFT_TOP + 1.5]];
    return {
      cup: squareLathe(cupProfile),
      shaft: squareLathe(shaftProfile),
      deck: squareLathe(deckProfile),
      bronze: new THREE.LatheGeometry(bronzeProfile.map(([r, y]) => new THREE.Vector2(r, y)), 32),
      flame: flameGeometry(),
    };
  }, []);
  const marble = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.38, metalness: 0.05, flatShading: true }), []);
  const marbleShade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9d6cc', roughness: 0.5, flatShading: true }), []);
  const groove = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9c5b9', roughness: 0.6 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#203347', metalness: 0.6, roughness: 0.15, emissive: '#3a6ea8', emissiveIntensity: 0.35 }), []);
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a5a2b', metalness: 0.8, roughness: 0.32 }), []);
  const lamp = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff2c4' }), []);
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfd8e3', metalness: 0.9, roughness: 0.2 }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (glow.current) glow.current.material.opacity = 0.22 + Math.sin(t * 1.6) * 0.08;
    if (lampRing.current) lampRing.current.rotation.y = t * 0.05;
  });

  // Vertical relief grooves on each shaft face (4 per face), following the taper.
  const grooves = [];
  const shaftLow = CUP_TOP + 1.2;
  const shaftH = SHAFT_TOP - 0.35 - shaftLow;
  const halfMid = (1.26 + 0.9) / 2;
  const lean = Math.atan2(1.26 - 0.9, shaftH);
  for (let side = 0; side < 4; side += 1) {
    const rot = (side * Math.PI) / 2;
    for (const off of [-0.54, -0.18, 0.18, 0.54]) {
      grooves.push(<group key={`${side}${off}`} rotation={[0, rot, 0]}>
        <mesh position={[off * 0.88, shaftLow + shaftH / 2, halfMid + 0.005]} rotation={[-lean, 0, 0]}><boxGeometry args={[0.07, shaftH, 0.04]} /><primitive object={groove} attach="material" /></mesh>
      </group>);
    }
  }
  // Horizontal bands every ~5 units.
  const bands = [8, 13, 18, 23].map((y) => {
    const k = (y - shaftLow) / shaftH;
    const half = 1.26 + (0.9 - 1.26) * k;
    return <mesh key={y} position={[0, y, 0]}><boxGeometry args={[half * 2 + 0.06, 0.08, half * 2 + 0.06]} /><primitive object={marbleShade} attach="material" /></mesh>;
  });
  // Cup terrace parapet posts + corner lamps.
  const posts = [];
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    for (let j = -4; j <= 4; j += 1) {
      const p = j * 1.15;
      const x = Math.cos(a) * 5.2 - Math.sin(a) * p;
      const z = Math.sin(a) * 5.2 + Math.cos(a) * p;
      posts.push(<mesh key={`p${i}${j}`} position={[x, CUP_TOP + 0.22, z]}><boxGeometry args={[0.09, 0.44, 0.09]} /><primitive object={marbleShade} attach="material" /></mesh>);
    }
  }

  return <group>
    {/* Plinth/pelataran lebar: permukaan datar yang bisa dipijak mengelilingi tugu */}
    <mesh position={[0, WALK_Y - 0.08, 0]}><boxGeometry args={[13.4, 0.16, 13.4]} /><primitive object={marbleShade} attach="material" /></mesh>
    {/* Tepi pelataran (trim) tanpa railing */}
    {[[0, 6.62], [0, -6.62], [6.62, 0], [-6.62, 0]].map(([x, z], index) => (
      <mesh key={`trim${index}`} position={[x, WALK_Y + 0.015, z]}>
        <boxGeometry args={x === 0 ? [13.3, 0.05, 0.12] : [0.12, 0.05, 13.3]} />
        <primitive object={marbleShade} attach="material" />
      </mesh>
    ))}
    {/* Tangga lebar di 4 sisi pelataran (bisa dinaiki) */}
    {[0, 1, 2, 3].map((side) => (
      <group key={`stairs${side}`} rotation={[0, (side * Math.PI) / 2, 0]}>
        {Array.from({ length: 5 }, (_, step) => {
          const height = WALK_Y * (1 - step / 5);
          return <mesh key={`st${step}`} position={[0, height / 2, 6.7 + step * 0.34]}>
            <boxGeometry args={[4.6, Math.max(0.05, height), 0.34]} />
            <primitive object={marble} attach="material" />
          </mesh>;
        })}
      </group>
    ))}
    <mesh geometry={parts.cup} material={marble} castShadow />
    {/* Entrance portal on the north face */}
    <mesh position={[0, BASE_Y + 0.75, 3.12]}><boxGeometry args={[1.5, 1.5, 0.3]} /><primitive object={glass} attach="material" /></mesh>
    <mesh position={[0, BASE_Y + 1.58, 3.2]}><boxGeometry args={[1.9, 0.16, 0.4]} /><primitive object={marbleShade} attach="material" /></mesh>
    {/* Terrace parapet rails */}
    {[0, 1, 2, 3].map((i) => <mesh key={`rail${i}`} position={[Math.cos((i * Math.PI) / 2) * 5.2, CUP_TOP + 0.45, Math.sin((i * Math.PI) / 2) * 5.2]} rotation={[0, (i * Math.PI) / 2, 0]}><boxGeometry args={[0.08, 0.06, 10.4]} /><primitive object={marbleShade} attach="material" /></mesh>)}
    {posts}
    <mesh geometry={parts.shaft} material={marble} castShadow />
    {grooves}
    {bands}
    <mesh geometry={parts.deck} material={marble} />
    {/* Lantern-room windows */}
    <mesh position={[0, SHAFT_TOP + 0.76, 0]}><boxGeometry args={[2.24, 0.42, 2.24]} /><primitive object={glass} attach="material" /></mesh>
    {/* Deck railing lamps */}
    <group ref={lampRing}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <mesh key={`l${i}`} position={[Math.cos(a) * 1.75, SHAFT_TOP + 0.5, Math.sin(a) * 1.75]}><sphereGeometry args={[0.07, 8, 6]} /><primitive object={lamp} attach="material" /></mesh>;
      })}
    </group>
    <mesh geometry={parts.bronze} material={bronze} />
    <mesh geometry={parts.flame} material={goldMaterial} position={[0, SHAFT_TOP + 1.42, 0]} />
    {/* Soft uplight halo around the cup at night/day */}
    <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE_Y + 0.02, 0]}><ringGeometry args={[5.9, 7.2, 64]} /><meshBasicMaterial color="#ffe7a8" transparent opacity={0.22} depthWrite={false} /></mesh>

    {/* ---- Pelataran: tanpa railing; panel relief, pintu, tiang bendera, lampu, bollard ---- */}
    {/* panel relief di dinding cawan (12 medali) + pintu samping */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
      const side = Math.floor(i / 3);
      const offset = (i % 3 - 1) * 1.5;
      const a = (side * Math.PI) / 2;
      const x = Math.cos(a) * (3.35 + 0.02) - Math.sin(a) * offset;
      const z = Math.sin(a) * (3.35 + 0.02) + Math.cos(a) * offset;
      return <mesh key={`relief${i}`} position={[x, BASE_Y + 1.5, z]} rotation={[0, a, 0]}><boxGeometry args={[1.15, 1.9, 0.05]} /><primitive object={marbleShade} attach="material" /></mesh>;
    })}
    {[0, 1, 2, 3].map((i) => {
      const a = (i * Math.PI) / 2;
      return <mesh key={`door${i}`} position={[Math.cos(a) * 3.32, BASE_Y + 0.62, Math.sin(a) * 3.32]} rotation={[0, a, 0]}><boxGeometry args={[0.95, 1.2, 0.08]} /><primitive object={glass} attach="material" /></mesh>;
    })}
    {/* tiang bendera + lampu sorot + bollard di pelataran */}
    <mesh position={[4.2, BASE_Y + 2.4, 5.6]}><cylinderGeometry args={[0.035, 0.045, 4.8, 8]} /><primitive object={chrome} attach="material" /></mesh>
    <mesh position={[4.2, BASE_Y + 2.45, 5.6]}><sphereGeometry args={[0.07, 10, 8]} /><primitive object={goldMaterial} attach="material" /></mesh>
    <mesh position={[3.93, BASE_Y + 4.3, 5.6]}><boxGeometry args={[0.54, 0.34, 0.02]} /><meshStandardMaterial color="#e23b3b" emissive="#a81414" emissiveIntensity={0.25} /></mesh>
    {[0, 1, 2, 3].map((i) => {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      return <group key={`flood${i}`} position={[Math.cos(a) * 6.0, WALK_Y, Math.sin(a) * 6.0]} rotation={[0, -a, 0]}>
        <mesh position={[0, 0.18, 0]}><boxGeometry args={[0.16, 0.36, 0.16]} /><primitive object={marbleShade} attach="material" /></mesh>
        <mesh position={[0, 0.4, 0.04]} rotation={[-0.5, 0, 0]}><boxGeometry args={[0.26, 0.16, 0.06]} /><primitive object={lamp} attach="material" /></mesh>
      </group>;
    })}
    {Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return <mesh key={`bollard${i}`} position={[Math.cos(a) * 9.6, 0.2, Math.sin(a) * 9.6]}><cylinderGeometry args={[0.07, 0.09, 0.4, 8]} /><primitive object={marbleShade} attach="material" /></mesh>;
    })}
  </group>;
}
