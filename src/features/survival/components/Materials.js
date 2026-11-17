import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { useFrame, useThree } from '../../viewer/components/ThreeDRenderer';

// Procedural PBR-ish ground materials (no image assets): tileable fBm noise textures for grass, asphalt,
// concrete paving, dirt and wooden planks. The same texture doubles as a bump map so surfaces catch light
// instead of looking like flat colour. Textures are generated once and cached; each material gets its own
// clone so it can tile at its own scale.

// Image-based lighting + soft shadow maps are enabled on web; phones keep the cheaper lighting path
// (PMREM render targets are not reliable on every mobile GL driver).
export const REALISTIC_LIGHTING = Platform.OS === 'web';

const N = Platform.OS === 'web' ? 256 : 128; // smaller, faster-to-generate textures on phones
const cache = {};

function hash(x, y, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
// Tileable value noise: lattice coordinates wrap at `period`.
function vnoise(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const w = (v) => ((v % period) + period) % period;
  const a = hash(w(xi), w(yi), seed);
  const b = hash(w(xi + 1), w(yi), seed);
  const c = hash(w(xi), w(yi + 1), seed);
  const d = hash(w(xi + 1), w(yi + 1), seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}
function fbm(u, v, base, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const p = base * 2 ** o;
    sum += vnoise(u * p, v * p, p, seed + o) * amp;
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const PAINTERS = {
  grass(u, v) {
    const n = fbm(u, v, 4, 5, 1);
    const patch = fbm(u, v, 2, 3, 9);
    const blade = hash(Math.floor(u * N), Math.floor(v * N), 3);
    let c = mixc([0.2, 0.36, 0.13], [0.36, 0.52, 0.2], n);
    c = mixc(c, [0.45, 0.47, 0.22], clamp01((patch - 0.6) * 2.2)); // dry patches
    const k = 0.85 + blade * 0.3;
    return [c[0] * k, c[1] * k, c[2] * k];
  },
  asphalt(u, v) {
    const n = fbm(u, v, 8, 4, 2);
    const g = hash(Math.floor(u * N), Math.floor(v * N), 5);
    let l = 0.2 + n * 0.08 + (g - 0.5) * 0.09;
    if (g > 0.975) l += 0.18; // aggregate stones
    const stain = fbm(u, v, 2, 3, 12);
    l *= 0.9 + stain * 0.2;
    return [l, l * 1.01, l * 1.04];
  },
  concrete(u, v) {
    const n = fbm(u, v, 6, 4, 4);
    const g = hash(Math.floor(u * N), Math.floor(v * N), 6);
    let l = 0.66 + n * 0.12 + (g - 0.5) * 0.05;
    // paving slab joints (4 x 4 slabs per tile)
    const fu = (u * 4) % 1;
    const fv = (v * 4) % 1;
    if (fu < 0.018 || fv < 0.018) l *= 0.62;
    return [l * 0.98, l * 0.97, l * 0.93];
  },
  dirt(u, v) {
    const n = fbm(u, v, 4, 5, 7);
    const g = hash(Math.floor(u * N), Math.floor(v * N), 8);
    let c = mixc([0.42, 0.32, 0.2], [0.62, 0.5, 0.33], n);
    if (g > 0.97) c = mixc(c, [0.7, 0.68, 0.62], 0.6); // pebbles
    return c;
  },
  wood(u, v) {
    // 8 planks per tile, rows along v; each plank gets its own tone and long grain streaks along u.
    const row = Math.floor(v * 8);
    const fv = (v * 8) % 1;
    const tone = hash(row, 1, 11);
    const grain = fbm(u * 0.25 + row * 0.37, v * 4, 8, 3, 13);
    let c = mixc([0.42, 0.27, 0.15], [0.62, 0.43, 0.26], tone * 0.6 + grain * 0.4);
    const streak = Math.sin((u * 40 + grain * 6 + row * 3) * Math.PI) * 0.04;
    c = c.map((x) => x + streak);
    if (fv < 0.06 || fv > 0.96) c = c.map((x) => x * 0.35); // gaps between planks
    const seam = ((u + hash(row, 2, 14)) * 2) % 1; // plank butt joints
    if (seam < 0.006) c = c.map((x) => x * 0.5);
    return c;
  },
};

function baseTexture(kind) {
  if (cache[kind]) return cache[kind];
  const data = new Uint8Array(N * N * 4);
  const paint = PAINTERS[kind];
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const [r, g, b] = paint(x / N, y / N);
      const i = (y * N + x) * 4;
      data[i] = clamp01(r) * 255;
      data[i + 1] = clamp01(g) * 255;
      data[i + 2] = clamp01(b) * 255;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  cache[kind] = t;
  return t;
}

const SURFACE = {
  grass: { roughness: 0.95, bump: 0.6 },
  asphalt: { roughness: 0.88, bump: 0.5 },
  concrete: { roughness: 0.78, bump: 0.7 },
  dirt: { roughness: 0.97, bump: 0.9 },
  wood: { roughness: 0.72, bump: 1.4 },
};

// New material tiling `kind` [rx, ry] times over the geometry's UV range.
export function groundMaterial(kind, repeat = [1, 1], { rotate = 0, color = '#ffffff', ...extra } = {}) {
  const map = baseTexture(kind).clone();
  map.repeat.set(repeat[0], repeat[1]);
  if (rotate) { map.center.set(0.5, 0.5); map.rotation = rotate; }
  map.needsUpdate = true;
  // Bump mapping costs extra texture lookups per pixel: web only.
  return new THREE.MeshStandardMaterial({ map, bumpMap: REALISTIC_LIGHTING ? map : null, bumpScale: SURFACE[kind].bump, roughness: SURFACE[kind].roughness, metalness: 0, color, ...extra });
}

// Sky-gradient environment map (with a bright sun disc) so metal, glass, car paint and wet surfaces
// reflect a believable sky. Regenerated only when the day/night sky colour changes.
export function SkyEnvironment({ skyColor, intensity = 0.75 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!REALISTIC_LIGHTING) return undefined;
    let pmrem;
    let target;
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 48, 24);
    const sky = new THREE.Color(skyColor);
    const zenith = sky.clone().multiplyScalar(0.75);
    const horizon = sky.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    const ground = new THREE.Color('#4a4a3c');
    const colors = [];
    const pos = geo.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i) / 10;
      if (y >= 0) c.copy(horizon).lerp(zenith, Math.pow(y, 0.6)); else c.copy(horizon).lerp(ground, Math.min(1, -y * 4));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    env.add(new THREE.Mesh(geo, skyMat));
    const day = Math.min(1, sky.r + sky.g + sky.b);
    const sunGeo = new THREE.SphereGeometry(0.7, 16, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff3d6').multiplyScalar(6 * day + 0.2) });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(14, 22, 10).normalize().multiplyScalar(9);
    env.add(sun);
    try {
      pmrem = new THREE.PMREMGenerator(gl);
      target = pmrem.fromScene(env, 0.035);
      scene.environment = target.texture;
      if ('environmentIntensity' in scene) scene.environmentIntensity = intensity;
    } catch (error) {
      console.warn('[SkyEnvironment] environment map unavailable', error);
    }
    return () => {
      if (scene.environment === target?.texture) scene.environment = null;
      target?.dispose(); pmrem?.dispose(); geo.dispose(); skyMat.dispose(); sunGeo.dispose(); sunMat.dispose();
    };
  }, [gl, scene, skyColor, intensity]);
  return null;
}

// Sun that follows the player so the (limited) shadow frustum always covers what the camera sees.
export function FollowSun({ controlRef, intensity, fallback = [0, 0] }) {
  const { scene } = useThree();
  const light = React.useRef(null);
  const target = React.useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    scene.add(target);
    if (light.current) light.current.target = target;
    return () => { scene.remove(target); };
  }, [scene, target]);
  useFrame(() => {
    const p = controlRef?.current?.pos || fallback;
    const l = light.current;
    if (!l) return;
    // Snap to a coarse grid so the shadow texels do not swim while walking.
    const sx = Math.round(p[0] / 2) * 2;
    const sz = Math.round(p[1] / 2) * 2;
    l.position.set(sx + 14, 22, sz + 10);
    target.position.set(sx, 0, sz);
    target.updateMatrixWorld();
  });
  return <directionalLight
    ref={light}
    position={[14, 22, 10]}
    intensity={intensity}
    castShadow={REALISTIC_LIGHTING}
    shadow-mapSize-width={1024}
    shadow-mapSize-height={1024}
    shadow-camera-left={-20}
    shadow-camera-right={20}
    shadow-camera-top={20}
    shadow-camera-bottom={-20}
    shadow-camera-near={1}
    shadow-camera-far={80}
    shadow-bias={-0.0004}
    shadow-normalBias={0.03}
  />;
}

