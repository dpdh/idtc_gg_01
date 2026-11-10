import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * What to hand to useGLTF for a bundled GLB (`require('…/model.glb')`).
 *
 * Native: pass the module id itself. @react-three/fiber/native's loader polyfill resolves it with
 * expo-asset + expo-file-system, including Android release builds where the embedded asset URI has
 * no scheme and must be copied to the cache first. Pre-resolving it to a string ourselves broke that
 * path (the model silently failed to load on device builds).
 *
 * Web: the asset's served URL.
 */
export function glbSourceFor(moduleId) {
  if (moduleId == null) return null;
  if (Platform.OS !== 'web') return moduleId;
  return Asset.fromModule(moduleId).uri;
}
