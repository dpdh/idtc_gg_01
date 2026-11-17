import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

// Realistic-looking trees that stay cheap: every species is just TWO instanced draw calls for the whole
// forest — a vertex-coloured "wood" mesh (trunk, branches, dark inner canopy) and a foliage mesh made of
// leaf cards with a procedural alpha-cut leaf texture (real leaf silhouettes instead of cones / spheres).
// Foliage normals are bent outwards from the crown so the cards shade like one soft, round canopy.

const rng = (seed) => { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };

function finish(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// A spray of ~80 overlapping leaves (pointed ellipses with a lighter mid-rib) on a transparent background.
function makeLeafTexture() {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  const r = rng(77);
  for (let k = 0; k < 84; k += 1) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.4;
    const cx = 0.5 + Math.cos(a) * d;
    const cy = 0.5 + Math.sin(a) * d;
    const rot = r() * Math.PI * 2;
    const len = 0.075 + r() * 0.055;
    const wid = len * (0.38 + r() * 0.16);
    const shade = 0.62 + r() * 0.5;
    const hue = r();
    const x0 = Math.max(0, Math.floor((cx - len) * N));
    const x1 = Math.min(N - 1, Math.ceil((cx + len) * N));
    const y0 = Math.max(0, Math.floor((cy - len) * N));
    const y1 = Math.min(N - 1, Math.ceil((cy + len) * N));
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const px = x / N - cx;
        const py = y / N - cy;
        const u = (px * cr + py * sr) / len; // along the leaf, -1..1
        const v = (-px * sr + py * cr) / wid;
        const edge = 1 - u * u; // pointed tips
        if (edge <= 0 || Math.abs(v) > edge) continue;
        const rib = Math.abs(v) < 0.09 ? 1.25 : 1;
        const rim = 0.8 + 0.2 * (1 - Math.abs(v) / edge);
        const l = shade * rib * rim;
        const i = (y * N + x) * 4;
        data[i] = Math.min(255, (58 + hue * 46) * l);
        data[i + 1] = Math.min(255, (128 + hue * 30) * l);
        data[i + 2] = Math.min(255, (44 + hue * 20) * l);
        data[i + 3] = 255;
      }
    }
  }
  return finish(data, N, N);
}

// One feather-shaped frond: a mid-rib with rows of slanted leaflets (palm leaf / conifer branch).
function makeFrondTexture() {
  const W = 64;
  const H = 128;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const u = (x / (W - 1)) * 2 - 1;
      const v = y / (H - 1);
      const au = Math.abs(u);
      const env = Math.sin(Math.PI * Math.min(1, v * 1.02)) ** 0.45 * 0.97; // leaf outline
      const stripe = (v * 22 - au * 3.2) % 1; // leaflets sweep towards the tip
      const leaflet = au < env && ((stripe + 1) % 1) < 0.62;
      const rib = au < 0.05 && v < 0.98;
      if (!leaflet && !rib) continue;
      const l = rib ? 0.75 : 0.72 + 0.4 * (1 - au / Math.max(0.05, env)) + (((stripe + 1) % 1) < 0.12 ? -0.18 : 0);
      const i = (y * W + x) * 4;
      data[i] = Math.min(255, 70 * l);
      data[i + 1] = Math.min(255, 150 * l);
      data[i + 2] = Math.min(255, 60 * l);
      data[i + 3] = 255;
    }
  }
  return finish(data, W, H);
}

function colored(geometry, hex, matrix) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (matrix) g.applyMatrix4(matrix);
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const mat4 = (p, r = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));

// Bend all normals away from `center` (mixed with straight up) → cards shade like a single soft volume.
function puffNormals(g, center, up = 0.35) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.set(pos.getX(i) - center[0], pos.getY(i) - center[1], pos.getZ(i) - center[2]).normalize();
    v.y += up;
    v.normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

function buildBroadleaf() {
  const r = rng(11);
  const wood = [
    colored(new THREE.CylinderGeometry(0.075, 0.15, 1.7, 8), '#6b4a34', mat4([0, 0.85, 0])),
    colored(new THREE.CylinderGeometry(0.04, 0.07, 1.0, 6), '#6b4a34', mat4([0.28, 1.75, 0.05], [0, 0, -0.62])),
    colored(new THREE.CylinderGeometry(0.04, 0.07, 1.0, 6), '#6b4a34', mat4([-0.22, 1.8, 0.2], [0.45, 0, 0.55])),
    colored(new THREE.CylinderGeometry(0.035, 0.06, 0.9, 6), '#6b4a34', mat4([-0.05, 1.85, -0.26], [-0.6, 0, 0.1])),
    // dark inner canopy so you never see through the leaf cards
    colored(new THREE.IcosahedronGeometry(0.78, 1), '#1f4a24', mat4([0, 2.45, 0], [0, 0, 0], [1.15, 0.85, 1.15])),
  ];
  const center = [0, 2.45, 0];
  const cards = [];
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2 + r() * 0.5;
    const el = (r() - 0.25) * 1.5;
    const dir = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)];
    const size = 1.15 + r() * 0.6;
    const q = new THREE.PlaneGeometry(size, size);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-dir[0], -dir[1] * 0.6, -dir[2]), new THREE.Vector3(0, 1, 0));
    m.multiply(new THREE.Matrix4().makeRotationZ(r() * Math.PI * 2));
    m.setPosition(center[0] + dir[0] * 0.85, center[1] + dir[1] * 0.6, center[2] + dir[2] * 0.85);
    q.applyMatrix4(m);
    cards.push(q.toNonIndexed());
  }
  return { wood: mergeBufferGeometries(wood, false), foliage: puffNormals(mergeBufferGeometries(cards, false), center) };
}

// A frond: a strip following a drooping arc from the crown, slightly folded along the mid-rib.
function frondStrip(origin, angle, length, width, lift, droop, segments = 6) {
  const pos = [];
  const uv = [];
  const idx = [];
  const cx = Math.cos(angle);
  const sz = Math.sin(angle);
  for (let i = 0; i <= segments; i += 1) {
    const s = i / segments;
    const out = length * s;
    const y = origin[1] + lift * s - droop * s * s;
    const w = width * 0.5;
    const fold = 0.12 * width * Math.sin(Math.PI * s); // V-fold: edges sit lower than the rib
    const px = origin[0] + cx * out;
    const pz = origin[2] + sz * out;
    pos.push(px - sz * w, y - fold, pz + cx * w, px, y, pz, px + sz * w, y - fold, pz - cx * w);
    uv.push(0, s, 0.5, s, 1, s);
    if (i < segments) { const a = i * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function buildPalm() {
  const r = rng(23);
  const wood = [];
  // gently curved, ringed trunk
  const SEG = 7;
  const H = 3.7;
  const bend = (s) => 0.55 * s * s;
  for (let i = 0; i < SEG; i += 1) {
    const s0 = i / SEG;
    const s1 = (i + 1) / SEG;
    const lean = Math.atan2(bend(s1) - bend(s0), H / SEG);
    wood.push(colored(new THREE.CylinderGeometry(0.13 - s1 * 0.045, 0.16 - s0 * 0.05, H / SEG + 0.04, 8), i % 2 ? '#8d7355' : '#7c6449', mat4([(bend(s0) + bend(s1)) / 2, (s0 + s1) * 0.5 * H, 0], [0, 0, -lean])));
  }
  const top = [bend(1), H, 0];
  [0, 2.1, 4.2].forEach((a) => wood.push(colored(new THREE.SphereGeometry(0.13, 8, 6), '#4a3a22', mat4([top[0] + Math.cos(a) * 0.17, top[1] - 0.16, Math.sin(a) * 0.17]))));
  wood.push(colored(new THREE.SphereGeometry(0.2, 8, 6), '#3d6b2c', mat4(top, [0, 0, 0], [1, 0.8, 1])));
  const fronds = [];
  for (let i = 0; i < 11; i += 1) {
    const a = (i / 11) * Math.PI * 2 + r() * 0.25;
    const young = i % 3 === 0; // a few upright young fronds, the rest arch over and droop
    fronds.push(frondStrip(top, a, 2.0 + r() * 0.5, 0.72, young ? 1.5 : 0.75 + r() * 0.3, young ? 1.3 : 1.9 + r() * 0.5));
  }
  return { wood: mergeBufferGeometries(wood, false), foliage: puffNormals(mergeBufferGeometries(fronds, false), [top[0], top[1] - 1.2, 0], 0.9) };
}

function buildPine() {
  const r = rng(31);
  const wood = [
    colored(new THREE.CylinderGeometry(0.05, 0.16, 3.5, 8), '#5a4030', mat4([0, 1.75, 0])),
    colored(new THREE.ConeGeometry(0.5, 2.6, 8), '#1c3f26', mat4([0, 2.2, 0])), // dark core
    colored(new THREE.ConeGeometry(0.16, 0.6, 6), '#28552f', mat4([0, 3.75, 0])), // leader
  ];
  const boughs = [];
  const TIERS = 6;
  for (let t = 0; t < TIERS; t += 1) {
    const k = t / (TIERS - 1);
    const y = 0.85 + k * 2.55;
    const reach = 1.3 - k * 0.98;
    const count = 8 - Math.floor(k * 3);
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + t * 0.6 + r() * 0.2;
      boughs.push(frondStrip([0, y, 0], a, reach * (0.9 + r() * 0.2), reach * 0.75, 0.12, 0.42 + (1 - k) * 0.2, 3));
    }
  }
  return { wood: mergeBufferGeometries(wood, false), foliage: puffNormals(mergeBufferGeometries(boughs, false), [0, 1.6, 0], 0.7) };
}

const BUILDERS = { broadleaf: buildBroadleaf, palm: buildPalm, pine: buildPine };
const cache = {};
function species(kind) {
  if (cache[kind]) return cache[kind];
  const geo = BUILDERS[kind]();
  const frond = kind !== 'broadleaf';
  const map = frond ? (cache.frondTex || (cache.frondTex = makeFrondTexture())) : (cache.leafTex || (cache.leafTex = makeLeafTexture()));
  const foliage = new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.82, metalness: 0, color: kind === 'pine' ? '#5f9a62' : kind === 'palm' ? '#c9ee9a' : '#ffffff' });
  // Keep the puffed normals on back faces too (three would flip them and darken half of every card).
  foliage.onBeforeCompile = (shader) => {
    const chunk = THREE.ShaderChunk.normal_fragment_begin;
    if (chunk && chunk.includes('gl_FrontFacing ? 1.0 : - 1.0')) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', chunk.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
  };
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  cache[kind] = { ...geo, foliageMat: foliage, woodMat: wood };
  return cache[kind];
}

// items: [x, z, rand1, rand2]; `yOf(x, z)` optional ground height; `size` base scale.
export default function TreeInstances({ items, kind = 'broadleaf', size = 1, vary = 0.5, tilt = 0, yOf }) {
  const sp = useMemo(() => species(kind), [kind]);
  const wood = useRef(null);
  const leaves = useRef(null);
  useLayoutEffect(() => {
    if (!wood.current || !leaves.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      const a = item[2] ?? ((i * 37) % 10) / 10;
      const b = item[3] ?? ((i * 53) % 10) / 10;
      dummy.position.set(item[0], yOf ? yOf(item[0], item[1]) : 0, item[1]);
      dummy.rotation.set((a - 0.5) * tilt, b * Math.PI * 2, (b - 0.5) * tilt);
      dummy.scale.setScalar(size * (1 - vary * 0.5 + a * vary));
      dummy.updateMatrix();
      wood.current.setMatrixAt(i, dummy.matrix);
      leaves.current.setMatrixAt(i, dummy.matrix);
      // per-tree tint: fresh green … slightly yellow / darker
      leaves.current.setColorAt(i, color.setRGB(0.82 + b * 0.18, 0.86 + a * 0.14, 0.78 + ((a + b) % 1) * 0.12));
    });
    [wood.current, leaves.current].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); });
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, [items, size, vary, tilt, yOf]);
  if (!items.length) return null;
  return <>
    <instancedMesh key={`w${items.length}`} ref={wood} args={[sp.wood, sp.woodMat, items.length]} castShadow receiveShadow />
    <instancedMesh key={`l${items.length}`} ref={leaves} args={[sp.foliage, sp.foliageMat, items.length]} />
  </>;
}
