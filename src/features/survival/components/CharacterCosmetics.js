import React from 'react';
import { cosmeticById } from '../data/disciplineCosmetics';
import { FALLBACK_FIT } from '../data/characterFits';

// Atribut karakter (lencana disiplin) yang menempel di badan Twini: topi, pakaian, sepatu, aksesori.
//
// Semua ukuran diturunkan dari `height` avatar (unit ruang yang sama) dan `fit` = proporsi tubuh
// karakter (rasio 0..1): puncak kepala, radius kepala, tinggi dada, lebar/tebal tubuh, serta posisi
// kaki. Dengan begitu topi tidak melayang, pakaian tidak menembus badan, dan sepatu pas di kaki —
// baik untuk model GLB (Twini Engineer, Insan Adhi, DNI) maupun avatar fallback chibi.
//
// Setiap slot bisa dimatikan lewat profil karakter (`enabled`), jadi item tetap tersimpan tapi tidak
// dirender saat pemain memilih "tidak dipakai".

const DARK = '#15212c';
const LIGHT = '#eaf5ff';
const METAL = '#c8d8e8';

function Hat({ item, H, fit }) {
  const c = item.color;
  const a = item.accent;
  const R = Math.max(fit.headR * H * 1.06, 0.08 * H);
  const y = (fit.headTop + (fit.hatLift || 0)) * H;
  const t = Math.max(0.006 * H, R * 0.045); // tebal pelat umum

  switch (item.shape) {
    case 'hardhat':
      return <group position={[0, y, 0]}>
        <mesh castShadow><sphereGeometry args={[R, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.42} metalness={0.22} /></mesh>
        <mesh position={[0, -t, 0]} castShadow><cylinderGeometry args={[R * 1.34, R * 1.34, t * 2, 24]} /><meshStandardMaterial color={c} roughness={0.5} metalness={0.18} /></mesh>
        <mesh position={[0, R * 0.55, 0]}><boxGeometry args={[R * 0.34, R * 0.1, R * 1.9]} /><meshStandardMaterial color={a} roughness={0.45} metalness={0.3} /></mesh>
        {[-1, 1].map((s) => [-0.35, 0, 0.35].map((k) => (
          <mesh key={`${s}-${k}`} position={[s * R * 0.95, R * 0.18, k * R]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <boxGeometry args={[R * 0.16, R * 0.09, R * 0.3]} /><meshStandardMaterial color={DARK} roughness={0.7} />
          </mesh>
        )))}
        <mesh position={[0, R * 0.22, R * 0.98]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R * 0.18, R * 0.18, R * 0.16, 12]} /><meshStandardMaterial color={LIGHT} metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, R * 0.22, R * 1.07]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R * 0.12, R * 0.12, R * 0.04, 12]} /><meshStandardMaterial color="#ffe9a3" emissive="#ffcf5c" emissiveIntensity={0.9} /></mesh>
        <mesh position={[0, -R * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R * 0.92, R * 0.035, 6, 20, Math.PI]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
      </group>;
    case 'fieldcap':
      return <group position={[0, y, 0]}>
        <mesh scale={[1, 0.78, 1]} castShadow><sphereGeometry args={[R * 0.99, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.75} /></mesh>
        <mesh position={[0, R * 0.8, 0]}><sphereGeometry args={[R * 0.1, 10, 8]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
        <mesh position={[0, -R * 0.02, R * 0.86]} rotation={[-0.1, 0, 0]} castShadow><boxGeometry args={[R * 1.72, t * 1.6, R * 0.62]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>
        <mesh position={[0, R * 0.12, 0]}><cylinderGeometry args={[R * 1.0, R * 1.0, R * 0.16, 20, 1, true]} /><meshStandardMaterial color={DARK} roughness={0.7} side={2} /></mesh>
        <mesh position={[R * 0.78, R * 0.12, R * 0.62]}><boxGeometry args={[R * 0.14, R * 0.12, t]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
      </group>;
    case 'beret':
      return <group position={[R * 0.05, y - t, 0]} rotation={[0, 0, 0.14]}>
        <mesh scale={[1, 0.46, 1]} castShadow><sphereGeometry args={[R * 1.16, 18, 12]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R * 1.02, R * 0.06, 8, 24]} /><meshStandardMaterial color={a} roughness={0.55} /></mesh>
        <mesh position={[0, R * 0.14, 0]}><sphereGeometry args={[R * 0.09, 8, 6]} /><meshStandardMaterial color={a} /></mesh>
        <group position={[0, -R * 0.02, R * 1.02]} rotation={[0.1, 0, 0]}>
          <mesh><boxGeometry args={[R * 0.34, R * 0.26, t]} /><meshStandardMaterial color={a} metalness={0.75} roughness={0.25} /></mesh>
          <mesh position={[0, 0, t]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R * 0.08, R * 0.02, 6, 12]} /><meshStandardMaterial color={c} metalness={0.8} roughness={0.2} /></mesh>
        </group>
      </group>;
    case 'visor':
      return <group position={[0, y - t, 0]}>
        <mesh><cylinderGeometry args={[R * 1.04, R * 1.04, R * 0.26, 22, 1, true]} /><meshStandardMaterial color={c} roughness={0.4} metalness={0.35} side={2} /></mesh>
        <mesh position={[0, R * 0.02, R * 0.7]} rotation={[-0.38, 0, 0]}><boxGeometry args={[R * 1.72, t * 0.7, R * 0.8]} /><meshStandardMaterial color={a} transparent opacity={0.62} emissive={a} emissiveIntensity={0.5} roughness={0.15} metalness={0.2} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * R * 0.92, R * 0.02, R * 0.42]}><boxGeometry args={[t, R * 0.12, R * 0.5]} /><meshStandardMaterial color={DARK} metalness={0.4} /></mesh>)}
        {[-0.14, 0, 0.14].map((k) => <mesh key={k} position={[k * R, R * 0.22, R * 0.99]}><sphereGeometry args={[R * 0.035, 6, 5]} /><meshStandardMaterial color="#7cf5ff" emissive="#22e6ff" emissiveIntensity={1} /></mesh>)}
      </group>;
    case 'toga':
      return <group position={[0, y + R * 0.16, -R * 0.05]} rotation={[0.06, 0, 0]}>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow><boxGeometry args={[R * 2.15, t * 1.3, R * 2.15]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>
        <mesh position={[0, -R * 0.16, 0]}><cylinderGeometry args={[R * 0.72, R * 0.78, R * 0.2, 14]} /><meshStandardMaterial color={DARK} roughness={0.75} /></mesh>
        <mesh position={[R * 0.62, -R * 0.42, R * 0.62]}><cylinderGeometry args={[R * 0.022, R * 0.022, R * 0.55, 6]} /><meshStandardMaterial color={a} metalness={0.5} /></mesh>
        <mesh position={[R * 0.62, -R * 0.72, R * 0.62]}><sphereGeometry args={[R * 0.07, 8, 6]} /><meshStandardMaterial color={a} metalness={0.6} roughness={0.3} /></mesh>
        {[-1, 0, 1].map((k) => <mesh key={k} position={[R * 0.62 + k * R * 0.045, -R * 0.86, R * 0.62]}><cylinderGeometry args={[R * 0.012, R * 0.012, R * 0.16, 5]} /><meshStandardMaterial color={a} /></mesh>)}
      </group>;
    case 'nurse':
      return <group position={[0, y, 0]}>
        <mesh castShadow><boxGeometry args={[R * 1.5, R * 0.28, R * 1.02]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
        <mesh position={[0, R * 0.15, 0]}><boxGeometry args={[R * 1.52, R * 0.03, R * 1.04]} /><meshStandardMaterial color={a} roughness={0.5} /></mesh>
        <mesh position={[0, R * 0.02, R * 0.52]}><boxGeometry args={[R * 0.1, R * 0.28, t]} /><meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.3} /></mesh>
        <mesh position={[0, R * 0.02, R * 0.52]}><boxGeometry args={[R * 0.28, R * 0.1, t]} /><meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.3} /></mesh>
      </group>;
    case 'straw':
      return <group position={[0, y - t, 0]}>
        <mesh castShadow><cylinderGeometry args={[R * 1.85, R * 1.85, t * 2.2, 26]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>
        {[0.45, 0.8, 1.15].map((k) => <mesh key={k} position={[0, t, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R * k * 1.5, t * 0.5, 4, 28]} /><meshStandardMaterial color={a} roughness={0.85} transparent opacity={0.55} /></mesh>)}
        <mesh position={[0, R * 0.28, 0]} castShadow><sphereGeometry args={[R * 0.94, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>
        <mesh position={[0, R * 0.08, 0]}><cylinderGeometry args={[R * 0.96, R * 0.96, R * 0.16, 22]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
        <mesh position={[R * 0.9, R * 0.12, R * 0.3]} rotation={[0, 0, 0.5]}><boxGeometry args={[R * 0.3, R * 0.1, t]} /><meshStandardMaterial color={a} /></mesh>
        <mesh position={[R * 0.9, R * 0.12, R * 0.3]} rotation={[0, 0, -0.5]}><boxGeometry args={[R * 0.3, R * 0.1, t]} /><meshStandardMaterial color={a} /></mesh>
      </group>;
    case 'helmet':
      return <group position={[0, y, 0]}>
        <mesh castShadow><sphereGeometry args={[R * 1.08, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.38} metalness={0.4} /></mesh>
        <mesh position={[0, -t, 0]}><cylinderGeometry args={[R * 1.22, R * 1.28, t * 2, 22]} /><meshStandardMaterial color={c} roughness={0.5} metalness={0.3} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * R * 0.94, R * 0.22, 0]} rotation={[0, 0, s * 0.1]}><boxGeometry args={[t, R * 0.3, R * 1.3]} /><meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} /></mesh>)}
        <mesh position={[0, R * 0.3, R * 0.92]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R * 0.16, R * 0.16, R * 0.22, 12]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, R * 0.3, R * 1.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R * 0.1, R * 0.1, R * 0.03, 12]} /><meshStandardMaterial color="#9be8ff" emissive="#3fd2ff" emissiveIntensity={0.8} /></mesh>
        {[-1, 1].map((s) => <mesh key={`strap-${s}`} position={[s * R * 0.9, -R * 0.28, R * 0.12]} rotation={[0, 0, s * 0.35]}><cylinderGeometry args={[R * 0.03, R * 0.03, R * 0.6, 6]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>)}
        <mesh position={[0, -R * 0.62, R * 0.1]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R * 0.42, R * 0.03, 6, 16, Math.PI]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
        <mesh position={[0, R * 0.05, -R * 1.02]}><boxGeometry args={[R * 0.5, R * 0.3, R * 0.2]} /><meshStandardMaterial color={DARK} metalness={0.4} /></mesh>
      </group>;
    case 'hood':
      return <group position={[0, y - R * 0.12, -R * 0.08]}>
        <mesh castShadow scale={[1, 1.04, 1.02]}><sphereGeometry args={[R * 1.28, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.55]} /><meshStandardMaterial color={c} roughness={0.85} side={2} /></mesh>
        <mesh position={[0, R * 0.05, R * 0.36]} rotation={[0.1, 0, 0]}><torusGeometry args={[R * 1.02, R * 0.075, 8, 22]} /><meshStandardMaterial color={a} roughness={0.8} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * R * 0.34, -R * 0.42, R * 0.86]} rotation={[0.15, 0, s * 0.08]}><cylinderGeometry args={[R * 0.02, R * 0.02, R * 0.5, 6]} /><meshStandardMaterial color={LIGHT} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={`tip-${s}`} position={[s * R * 0.34, -R * 0.66, R * 0.9]}><cylinderGeometry args={[R * 0.035, R * 0.035, R * 0.07, 8]} /><meshStandardMaterial color={METAL} metalness={0.7} /></mesh>)}
        <mesh position={[0, R * 0.15, -R * 1.16]}><boxGeometry args={[R * 0.08, R * 0.7, t]} /><meshStandardMaterial color={a} roughness={0.8} /></mesh>
      </group>;
    default: // fedora
      return <group position={[0, y - t, 0]}>
        <mesh position={[0, R * 0.5, 0]} castShadow><cylinderGeometry args={[R * 0.92, R * 1.02, R * 1.0, 18]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        <mesh position={[-R * 0.3, R * 1.02, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[R * 0.42, R * 0.22, R * 0.5]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        <mesh position={[R * 0.3, R * 1.02, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[R * 0.42, R * 0.22, R * 0.5]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        <mesh castShadow><cylinderGeometry args={[R * 1.7, R * 1.7, t * 2, 26]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        <mesh position={[0, R * 0.16, 0]}><cylinderGeometry args={[R * 1.0, R * 1.0, R * 0.22, 20]} /><meshStandardMaterial color={a} roughness={0.55} /></mesh>
        <mesh position={[R * 0.72, R * 0.3, R * 0.42]} rotation={[0.2, 0, -0.5]}><boxGeometry args={[R * 0.1, R * 0.4, t]} /><meshStandardMaterial color={a} metalness={0.4} /></mesh>
      </group>;
  }
}

function Clothing({ item, H, fit }) {
  const c = item.color;
  const a = item.accent;
  const W = fit.torsoW * H;
  const D = fit.torsoD * H;
  const r = W / 2;
  const zs = Math.max(0.55, D / Math.max(W, 0.001)); // pipihkan tabung mengikuti tebal badan
  const y = fit.chestY * H;
  const h = Math.max(0.2 * H, (fit.neckY - fit.waistY) * H * 0.95);
  const t = Math.max(0.005 * H, r * 0.05);
  const band = (yy, color, opacity = 1, extra = 1.03) => (
    <mesh key={`${yy}-${color}-${extra}`} position={[0, yy, 0]} scale={[1, 1, zs]}>
      <cylinderGeometry args={[r * extra, r * extra, t * 2.2, 20, 1, true]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.5} transparent={opacity < 1} opacity={opacity} side={2} />
    </mesh>
  );

  if (item.shape === 'coat') {
    return <group position={[0, y - h * 0.12, 0]}>
      <mesh castShadow scale={[1, 1, zs]}><cylinderGeometry args={[r * 1.03, r * 1.12, h * 1.25, 20, 1, true]} /><meshStandardMaterial color={c} roughness={0.62} side={2} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r * 0.4, h * 0.56, r * zs * 0.86]} rotation={[0.35, 0, s * 0.42]}><boxGeometry args={[r * 0.62, h * 0.2, t]} /><meshStandardMaterial color={a} roughness={0.55} /></mesh>)}
      {[0.3, 0.1, -0.1, -0.3].map((k) => <mesh key={k} position={[r * 0.1, h * k, r * zs * 1.02]}><sphereGeometry args={[t * 1.5, 8, 6]} /><meshStandardMaterial color={a} metalness={0.6} roughness={0.3} /></mesh>)}
      <mesh position={[0, -h * 0.28, 0]} scale={[1, 1, zs + 0.03]}><cylinderGeometry args={[r * 1.1, r * 1.1, h * 0.12, 20, 1, true]} /><meshStandardMaterial color={a} roughness={0.6} side={2} /></mesh>
      {[-1, 1].map((s) => <mesh key={`p${s}`} position={[s * r * 0.52, -h * 0.14, r * zs * 0.97]}><boxGeometry args={[r * 0.5, h * 0.12, t]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>)}
    </group>;
  }
  if (item.shape === 'apron') {
    return <group position={[0, y - h * 0.05, 0]}>
      <mesh position={[0, 0, r * zs * 0.94]} castShadow><boxGeometry args={[r * 1.24, h * 1.1, t * 1.4]} /><meshStandardMaterial color={c} roughness={0.82} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r * 0.4, h * 0.62, r * zs * 0.8]} rotation={[0.2, 0, s * 0.18]}><boxGeometry args={[t * 1.6, h * 0.5, t]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>)}
      <mesh position={[0, -h * 0.02, 0]} scale={[1, 1, zs + 0.02]}><cylinderGeometry args={[r * 1.02, r * 1.02, t * 2.4, 20, 1, true]} /><meshStandardMaterial color={a} roughness={0.75} side={2} /></mesh>
      <mesh position={[0, -h * 0.22, r * zs * 0.98]}><boxGeometry args={[r * 0.66, h * 0.22, t * 1.6]} /><meshStandardMaterial color={a} roughness={0.8} /></mesh>
      <mesh position={[0, h * 0.34, r * zs * 0.99]}><boxGeometry args={[r * 0.3, h * 0.1, t * 1.2]} /><meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.25} /></mesh>
    </group>;
  }
  if (item.shape === 'vest') {
    return <group position={[0, y, 0]}>
      <mesh castShadow scale={[1, 1, zs]}><cylinderGeometry args={[r * 0.99, r * 0.99, h, 20, 1, true]} /><meshStandardMaterial color={c} roughness={0.72} side={2} /></mesh>
      {band(h * 0.22, a, 1, 1.02)}
      {band(-h * 0.16, a, 1, 1.02)}
      {band(h * 0.05, a, 0.5, 1.015)}
      <mesh position={[0, 0, r * zs * 1.01]}><boxGeometry args={[t, h * 0.92, t]} /><meshStandardMaterial color={LIGHT} metalness={0.5} roughness={0.35} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r * 0.55, -h * 0.24, r * zs * 0.99]}><boxGeometry args={[r * 0.42, h * 0.18, t * 1.2]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`st${s}`} position={[s * r * 0.48, h * 0.44, 0]} rotation={[0, 0, s * 0.12]}><boxGeometry args={[r * 0.2, h * 0.16, r * zs * 1.6]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>)}
      <mesh position={[r * 0.16, -h * 0.02, r * zs * 1.03]}><boxGeometry args={[t * 1.4, t * 1.4, t]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} /></mesh>
    </group>;
  }
  if (item.shape === 'blazer') {
    return <group position={[0, y, 0]}>
      <mesh castShadow scale={[1, 1, zs]}><cylinderGeometry args={[r * 1.02, r * 1.04, h * 1.06, 20, 1, true]} /><meshStandardMaterial color={c} roughness={0.58} side={2} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r * 0.34, h * 0.4, r * zs * 0.92]} rotation={[0.3, 0, s * 0.5]}><boxGeometry args={[r * 0.7, h * 0.22, t]} /><meshStandardMaterial color={a} roughness={0.5} metalness={0.2} /></mesh>)}
      {[0.2, 0.02, -0.16].map((k) => <mesh key={k} position={[r * 0.08, h * k, r * zs * 1.02]}><sphereGeometry args={[t * 1.6, 8, 6]} /><meshStandardMaterial color={a} metalness={0.7} roughness={0.25} /></mesh>)}
      <mesh position={[0, -h * 0.28, r * zs * 0.99]}><boxGeometry args={[r * 0.52, h * 0.2, t * 1.4]} /><meshStandardMaterial color={a} roughness={0.65} /></mesh>
      <mesh position={[-r * 0.62, h * 0.3, r * zs * 0.98]}><boxGeometry args={[r * 0.3, h * 0.1, t]} /><meshStandardMaterial color={LIGHT} roughness={0.5} /></mesh>
    </group>;
  }
  if (item.shape === 'uniform') {
    return <group position={[0, y, 0]}>
      <mesh castShadow scale={[1, 1, zs]}><cylinderGeometry args={[r * 1.01, r * 1.03, h, 20]} /><meshStandardMaterial color={c} roughness={0.78} /></mesh>
      <mesh position={[0, h * 0.46, 0]} scale={[1, 1, zs]}><cylinderGeometry args={[r * 1.02, r * 1.02, h * 0.12, 20, 1, true]} /><meshStandardMaterial color={a} roughness={0.7} side={2} /></mesh>
      <mesh position={[0, -h * 0.05, 0]} scale={[1, 1, zs + 0.02]}><cylinderGeometry args={[r * 1.03, r * 1.03, h * 0.1, 20, 1, true]} /><meshStandardMaterial color={a} metalness={0.35} roughness={0.6} side={2} /></mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh position={[s * r * 0.42, h * 0.18, r * zs * 1.01]}><boxGeometry args={[r * 0.42, h * 0.16, t * 1.2]} /><meshStandardMaterial color={a} roughness={0.75} /></mesh>
        <mesh position={[s * r * 0.42, h * 0.18, r * zs * 1.03]}><boxGeometry args={[r * 0.44, t, t * 0.6]} /><meshStandardMaterial color={a} roughness={0.8} /></mesh>
        <mesh position={[s * r * 0.62, h * 0.48, 0]} rotation={[0, 0, s * 0.1]}><boxGeometry args={[r * 0.24, h * 0.08, r * zs * 1.5]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>
      </group>)}
      <mesh position={[-r * 0.5, h * 0.3, r * zs * 1.02]}><boxGeometry args={[r * 0.22, h * 0.07, t]} /><meshStandardMaterial color={a} metalness={0.6} roughness={0.35} /></mesh>
    </group>;
  }
  // jacket (bawaan disiplin)
  return <group position={[0, y, 0]}>
    <mesh castShadow scale={[1, 1, zs]}><cylinderGeometry args={[r * 1.01, r * 1.02, h, 20]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>
    <mesh position={[0, 0, r * zs * 1.02]}><boxGeometry args={[t, h * 0.9, t]} /><meshStandardMaterial color={a} metalness={0.55} roughness={0.35} /></mesh>
    <mesh position={[0, h * 0.46, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, zs]}><torusGeometry args={[r * 0.66, t * 1.2, 6, 18]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
    {[-1, 1].map((s) => <group key={s}>
      <mesh position={[s * r * 1.02, h * 0.16, 0]} rotation={[0, 0, s * 0.12]}><cylinderGeometry args={[r * 0.2, r * 0.22, h * 0.34, 12]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>
      <mesh position={[s * r * 0.5, -h * 0.22, r * zs * 0.99]}><boxGeometry args={[r * 0.44, h * 0.18, t * 1.2]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>
      <mesh position={[s * r * 0.62, h * 0.36, r * zs * 0.9]}><boxGeometry args={[r * 0.3, h * 0.08, t]} /><meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.2} /></mesh>
    </group>)}
  </group>;
}

function Shoes({ item, H, fit }) {
  const c = item.color;
  const a = item.accent;
  const gap = fit.footGap * H;
  const len = fit.footLen * H;
  const w = Math.max(0.05 * H, len * 0.44);
  const y = fit.footY * H;
  const boot = item.shape === 'boot';
  const sandal = item.shape === 'sandal';
  const soleH = 0.022 * H;
  const upperH = boot ? 0.1 * H : 0.075 * H;

  return <group>
    {[-1, 1].map((s) => <group key={s} position={[s * gap, y, len * 0.16]}>
      {/* sol + hak */}
      <mesh position={[0, soleH / 2, 0]} castShadow><boxGeometry args={[w * 1.08, soleH, len]} /><meshStandardMaterial color={a} roughness={0.85} /></mesh>
      <mesh position={[0, soleH * 1.8, -len * 0.36]}><boxGeometry args={[w * 0.9, soleH * 1.4, len * 0.24]} /><meshStandardMaterial color={DARK} roughness={0.9} /></mesh>
      {/* badan sepatu */}
      <mesh position={[0, soleH + upperH / 2, -len * 0.05]} castShadow><boxGeometry args={[w, upperH, len * (boot ? 0.72 : 0.82)]} /><meshStandardMaterial color={c} roughness={0.6} metalness={boot ? 0.25 : 0.1} /></mesh>
      {/* ujung depan membulat */}
      <mesh position={[0, soleH + upperH * 0.42, len * 0.38]} scale={[1, 0.9, 1.05]}>
        <sphereGeometry args={[w * 0.52, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={c} roughness={0.55} metalness={boot ? 0.2 : 0.08} />
      </mesh>
      {boot ? <>
        {/* shaft tinggi + tali silang */}
        <mesh position={[0, soleH + upperH + 0.05 * H, -len * 0.24]} castShadow><cylinderGeometry args={[w * 0.48, w * 0.52, 0.1 * H, 12]} /><meshStandardMaterial color={c} roughness={0.62} /></mesh>
        {[0, 1, 2].map((k) => <mesh key={k} position={[0, soleH + upperH * 0.72 + k * 0.022 * H, len * 0.06]} rotation={[0, 0, k % 2 ? 0.25 : -0.25]}><boxGeometry args={[w * 0.86, 0.008 * H, 0.012 * H]} /><meshStandardMaterial color={LIGHT} roughness={0.7} /></mesh>)}
        {[-1, 1].map((e) => <mesh key={e} position={[e * w * 0.34, soleH + upperH * 0.72, len * 0.06]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.009 * H, 0.004 * H, 4, 8]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} /></mesh>)}
        <mesh position={[0, soleH + upperH * 0.4, len * 0.36]}><boxGeometry args={[w * 0.72, 0.01 * H, len * 0.18]} /><meshStandardMaterial color={a} roughness={0.4} metalness={0.5} /></mesh>
      </> : null}
      {!boot && !sandal ? <>
        {/* sneaker / formal: tali + aksen samping */}
        {[0, 1, 2].map((k) => <mesh key={k} position={[0, soleH + upperH * 0.8 + k * 0.012 * H, len * 0.12 + k * 0.026 * H]}><boxGeometry args={[w * 0.7, 0.007 * H, 0.01 * H]} /><meshStandardMaterial color={item.shape === 'formal' ? a : LIGHT} roughness={0.6} /></mesh>)}
        <mesh position={[0, soleH + upperH * 0.45, len * 0.3]}><boxGeometry args={[w * 0.86, upperH * 0.22, len * 0.16]} /><meshStandardMaterial color={a} roughness={0.45} metalness={item.shape === 'formal' ? 0.6 : 0.2} /></mesh>
        {item.shape === 'formal' ? <mesh position={[0, soleH + upperH * 0.95, -len * 0.16]}><boxGeometry args={[w * 0.5, 0.012 * H, len * 0.14]} /><meshStandardMaterial color={a} metalness={0.8} roughness={0.2} /></mesh> : null}
      </> : null}
      {sandal ? <>
        {/* sandal: dua strap + gesper */}
        <mesh position={[0, soleH + 0.02 * H, len * 0.1]}><boxGeometry args={[w, 0.018 * H, len * 0.24]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>
        <mesh position={[0, soleH + 0.02 * H, -len * 0.2]}><boxGeometry args={[w * 0.9, 0.018 * H, len * 0.14]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>
        <mesh position={[w * 0.3, soleH + 0.03 * H, len * 0.1]}><boxGeometry args={[0.014 * H, 0.012 * H, 0.02 * H]} /><meshStandardMaterial color={a} metalness={0.8} roughness={0.25} /></mesh>
      </> : null}
    </group>)}
  </group>;
}

function Accessory({ item, H, fit }) {
  const c = item.color;
  const a = item.accent;
  const chestY = fit.chestY * H;
  const front = (fit.torsoD * H) / 2;
  const w = fit.torsoW * H;
  const t = Math.max(0.004 * H, w * 0.03);

  if (item.shape === 'sash') {
    return <group position={[w * 0.06, chestY, front + t]} rotation={[0, 0, 0.62]}>
      <mesh castShadow><boxGeometry args={[w * 0.3, H * 0.62, t]} /><meshStandardMaterial color={c} roughness={0.5} emissive={c} emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, H * 0.3, 0]}><sphereGeometry args={[w * 0.09, 10, 8]} /><meshStandardMaterial color={a} metalness={0.4} roughness={0.4} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.08, H * 0.36, t * 1.2]} rotation={[0, 0, s * 0.4]}><boxGeometry args={[w * 0.07, H * 0.14, t]} /><meshStandardMaterial color={a} roughness={0.55} /></mesh>)}
      {[-1, 0, 1].map((k) => <mesh key={k} position={[k * w * 0.05, H * 0.43, t * 1.2]}><boxGeometry args={[w * 0.02, H * 0.06, t]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>)}
    </group>;
  }
  if (item.shape === 'scarf') {
    const neckY = (fit.neckY - 0.03) * H;
    return <group position={[0, neckY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, Math.max(0.6, (fit.torsoD / Math.max(fit.torsoW, 0.01)) * 1.05), 1]}>
        <torusGeometry args={[w * 0.2, w * 0.055, 8, 20]} />
        <meshStandardMaterial color={c} roughness={0.75} />
      </mesh>
      <mesh position={[w * 0.08, -w * 0.06, front * 0.9]}><sphereGeometry args={[w * 0.06, 10, 8]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>
      <mesh position={[w * 0.12, -H * 0.14, front * 0.9]} rotation={[0.1, 0, 0.18]}><boxGeometry args={[w * 0.1, H * 0.2, t * 1.4]} /><meshStandardMaterial color={c} roughness={0.78} /></mesh>
      {[-1, 0, 1].map((k) => <mesh key={k} position={[w * 0.12 + k * w * 0.028, -H * 0.245, front * 0.9]}><boxGeometry args={[w * 0.014, H * 0.04, t]} /><meshStandardMaterial color={a} roughness={0.8} /></mesh>)}
    </group>;
  }
  if (item.shape === 'idcard') {
    const cardY = chestY + H * 0.02;
    return <group position={[0, cardY, front + t]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.12, (fit.neckY - fit.chestY) * H * 0.42, -t]} rotation={[0.18, 0, s * 0.06]}><boxGeometry args={[t, H * 0.2, t]} /><meshStandardMaterial color={a} roughness={0.65} /></mesh>)}
      <mesh castShadow><boxGeometry args={[w * 0.26, H * 0.09, t * 1.2]} /><meshStandardMaterial color={c} roughness={0.42} metalness={0.1} /></mesh>
      <mesh position={[-w * 0.055, H * 0.008, t * 1.2]}><boxGeometry args={[w * 0.09, H * 0.052, t * 0.4]} /><meshStandardMaterial color={LIGHT} roughness={0.5} /></mesh>
      <mesh position={[w * 0.07, H * 0.008, t * 1.2]}><boxGeometry args={[w * 0.07, H * 0.022, t * 0.4]} /><meshStandardMaterial color={a} metalness={0.7} roughness={0.25} /></mesh>
      <mesh position={[-w * 0.055, -H * 0.026, t * 1.2]}><boxGeometry args={[w * 0.09, H * 0.016, t * 0.4]} /><meshStandardMaterial color={a} metalness={0.6} /></mesh>
      <mesh position={[0, H * 0.055, 0]}><boxGeometry args={[w * 0.05, H * 0.012, t * 1.6]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} /></mesh>
    </group>;
  }
  if (item.shape === 'medal') {
    return <group position={[w * 0.3, chestY + H * 0.08, front + t]}>
      <mesh><boxGeometry args={[w * 0.16, H * 0.12, t]} /><meshStandardMaterial color={a} roughness={0.6} /></mesh>
      {[-1, 0, 1].map((k) => <mesh key={k} position={[k * w * 0.045, 0, t * 0.6]}><boxGeometry args={[w * 0.02, H * 0.12, t * 0.3]} /><meshStandardMaterial color={k === 0 ? LIGHT : c} roughness={0.5} /></mesh>)}
      <mesh position={[0, -H * 0.09, t * 1.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[w * 0.1, w * 0.1, t * 1.4, 18]} /><meshStandardMaterial color={c} metalness={0.85} roughness={0.2} /></mesh>
      <mesh position={[0, -H * 0.09, t * 2.1]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[w * 0.075, t * 0.5, 6, 16]} /><meshStandardMaterial color={a} metalness={0.7} roughness={0.25} /></mesh>
      <mesh position={[0, -H * 0.09, t * 2.2]} rotation={[0, 0, Math.PI]}><coneGeometry args={[w * 0.035, H * 0.03, 5]} /><meshStandardMaterial color={a} metalness={0.8} roughness={0.2} /></mesh>
    </group>;
  }
  // badge / lencana disiplin
  return <group position={[-w * 0.26, chestY + H * 0.05, front + t]} rotation={[0, 0, 0.04]}>
    <mesh castShadow><boxGeometry args={[w * 0.3, H * 0.075, t * 1.2]} /><meshStandardMaterial color={c} metalness={0.55} roughness={0.3} /></mesh>
    <mesh position={[0, 0, t * 0.75]}><boxGeometry args={[w * 0.26, H * 0.062, t * 0.5]} /><meshStandardMaterial color={a} metalness={0.6} roughness={0.28} /></mesh>
    <mesh position={[0, 0, t * 1.15]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[w * 0.055, t * 0.35, 6, 16]} /><meshStandardMaterial color={LIGHT} metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, 0, t * 1.3]} rotation={[0, 0, Math.PI]}><coneGeometry args={[w * 0.03, H * 0.022, 5]} /><meshStandardMaterial color={LIGHT} metalness={0.85} roughness={0.18} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.11, 0, t * 0.5]}><sphereGeometry args={[w * 0.018, 6, 5]} /><meshStandardMaterial color={LIGHT} metalness={0.7} /></mesh>)}
  </group>;
}

// `cosmetics` = profil karakter { equipped, enabled } (lihat engine/cosmetics.js).
// `fit` = proporsi tubuh karakter (lihat data/characterFits.js). Slot dengan enabled=false dilewati.
export default function CharacterCosmetics({ cosmetics, height = 1.8, fit }) {
  if (!cosmetics?.equipped) return null;
  const H = Math.max(0.15, Number(height) || 1.8);
  const f = fit || FALLBACK_FIT;
  const enabled = cosmetics.enabled || {};
  const slotItem = (slot) => (enabled[slot] === false ? null : cosmeticById(cosmetics.equipped[slot]));
  const hat = slotItem('hat');
  const clothing = slotItem('clothing');
  const shoes = slotItem('shoes');
  const accessory = slotItem('accessory');
  if (!hat && !clothing && !shoes && !accessory) return null;
  return <group>
    {shoes ? <Shoes item={shoes} H={H} fit={f} /> : null}
    {clothing ? <Clothing item={clothing} H={H} fit={f} /> : null}
    {accessory ? <Accessory item={accessory} H={H} fit={f} /> : null}
    {hat ? <Hat item={hat} H={H} fit={f} /> : null}
  </group>;
}
