export { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber/native';
export { OrbitControls, useAnimations, useGLTF } from '@react-three/drei/native';

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
