// Home hero 3D layer: Twini companion + futuristic bubble universe, rendered in ONE WebGL canvas
// (cheaper than stacking canvases on mobile). The character is framed into the "stage" rectangle
// measured by HomeDashboard, so it never sits under the title or the buttons on any screen size.
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { AdditiveBlending, Box3, CanvasTexture, Color, DataTexture, DoubleSide, Float32BufferAttribute, Euler, LoopOnce, MathUtils, Quaternion, RGBAFormat, SphereGeometry, Vector3 } from 'three';
import { Canvas, quietExpoGL, useAnimations, useFrame, useGLTF, useThree } from '../../viewer/components/ThreeDRenderer';
import { getGLTFFrame } from '../../viewer/utils/glbBounds';
import useAppActive from '../../../shared/hooks/useAppActive';

const FOV = 34;
const TMP_Q = new Quaternion();
const TMP_E = new Euler();
const TAN_HALF = Math.tan(MathUtils.degToRad(FOV / 2));
const PALETTE = ['#22e6ff', '#3d7bff', '#9b5cff', '#ff3fd2', '#ff7ab8', '#ffc94d', '#2ff5c8'];
const randomUnit = (seed) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------- camera framing ----------
/**
 * Places the camera so the model (height h, width w, centred at the origin) fills ~86% of the stage
 * height and sits in the stage's centre, given the canvas size. Width is honoured too (landscape / narrow).
 */
function computeFit(canvas, stage, model) {
  const ch = Math.max(1, canvas.height);
  const cw = Math.max(1, canvas.width);
  const st = stage && stage.height > 40 ? stage : { x: 0, y: ch * 0.18, width: cw, height: ch * 0.64 };
  const usableH = st.height * 0.84;
  const usableW = st.width * 0.64; // room for the wave pose, which leans sideways
  const dByH = (model.h * ch) / (usableH * 2 * TAN_HALF);
  const dByW = (model.w * ch) / (usableW * 2 * TAN_HALF);
  const d = Math.max(dByH, dByW, 2.2);
  const unitsPerPx = (2 * d * TAN_HALF) / ch;
  const offsetY = (st.y + st.height / 2 - ch / 2) * unitsPerPx; // + means the stage is below centre
  const offsetX = (st.x + st.width / 2 - cw / 2) * unitsPerPx;
  return { d, camX: -offsetX, camY: offsetY, aspect: cw / ch };
}

function FitCamera({ stage, model, fitRef, reduceMotion, lookRef }) {
  const { camera, size } = useThree();
  const fit = useMemo(() => computeFit(size, stage, model), [size.width, size.height, stage?.x, stage?.y, stage?.width, stage?.height, model.h, model.w]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fitRef.current = fit;
    camera.fov = FOV;
    camera.near = 0.1;
    camera.far = 60;
    camera.updateProjectionMatrix();
  }, [camera, fit, fitRef]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Gentle parallax sway (depth layers drift against each other); follows the last touch a little.
    const look = lookRef.current;
    const sx = reduceMotion ? 0 : Math.sin(t * 0.23) * 0.07 + look.x * 0.06;
    const sy = reduceMotion ? 0 : Math.sin(t * 0.31) * 0.04 + look.y * 0.04;
    camera.position.set(fit.camX + sx, fit.camY + sy, fit.d);
    camera.lookAt(fit.camX, fit.camY, 0);
  });
  return null;
}

// Frustum half-extents of the plane at depth z (model at z = 0).
function planeBounds(fit, z) {
  const dist = fit.d - z;
  const hh = dist * TAN_HALF;
  return { hh, hw: hh * fit.aspect, cx: fit.camX, cy: fit.camY };
}

// ---------- character ----------
function findBone(scene, pattern) {
  let found = null;
  scene.traverse((object) => { if (!found && object.isBone && pattern.test(object.name)) found = object; });
  return found;
}

function TwiniCharacter({ source, greetSignal, reduceMotion, onReady, onModelSize, lookRef }) {
  const root = useRef(null);
  const body = useRef(null);
  const { scene, animations } = useGLTF(source);
  const clips = useMemo(() => (Array.isArray(animations) ? animations : []), [animations]);
  const { actions, mixer } = useAnimations(clips, body);
  const frame = useMemo(() => {
    try {
      const f = getGLTFFrame(scene, 2.35);
      const size = f.size ? f.size.map((v) => v * f.scale) : [1.4, 2.35, 1];
      return { center: [-f.center[0], -f.center[1], -f.center[2]], scale: f.scale, w: Math.max(0.9, size[0]), h: Math.max(1, size[1]) };
    } catch {
      return { center: [0, -0.85, 0], scale: 1.35, w: 1.4, h: 2.35 };
    }
  }, [scene]);
  const bones = useMemo(() => ({
    head: findBone(scene, /head$/i),
    neck: findBone(scene, /neck$/i),
    spine: findBone(scene, /(spine2|upperchest|chest|spine1)$/i),
    rightArm: findBone(scene, /(rightarm|rightupperarm)$/i),
    leftArm: findBone(scene, /(leftarm|leftupperarm)$/i),
  }), [scene]);
  const motion = useRef({ hopAt: -10, idle: null, wave: null, last: {}, frames: 0, measured: false });

  useEffect(() => { onModelSize?.({ w: frame.w, h: frame.h }); }, [frame.w, frame.h, onModelSize]);

  // Idle: a dedicated idle clip if the model has one; otherwise Twini stands in the first frame of its
  // wave clip (a natural standing pose) and procedural breathing/head motion is layered on top.
  // Models without either keep looping their first clip, as before.
  useEffect(() => {
    const names = clips.map((clip) => clip.name);
    const idleName = names.find((n) => /idle|breath/i.test(n));
    const waveName = names.find((n) => /wave|hello|greet/i.test(n));
    const m = motion.current;
    m.wave = waveName ? actions[waveName] : null;
    if (idleName) {
      m.idle = actions[idleName];
      m.idle?.reset().play();
    } else if (waveName && mixer) {
      const pose = clips.find((clip) => clip.name === waveName).clone();
      m.idle = mixer.clipAction(pose, body.current);
      m.idle.reset();
      m.idle.play();
      m.idle.paused = true;
      m.idle.time = 0;
    } else {
      const first = Object.values(actions).find(Boolean);
      m.idle = first || null;
      first?.reset().play();
    }
    onReady?.();
    return () => { Object.values(actions).forEach((a) => a?.stop?.()); m.idle?.stop?.(); };
  }, [actions, clips, mixer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Greeting: wave (if available) + a little hop. Fired once on load (after the idle pose was measured)
  // and on every tap.
  useEffect(() => {
    if (!mixer) return undefined;
    const m = motion.current;
    m.playGreeting = () => {
      m.hopAt = reduceMotion ? -10 : performance.now() / 1000;
      if (!m.wave) return;
      m.wave.reset();
      m.wave.setLoop(LoopOnce, 1);
      m.wave.clampWhenFinished = false;
      m.wave.enabled = true;
      m.wave.setEffectiveWeight(1);
      m.wave.play();
      if (m.idle && m.idle !== m.wave) m.idle.crossFadeTo(m.wave, 0.25, false);
    };
    const onFinished = (event) => {
      if (event.action !== m.wave || !m.idle || m.idle === m.wave) return;
      m.idle.enabled = true;
      m.idle.setEffectiveWeight(1);
      m.wave.crossFadeTo(m.idle, 0.35, false);
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, reduceMotion]);
  useEffect(() => {
    const m = motion.current;
    if (m.measured) m.playGreeting?.();
    else m.greetPending = true;
  }, [greetSignal]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const m = motion.current;
    if (root.current) {
      const now = performance.now() / 1000;
      const hopT = now - m.hopAt;
      const hop = hopT >= 0 && hopT < 0.6 ? Math.sin((hopT / 0.6) * Math.PI) * 0.16 : 0;
      root.current.position.y = (reduceMotion ? 0 : Math.sin(t * 1.4) * 0.05) + hop;
      root.current.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.45) * 0.12 + lookRef.current.x * 0.25;
      const breath = 1 + Math.sin(t * 2.1) * (reduceMotion ? 0.004 : 0.012);
      root.current.scale.set(frame.scale, frame.scale * breath, frame.scale);
    }
    // Re-measure once from the pose actually on screen: skinned bind-pose bounds can be much taller than
    // the standing pose, which made the character look small and low. Reported outside the frame loop.
    m.frames += 1;
    if (!m.measured && m.frames === 4 && body.current && root.current) {
      m.measured = true;
      const box = new Box3().setFromObject(body.current, true);
      if (!box.isEmpty()) {
        const s = root.current.scale.x || 1;
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3()).sub(root.current.position).divideScalar(s);
        body.current.position.x -= center.x;
        body.current.position.y -= center.y;
        body.current.position.z -= center.z;
        const measured = { w: Math.max(0.6, size.x), h: Math.max(0.8, size.y) };
        setTimeout(() => onModelSize?.(measured), 0);
      }
      if (m.greetPending) { m.greetPending = false; m.playGreeting?.(); }
    }
    // Procedural layer (look-around, breathing, arm sway) on top of the current pose. If the mixer wrote a
    // fresh pose this frame the bone no longer equals what we wrote, so that becomes the new base;
    // otherwise we reuse the stored base. This never accumulates, whether or not a clip drives the bone.
    const amp = reduceMotion ? 0.3 : 1;
    const look = lookRef.current;
    const apply = (bone, key, x, y, z) => {
      if (!bone) return;
      const st = m.last[key] || (m.last[key] = { base: new Quaternion(), written: new Quaternion(), has: false });
      if (!st.has || !bone.quaternion.equals(st.written)) st.base.copy(bone.quaternion);
      TMP_Q.setFromEuler(TMP_E.set(x * amp, y * amp, z * amp));
      bone.quaternion.copy(st.base).multiply(TMP_Q);
      st.written.copy(bone.quaternion);
      st.has = true;
    };
    apply(bones.head, 'head', Math.sin(t * 0.43 + 1) * 0.06 - look.y * 0.12, Math.sin(t * 0.6) * 0.22 + look.x * 0.3, 0);
    apply(bones.neck, 'neck', 0, 0, Math.sin(t * 0.5) * 0.035);
    apply(bones.spine, 'spine', Math.sin(t * 2.1) * 0.025, 0, 0);
    apply(bones.rightArm, 'rightArm', 0, 0, Math.sin(t * 1.1) * 0.045);
    apply(bones.leftArm, 'leftArm', 0, 0, Math.sin(t * 1.1 + 2) * 0.045);
  });

  return <group ref={root} scale={frame.scale}>
    <group ref={body} position={frame.center}><primitive object={scene} /></group>
  </group>;
}

function LoadingOrb() {
  const mesh = useRef(null);
  useFrame(({ clock }) => { if (mesh.current) { mesh.current.rotation.y = clock.elapsedTime; mesh.current.rotation.x = clock.elapsedTime * 0.6; } });
  return <mesh ref={mesh}><icosahedronGeometry args={[0.45, 1]} /><meshBasicMaterial color="#5fe0ff" wireframe /></mesh>;
}

class ModelBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn('[TwiniHero] GLB failed to load, showing 2D Twini', error); this.props.onError?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

// ---------- holographic platform & energy waves ----------
function HoloPlatform({ y, reduceMotion }) {
  const rings = [useRef(null), useRef(null), useRef(null)];
  const disc = useRef(null);
  const beam = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rings.forEach((ref, i) => {
      if (!ref.current) return;
      const p = reduceMotion ? 0.35 + i * 0.25 : ((t * 0.45 + i / 3) % 1);
      ref.current.scale.setScalar(0.7 + p * 1.6);
      ref.current.material.opacity = (1 - p) * 0.55;
    });
    if (disc.current) disc.current.material.opacity = 0.32 + (reduceMotion ? 0 : Math.sin(t * 2) * 0.08);
    if (beam.current) beam.current.material.opacity = 0.08 + (reduceMotion ? 0 : Math.sin(t * 1.3) * 0.03);
  });
  const tilt = -Math.PI / 2 + 0.42;
  return <group position={[0, y, 0]}>
    <mesh ref={disc} rotation={[tilt, 0, 0]}><circleGeometry args={[0.85, 48]} /><meshBasicMaterial color="#22e6ff" transparent opacity={0.32} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} /></mesh>
    {rings.map((ref, i) => <mesh key={i} ref={ref} rotation={[tilt, 0, 0]}><ringGeometry args={[0.78, 0.84, 64]} /><meshBasicMaterial color={i === 1 ? '#ff3fd2' : '#5fe0ff'} transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} /></mesh>)}
    <mesh ref={beam} position={[0, 1.2, -0.05]}><cylinderGeometry args={[0.55, 0.85, 2.4, 32, 1, true]} /><meshBasicMaterial color="#3d7bff" transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} /></mesh>
  </group>;
}

// ---------- bubbles (elastic 2D physics on depth layers behind the character) ----------
function makeBubbleGeometry(radius, hue) {
  const sphere = new SphereGeometry(radius, 18, 14);
  const positions = sphere.attributes.position;
  const colors = [];
  const dark = new Color().setHSL(hue, 0.95, 0.45);
  const light = new Color().setHSL((hue + 0.18) % 1, 1, 0.82);
  for (let i = 0; i < positions.count; i += 1) {
    const mix = Math.max(0, Math.min(1, (positions.getY(i) / radius + 1) / 2));
    const c = dark.clone().lerp(light, mix);
    colors.push(c.r, c.g, c.b);
  }
  sphere.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return sphere;
}

function BubbleField({ count, fitRef, reduceMotion, impulseRef, qualityRef }) {
  const bubbles = useMemo(() => Array.from({ length: count }, (_, i) => {
    const layer = i % 3; // 0 near, 1 mid, 2 far: parallax depth
    const hue = new Color(PALETTE[i % PALETTE.length]).getHSL({ h: 0, s: 0, l: 0 }).h;
    return {
      i, layer, z: [-1.4, -2.6, -4.2][layer], hue,
      rel: 0.035 + randomUnit(i * 7 + 1) * (layer === 2 ? 0.05 : 0.075), // radius as a fraction of the plane half-height
      seedX: randomUnit(i * 7 + 2), seedY: randomUnit(i * 7 + 3), dir: randomUnit(i * 7 + 4) * Math.PI * 2,
      speed: 0.12 + randomUnit(i * 7 + 5) * 0.22, phase: randomUnit(i * 7 + 6) * Math.PI * 2, bob: 0.4 + randomUnit(i * 7 + 7) * 0.8,
    };
  }), [count]);
  const geometries = useMemo(() => bubbles.map((b) => makeBubbleGeometry(1, b.hue)), [bubbles]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const meshes = useRef([]);
  const materials = useRef([]);
  const state = useRef(null);
  const lastImpulse = useRef(0);

  useFrame(({ clock }, rawDelta) => {
    const fit = fitRef.current;
    if (!fit) return;
    const t = clock.elapsedTime;
    const dt = Math.min(rawDelta, 1 / 30);
    if (!state.current) {
      // Lazy init once the camera fit (and so the visible area) is known.
      state.current = bubbles.map((b) => {
        const { hh, hw, cx, cy } = planeBounds(fit, b.z);
        const r = b.rel * hh;
        return { x: cx + (b.seedX * 2 - 1) * (hw - r), y: cy + (b.seedY * 2 - 1) * (hh - r), vx: Math.cos(b.dir) * b.speed * hh, vy: Math.sin(b.dir) * b.speed * hh, r, squash: 0 };
      });
    }
    const s = state.current;
    const impulse = impulseRef.current;
    const burst = impulse && impulse !== lastImpulse.current;
    if (burst) lastImpulse.current = impulse;
    const visible = qualityRef.current === 'low' ? Math.ceil(bubbles.length * 0.5) : bubbles.length;

    for (let i = 0; i < bubbles.length; i += 1) {
      const b = bubbles[i];
      const p = s[i];
      const mesh = meshes.current[i];
      if (!mesh) continue;
      mesh.visible = i < visible;
      if (!mesh.visible) continue;
      const { hh, hw, cx, cy } = planeBounds(fit, b.z);
      p.r = b.rel * hh;
      if (!reduceMotion) {
        if (burst) { // tap: push bubbles away from the character
          const dx = p.x - cx; const dy = p.y - cy; const len = Math.hypot(dx, dy) || 1;
          p.vx += (dx / len) * hh * 0.9; p.vy += (dy / len) * hh * 0.9;
        }
        p.vy += Math.sin(t * b.bob + b.phase) * hh * 0.06 * dt; // natural rise/fall
        const speed = Math.hypot(p.vx, p.vy);
        const min = b.speed * hh * 0.6; const max = b.speed * hh * 2.4;
        if (speed > max) { p.vx *= max / speed; p.vy *= max / speed; }
        else if (speed < min && speed > 0) { p.vx *= 1.02; p.vy *= 1.02; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        // Elastic walls at the visible edges of this depth layer.
        if (p.x - p.r < cx - hw) { p.x = cx - hw + p.r; p.vx = Math.abs(p.vx) * 0.96; p.squash = 1; }
        if (p.x + p.r > cx + hw) { p.x = cx + hw - p.r; p.vx = -Math.abs(p.vx) * 0.96; p.squash = 1; }
        if (p.y - p.r < cy - hh) { p.y = cy - hh + p.r; p.vy = Math.abs(p.vy) * 0.96; p.squash = 1; }
        if (p.y + p.r > cy + hh) { p.y = cy + hh - p.r; p.vy = -Math.abs(p.vy) * 0.96; p.squash = 1; }
        p.squash = Math.max(0, p.squash - dt * 4);
      }
    }
    if (!reduceMotion) {
      // Bubble–bubble elastic collisions within the same depth layer (mass ∝ r²).
      for (let i = 0; i < visible; i += 1) {
        for (let j = i + 1; j < visible; j += 1) {
          if (bubbles[i].layer !== bubbles[j].layer) continue;
          const a = s[i]; const c = s[j];
          const dx = c.x - a.x; const dy = c.y - a.y; const dist = Math.hypot(dx, dy); const minDist = a.r + c.r;
          if (dist === 0 || dist >= minDist) continue;
          const nx = dx / dist; const ny = dy / dist; const overlap = (minDist - dist) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap; c.x += nx * overlap; c.y += ny * overlap;
          const ma = a.r * a.r; const mc = c.r * c.r;
          const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (rel <= 0) continue;
          const k = (1.9 * rel) / (ma + mc); // restitution ≈ 0.9
          a.vx -= k * mc * nx; a.vy -= k * mc * ny; c.vx += k * ma * nx; c.vy += k * ma * ny;
          a.squash = 1; c.squash = 1;
        }
      }
    }
    for (let i = 0; i < visible; i += 1) {
      const b = bubbles[i]; const p = s[i]; const mesh = meshes.current[i]; const mat = materials.current[i];
      if (!mesh) continue;
      const pulse = reduceMotion ? 1 : 1 + Math.sin(t * 1.8 + b.phase) * 0.06;
      const squash = p.squash * 0.18;
      mesh.position.set(p.x, p.y, b.z);
      mesh.scale.set(p.r * pulse * (1 + squash), p.r * pulse * (1 - squash), p.r * pulse);
      if (mat && !reduceMotion) {
        mat.emissive.setHSL((b.hue + t * 0.02) % 1, 0.95, 0.5);
        mat.emissiveIntensity = 0.35 + (Math.sin(t * 2.4 + b.phase) + 1) * 0.2;
        mat.opacity = (b.layer === 2 ? 0.28 : 0.4) + (Math.sin(t * 1.7 + b.phase) + 1) * 0.08;
      }
    }
  });

  return <>{bubbles.map((b, i) => <mesh key={b.i} ref={(m) => { meshes.current[i] = m; }} geometry={geometries[i]} position={[0, 0, b.z]} scale={0.0001}>
    <meshStandardMaterial ref={(m) => { materials.current[i] = m; }} vertexColors transparent opacity={0.4} roughness={0.15} metalness={0.05} emissive={PALETTE[i % PALETTE.length]} emissiveIntensity={0.45} depthWrite={false} />
    <mesh position={[-0.35, 0.38, 0.8]} scale={0.16}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.75} depthWrite={false} /></mesh>
  </mesh>)}</>;
}

// ---------- glowing particles & neon orbs ----------
function useGlowTexture() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d'); const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return new CanvasTexture(c);
    }
    const size = 32; const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d) ** 2;
      const k = (y * size + x) * 4; data[k] = 255; data[k + 1] = 255; data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
    }
    const tex = new DataTexture(data, size, size, RGBAFormat); tex.needsUpdate = true;
    return tex;
  }, []);
}

function Particles({ count, fitRef, reduceMotion, qualityRef }) {
  const points = useRef(null);
  const texture = useGlowTexture();
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: randomUnit(i * 3 + 11) * 2 - 1, y: randomUnit(i * 3 + 12) * 2 - 1, z: -0.8 - randomUnit(i * 3 + 13) * 4, v: 0.04 + randomUnit(i * 3 + 14) * 0.08 })), [count]);
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3); const col = new Float32Array(count * 3);
    seeds.forEach((s, i) => { const c = new Color(PALETTE[i % PALETTE.length]); col.set([c.r, c.g, c.b], i * 3); });
    return { positions: pos, colors: col };
  }, [count, seeds]);
  useFrame(({ clock }) => {
    const fit = fitRef.current; const geo = points.current?.geometry;
    if (!fit || !geo) return;
    const t = reduceMotion ? 0 : clock.elapsedTime;
    seeds.forEach((s, i) => {
      const { hh, hw, cx, cy } = planeBounds(fit, s.z);
      const y = ((s.y + 1 + t * s.v) % 2) - 1; // drift upwards and wrap
      positions[i * 3] = cx + (s.x + Math.sin(t * 0.3 + i) * 0.03) * hw;
      positions[i * 3 + 1] = cy + y * hh;
      positions[i * 3 + 2] = s.z;
    });
    geo.attributes.position.needsUpdate = true;
    geo.setDrawRange(0, qualityRef.current === 'low' ? Math.ceil(count / 2) : count);
    if (points.current) points.current.material.opacity = 0.65 + (reduceMotion ? 0 : Math.sin(clock.elapsedTime * 1.5) * 0.15);
  });
  return <points ref={points} frustumCulled={false}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      <bufferAttribute attach="attributes-color" args={[colors, 3]} />
    </bufferGeometry>
    <pointsMaterial map={texture} vertexColors size={0.09} sizeAttenuation transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
  </points>;
}

function NeonOrbs({ fitRef, reduceMotion }) {
  const texture = useGlowTexture();
  const orbs = useRef([]);
  const defs = useMemo(() => [['#9b5cff', -0.7, 0.55, 3.4], ['#22e6ff', 0.75, -0.2, 3.0], ['#ff3fd2', 0.2, 0.85, 2.4], ['#ffc94d', -0.55, -0.7, 2.0]], []);
  useFrame(({ clock }) => {
    const fit = fitRef.current; if (!fit) return;
    const t = reduceMotion ? 0 : clock.elapsedTime;
    defs.forEach(([, x, y, s], i) => {
      const o = orbs.current[i]; if (!o) return;
      const { hh, hw, cx, cy } = planeBounds(fit, -6);
      o.position.set(cx + (x + Math.sin(t * 0.17 + i) * 0.08) * hw, cy + (y + Math.cos(t * 0.13 + i) * 0.08) * hh, -6);
      o.scale.setScalar(s * hh * 0.42 * (1 + Math.sin(t * 0.6 + i) * 0.08));
    });
  });
  return defs.map(([color], i) => <sprite key={color} ref={(m) => { orbs.current[i] = m; }}>
    <spriteMaterial map={texture} color={color} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
  </sprite>);
}

// Lowers effect density if the device cannot hold ~40 fps (no React state from the frame loop).
function AdaptiveQuality({ qualityRef }) {
  const samples = useRef({ total: 0, frames: 0 });
  useFrame((_, delta) => {
    if (qualityRef.current === 'low') return;
    const s = samples.current;
    s.total += delta; s.frames += 1;
    if (s.frames >= 120) {
      if (s.total / s.frames > 1 / 40) qualityRef.current = 'low';
      s.total = 0; s.frames = 0;
    }
  });
  return null;
}

export default function TwiniHeroBackground({ source, stage, greetSignal, reduceMotion, lowEnd, onReady, onError, lookRef, impulseRef }) {
  const appActive = useAppActive();
  const fitRef = useRef(null);
  const qualityRef = useRef(lowEnd ? 'low' : 'high');
  const [model, setModel] = React.useState({ w: 1.4, h: 2.35 });
  const onModelSize = React.useCallback((size) => setModel((current) => (Math.abs(current.w - size.w) > 0.01 || Math.abs(current.h - size.h) > 0.01 ? size : current)), []);
  const bubbleCount = reduceMotion ? 10 : Platform.OS === 'web' ? 24 : 18;
  const particleCount = reduceMotion ? 40 : Platform.OS === 'web' ? 140 : 90;

  return <Canvas
    style={StyleSheet.absoluteFill}
    frameloop={appActive ? 'always' : 'never'}
    camera={{ position: [0, 0, 6], fov: FOV, near: 0.1, far: 60 }}
    // Hero hanya latar: 1,5× sudah tajam di layar padat, sementara 1,75× memakan ~35% fill-rate lebih
    // banyak dan membuat Home terasa berat di perangkat menengah.
    dpr={Platform.OS === 'web' ? [1, 1.5] : [1, lowEnd ? 1 : 1.5]}
    gl={{ alpha: true, antialias: true, stencil: false, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => quietExpoGL(gl)}
  >
    <ambientLight intensity={1.15} />
    <directionalLight position={[2.5, 4, 5]} intensity={1.9} />
    <directionalLight position={[-3, 1.5, 2]} intensity={0.9} color="#9b5cff" />
    <pointLight position={[0, -0.6, 1.6]} intensity={1.2} distance={6} color="#22e6ff" />
    <FitCamera stage={stage} model={model} fitRef={fitRef} reduceMotion={reduceMotion} lookRef={lookRef} />
    <AdaptiveQuality qualityRef={qualityRef} />
    <NeonOrbs fitRef={fitRef} reduceMotion={reduceMotion} />
    <Particles count={particleCount} fitRef={fitRef} reduceMotion={reduceMotion} qualityRef={qualityRef} />
    <BubbleField count={bubbleCount} fitRef={fitRef} reduceMotion={reduceMotion} impulseRef={impulseRef} qualityRef={qualityRef} />
    <HoloPlatform y={-model.h / 2 - 0.02} reduceMotion={reduceMotion} />
    <ModelBoundary key={String(source)} onError={onError}>
      <Suspense fallback={<LoadingOrb />}>
        {source != null ? <TwiniCharacter source={source} greetSignal={greetSignal} reduceMotion={reduceMotion} onReady={onReady} onModelSize={onModelSize} lookRef={lookRef} /> : <LoadingOrb />}
      </Suspense>
    </ModelBoundary>
  </Canvas>;
}
