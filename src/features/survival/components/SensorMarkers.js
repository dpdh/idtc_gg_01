import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';

// Colourful, animated models for the interactive Digital Twin objects. Each object uses ≤ ~10 meshes and one
// frame callback; no per-object lights (cheap on mobile GPUs). "ok" = repaired / synced / done state.
const DARK = '#1f2b3a';
const STEEL = '#c9d4de';
const OK = '#4fe39a';

const Std = ({ color, metal = 0.35, rough = 0.35, glow, glowI = 0.8, ...rest }) => <meshStandardMaterial color={color} metalness={metal} roughness={rough} emissive={glow || '#000000'} emissiveIntensity={glow ? glowI : 0} {...rest} />;
const Glow = ({ color, opacity = 1 }) => <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />;

function useAnim(fn) {
  const refs = useRef({});
  useFrame(({ clock }) => fn(refs.current, clock.elapsedTime));
  return (key) => (node) => { refs.current[key] = node; };
}

// Futuristic hex pad shared by every object: dark glass base, neon rim and a rotating scanner arc.
function HoloPad({ color, active, r = 0.62 }) {
  const ref = useAnim((m, t) => {
    if (m.arc) { m.arc.rotation.z = t * (active ? 1.8 : 0.7); m.arc.material.opacity = (active ? 0.85 : 0.45) + Math.sin(t * 2.4) * 0.12; }
  });
  return <group>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[r, r + 0.06, 0.06, 6]} /><Std color="#2a4a6e" metal={0.25} rough={0.35} glow={color} glowI={0.3} transparent opacity={0.88} /></mesh>
    <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r - 0.06, r, 6]} /><Glow color={color} /></mesh>
    <mesh ref={ref('arc')} position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r * 0.58, r * 0.68, 40, 1, 0, Math.PI * 1.4]} /><meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>;
}

function IotSensor({ c, ok }) {
  const col = ok ? OK : c;
  const ref = useAnim((m, t) => {
    if (m.ring) { m.ring.rotation.y = t * 1.6; m.ring.position.y = 1.55 + Math.sin(t * 2) * 0.06; }
    if (m.led) m.led.material.opacity = 0.35 + Math.max(0, Math.sin(t * 6)) * 0.65;
  });
  return <>
    <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.05, 0.08, 1.3, 10]} /><Std color={STEEL} metal={0.8} rough={0.25} /></mesh>
    <mesh position={[0, 1.42, 0]}><cylinderGeometry args={[0.24, 0.24, 0.36, 6]} /><Std color="#eef3f8" metal={0.3} rough={0.3} /></mesh>
    <mesh position={[0, 1.42, 0]}><cylinderGeometry args={[0.25, 0.25, 0.1, 6]} /><Std color={col} glow={col} glowI={1.1} /></mesh>
    <mesh position={[0, 1.66, 0]}><coneGeometry args={[0.24, 0.16, 6]} /><Std color={DARK} metal={0.6} /></mesh>
    <mesh ref={ref('ring')} position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.38, 0.018, 6, 32]} /><Glow color={col} /></mesh>
    <mesh position={[0, 1.95, 0]}><cylinderGeometry args={[0.012, 0.012, 0.5, 4]} /><Std color={STEEL} metal={0.8} /></mesh>
    <mesh ref={ref('led')} position={[0, 2.22, 0]}><sphereGeometry args={[0.055, 10, 8]} /><Glow color={ok ? OK : '#ff5577'} opacity={0.9} /></mesh>
  </>;
}

function StreetLight({ c, ok }) {
  const ref = useAnim((m, t) => { if (m.ring) m.ring.material.opacity = 0.4 + Math.sin(t * 2.5) * 0.2; });
  const lit = ok ? '#fff1b8' : '#5b5644';
  return <>
    <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.055, 0.09, 3, 10]} /><Std color="#2b3a4c" metal={0.85} rough={0.22} /></mesh>
    <mesh position={[0.35, 2.95, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.35, 0.04, 6, 16, Math.PI / 2]} /><Std color="#2b3a4c" metal={0.85} rough={0.22} /></mesh>
    <mesh position={[0.72, 3.2, 0]}><boxGeometry args={[0.62, 0.1, 0.26]} /><Std color="#dfe7ef" metal={0.4} /></mesh>
    <mesh position={[0.72, 3.14, 0]}><boxGeometry args={[0.54, 0.03, 0.2]} /><Glow color={lit} /></mesh>
    {ok ? <mesh position={[0.72, 1.55, 0]}><coneGeometry args={[0.85, 3.1, 16, 1, true]} /><meshBasicMaterial color="#fff3c4" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} /></mesh> : null}
    <mesh position={[0, 3.08, 0]}><boxGeometry args={[0.3, 0.04, 0.3]} /><Std color="#18406e" metal={0.7} rough={0.2} glow="#2a6dff" glowI={0.25} /></mesh>
    <mesh ref={ref('ring')} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.025, 6, 20]} /><meshBasicMaterial color={ok ? OK : c} transparent opacity={0.5} /></mesh>
  </>;
}

function Cctv({ c, ok }) {
  const ref = useAnim((m, t) => {
    if (m.head) m.head.rotation.y = Math.sin(t * 0.7) * 0.9;
    if (m.led) m.led.material.opacity = Math.sin(t * 4) > 0 ? 1 : 0.2;
  });
  return <>
    <mesh position={[0, 1.25, 0]}><cylinderGeometry args={[0.05, 0.07, 2.5, 10]} /><Std color="#2b3a4c" metal={0.85} rough={0.22} /></mesh>
    <group ref={ref('head')} position={[0, 2.5, 0]}>
      <mesh position={[0.18, 0.02, 0]}><boxGeometry args={[0.5, 0.14, 0.26]} /><Std color="#f2f5f8" metal={0.3} rough={0.3} /></mesh>
      <mesh position={[0.18, -0.1, 0]}><sphereGeometry args={[0.15, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Std color="#0f1d2c" metal={0.7} rough={0.1} glow={ok ? OK : c} glowI={0.35} /></mesh>
      <mesh ref={ref('led')} position={[0.44, 0.04, 0.09]}><sphereGeometry args={[0.03, 8, 6]} /><Glow color={ok ? OK : '#ff3355'} opacity={0.95} /></mesh>
    </group>
  </>;
}

function Drainage({ c, ok }) {
  const ref = useAnim((m, t) => { if (m.buoy) m.buoy.position.y = 0.3 + Math.sin(t * 2.2) * 0.06; if (m.water) m.water.material.opacity = 0.65 + Math.sin(t * 3) * 0.12; });
  return <>
    <mesh position={[0, 0.07, 0]}><boxGeometry args={[1.6, 0.14, 0.72]} /><Std color="#56636f" metal={0.6} rough={0.5} /></mesh>
    {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => <mesh key={x} position={[x, 0.15, 0]}><boxGeometry args={[0.06, 0.03, 0.58]} /><Std color="#2b3a4c" metal={0.8} /></mesh>)}
    <mesh ref={ref('water')} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.45, 0.56]} /><meshBasicMaterial color={ok ? '#3fb6ff' : '#7a6a48'} transparent opacity={0.7} depthWrite={false} /></mesh>
    <mesh ref={ref('buoy')} position={[0.95, 0.3, 0]}><sphereGeometry args={[0.13, 14, 10]} /><Std color={ok ? '#5ec8ff' : '#ff9a3d'} glow={ok ? '#1a8fd6' : '#b45309'} glowI={0.6} /></mesh>
    <mesh position={[0.95, 0.55, 0]}><cylinderGeometry args={[0.012, 0.012, 0.38, 4]} /><Std color={STEEL} /></mesh>
  </>;
}

function EnergyStation({ c, ok }) {
  const col = ok ? OK : c;
  const ref = useAnim((m, t) => { if (m.holo) { m.holo.rotation.y = t * 1.2; m.holo.position.y = 2.05 + Math.sin(t * 2) * 0.08; } });
  return <>
    <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.9, 1.5, 0.55]} /><Std color="#1c2b40" metal={0.7} rough={0.25} /></mesh>
    <mesh position={[0, 1.55, 0]}><boxGeometry args={[1.0, 0.1, 0.65]} /><Std color={col} glow={col} glowI={1} /></mesh>
    <mesh position={[0, 1.05, 0.28]}><boxGeometry args={[0.6, 0.38, 0.02]} /><Std color="#0b1626" glow={col} glowI={ok ? 1.2 : 0.5} /></mesh>
    <mesh position={[0.38, 0.55, 0.3]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.16, 0.035, 6, 16, Math.PI * 1.3]} /><Std color="#111" rough={0.6} /></mesh>
    <group ref={ref('holo')} position={[0, 2.05, 0]}>
      <mesh><boxGeometry args={[0.22, 0.36, 0.12]} /><meshBasicMaterial color={col} transparent opacity={0.6} /></mesh>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.1, 0.06, 0.08]} /><meshBasicMaterial color={col} transparent opacity={0.6} /></mesh>
    </group>
  </>;
}

function SolarPanel({ ok }) {
  return <>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.06, 0.08, 1, 8]} /><Std color="#2b3a4c" metal={0.8} /></mesh>
    <group position={[0, 1.02, 0]} rotation={[-0.5, 0, 0]}>
      <mesh><boxGeometry args={[1.7, 0.05, 1.0]} /><Std color="#c9d4de" metal={0.8} rough={0.3} /></mesh>
      {[[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.03, z]}><boxGeometry args={[0.78, 0.02, 0.44]} /><Std color="#1a3f8f" metal={0.8} rough={0.12} glow={ok ? '#2a6dff' : '#0b1e44'} glowI={ok ? 0.55 : 0.3} /></mesh>)}
    </group>
    <mesh position={[0.5, 0.35, 0.25]}><boxGeometry args={[0.3, 0.4, 0.2]} /><Std color="#eef3f8" /></mesh>
    <mesh position={[0.5, 0.45, 0.36]}><sphereGeometry args={[0.03, 8, 6]} /><Glow color={ok ? OK : '#ffbf47'} /></mesh>
  </>;
}

function SmartBuilding({ c, ok }) {
  const col = ok ? OK : c;
  const ref = useAnim((m, t) => { if (m.beacon) m.beacon.material.opacity = 0.3 + Math.max(0, Math.sin(t * 3)) * 0.7; });
  return <>
    <mesh position={[0, 1.1, 0]}><boxGeometry args={[2.2, 2.2, 2.2]} /><Std color="#8fa7c4" metal={0.6} rough={0.22} /></mesh>
    <mesh position={[0, 2.75, 0]}><boxGeometry args={[1.5, 1.1, 1.5]} /><Std color="#a9bfd8" metal={0.6} rough={0.2} /></mesh>
    {[0.6, 1.3, 1.95].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[2.24, 0.12, 2.24]} /><Std color="#0e2038" glow={col} glowI={ok ? 0.9 : 0.35} /></mesh>)}
    <mesh position={[0, 3.0, 0]}><boxGeometry args={[1.54, 0.1, 1.54]} /><Std color="#0e2038" glow={col} glowI={0.6} /></mesh>
    <mesh position={[0.4, 3.75, 0.4]}><cylinderGeometry args={[0.02, 0.03, 0.9, 6]} /><Std color={STEEL} metal={0.8} /></mesh>
    <mesh ref={ref('beacon')} position={[0.4, 4.22, 0.4]}><sphereGeometry args={[0.07, 10, 8]} /><Glow color="#ff4466" opacity={0.9} /></mesh>
  </>;
}

function WeatherStation({ c, ok, kind }) {
  const col = ok ? OK : c;
  const ref = useAnim((m, t) => { if (m.cups) m.cups.rotation.y = t * 4; if (m.vane) m.vane.rotation.y = Math.sin(t * 0.5) * 1.2; });
  if (kind === 'public_facility') {
    return <>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.9, 1.8, 0.35]} /><Std color="#eef3f8" metal={0.3} /></mesh>
      <mesh position={[0, 1.15, 0.18]}><boxGeometry args={[0.72, 1.0, 0.02]} /><Std color="#0b1626" glow={col} glowI={0.9} /></mesh>
      <mesh position={[0, 1.95, 0]}><boxGeometry args={[1.05, 0.14, 0.5]} /><Std color={col} glow={col} glowI={0.7} /></mesh>
      <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.16, 14, 10]} /><Std color="#ffffff" glow={col} glowI={0.5} /></mesh>
    </>;
  }
  if (kind === 'air_quality') {
    return <>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.06, 0.08, 1.2, 8]} /><Std color={STEEL} metal={0.8} /></mesh>
      {[1.25, 1.4, 1.55, 1.7].map((y, i) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.26 - i * 0.02, 0.28 - i * 0.02, 0.09, 16]} /><Std color={i % 2 ? '#eef3f8' : col} glow={i % 2 ? null : col} glowI={0.6} /></mesh>)}
      <mesh position={[0, 1.85, 0]}><sphereGeometry args={[0.12, 12, 8]} /><Std color="#ffffff" glow={col} glowI={0.4} /></mesh>
    </>;
  }
  return <>
    <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.05, 0.07, 2.0, 8]} /><Std color={STEEL} metal={0.8} /></mesh>
    <group ref={ref('cups')} position={[0, 2.05, 0]}>
      {[0, 1, 2].map((i) => <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
        <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.44, 4]} /><Std color={STEEL} /></mesh>
        <mesh position={[0.44, 0, 0]}><sphereGeometry args={[0.07, 10, 6, 0, Math.PI]} /><Std color={col} glow={col} glowI={0.5} side={THREE.DoubleSide} /></mesh>
      </group>)}
    </group>
    <group ref={ref('vane')} position={[0, 1.7, 0]}><mesh position={[0.2, 0, 0]}><coneGeometry args={[0.08, 0.36, 4]} /><Std color="#ff9a3d" /></mesh></group>
    <mesh position={[0, 0.9, 0.12]}><boxGeometry args={[0.32, 0.4, 0.16]} /><Std color="#eef3f8" /></mesh>
  </>;
}

function Pollution({ ok }) {
  const ref = useAnim((m, t) => {
    [m.p0, m.p1, m.p2].forEach((p, i) => {
      if (!p) return;
      const k = ((t * 0.35 + i / 3) % 1);
      p.position.y = 0.7 + k * 1.6; p.scale.setScalar(0.4 + k * 0.9); p.material.opacity = 0.5 * (1 - k);
    });
  });
  if (ok) return <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.7, 20]} /><meshBasicMaterial color={OK} transparent opacity={0.45} /></mesh>;
  return <>
    <mesh position={[0, 0.25, 0]}><dodecahedronGeometry args={[0.45, 0]} /><Std color="#6e5a43" rough={1} flatShading /></mesh>
    <mesh position={[0.35, 0.15, 0.2]}><dodecahedronGeometry args={[0.25, 0]} /><Std color="#4f6b3a" rough={1} flatShading /></mesh>
    <mesh position={[-0.3, 0.14, -0.15]}><boxGeometry args={[0.28, 0.2, 0.2]} /><Std color="#c94f4f" rough={0.8} /></mesh>
    {['p0', 'p1', 'p2'].map((k) => <mesh key={k} ref={ref(k)}><sphereGeometry args={[0.35, 10, 8]} /><meshBasicMaterial color="#5b5048" transparent opacity={0.4} depthWrite={false} /></mesh>)}
  </>;
}

function Npc({ c }) {
  const ref = useAnim((m, t) => { if (m.mark) { m.mark.position.y = 1.85 + Math.sin(t * 3) * 0.1; m.mark.rotation.y = t * 2; } });
  return <>
    <mesh position={[0, 0.55, 0]}><capsuleGeometry args={[0.22, 0.55, 6, 14]} /><Std color={c} rough={0.6} /></mesh>
    <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.2, 16, 12]} /><Std color="#f1c7a0" rough={0.7} /></mesh>
    <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><Std color="#2b3a4c" rough={0.6} /></mesh>
    <group ref={ref('mark')} position={[0, 1.85, 0]}>
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.08, 0.22, 0.08]} /><Std color="#ffd36e" glow="#ffb62e" glowI={1} /></mesh>
      <mesh position={[0, -0.12, 0]}><boxGeometry args={[0.08, 0.08, 0.08]} /><Std color="#ffd36e" glow="#ffb62e" glowI={1} /></mesh>
    </group>
  </>;
}

function InfraChallenge({ c, ok }) {
  const col = ok ? OK : c;
  const ref = useAnim((m, t) => { if (m.cube) { m.cube.rotation.set(t * 0.8, t * 1.1, 0); m.cube.position.y = 2.0 + Math.sin(t * 2) * 0.08; } });
  return <>
    <mesh position={[0, 0.55, 0]}><boxGeometry args={[0.8, 1.1, 0.45]} /><Std color="#1d1a33" metal={0.75} rough={0.2} /></mesh>
    <mesh position={[0, 1.22, 0.05]} rotation={[-0.45, 0, 0]}><boxGeometry args={[0.85, 0.5, 0.08]} /><Std color="#26214a" metal={0.6} /></mesh>
    <mesh position={[0, 1.24, 0.1]} rotation={[-0.45, 0, 0]}><boxGeometry args={[0.72, 0.4, 0.02]} /><Std color="#0b0820" glow={col} glowI={1} /></mesh>
    <mesh ref={ref('cube')} position={[0, 2.0, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshBasicMaterial color={col} wireframe /></mesh>
  </>;
}

function Hydration({ c }) {
  const ref = useAnim((m, t) => { if (m.drop) { m.drop.position.y = 1.35 + Math.sin(t * 2) * 0.08; m.drop.rotation.y = t; } if (m.ring) m.ring.rotation.z = t * 1.4; });
  return <>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.28, 0.36, 1.0, 16]} /><Std color="#e3eef6" metal={0.4} rough={0.15} /></mesh>
    <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.34, 0.3, 0.06, 16]} /><Std color={c} glow={c} glowI={0.7} /></mesh>
    <group ref={ref('drop')} position={[0, 1.35, 0]}>
      <mesh><sphereGeometry args={[0.16, 16, 12]} /><Std color="#5ec8ff" glow="#2b9fe0" glowI={0.8} transparent opacity={0.9} /></mesh>
      <mesh position={[0, 0.15, 0]}><coneGeometry args={[0.12, 0.2, 16]} /><Std color="#5ec8ff" glow="#2b9fe0" glowI={0.8} transparent opacity={0.9} /></mesh>
    </group>
    <mesh ref={ref('ring')} position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.3, 0.015, 6, 28]} /><Glow color="#9fe3ff" /></mesh>
  </>;
}

function SupplyCrate({ c }) {
  const ref = useAnim((m, t) => { if (m.arrow) { m.arrow.position.y = 1.15 + Math.sin(t * 3) * 0.1; m.arrow.rotation.y = t * 2; } });
  return <>
    <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.7, 0.7, 0.7]} /><Std color="#c08a40" metal={0.3} rough={0.55} /></mesh>
    {[[0, 0.71], [0, 0.0]].map(([x, y]) => <mesh key={y} position={[x, y + 0.01, 0]}><boxGeometry args={[0.74, 0.06, 0.74]} /><Std color="#3d4a5a" metal={0.8} /></mesh>)}
    <mesh position={[0, 0.35, 0.355]}><boxGeometry args={[0.5, 0.08, 0.01]} /><Std color={c} glow="#ffb04a" glowI={1} /></mesh>
    <mesh ref={ref('arrow')} position={[0, 1.15, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.16, 0.3, 4]} /><Std color="#ffd36e" glow="#ffb62e" glowI={1} /></mesh>
  </>;
}

function Treasure() {
  const ref = useAnim((m, t) => { if (m.gem) m.gem.rotation.y = t * 1.5; if (m.ring) m.ring.rotation.z = t * 2; });
  return <>
    <mesh ref={ref('gem')} position={[0, 0.75, 0]}><icosahedronGeometry args={[0.35, 0]} /><Std color="#ffd700" glow="#ffb000" glowI={1.1} metal={0.8} rough={0.2} flatShading /></mesh>
    <mesh ref={ref('ring')} position={[0, 0.75, 0]} rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[0.6, 0.02, 6, 36]} /><Glow color="#ffe9a6" /></mesh>
  </>;
}

function LandmarkCore({ ok }) {
  const col = ok ? OK : '#f2c45f';
  const ref = useAnim((m, t) => { if (m.a) m.a.rotation.set(t * 0.8, t * 1.2, 0); if (m.b) m.b.rotation.set(0, t * -1.4, t * 0.6); if (m.core) m.core.rotation.y = t * 2; });
  return <group position={[0, 1.4, 0]}>
    <mesh ref={ref('a')}><torusGeometry args={[0.55, 0.045, 10, 48]} /><Std color={col} glow={col} glowI={1} /></mesh>
    <mesh ref={ref('b')}><torusGeometry args={[0.42, 0.035, 10, 40]} /><Std color="#9fe3ff" glow="#3fb6ff" glowI={1} /></mesh>
    <mesh ref={ref('core')}><octahedronGeometry args={[0.2, 0]} /><Std color="#ffffff" glow={col} glowI={1.2} flatShading /></mesh>
  </group>;
}

export const WorldObjectMarker = React.memo(function WorldObjectMarker({ object, state = {}, highlighted, groundY }) {
  const ok = !!(state.done || state.synced || state.repaired || state.restored);
  const t = object.type;
  const c = object.color || '#8fdcff';
  const glow = ok ? OK : c;
  let body = null;
  if (t === 'iot_sensor') body = <IotSensor c={c} ok={ok} />;
  else if (t === 'street_light') body = <StreetLight c={c} ok={ok} />;
  else if (t === 'cctv') body = <Cctv c={c} ok={ok} />;
  else if (t === 'drainage') body = <Drainage c={c} ok={ok} />;
  else if (t === 'energy_station') body = <EnergyStation c={c} ok={ok} />;
  else if (t === 'solar_panel') body = <SolarPanel ok={ok} />;
  else if (t === 'smart_building') body = <SmartBuilding c={c} ok={ok} />;
  else if (t === 'weather_station' || t === 'air_quality' || t === 'public_facility') body = <WeatherStation c={c} ok={ok} kind={t} />;
  else if (t === 'pollution') body = <Pollution ok={ok} />;
  else if (t === 'npc') body = ok ? null : <Npc c={c} />;
  else if (t === 'infra_challenge') body = <InfraChallenge c={c} ok={ok} />;
  else if (t === 'hydration') body = <Hydration c={c} />;
  else if (t === 'supply_crate') body = <SupplyCrate c={c} />;
  else if (t === 'treasure') body = ok ? null : <Treasure />;
  else if (t === 'landmark_core') body = <LandmarkCore ok={ok} />;
  const big = t === 'smart_building' || t === 'drainage';
  return <group position={[object.position[0], groundY, object.position[1]]}>
    <HoloPad color={glow} active={highlighted} r={big ? 1.4 : 0.62} />
    {highlighted ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[big ? 1.6 : 0.85, big ? 1.8 : 1.05, 48]} /><meshBasicMaterial color="#5fd3ff" transparent opacity={0.85} /></mesh> : null}
    {body}
  </group>;
});

// Zone areas: soft coloured disc, a pulsing rim and four glowing corner pylons.
export function ZoneRings({ zones, groundAt }) {
  const rims = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rims.current.forEach((m, i) => { if (m) m.material.opacity = 0.42 + Math.sin(t * 1.8 + i) * 0.16; });
  });
  return zones.map((zone, i) => {
    const y = groundAt(zone.center[0], zone.center[1]) + 0.02;
    return <group key={zone.id} position={[zone.center[0], y, zone.center[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[zone.radius, 48]} /><meshBasicMaterial color={zone.color} transparent opacity={0.06} depthWrite={false} /></mesh>
      <mesh ref={(m) => { rims.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[zone.radius - 0.16, zone.radius, 96]} /><meshBasicMaterial color={zone.color} transparent opacity={0.45} depthWrite={false} /></mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        return <group key={k} position={[Math.cos(a) * zone.radius, 0, Math.sin(a) * zone.radius]}>
          <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.06, 0.1, 0.9, 6]} /><meshStandardMaterial color="#e8eef5" metalness={0.5} roughness={0.3} /></mesh>
          <mesh position={[0, 0.98, 0]}><octahedronGeometry args={[0.12, 0]} /><meshBasicMaterial color={zone.color} /></mesh>
        </group>;
      })}
    </group>;
  });
}
