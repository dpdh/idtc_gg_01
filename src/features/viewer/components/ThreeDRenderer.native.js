// Deep imports keep the Android/Hermes bundle small: `@react-three/drei/native` re-exports ~100
// components (troika text, camera-controls, meshline, ...) and Metro does not tree-shake, so importing
// the barrel added ~3.6 MB of JS to every cold start (measured: 9.74 MB -> 6.15 MB bundle).
export { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber/native';
export { OrbitControls } from '@react-three/drei/core/OrbitControls';
export { useAnimations } from '@react-three/drei/core/useAnimations';
export { useGLTF } from '@react-three/drei/core/Gltf';

export const getGLTFSource = (_source, uri) => uri;

// expo-gl logs "pixelStorei() doesn't support this parameter yet!" through the JS bridge for every texture
// upload (three.js re-uploads the skinning bone texture every frame), i.e. ~60 log calls per second.
// Both params are no-ops in expo-gl anyway, so drop them before they reach the native side.
const UNSUPPORTED_PIXEL_STORE = new Set([0x9241 /* UNPACK_PREMULTIPLY_ALPHA_WEBGL */, 0x9243 /* UNPACK_COLORSPACE_CONVERSION_WEBGL */]);
export function quietExpoGL(renderer) {
  const ctx = renderer?.getContext?.();
  if (!ctx || ctx.__twiniQuiet) return;
  ctx.__twiniQuiet = true;
  const pixelStorei = ctx.pixelStorei.bind(ctx);
  ctx.pixelStorei = (pname, param) => (UNSUPPORTED_PIXEL_STORE.has(pname) ? undefined : pixelStorei(pname, param));
}
