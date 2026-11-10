import { Box3, Vector3 } from 'three';

export function getGLTFFrame(scene, targetSize = 2.35) {
  if (!scene || typeof scene.traverse !== 'function') {
    return { center: [0, 0, 0], min: [0, 0, 0], scale: 1 };
  }

  scene.updateMatrixWorld(true);
  const bounds = new Box3();

  // Skinned meshes need bone transforms applied before fitting. Their raw
  // geometry bounds can be tiny when the rig is authored in a different scale.
  scene.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    let objectBounds;
    if (object.isSkinnedMesh && typeof object.computeBoundingBox === 'function') {
      object.computeBoundingBox();
      objectBounds = object.boundingBox;
    } else {
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      objectBounds = object.geometry.boundingBox;
    }
    if (objectBounds && !objectBounds.isEmpty()) {
      bounds.union(objectBounds.clone().applyMatrix4(object.matrixWorld));
    }
  });

  if (bounds.isEmpty()) bounds.setFromObject(scene);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const largestSide = Math.max(size.x, size.y, size.z) || 1;

  return {
    center: [center.x, center.y, center.z],
    min: [bounds.min.x, bounds.min.y, bounds.min.z],
    scale: targetSize / largestSide,
    size: [size.x, size.y, size.z],
  };
}
