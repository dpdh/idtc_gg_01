import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

// Bunga instanced yang tetap murah: satu patch bunga = 2 draw call.
//  - mesh "plant": batang + daun + kepala sari (warna di-bake per-vertex: hijau / kuning).
//  - mesh "bloom": mahkota bunga (kelopak membulat 2 lapis, putih) yang di-tint per-instance
//    lewat instanceColor, jadi satu patch bisa berisi campuran warna yang hidup.
// Tersedia 3 jenis: hibiscus (tropis, benang sari menjulur), garden (kelopak tegak seperti
// tulip/peoni) dan blossom (daisy kecil). Penempatan rapi memakai helper flowerRing /
// flowerLine / flowerGrid supaya taman terlihat tertata, bukan taburan acak.

const rng = (seed = 1) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

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

const _m = new THREE.Matrix4();
// Satu kelopak = lingkaran yang dipipihkan memanjang, pangkalnya di radius r0 dari pusat
// bunga, dimiringkan (tilt) lalu diputar mengelilingi sumbu (fan) membentuk mahkota.
function petalFan(count, tilt, len, wid, r0, headY, shade = 1, offset = 0) {
  const shape = new THREE.CircleGeometry(0.5, 8);
  shape.scale(wid, len, 1);
  shape.translate(0, len * 0.5 + r0, 0);
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + offset;
    const g = shape.clone();
    _m.makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(tilt));
    const place = new THREE.Matrix4().multiply(new THREE.Matrix4().makeTranslation(0, headY, 0), _m);
    g.applyMatrix4(place);
    parts.push(paint(g, `rgb(${Math.round(shade * 255)},${Math.round(shade * 255)},${Math.round(shade * 255)})`));
  }
  return parts;
}

// Daun pipih menghadap keluar dengan kemiringan ke atas.
function leafPair(y, len, wid, hex) {
  const parts = [];
  [-1, 1].forEach((side, i) => {
    const g = new THREE.CircleGeometry(0.5, 8);
    g.scale(wid, len, 1);
    g.translate(0, len * 0.5, 0);
    _m.makeRotationY(i * Math.PI - 0.55).multiply(new THREE.Matrix4().makeRotationX(0.65));
    g.applyMatrix4(new THREE.Matrix4().multiply(new THREE.Matrix4().makeTranslation(side * 0.02, y, 0), _m));
    parts.push(paint(g, hex));
  });
  return parts;
}

const stem = (h, hex, rTop = 0.011, rBot = 0.016) => (
  paint(new THREE.CylinderGeometry(rTop, rBot, h, 7).translate(0, h / 2, 0), hex)
);

// ---------------------------------------------------------------- jenis-jenis bunga
function buildHibiscus() {
  const plant = [
    stem(0.4, '#3d7a34'),
    ...leafPair(0.17, 0.13, 0.05, '#3f8f3d'),
    ...leafPair(0.27, 0.1, 0.04, '#357a33'), // daun atas sedikit lebih kecil
    paint(new THREE.SphereGeometry(0.03, 10, 8).translate(0, 0.4, 0), '#ffd23f'), // kepala sari
    // benang sari hibiscus yang khas: menjulur ke depan-atas dengan 5 titik ujung.
    paint(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6).rotateX(1.15).translate(0, 0.41, 0.07), '#ffe9a3'),
    ...[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return paint(new THREE.SphereGeometry(0.011, 6, 5).translate(Math.cos(a) * 0.03, 0.5, 0.16 + Math.sin(a) * 0.02), '#ff8248');
    }),
  ];
  const bloom = [
    ...petalFan(6, 1.05, 0.16, 0.095, 0.012, 0.4, 1),
    ...petalFan(6, 0.68, 0.125, 0.075, 0.006, 0.4, 0.9, Math.PI / 6),
  ];
  return { plant: mergeBufferGeometries(plant, false), bloom: mergeBufferGeometries(bloom, false), headY: 0.4 };
}

function buildGarden() {
  const plant = [
    stem(0.3, '#3d7a34'),
    ...leafPair(0.13, 0.12, 0.045, '#3f8f3d'),
    paint(new THREE.SphereGeometry(0.026, 10, 8).translate(0, 0.3, 0), '#ffd23f'),
  ];
  const bloom = [
    ...petalFan(6, 0.42, 0.15, 0.1, 0.01, 0.3, 1), // kelopak tegak membentuk cangkir
    ...petalFan(6, 0.2, 0.12, 0.082, 0.004, 0.3, 0.88, Math.PI / 6),
  ];
  return { plant: mergeBufferGeometries(plant, false), bloom: mergeBufferGeometries(bloom, false), headY: 0.3 };
}

function buildBlossom() {
  const plant = [
    stem(0.34, '#3d7a34'),
    ...leafPair(0.15, 0.11, 0.042, '#3f8f3d'),
    paint(new THREE.SphereGeometry(0.03, 10, 8).scale(1, 0.62, 1).translate(0, 0.335, 0), '#ffcf4d'), // dome kuning
    // 2 kuncup kecil di samping batang supaya tampak rimbun.
    paint(new THREE.SphereGeometry(0.026, 8, 7).scale(1, 0.62, 1).translate(0.085, 0.24, 0.03), '#9bd567'),
    paint(new THREE.SphereGeometry(0.026, 8, 7).scale(1, 0.62, 1).translate(-0.08, 0.27, -0.02), '#9bd567'),
  ];
  const bloom = [...petalFan(8, 1.32, 0.11, 0.038, 0.024, 0.335, 1)];
  return { plant: mergeBufferGeometries(plant, false), bloom: mergeBufferGeometries(bloom, false), headY: 0.335 };
}

const BUILDERS = { hibiscus: buildHibiscus, garden: buildGarden, blossom: buildBlossom };
const cache = {};
function species(kind) {
  if (cache[kind]) return cache[kind];
  const geo = (BUILDERS[kind] || buildHibiscus)();
  const bloomMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide,
  });
  const plantMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  cache[kind] = { ...geo, bloomMat, plantMat };
  return cache[kind];
}

export const FLOWER_PALETTES = {
  hibiscus: ['#ff2e4d', '#ff5a3c', '#ffb03a', '#ff7ab8', '#ff4f7d', '#ffd23f'],
  garden: ['#ff8fb3', '#c6a7ff', '#ffd166', '#ff6b8a', '#7fd3ff', '#ffffff', '#f72c5a'],
  blossom: ['#ffffff', '#ffd9e8', '#ffe36e', '#d9bcff'],
};

// ------------------------------------------------------------------------------ penempatan rapi
// Ring di sekeliling titik — untuk tepi taman bulat / mengelilingi kolam.
export function flowerRing(cx, cz, r, count, opts = {}) {
  const { start = 0, jitter = 0.12, seed = 11 } = opts;
  const rand = rng(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const a = start + (i / count) * Math.PI * 2;
    items.push([
      cx + Math.cos(a) * r + (rand() - 0.5) * jitter,
      cz + Math.sin(a) * r + (rand() - 0.5) * jitter,
      rand(), rand(),
    ]);
  }
  return items;
}

// Barisan bunga di sepanjang garis — untuk tepi jalan setapak & pinggiran lapangan.
export function flowerLine(x0, z0, x1, z1, count, opts = {}) {
  const { jitter = 0.1, seed = 21 } = opts;
  const rand = rng(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const k = count > 1 ? i / (count - 1) : 0;
    items.push([
      x0 + (x1 - x0) * k + (rand() - 0.5) * jitter,
      z0 + (z1 - z0) * k + (rand() - 0.5) * jitter,
      rand(), rand(),
    ]);
  }
  return items;
}

// Bedeng baris-kolom — kebun kota yang rapi.
export function flowerGrid(cx, cz, w, d, cols, rows, opts = {}) {
  const { jitter = 0.07, seed = 31 } = opts;
  const rand = rng(seed);
  const items = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = cols > 1 ? cx - w / 2 + (w / (cols - 1)) * c : cx;
      const z = rows > 1 ? cz - d / 2 + (d / (rows - 1)) * r : cz;
      items.push([x + (rand() - 0.5) * jitter, z + (rand() - 0.5) * jitter, rand(), rand()]);
    }
  }
  return items;
}


// ------------------------------------------------------------------------------------ komponen
// items: [x, z, rand1, rand2]; rand1 mengatur variasi ukuran, rand2 rotasi; yOf(x, z)
// opsional untuk mengikuti ketinggian tanah.
export default function FlowerInstances({
  items, kind = 'hibiscus', size = 1, vary = 0.35, tilt = 0.14, yOf,
}) {
  const sp = useMemo(() => species(kind), [kind]);
  const colors = useMemo(() => FLOWER_PALETTES[kind] || FLOWER_PALETTES.hibiscus, [kind]);
  const plant = useRef(null);
  const bloom = useRef(null);
  useLayoutEffect(() => {
    if (!plant.current || !bloom.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      const a = item[2] ?? ((i * 37) % 10) / 10;
      const b = item[3] ?? ((i * 53) % 10) / 10;
      dummy.position.set(item[0], yOf ? yOf(item[0], item[1]) : 0, item[1]);
      dummy.rotation.set((a - 0.5) * tilt * 2, b * Math.PI * 2, (b - 0.5) * tilt * 2);
      dummy.scale.setScalar(size * (1 - vary * 0.5 + a * vary));
      dummy.updateMatrix();
      plant.current.setMatrixAt(i, dummy.matrix);
      bloom.current.setMatrixAt(i, dummy.matrix);
      bloom.current.setColorAt(i, color.set(colors[(a * colors.length) | 0] || colors[i % colors.length]));
    });
    [plant.current, bloom.current].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); });
    if (bloom.current.instanceColor) bloom.current.instanceColor.needsUpdate = true;
  }, [items, size, vary, tilt, yOf, colors]);
  if (!items.length) return null;
  return <>
    <instancedMesh key={`p${items.length}`} ref={plant} args={[sp.plant, sp.plantMat, items.length]} />
    <instancedMesh key={`b${items.length}`} ref={bloom} args={[sp.bloom, sp.bloomMat, items.length]} />
  </>;
}

