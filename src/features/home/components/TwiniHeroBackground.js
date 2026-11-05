import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei/core/useAnimations';
import { useGLTF } from '@react-three/drei/core/Gltf';
import { Box3, Color, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three';
import { Asset } from 'expo-asset';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChevronRight, faHandPointer } from '@fortawesome/free-solid-svg-icons';
import glbModels from '../../library/data/glbModels';

const HERO_MODELS = glbModels;
const HERO_IMAGES = [
  { label: 'Twini - IDTC', image: require('../../../assets/imageTwini/TwiniGG.png') },
  { label: 'Twini - Engineer', image: require('../../../assets/imageTwini/Engineer High-Res Render.png') },
  { label: 'Twini - Computer Scientist', image: require('../../../assets/imageTwini/Computer Scientist.png') },
  { label: 'Twini - Smart City', image: require('../../../assets/imageTwini/Urban Planning and Architecture.png') },
];

function AnimatedGlb({ uri, replayKey }) {
  const root = useRef(null);
  const { scene, animations } = useGLTF(uri);
  const { actions } = useAnimations(animations, root);
  const modelFrame = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const largestSide = Math.max(size.x, size.y, size.z) || 1;
    return { center: [-center.x, -center.y, -center.z], scale: 2.35 / largestSide };
  }, [scene]);

  useEffect(() => {
    const availableActions = Object.values(actions).filter((action) => action && typeof action.reset === 'function');
    const action = availableActions[0];
    action?.reset();
    action?.setEffectiveWeight?.(1);
    action?.fadeIn?.(0.25);
    action?.play?.();
    return () => availableActions.forEach((item) => item?.fadeOut?.(0.15));
  }, [actions, replayKey]);

  return <group ref={root} scale={modelFrame.scale}>
    <group position={modelFrame.center}><primitive object={scene} /></group>
  </group>;
}

function LoadingModel() {
  return <mesh><icosahedronGeometry args={[0.45, 1]} /><meshStandardMaterial color="#75baff" wireframe /></mesh>;
}

const randomUnit = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

function RisingBubble({ bubble }) {
  const mesh = useRef(null);
  const material = useRef(null);
  const sparkle = useRef(null);
  const sparkleMaterial = useRef(null);
  const geometry = useMemo(() => {
    const sphere = new SphereGeometry(bubble.radius, 20, 16);
    const positions = sphere.attributes.position;
    const colors = [];
    const dark = new Color().setHSL(bubble.hue, 0.9, 0.42);
    const light = new Color().setHSL((bubble.hue + 0.22) % 1, 0.95, 0.78);
    for (let i = 0; i < positions.count; i += 1) {
      const mix = Math.max(0, Math.min(1, (positions.getY(i) / bubble.radius + 1) / 2));
      const color = dark.clone().lerp(light, mix);
      colors.push(color.r, color.g, color.b);
    }
    sphere.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return sphere;
  }, [bubble.hue, bubble.radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const time = state.clock.elapsedTime;
    mesh.current.position.y += bubble.speed * delta;
    mesh.current.position.x = bubble.x + Math.sin(time * bubble.drift + bubble.phase) * 0.14;
    mesh.current.scale.setScalar(1 + Math.sin(time * 2.2 + bubble.phase) * 0.06);
    if (mesh.current.position.y > 2.5) mesh.current.position.y = -2.5 - bubble.offset;
    if (material.current) {
      material.current.color.setHSL((bubble.hue + time * 0.035) % 1, 0.72, 0.82);
      material.current.emissive.setHSL((bubble.hue + 0.15 + time * 0.055) % 1, 0.9, 0.5);
      material.current.emissiveIntensity = 0.12 + (Math.sin(time * 3 + bubble.phase) + 1) * 0.15;
      material.current.opacity = 0.27 + (Math.sin(time * 2.4 + bubble.phase) + 1) * 0.07;
    }
    if (sparkle.current) {
      sparkle.current.position.set(
        Math.sin(time * 1.7 + bubble.phase) * bubble.radius * 0.35,
        Math.cos(time * 1.3 + bubble.phase) * bubble.radius * 0.35,
        bubble.radius * 0.82,
      );
    }
    if (sparkleMaterial.current) sparkleMaterial.current.opacity = 0.35 + (Math.sin(time * 4 + bubble.phase) + 1) * 0.3;
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[bubble.x, bubble.y, bubble.z]}>
      <meshStandardMaterial ref={material} vertexColors transparent opacity={0.32} roughness={0.18} metalness={0.02} emissive="#72dcff" emissiveIntensity={0.2} depthWrite={false} />
      <mesh ref={sparkle}>
        <sphereGeometry args={[bubble.radius * 0.13, 8, 8]} />
        <meshBasicMaterial ref={sparkleMaterial} color="#ffffff" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </mesh>
  );
}

function BubbleField() {
  const bubbles = useMemo(() => Array.from({ length: 24 }, (_, index) => ({
    id: index,
    x: (randomUnit(index * 9 + 1) - 0.5) * 3.4,
    y: (randomUnit(index * 9 + 2) - 0.5) * 5,
    z: -1.5 - randomUnit(index * 9 + 3) * 1.2,
    radius: 0.035 + randomUnit(index * 9 + 4) * 0.12,
    speed: 0.18 + randomUnit(index * 9 + 5) * 0.48,
    drift: 0.5 + randomUnit(index * 9 + 6) * 1.3,
    phase: randomUnit(index * 9 + 7) * Math.PI * 2,
    offset: randomUnit(index * 9 + 8) * 3,
    hue: randomUnit(index * 9 + 9),
  })), []);

  return <>{bubbles.map((bubble) => <RisingBubble key={bubble.id} bubble={bubble} />)}</>;
}

function AndroidImageHero({ image, label }) {
  return (
    <View style={styles.nativeHero}>
      <View style={styles.nativeHeroGlow} />
      <Image source={image} style={styles.nativeHeroImage} resizeMode="contain" fadeDuration={180} />
      <View style={styles.nativeHeroLabel}>
        <Text style={styles.nativeHeroLabelText}>{label}</Text>
        <Text style={styles.nativeHeroLabelHint}>Image carousel · IDTC</Text>
      </View>
    </View>
  );
}

export default function TwiniHeroBackground() {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, HERO_MODELS.findIndex((model) => model.id === 'twini-idtc')));
  const [modelUri, setModelUri] = useState(null);
  const [replayKey, setReplayKey] = useState(0);
  const tapMotion = useRef(new Animated.Value(0)).current;
  const model = HERO_MODELS[selectedIndex];
  const imageModel = HERO_IMAGES[selectedIndex % HERO_IMAGES.length];

  useEffect(() => {
    let active = true;
    setModelUri(null);
    const asset = Asset.fromModule(model.source);
    asset.downloadAsync()
      .then(() => { if (active) setModelUri(asset.localUri || asset.uri); })
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
    setSelectedIndex((current) => (current + direction + HERO_MODELS.length) % HERO_MODELS.length);
    setReplayKey(0);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
        <AndroidImageHero image={imageModel.image} label={imageModel.label} />
      ) : (
        <Canvas style={styles.modelCanvas} camera={{ position: [0, 0, 4.5], fov: 42, near: 0.1, far: 100 }} dpr={1} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => gl.setClearColor('#000000', 0)}>
          <ambientLight intensity={1.3} />
          <directionalLight position={[2, 4, 5]} intensity={1.8} />
          <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#79baff" />
          <BubbleField />
          <Suspense fallback={<LoadingModel />}>
            {modelUri ? <AnimatedGlb key={modelUri} uri={modelUri} replayKey={replayKey} /> : <LoadingModel />}
          </Suspense>
        </Canvas>
      )}

      <View pointerEvents="box-none" style={styles.controls}>
        <TouchableOpacity onPress={() => selectModel(-1)} style={styles.arrowButton} accessibilityRole="button" accessibilityLabel="Model sebelumnya">
          <FontAwesomeIcon icon={faChevronLeft} size={15} color="#eff7ff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => selectModel(1)} style={styles.arrowButton} accessibilityRole="button" accessibilityLabel="Model berikutnya">
          <FontAwesomeIcon icon={faChevronRight} size={15} color="#eff7ff" />
        </TouchableOpacity>
        <View style={styles.animatePrompt}>
          <Text style={styles.animateWarning}>⚠ SENTUH</Text>
          {Platform.OS === 'android' ? (
            <View style={styles.animateButton} accessible accessibilityLabel="Carousel gambar aktif">
              <FontAwesomeIcon icon={faHandPointer} size={19} color="#fff4d5" />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setReplayKey((key) => key + 1)} style={styles.animateButton} accessibilityRole="button" accessibilityLabel="Putar ulang animasi model">
              <Animated.View style={{ transform: [
                { translateY: tapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                { scale: tapMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ] }}>
                <FontAwesomeIcon icon={faHandPointer} size={19} color="#fff4d5" />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  modelCanvas: { flex: 1, width: '100%', height: '100%' },
  nativeHero: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nativeHeroGlow: { position: 'absolute', width: 270, height: 270, borderRadius: 135, backgroundColor: '#347ed2', opacity: 0.2 },
  nativeHeroImage: { width: '92%', height: '82%', marginTop: -4 },
  nativeHeroLabel: { position: 'absolute', left: 18, right: 18, bottom: 58, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(8,19,33,0.72)', borderWidth: 1, borderColor: 'rgba(241,248,255,0.2)' },
  nativeHeroLabelText: { color: '#f7faff', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  nativeHeroLabelHint: { color: '#a8c4e3', fontSize: 8, marginTop: 2, letterSpacing: 0.4 },
  controls: { ...StyleSheet.absoluteFillObject, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  arrowButton: { position: 'relative', top: 40, width: 38, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(209,230,255,0.18)', borderWidth: 1, borderColor: 'rgba(244,249,255,0.34)' },
  animatePrompt: { position: 'absolute', left: 0, right: 0, bottom: 106, alignItems: 'center', gap: 4 },
  animateWarning: { overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, color: '#ffe49a', backgroundColor: 'rgba(77,52,12,0.86)', borderWidth: 1, borderColor: 'rgba(255,202,92,0.72)', fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },
  animateButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
