import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';

// Realistic beach water for "Pesisir Digital": a custom ShaderMaterial with animated sharp-crested waves
// (vertex displacement), Fresnel sky reflection, sun glitter, shallow→deep colour, wave-crest whitecaps and
// shore surf. `oceanHeight()` evaluates the very same wave sum on the CPU so boats, buoys and projectiles
// float / splash exactly on the rendered surface.

export const SHORE_R = 52;        // radius of the dry sand island
export const BEACH_SLOPE = 0.12;  // sand drop per unit beyond the shore line
export const WATER_LEVEL = -0.1;
export const WADE_R = 55.5;       // on foot Twini can wade until here (knee-deep)
export const BOAT_MIN_R = 56.2;   // boats float beyond here
export const PIER = { x0: -2.1, x1: 2.1, z0: -81, z1: -51, top: 0.4 };

export const onPier = (x, z, margin = 0) => x >= PIER.x0 - margin && x <= PIER.x1 + margin && z >= PIER.z0 - margin && z <= PIER.z1 + margin;
export function beachHeight(x, z) {
  if (onPier(x, z)) return PIER.top;
  const r = Math.hypot(x, z);
  return r <= SHORE_R ? 0 : -(r - SHORE_R) * BEACH_SLOPE;
}
export const isOpenWater = (x, z) => Math.hypot(x, z) >= BOAT_MIN_R && !onPier(x, z, 0.9);

// [dirX, dirZ, amplitude, wavelength, angular speed]
const WAVES = [
  [0.92, 0.39, 0.24, 17, 1.15],
  [-0.45, 0.89, 0.15, 9.5, 1.55],
  [0.2, -0.98, 0.09, 6.2, 1.95],
  [-0.8, -0.6, 0.05, 3.9, 2.55],
].map(([dx, dz, a, L, w]) => { const l = Math.hypot(dx, dz); return [dx / l, dz / l, a, (Math.PI * 2) / L, w]; });

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const attenuation = (r) => 0.22 + 0.78 * smooth(SHORE_R + 1, SHORE_R + 22, r);

// Sharp crests: a·(e^{sin θ} − I0(1)) / 1.45 → zero mean, peaks at +a.
export function oceanHeight(x, z, t) {
  const att = attenuation(Math.hypot(x, z));
  let h = 0;
  for (let i = 0; i < WAVES.length; i += 1) {
    const [dx, dz, a, k, w] = WAVES[i];
    h += (a * (Math.exp(Math.sin(k * (dx * x + dz * z) - w * t)) - 1.266)) / 1.45;
  }
  return WATER_LEVEL + h * att;
}
// Surface slope (dh/dx, dh/dz) for tilting floating objects.
export function oceanSlope(x, z, t) {
  const att = attenuation(Math.hypot(x, z));
  let sx = 0;
  let sz = 0;
  for (let i = 0; i < WAVES.length; i += 1) {
    const [dx, dz, a, k, w] = WAVES[i];
    const th = k * (dx * x + dz * z) - w * t;
    const d = (a * Math.exp(Math.sin(th)) * Math.cos(th) * k) / 1.45;
    sx += d * dx;
    sz += d * dz;
  }
  return [sx * att, sz * att];
}

const VERTEX = /* glsl */`
uniform float uTime;
uniform float uShore;
uniform vec4 uWave[4];
uniform float uOmega[4];
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vHeight;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float r = length(wp.xz);
  float att = 0.22 + 0.78 * smoothstep(uShore + 1.0, uShore + 22.0, r);
  float h = 0.0;
  float sx = 0.0;
  float sz = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 w = uWave[i];
    float th = w.w * dot(w.xy, wp.xz) - uOmega[i] * uTime;
    float e = exp(sin(th));
    h += w.z * (e - 1.266) / 1.45;
    float d = w.z * e * cos(th) * w.w / 1.45;
    sx += d * w.x;
    sz += d * w.y;
  }
  wp.y += h * att;
  vHeight = h * att;
  vNormalW = normalize(vec3(-sx * att, 1.0, -sz * att));
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uShore;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uFoam;
uniform float uDay;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vHeight;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec2 p = vWorld.xz;
  // Small travelling ripples perturb the wave normal (faded with distance to avoid shimmering).
  float n1 = noise(p * 0.8 + vec2(uTime * 0.35, uTime * 0.21));
  float n2 = noise(p * 2.1 - vec2(uTime * 0.52, -uTime * 0.31));
  vec2 rip = vec2(noise(p * 1.6 + vec2(uTime * 0.45, 0.0)) - 0.5, noise(p * 1.6 + vec2(3.7, uTime * 0.5)) - 0.5);
  #ifdef FINE_RIPPLES
  rip += vec2(noise(p * 4.3 - vec2(0.0, uTime * 0.9)) - 0.5, noise(p * 4.3 + vec2(uTime * 0.8, 9.1)) - 0.5) * 0.5;
  #endif
  vec3 N = normalize(vNormalW + vec3(rip.x, 0.0, rip.y) * 0.42 * (1.0 - smoothstep(20.0, 95.0, dist)));
  float r = length(p);
  float depthMix = smoothstep(uShore + 0.5, uShore + 28.0, r);
  vec3 water = mix(uShallow, uDeep, depthMix);
  float ndv = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(R.y * 1.6, 0.0, 1.0));
  vec3 col = mix(water, sky, clamp(fres * 0.92, 0.0, 1.0));
  // Light shining through the wave crests (subsurface scattering look).
  col += uShallow * max(vHeight, 0.0) * 0.85 * (1.0 - depthMix * 0.5) * uDay;
  float diff = max(dot(N, uSunDir), 0.0);
  col *= 0.72 + 0.38 * diff;
  // Sun glitter: tight hot-spot + broad sheen.
  vec3 H = normalize(uSunDir + V);
  float nh = max(dot(N, H), 0.0);
  col += uSunColor * (pow(nh, 260.0) * 4.0 + pow(nh, 38.0) * 0.22) * uDay;
  // Foam: wave-crest whitecaps, the wet shore line and surf bands rolling in to the beach.
  float crest = smoothstep(0.15, 0.3, vHeight + (n1 - 0.5) * 0.14);
  float shore = 1.0 - smoothstep(uShore + 0.4, uShore + 4.8, r);
  float surfBand = smoothstep(0.6, 0.97, sin(r * 2.1 + uTime * 1.7 + n2 * 2.6) * 0.5 + 0.5);
  float surf = surfBand * (1.0 - smoothstep(uShore + 0.6, uShore + 9.5, r));
  float foam = clamp(crest * 0.7 + shore * 0.9 * (0.5 + 0.5 * n2) + surf * 0.75, 0.0, 1.0) * (0.55 + 0.45 * n1);
  col = mix(col, uFoam, foam);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Polar grid: dense rings next to the beach (where the camera is), growing coarser towards the horizon.
function buildOceanGeometry(inner = 47, outer = 180, far = 340, seg = 240) {
  const radii = [];
  for (let r = inner; r < outer; r += 0.55 * (1 + (r - inner) / 24)) radii.push(r);
  radii.push(outer, far);
  const positions = new Float32Array(radii.length * (seg + 1) * 3);
  let o = 0;
  radii.forEach((r) => {
    for (let j = 0; j <= seg; j += 1) {
      const a = (j / seg) * Math.PI * 2;
      positions[o++] = Math.cos(a) * r; positions[o++] = 0; positions[o++] = Math.sin(a) * r;
    }
  });
  const index = [];
  for (let i = 0; i < radii.length - 1; i += 1) {
    for (let j = 0; j < seg; j += 1) {
      const a = i * (seg + 1) + j;
      const b = a + seg + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

// Fine sand grain texture (tileable value noise + speckles), procedurally generated — no image assets.
export function makeSandTexture() {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  const h = (x, y) => { const s = Math.sin(((x % N) * 127.1 + (y % N) * 311.7)) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, cell) => {
    const gx = Math.floor(x / cell); const gy = Math.floor(y / cell);
    const fx = x / cell - gx; const fy = y / cell - gy; const c = N / cell;
    const v = (i, j) => h(((gx + i) % c + c) % c * 7, ((gy + j) % c + c) % c * 13);
    const ux = fx * fx * (3 - 2 * fx); const uy = fy * fy * (3 - 2 * fy);
    return (v(0, 0) * (1 - ux) + v(1, 0) * ux) * (1 - uy) + (v(0, 1) * (1 - ux) + v(1, 1) * ux) * uy;
  };
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const ripple = vn(x, y, 32) * 0.5 + vn(x, y, 16) * 0.3 + vn(x, y, 8) * 0.2;
      const grain = h(x * 3 + 1, y * 5 + 2);
      let v = 0.82 + ripple * 0.14 + (grain - 0.5) * 0.12;
      if (grain > 0.985) v -= 0.25; // dark speckles (tiny pebbles / shells)
      if (grain < 0.012) v += 0.12; // bright quartz sparkles
      const i = (y * N + x) * 4;
      data[i] = Math.max(0, Math.min(255, v * 255));
      data[i + 1] = Math.max(0, Math.min(255, v * 247));
      data[i + 2] = Math.max(0, Math.min(255, v * 232));
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Beach island: flat dry sand that slopes down under the water (so the shore line is a real intersection),
// darker "wet sand" vertex colour towards the surf.
function buildBeachGeometry(seg = 144) {
  const radii = [0, 10, 20, 30, 38, 44, 48, 50.5, SHORE_R, 52.8, 53.6, 54.6, 55.8, 57.5, 60, 64, 70];
  const positions = [];
  const colors = [];
  const uvs = [];
  const dry = new THREE.Color('#f0e1b6');
  const damp = new THREE.Color('#d8c08e');
  const wet = new THREE.Color('#a88f63');
  const c = new THREE.Color();
  radii.forEach((r) => {
    const y = r <= SHORE_R ? 0 : -(r - SHORE_R) * BEACH_SLOPE;
    if (r < 50) c.copy(dry); else if (r <= SHORE_R) c.copy(dry).lerp(damp, (r - 50) / (SHORE_R - 50)); else c.copy(damp).lerp(wet, Math.min(1, (r - SHORE_R) / 3));
    for (let j = 0; j <= seg; j += 1) {
      const a = (j / seg) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      positions.push(x, y, z);
      colors.push(c.r, c.g, c.b);
      uvs.push(x / 3.2, z / 3.2);
    }
  });
  const index = [];
  for (let i = 0; i < radii.length - 1; i += 1) {
    for (let j = 0; j < seg; j += 1) {
      const a = i * (seg + 1) + j;
      const b = a + seg + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b); // counter-clockwise from above → normals point up
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function Beach() {
  const geometry = useMemo(() => buildBeachGeometry(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: makeSandTexture(), vertexColors: true, roughness: 0.96, metalness: 0 }), []);
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

export default function Ocean({ skyColor = '#8db5c1', sunIntensity = 2.3 }) {
  // Phones get a lighter grid and skip the second ripple octave (two fewer noise lookups per pixel).
  const geometry = useMemo(() => (Platform.OS === 'web' ? buildOceanGeometry() : buildOceanGeometry(47, 180, 340, 150)), []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    defines: Platform.OS === 'web' ? { FINE_RIPPLES: '' } : {},
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uShore: { value: SHORE_R },
      uWave: { value: WAVES.map(([dx, dz, a, k]) => new THREE.Vector4(dx, dz, a, k)) },
      uOmega: { value: WAVES.map((w) => w[4]) },
      uDeep: { value: new THREE.Color('#0b4f78') },
      uShallow: { value: new THREE.Color('#2fc4c4') },
      uSkyTop: { value: new THREE.Color('#5aa7e0') },
      uSkyHorizon: { value: new THREE.Color('#d6eef7') },
      uSunColor: { value: new THREE.Color('#fff4d6') },
      uSunDir: { value: new THREE.Vector3(14, 22, 10).normalize() },
      uFoam: { value: new THREE.Color('#f4fbff') },
      uDay: { value: 1 },
    }]),
  }), []);
  // Follow the day/night sky: reflections and glitter dim at night.
  useEffect(() => {
    const day = Math.max(0.15, Math.min(1, sunIntensity / 2.3));
    const sky = new THREE.Color(skyColor);
    material.uniforms.uSkyHorizon.value.copy(sky).lerp(new THREE.Color('#ffffff'), 0.35 * day);
    material.uniforms.uSkyTop.value.copy(sky).multiplyScalar(0.75 + 0.15 * day);
    material.uniforms.uDeep.value.set('#0b4f78').multiplyScalar(0.45 + 0.55 * day);
    material.uniforms.uShallow.value.set('#2fc4c4').multiplyScalar(0.4 + 0.6 * day);
    material.uniforms.uFoam.value.set('#f4fbff').multiplyScalar(0.55 + 0.45 * day);
    material.uniforms.uDay.value = day;
  }, [skyColor, sunIntensity, material]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ clock }) => { material.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />;
}
