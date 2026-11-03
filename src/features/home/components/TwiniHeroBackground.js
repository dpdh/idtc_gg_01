import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds } from '@react-three/drei/core/Bounds';
import { Center } from '@react-three/drei/core/Center';
import { useAnimations } from '@react-three/drei/core/useAnimations';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHandPointer } from '@fortawesome/free-solid-svg-icons';
import { Asset } from 'expo-asset';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { SkeletonUtils } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import glbModels from '../../library/data/glbModels';

const carouselModels = [
  glbModels.find((model) => model.id === 'twini-idtc'),
  glbModels.find((model) => model.id === 'dni-01'),
  glbModels.find((model) => model.id === 'dni-02'),
  glbModels.find((model) => model.id === 'twini-energy'),
].filter(Boolean);

function decodeBase64ToArrayBuffer(encoded) {
  const binary = globalThis.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function Model({ uri, modelId, animationTrigger, onLoaded }) {
  const group = useRef(null);
  const cameraOrbit = useRef(null);
  const [gltf, setGltf] = useState(null);

  useEffect(() => {
    let active = true;
    setGltf(null);
    readAsStringAsync(uri, { encoding: EncodingType.Base64 })
      .then((base64) => new GLTFLoader().parse(
        decodeBase64ToArrayBuffer(base64),
        '',
        (result) => {
          if (!active) return;
          setGltf(result);
          onLoaded?.();
        },
        (error) => { if (active) console.warn('Could not parse Twini GLB model', error); },
      ))
      .catch((error) => { if (active) console.warn('Could not read Twini GLB model', error); });
    return () => { active = false; };
  }, [uri, onLoaded]);

  const scene = gltf?.scene;
  const animations = gltf?.animations || [];
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      node.material = Array.isArray(node.material)
        ? node.material.map((material) => material.clone())
        : node.material.clone();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
      });
    });
    return clone;
  }, [scene]);
  const { actions } = useAnimations(animations, group);
  const motionAction = actions.Running
    || actions.Walking
    || Object.entries(actions).find(([name]) => /run|walk|dance|wave/i.test(name))?.[1]
    || Object.values(actions)[0];

  useEffect(() => {
    if (!motionAction) return undefined;
    motionAction.reset().setEffectiveWeight(1).fadeIn(0.2).play();
    return () => motionAction.stop();
  }, [motionAction, animationTrigger]);

  useFrame(({ clock, camera }) => {
    if (!group.current) return;
    group.current.rotation.set(0, 0, 0);
    group.current.position.y = modelId === 'twini-idtc' ? -0.55 : -0.3;

    if (!cameraOrbit.current) {
      cameraOrbit.current = {
        radius: Math.hypot(camera.position.x, camera.position.z),
        angle: Math.atan2(camera.position.x, camera.position.z),
        height: camera.position.y,
      };
    }
    const orbitAngle = cameraOrbit.current.angle + Math.sin(clock.elapsedTime * 0.42) * 0.28;
    camera.position.set(
      Math.sin(orbitAngle) * cameraOrbit.current.radius,
      cameraOrbit.current.height,
      Math.cos(orbitAngle) * cameraOrbit.current.radius,
    );
    camera.lookAt(0, 0, 0);
  }, [modelId]);

  if (!clonedScene) return <ModelLoadingMarker />;
  return <group ref={group}><Center><primitive object={clonedScene} /></Center></group>;
}

function ModelLoadingMarker() {
  return <mesh><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial color="#91caff" wireframe /></mesh>;
}

export default function TwiniHeroBackground({ onModelChange }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [modelUri, setModelUri] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const tapMotion = useRef(new Animated.Value(0)).current;
  const model = carouselModels[selectedIndex] || carouselModels[0];
  const handleModelLoaded = useCallback(() => setModelLoaded(true), []);

  useEffect(() => {
    let active = true;
    setModelUri(null);
    setModelLoaded(false);
    const asset = Asset.fromModule(model.source);
    asset.downloadAsync()
      .then(() => {
        if (active) setModelUri(asset.localUri || asset.uri);
      })
      .catch((error) => console.warn(`Could not prepare ${model.name} model`, error));
    return () => { active = false; };
  }, [model]);

  useEffect(() => {
    const bounce = Animated.loop(Animated.sequence([
      Animated.timing(tapMotion, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(tapMotion, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    bounce.start();
    return () => bounce.stop();
  }, [tapMotion]);

  const selectModel = (direction) => {
    const nextIndex = (selectedIndex + direction + carouselModels.length) % carouselModels.length;
    setSelectedIndex(nextIndex);
    onModelChange?.(carouselModels[nextIndex]);
  };

  useEffect(() => {
    onModelChange?.(model);
  }, [model, onModelChange]);

  return (
    <View style={styles.container}>
      <Canvas
        style={StyleSheet.absoluteFill}
        camera={{ position: [0, 0.4, 4], fov: 38 }}
        dpr={1}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[3, 5, 4]} intensity={1.8} />
        <directionalLight position={[-3, 1, -2]} intensity={0.7} color="#79baff" />
        <Suspense fallback={<ModelLoadingMarker />}>
          <Bounds key={`${model.id}-${modelLoaded ? 'loaded' : 'loading'}`} fit clip margin={model.id === 'twini-idtc' ? 0.4 : 1.35}>
            {modelUri
              ? <Model key={modelUri} uri={modelUri} modelId={model.id} animationTrigger={animationTrigger} onLoaded={handleModelLoaded} />
              : <ModelLoadingMarker />}
          </Bounds>
        </Suspense>
      </Canvas>
      <View pointerEvents="box-none" style={styles.controls}>
        <TouchableOpacity onPress={() => selectModel(-1)} style={styles.arrowButton} accessibilityRole="button" accessibilityLabel="Model sebelumnya">
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => selectModel(1)} style={styles.arrowButton} accessibilityRole="button" accessibilityLabel="Model berikutnya">
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
        <View style={styles.animatePrompt}>
          <Text style={styles.animateWarning}>⚠ SENTUH</Text>
          <TouchableOpacity
            onPress={() => setAnimationTrigger((trigger) => trigger + 1)}
            style={styles.animateButton}
            accessibilityRole="button"
            accessibilityLabel="Sentuh ikon untuk memutar ulang animasi Twini"
          >
            <Animated.View style={{ transform: [
              { translateY: tapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
              { scale: tapMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            ] }}>
              <FontAwesomeIcon icon={faHandPointer} size={19} color="#fff4d5" />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  controls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  arrowButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(209,230,255,0.18)', borderWidth: 1, borderColor: 'rgba(244,249,255,0.34)' },
  arrowText: { color: '#f4f8ff', fontSize: 28, lineHeight: 30, fontWeight: '500', marginTop: -3 },
  animatePrompt: { position: 'absolute', right: 50, bottom: 19, alignItems: 'center', gap: 4 },
  animateWarning: { overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, color: '#ffe49a', backgroundColor: 'rgba(77,52,12,0.86)', borderWidth: 1, borderColor: 'rgba(255,202,92,0.72)', fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },
  animateButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(24,53,85,0.86)', borderWidth: 1, borderColor: 'rgba(255,210,119,0.8)', shadowColor: '#ffcb68', shadowOpacity: 0.44, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
});
