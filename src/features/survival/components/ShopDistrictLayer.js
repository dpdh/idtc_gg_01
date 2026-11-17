import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { SHOP_BUILDINGS, SHOP_DISTRICT } from '../data/shopDistrict';

// Distrik Toko TWINI: 5 bangunan berjejer (toko, bengkel laser, garasi, gudang aset, pos layanan)
// di atas satu pelataran paving, lengkap dengan trotoar, 6 lampu, planter, dan gapura barat.
// Setiap bangunan memakai 3 geometry gabungan (padat / kaca / glow) supaya hemat draw call.

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

const box = (w, h, d, x, y, z, hex) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex);
const cyl = (rt, rb, h, seg, x, y, z, hex, rx = 0) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  return paint(g, hex);
};
const ring = (radius, tube, x, y, z, hex, rx = Math.PI / 2) => {
  const g = new THREE.TorusGeometry(radius, tube, 8, 24);
  g.rotateX(rx);
  g.translate(x, y, z);
  return paint(g, hex);
};
const sphere = (radius, x, y, z, hex, seg = 12) => paint(new THREE.SphereGeometry(radius, seg, Math.max(6, seg - 2)).translate(x, y, z), hex);

const DARK = '#22303f';
const BODY = '#122a3d';
const TRIM = '#e8f4ff';
const CONCRETE = '#26323f';

// ------------------------------------------------------------------------------- facade builders
function storeUnit(b, solid, glow, glass) {
  const { w, d, h, color } = b;
  solid.push(box(w + 0.6, 0.16, d + 0.4, 0, 0.08, 0, CONCRETE));
  solid.push(box(w, h, d, 0, 0.16 + h / 2, 0, BODY));
  solid.push(box(w + 0.14, 0.32, d + 0.14, 0, 0.16 + h + 0.12, 0, color));
  solid.push(box(w * 0.66, 0.62, 0.18, 0, h + 0.66, -d / 2, TRIM));
  solid.push(box(1.3, 2.2, 0.14, -0.62, 1.26, -d / 2 - 0.06, DARK));
  solid.push(box(w - 0.5, 0.1, 1.25, 0, 2.62, -d / 2 - 0.58, color));
  for (let i = 0; i < 6; i += 1) {
    solid.push(box(0.46, 0.11, 1.26, -1.9 + i * 0.76, 2.63, -d / 2 - 0.58, i % 2 ? '#f2fbff' : color));
  }
  solid.push(box(0.9, 0.5, 0.7, -1.4, h + 0.9, 0.4, DARK));
  solid.push(box(0.7, 0.42, 0.6, 1.5, h + 0.86, 0.3, '#2d4054'));
  solid.push(box(0.9, 0.9, 0.5, -2.0, 0.62, -d / 2 - 0.32, '#2b3c4e'));
  solid.push(box(0.9, 0.9, 0.5, 1.95, 0.62, -d / 2 - 0.32, '#2b3c4e'));

  glass.push(box(w - 1.5, h * 0.46, 0.1, 0.35, 1.62, -d / 2 - 0.02, '#0f3550'));
  glass.push(box(0.9, 1.95, 0.08, 0.55, 1.24, -d / 2 - 0.1, '#0c2c42'));
  glass.push(box(0.1, h * 0.34, d * 0.52, -w / 2 - 0.02, 1.55, 0.1, '#0f3550'));
  glass.push(box(0.1, h * 0.34, d * 0.52, w / 2 + 0.02, 1.55, 0.1, '#0f3550'));

  glow.push(box(w - 0.4, 0.06, 0.07, 0, 2.95, -d / 2 - 0.1, color));
  glow.push(box(w * 0.58, 0.06, 0.1, 0, h + 0.32, -d / 2 - 0.03, color));
  glow.push(box(0.5, 0.42, 0.08, 0, h + 0.66, -d / 2 - 0.11, color));
  glow.push(ring(0.17, 0.035, 0, h + 0.92, -d / 2 - 0.08, color, 0));
  glow.push(box(0.08, 2.0, 0.06, -0.1, 1.25, -d / 2 - 0.14, '#d8fbff'));
}

function weaponUnit(b, solid, glow, glass) {
  const { w, d, h, color } = b;
  solid.push(box(w + 0.6, 0.16, d + 0.4, 0, 0.08, 0, CONCRETE));
  solid.push(box(w, h, d, 0, 0.16 + h / 2, 0, BODY));
  solid.push(box(w + 0.12, 0.26, d + 0.12, 0, 0.16 + h + 0.1, 0, color));
  solid.push(box(w * 0.72, 0.5, 0.16, 0, h + 0.5, -d / 2, TRIM));
  solid.push(box(w * 0.62, 1.9, 0.14, 0, 1.11, -d / 2 - 0.06, DARK));
  for (let i = 0; i < 5; i += 1) solid.push(box(w * 0.58, 0.05, 0.06, 0, 0.42 + i * 0.36, -d / 2 - 0.13, '#33465a'));
  solid.push(box(w - 0.4, 0.1, 1.0, 0, 2.35, -d / 2 - 0.5, color));
  solid.push(box(0.9, 0.85, 0.55, w / 2 - 0.9, 0.6, -d / 2 - 0.34, '#2b3c4e'));
  solid.push(box(0.44, 0.34, 0.4, -w / 2 + 0.55, 0.34, -d / 2 - 0.5, '#3a4d63'));
  solid.push(box(0.36, 0.28, 0.34, -w / 2 + 0.95, 0.31, -d / 2 - 0.32, '#33455a'));

  glass.push(box(w * 0.5, 0.7, 0.08, 0, 1.55, -d / 2 - 0.12, '#0f3550'));

  glow.push(box(0.05, 1.0, 0.05, w / 2 - 0.35, h + 0.9, 0.2, color));
  glow.push(sphere(0.09, w / 2 - 0.35, h + 1.45, 0.2, color, 10));
  glow.push(ring(0.24, 0.032, 0, h + 0.5, -d / 2 - 0.1, color, 0));
  glow.push(ring(0.12, 0.026, 0, h + 0.5, -d / 2 - 0.1, color, 0));
  glow.push(sphere(0.05, 0, h + 0.5, -d / 2 - 0.12, color, 8));
  glow.push(box(w * 0.66, 0.05, 0.07, 0, h + 0.22, -d / 2 - 0.04, color));
}


function garageUnit(b, solid, glow, glass) {
  const { w, d, h, color } = b;
  solid.push(box(w + 0.7, 0.16, d + 0.8, 0, 0.08, 0.1, CONCRETE));
  solid.push(box(w, h, d, 0, 0.16 + h / 2, 0, '#1b3145'));
  solid.push(box(w + 0.1, 0.22, d + 0.1, 0, 0.16 + h + 0.08, 0, color));
  solid.push(box(w * 0.72, 2.0, 0.14, 0, 1.16, -d / 2 - 0.06, '#0e2433'));
  for (let i = 0; i < 5; i += 1) solid.push(box(w * 0.68, 0.05, 0.06, 0, 0.42 + i * 0.38, -d / 2 - 0.13, '#2c4054'));
  solid.push(box(w * 0.8, 0.14, 0.9, 0, 0.2, -d / 2 - 0.5, '#3a4a5c'));
  solid.push(cyl(0.24, 0.24, 0.16, 14, -w / 2 + 0.35, 0.28, -d / 2 - 0.62, '#141d26', Math.PI / 2));
  solid.push(cyl(0.24, 0.24, 0.16, 14, -w / 2 + 0.35, 0.28, -d / 2 - 0.9, '#141d26', Math.PI / 2));
  solid.push(box(0.8, 0.24, 0.8, 0, h + 0.32, 0.4, '#2d4054'));

  glass.push(box(0.5, 0.42, 0.08, w / 2 - 0.55, h + 0.32, -d / 2 - 0.04, '#0f3550'));

  glow.push(box(w - 0.3, 0.06, 0.07, 0, 1.95, -d / 2 - 0.12, color));
  glow.push(box(0.46, 0.16, 0.06, 0, h + 0.62, -d / 2 - 0.05, color));
  glow.push(box(0.26, 0.12, 0.055, 0, h + 0.78, -d / 2 - 0.05, color));
  glow.push(sphere(0.05, -0.12, h + 0.66, -d / 2 - 0.09, color, 8));
  glow.push(sphere(0.05, 0.12, h + 0.66, -d / 2 - 0.09, color, 8));
  glow.push(box(w * 0.8, 0.05, 0.06, 0, 0.32, -d / 2 - 0.56, color));
}

function warehouseUnit(b, solid, glow, glass) {
  const { w, d, h, color } = b;
  solid.push(box(w + 0.6, 0.16, d + 0.5, 0, 0.08, 0, CONCRETE));
  solid.push(box(w, h, d, 0, 0.16 + h / 2, 0, '#17303f'));
  solid.push(box(w + 0.12, 0.24, d + 0.12, 0, 0.16 + h + 0.08, 0, color));
  solid.push(box(w * 0.55, 1.15, 0.5, 0, 2.05, -d / 2 - 0.3, '#24384b'));
  solid.push(box(w * 0.62, 0.55, 0.55, 0, 0.42, -d / 2 - 0.35, '#2f4358'));
  solid.push(box(0.9, 0.9, 0.9, -w / 2 + 0.65, 0.6, -d / 2 - 0.75, color));
  solid.push(box(0.95, 0.6, 0.85, -w / 2 + 0.68, 1.32, -d / 2 - 0.78, '#33475c'));
  for (let i = 0; i < 3; i += 1) solid.push(box(w * 0.24, 0.06, d * 0.5, -w * 0.28 + i * w * 0.28, h + 0.35, 0.1, '#1d3a52'));
  solid.push(box(w * 0.6, 0.44, 0.16, 0, h + 0.56, -d / 2, TRIM));

  glass.push(box(0.55, 0.4, 0.08, w / 2 - 0.65, h + 0.34, -d / 2 - 0.03, '#0f3550'));

  glow.push(box(w * 0.55, 0.05, 0.06, 0, h + 0.34, -d / 2 - 0.04, color));
  glow.push(box(0.28, 0.2, 0.07, -0.12, h + 0.56, -d / 2 - 0.11, color));
  glow.push(box(0.28, 0.2, 0.07, 0.18, h + 0.56, -d / 2 - 0.11, color));
  glow.push(box(0.5, 0.05, 0.06, 0, 0.3, -d / 2 - 0.62, color));
}

function serviceUnit(b, solid, glow, glass) {
  const { w, d, h, color } = b;
  solid.push(box(w + 0.6, 0.16, d + 0.4, 0, 0.08, 0, CONCRETE));
  solid.push(box(w, h, d, 0, 0.16 + h / 2, 0, '#1d2f3f'));
  solid.push(box(w + 0.4, 0.14, d * 0.6, 0, 2.25, -d / 2 - 0.45, color));
  solid.push(box(0.18, 2.2, 0.18, -w / 2 + 0.3, 1.1, -d / 2 - 0.85, '#2b3c4e'));
  solid.push(box(0.18, 2.2, 0.18, w / 2 - 0.3, 1.1, -d / 2 - 0.85, '#2b3c4e'));
  solid.push(box(0.9, 0.16, 0.4, -0.6, 0.48, -d / 2 - 0.3, '#3a4d63'));
  solid.push(box(0.9, 0.16, 0.4, 0.6, 0.48, -d / 2 - 0.3, '#3a4d63'));
  solid.push(box(w * 0.5, 0.42, 0.14, 0, h + 0.32, -d / 2, TRIM));

  glass.push(box(w * 0.62, 1.1, 0.08, 0, 1.35, -d / 2 - 0.03, '#0f3550'));

  glow.push(box(0.5, 0.14, 0.06, 0, 2.42, -d / 2 - 0.93, color));
  glow.push(box(0.14, 0.5, 0.06, 0, 2.42, -d / 2 - 0.93, color));
  glow.push(box(w + 0.3, 0.05, 0.07, 0, 2.15, -d / 2 - 0.48, color));
}

const BUILDERS = { store: storeUnit, weapons: weaponUnit, garage: garageUnit, warehouse: warehouseUnit, service: serviceUnit };

// ------------------------------------------------------------------------------- plaza & fixtures
function districtGeometry() {
  const { pad, rowZ, gate } = SHOP_DISTRICT;
  const centerX = (pad.x0 + pad.x1) / 2;
  const width = pad.x1 - pad.x0;
  const depth = pad.z1 - pad.z0;
  const solid = [];
  const glow = [];

  solid.push(box(width, 0.4, depth, centerX, -0.04, rowZ, '#161f2b'));
  solid.push(box(width - 0.6, 0.06, 1.9, centerX, 0.17, pad.z0 + 1.0, '#2b3b4d'));
  for (let i = 0; i < 7; i += 1) {
    solid.push(box(1.7, 0.02, 0.1, centerX - 10.5 + i * 3.2, 0.21, pad.z0 + 0.35, '#c8d8e6'));
  }
  // Planter diletakkan tepat di celah antar-bangunan supaya pintu tetap terbuka.
  const gapCenters = SHOP_BUILDINGS.slice(0, -1).map((b, i) => {
    const next = SHOP_BUILDINGS[i + 1];
    return (b.x + b.w / 2 + next.x - next.w / 2) / 2;
  });
  [gapCenters[0], gapCenters[1], gapCenters[3]].forEach((x) => {
    solid.push(box(0.9, 0.42, 0.9, x, 0.29, pad.z0 + 0.55, '#33445a'));
    solid.push(box(0.78, 0.16, 0.78, x, 0.56, pad.z0 + 0.55, '#3fbf6b'));
    solid.push(sphere(0.26, x, 0.82, pad.z0 + 0.55, '#4fd97f', 10));
  });
  // Enam tiang lampu di trotoar, jarak rapi.
  for (let i = 0; i < 6; i += 1) {
    const x = pad.x0 + 2.2 + i * ((width - 4.4) / 5);
    solid.push(cyl(0.055, 0.075, 2.55, 8, x, 1.36, pad.z0 + 1.55, '#3a4a5c'));
    solid.push(box(0.5, 0.07, 0.07, x + 0.2, 2.6, pad.z0 + 1.55, '#3a4a5c'));
    glow.push(sphere(0.13, x + 0.42, 2.58, pad.z0 + 1.55, '#ffe3a3', 10));
  }
  // Gapura barat: dua tiang + balok + papan glow.
  solid.push(box(0.22, 2.9, 0.22, gate[0], 1.45, gate[1] - 1.5, '#2b3c4e'));
  solid.push(box(0.22, 2.9, 0.22, gate[0], 1.45, gate[1] + 1.5, '#2b3c4e'));
  solid.push(box(0.26, 0.26, 3.3, gate[0], 3.0, gate[1], '#2b3c4e'));
  solid.push(box(0.3, 0.55, 1.6, gate[0], 2.55, gate[1], TRIM));
  glow.push(box(0.34, 0.08, 1.5, gate[0], 3.16, gate[1], '#7cf5ff'));
  glow.push(box(0.36, 0.4, 0.42, gate[0] + 0.02, 2.55, gate[1], '#7cf5ff'));

  return { solid: mergeBufferGeometries(solid, false), glow: mergeBufferGeometries(glow, false) };
}

export default function ShopDistrictLayer({ groundAt }) {
  const plaza = useMemo(() => districtGeometry(), []);
  const materials = useMemo(() => ({
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.08 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  }), []);
  const y = groundAt ? groundAt(28, SHOP_DISTRICT.rowZ) : 0;
  return <group position={[0, y, 0]}>
    <mesh geometry={plaza.solid} material={materials.solid} receiveShadow />
    <mesh geometry={plaza.glow} material={materials.glow} />
    {SHOP_BUILDINGS.map((building) => <ShopBuilding key={building.id} building={building} />)}
  </group>;
}


// ------------------------------------------------------------------------------- building assembly
function buildingGeometries(building) {
  const solid = [];
  const glow = [];
  const glass = [];
  (BUILDERS[building.type] || storeUnit)(building, solid, glow, glass);
  return {
    solid: mergeBufferGeometries(solid, false),
    glow: mergeBufferGeometries(glow, false),
    glass: mergeBufferGeometries(glass, false),
  };
}

function ShopBuilding({ building }) {
  const geometries = useMemo(() => buildingGeometries(building), [building]);
  const materials = useMemo(() => ({
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.28 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    glass: new THREE.MeshStandardMaterial({
      vertexColors: true, transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0.6,
      emissive: new THREE.Color('#0a2f42'), emissiveIntensity: 0.55,
    }),
  }), []);
  return <group position={[building.x, 0, building.z]}>
    <mesh geometry={geometries.solid} material={materials.solid} castShadow receiveShadow />
    <mesh geometry={geometries.glow} material={materials.glow} />
    <mesh geometry={geometries.glass} material={materials.glass} renderOrder={2} />
  </group>;
}

