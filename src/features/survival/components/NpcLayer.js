import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { NPCS } from '../data/npcs';

// Warga (NPC) di environment: karakter manusia yang lebih detail — kepala dengan rambut,
// mata & mulut, lengan capsule dengan tangan, sepatu, plus perlengkapan khas peran:
//  - Pak Raka (insinyur sipil): helm kuning, rompi high-vis bergaris reflektif, clipboard.
//  - Bu Sari (geodesi): topi lapangan, kacamata, papan peta, rambung ikat.
//  - Dokter Nia: jas putih, stetoskop, tas P3K palang merah.
//  - Prajurit Adi (TNI): seragam & rompi lapangan, baret merah, sepatu lars, senapan.
// NPC selalu menghadap Twini saat dekat, sedikit bergoyang hidup, dan tidak memblokir
// gerakan (tanpa collision). Bodi di-merge per material (vertex color): ~1 draw call/NPC.

const paint = (geometry, hex) => {
  const color = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
};

const box = (w, h, d, x, y, z, hex, o = {}) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (o.rz) g.rotateZ(o.rz);
  if (o.rx) g.rotateX(o.rx);
  if (o.ry) g.rotateY(o.ry);
  return paint(g.translate(x, y, z), hex);
};
const ball = (r, x, y, z, hex, seg = 14, sy = 1) => (
  paint(new THREE.SphereGeometry(r, seg, Math.max(7, seg - 4)).scale(1, sy, 1).translate(x, y, z), hex)
);
const tube = (rt, rb, h, seg, x, y, z, hex, rx = 0, rz = 0) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  return paint(g.translate(x, y, z), hex);
};
const capsule = (r, len, x, y, z, hex, rz = 0, sy = 1) => (
  paint(new THREE.CapsuleGeometry(r, len, 4, 12).scale(1, sy, 1).rotateZ(rz).translate(x, y, z), hex)
);
const ring = (r, tubeR, x, y, z, hex, rx = 0, rz = 0, seg = 18) => {
  const g = new THREE.TorusGeometry(r, tubeR, 6, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  return paint(g.translate(x, y, z), hex);
};

// Tubuh dasar manusia (tinggi total ±1.42 sampai puncak kepala). +Z = arah depan/wajah.
function humanParts({ skin, hair, shirt, pants, shoes, female = false }) {
  const parts = [];
  // sepatu + kaki capsule
  [-0.09, 0.09].forEach((x) => {
    parts.push(box(0.095, 0.075, 0.175, x, 0.045, 0.035, shoes));
    parts.push(capsule(0.056, 0.42, x, 0.33, 0, pants));
  });
  // pinggul
  parts.push(box(0.28, 0.14, 0.19, 0, 0.66, 0, pants));
  parts.push(box(0.27, 0.06, 0.185, 0, 0.72, 0, shirt)); // gara pinggang baju
  // torso capsule (sedikit pipih)
  const torsoGeo = new THREE.CapsuleGeometry(0.155, 0.2, 4, 12);
  torsoGeo.scale(1, 0.85, 0.72);
  parts.push(paint(torsoGeo.translate(0, 0.845, 0), shirt));
  // bahu
  [-0.185, 0.185].forEach((x) => parts.push(ball(0.075, x, 0.985, 0, shirt, 10)));
  // lengan + tangan
  [-1, 1].forEach((s) => {
    parts.push(capsule(0.043, 0.27, s * 0.215, 0.78, 0.01, shirt, s * 0.1));
    parts.push(ball(0.048, s * 0.245, 0.53, 0.03, skin, 10));
  });
  // leher + kepala
  parts.push(tube(0.045, 0.05, 0.08, 8, 0, 1.09, 0, skin));
  parts.push(ball(0.135, 0, 1.2, 0.005, skin, 16));
  // telinga
  [-0.128, 0.128].forEach((x) => parts.push(ball(0.026, x, 1.2, -0.005, skin, 8)));
  // mata + alis + mulut
  [-0.048, 0.048].forEach((x) => {
    parts.push(ball(0.016, x, 1.215, 0.121, '#28303c', 8));
    parts.push(box(0.042, 0.011, 0.012, x, 1.252, 0.118, '#5d4a3a'));
  });
  parts.push(box(0.055, 0.014, 0.012, 0, 1.15, 0.124, '#b06a5a')); // senyum
  // rambut: kubah + poni
  parts.push(ball(0.138, 0, 1.235, -0.012, hair, 16, 0.72));
  parts.push(box(0.16, 0.05, 0.05, 0, 1.278, 0.095, hair));
  if (female) parts.push(ball(0.058, 0, 1.27, -0.125, hair, 12)); // sanggul
  return parts;
}

// ------------------------------------------------------------------------- kostum & perlengkapan
// Warna pakaian per warga; +Z = depan. Semua bagian di-bake jadi satu geometri per NPC.
const OUTFITS = {
  'npc-raka': { skin: '#d7a074', hair: '#2b2622', shirt: '#3f5d7a', pants: '#3b4756', shoes: '#2a2f36' },
  'npc-sari': { skin: '#e6b187', hair: '#241f1d', shirt: '#2f6b4f', pants: '#4c5561', shoes: '#33383f', female: true },
  'npc-nia': { skin: '#e8bb95', hair: '#3a2a21', shirt: '#6da9c9', pants: '#3f4c5c', shoes: '#eef3f8', female: true },
  'npc-adi': { skin: '#c98f63', hair: '#1e1b19', shirt: '#5d6b45', pants: '#4a5540', shoes: '#23272b' },
};
const DEFAULT_OUTFIT = OUTFITS['npc-raka'];

// Pak Raka — insinyur sipil: helm proyek, rompi high-vis bergaris reflektif, clipboard.
function engineerGear() {
  const parts = [];
  parts.push(ball(0.152, 0, 1.243, 0, '#ffcc33', 16, 0.6)); // kubah helm
  parts.push(tube(0.2, 0.2, 0.028, 18, 0, 1.238, 0, '#e8b32b')); // brim lebar
  parts.push(box(0.05, 0.04, 0.3, 0, 1.336, 0, '#ffd75e')); // tulang atas
  parts.push(box(0.09, 0.035, 0.02, 0, 1.249, 0.142, '#ffe27a')); // emblem depan
  parts.push(box(0.27, 0.3, 0.035, 0, 0.87, 0.112, '#ff8a1f')); // rompi depan
  parts.push(box(0.27, 0.3, 0.035, 0, 0.87, -0.112, '#f07a12')); // rompi punggung
  [-1, 1].forEach((s) => {
    parts.push(box(0.035, 0.3, 0.2, s * 0.145, 0.87, 0, '#ff8a1f')); // sisi rompi
    parts.push(box(0.014, 0.28, 0.014, s * 0.092, 0.87, 0.133, '#eef6ff')); // garis reflektif tegak
  });
  [0.78, 0.96].forEach((y) => parts.push(box(0.27, 0.03, 0.014, 0, y, 0.133, '#eef6ff'))); // garis mendatar
  parts.push(box(0.014, 0.2, 0.15, 0.26, 0.62, 0.075, '#c98b4b', { ry: -0.25 })); // papan clipboard
  parts.push(box(0.006, 0.17, 0.12, 0.272, 0.62, 0.075, '#f4f7fa', { ry: -0.25 })); // kertas
  parts.push(box(0.02, 0.03, 0.03, 0.263, 0.71, 0.075, '#8c9aa8', { ry: -0.25 })); // penjepit
  return parts;
}

// Bu Sari — surveyor geodesi: topi lapangan, kacamata, ikat rambut, papan peta.
function surveyorGear() {
  const parts = [];
  parts.push(ball(0.146, 0, 1.238, 0, '#2f6b4f', 16, 0.62)); // topi lapangan
  parts.push(box(0.28, 0.024, 0.17, 0, 1.246, 0.13, '#265c43')); // brim depan
  parts.push(box(0.05, 0.022, 0.05, 0, 1.312, 0, '#3a7d5c')); // kancing atas
  [-0.048, 0.048].forEach((x) => parts.push(ring(0.033, 0.006, x, 1.215, 0.128, '#1d2b33', 0, 0, 12))); // lensa
  parts.push(box(0.03, 0.008, 0.008, 0, 1.215, 0.13, '#1d2b33')); // jembatan kacamata
  [-1, 1].forEach((s) => parts.push(box(0.07, 0.007, 0.007, s * 0.088, 1.222, 0.095, '#1d2b33', { ry: s * 0.5 })));
  parts.push(ring(0.052, 0.014, 0, 1.252, -0.115, '#ff5d8f', Math.PI / 2)); // ikat rambut
  // papan peta dipegang dua tangan, dimiringkan ke atas.
  parts.push(box(0.3, 0.014, 0.22, 0, 0.68, 0.19, '#d7b98a', { rx: -0.45 }));
  parts.push(box(0.24, 0.018, 0.03, 0, 0.68, 0.19, '#2f7fd0', { rx: -0.45 })); // rute peta
  parts.push(box(0.03, 0.018, 0.18, 0, 0.68, 0.19, '#2f7fd0', { rx: -0.45 }));
  return parts;
}

// Dokter Nia — jas putih, kerah, stetoskop, dan tas P3K palang merah.
function doctorGear() {
  const parts = [];
  [-1, 1].forEach((s) => {
    parts.push(box(0.12, 0.4, 0.03, s * 0.072, 0.86, 0.113, '#f4f8fc')); // panel jas depan
    parts.push(box(0.12, 0.4, 0.03, s * 0.072, 0.86, -0.113, '#eaf1f8')); // panel punggung
    parts.push(capsule(0.05, 0.22, s * 0.215, 0.8, 0.01, '#f4f8fc', s * 0.1)); // lengan jas
    parts.push(box(0.06, 0.13, 0.022, s * 0.062, 1.035, 0.114, '#ffffff', { rz: s * 0.35 })); // kerah
  });
  parts.push(box(0.3, 0.14, 0.21, 0, 0.645, 0, '#f4f8fc')); // ujung jas
  parts.push(box(0.05, 0.03, 0.012, -0.062, 0.98, 0.132, '#2f8fd0')); // kartu nama
  parts.push(ring(0.09, 0.009, 0, 1.055, 0, '#2b3a4a', Math.PI / 2)); // selang leher
  [-1, 1].forEach((s) => parts.push(capsule(0.009, 0.2, s * 0.05, 0.955, 0.125, '#2b3a4a'))); // selang dada
  parts.push(tube(0.026, 0.026, 0.014, 12, 0.058, 0.822, 0.138, '#cfd8e3', Math.PI / 2)); // stetoskop
  parts.push(box(0.035, 0.34, 0.014, 0.11, 0.855, 0.128, '#dbe4ee', { rz: 0.35 })); // tali tas
  parts.push(box(0.16, 0.13, 0.075, 0.27, 0.56, 0.02, '#f7fafc')); // tas P3K
  parts.push(box(0.005, 0.075, 0.02, 0.349, 0.56, 0.02, '#e0344b')); // palang merah
  parts.push(box(0.005, 0.022, 0.07, 0.349, 0.56, 0.02, '#e0344b'));
  return parts;
}

// Prajurit Adi — seragam lapangan, baret merah, rompi kantong, senapan disandang.
function soldierGear() {
  const parts = [];
  parts.push(paint(new THREE.SphereGeometry(0.146, 16, 10).scale(1, 0.48, 1).rotateZ(0.16).translate(0.012, 1.278, 0), '#8f1f2b')); // baret
  parts.push(box(0.032, 0.024, 0.01, 0.1, 1.272, 0.128, '#f0d36a')); // badge baret
  parts.push(box(0.29, 0.3, 0.03, 0, 0.87, 0.112, '#4f5b3d')); // rompi depan
  parts.push(box(0.29, 0.3, 0.03, 0, 0.87, -0.112, '#465136')); // rompi punggung
  [-1, 1].forEach((s) => {
    parts.push(box(0.032, 0.3, 0.19, s * 0.148, 0.87, 0, '#4f5b3d')); // sisi rompi
    parts.push(box(0.075, 0.07, 0.028, s * 0.075, 0.79, 0.136, '#3f4a32')); // kantong bawah
    parts.push(box(0.075, 0.07, 0.028, s * 0.075, 0.92, 0.136, '#3f4a32')); // kantong atas
  });
  parts.push(box(0.06, 0.016, 0.012, 0, 0.985, 0.135, '#c9b26a')); // tanda pangkat
  // senapan disandang diagonal di punggung (laras ke atas).
  parts.push(box(0.05, 0.44, 0.045, 0.12, 0.95, -0.17, '#20262c', { rz: 0.6 }));
  parts.push(box(0.028, 0.3, 0.028, 0.26, 1.16, -0.17, '#333c44', { rz: 0.6 }));
  parts.push(box(0.042, 0.13, 0.036, 0.04, 0.8, -0.17, '#2a323a', { rz: 0.5 }));
  parts.push(box(0.035, 0.5, 0.008, 0.07, 0.86, 0.1, '#2f3a2a', { rz: 0.5 })); // tali senapan
  return parts;
}

const GEAR = {
  'npc-raka': engineerGear,
  'npc-sari': surveyorGear,
  'npc-nia': doctorGear,
  'npc-adi': soldierGear,
};

// Satu geometri per NPC (tubuh + kostum + perlengkapan) dengan vertex color → 1 draw call.
function bodyGeometry(npc) {
  const outfit = OUTFITS[npc.id] || DEFAULT_OUTFIT;
  const gear = GEAR[npc.id];
  const parts = [...humanParts(outfit), ...(gear ? gear() : [])];
  return mergeBufferGeometries(parts, false);
}

function Npc({ npc, index, groundAt, controlRef }) {
  const group = useRef(null);
  const marker = useRef(null);
  const geo = useMemo(() => bodyGeometry(npc), [npc]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.15, roughness: 0.72 }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: npc.color, transparent: true, opacity: 0.9 }), [npc.color]);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: npc.color, transparent: true, opacity: 0.45, side: THREE.DoubleSide }), [npc.color]);
  const seed = index * 1.7;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    const base = groundAt ? groundAt(npc.position[0], npc.position[1]) : 0;
    g.position.y = base + Math.sin(t * 1.7 + seed) * 0.012;
    const player = controlRef?.current?.pos;
    if (player) {
      const target = Math.atan2(player[0] - npc.position[0], player[1] - npc.position[1]);
      const turn = Math.atan2(Math.sin(target - g.rotation.y), Math.cos(target - g.rotation.y));
      g.rotation.y += turn * (1 - Math.exp(-5 * Math.min(delta || 1 / 60, 0.05)));
    }
    if (marker.current) {
      marker.current.rotation.y = t * 1.3 + seed;
      marker.current.position.y = 1.62 + Math.sin(t * 2 + seed) * 0.05;
      marker.current.visible = Math.sin(t * 2.2 + seed) > -0.75;
    }
  });

  return <group ref={group} position={[npc.position[0], 0, npc.position[1]]}>
    <mesh geometry={geo} material={material} castShadow receiveShadow />
    <group ref={marker}>
      <mesh><octahedronGeometry args={[0.09, 0]} /><primitive object={glow} attach="material" /></mesh>
    </group>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.42, 0.5, 26]} />
      <primitive object={ring} attach="material" />
    </mesh>
  </group>;
}

export default function NpcLayer({ groundAt, controlRef }) {
  return <group>
    {NPCS.map((npc, index) => <Npc key={npc.id} npc={npc} index={index} groundAt={groundAt} controlRef={controlRef} />)}
  </group>;
}
