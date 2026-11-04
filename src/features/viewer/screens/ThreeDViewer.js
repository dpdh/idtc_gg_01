import React, { Suspense, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { Bounds } from '@react-three/drei/core/Bounds';
import { Center } from '@react-three/drei/core/Center';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useAnimations } from '@react-three/drei/core/useAnimations';
import { useGLTF } from '@react-three/drei/core/Gltf';
import { Asset } from 'expo-asset';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faRotate } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import glbModels from '../../library/data/glbModels';

function GlbModel({ source, uri }) {
  const group = useRef(null);
  const asset = source ? Asset.fromModule(source) : null;
  const modelUri = uri || asset?.localUri || asset?.uri;
  const { scene, animations } = useGLTF(modelUri);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const firstAnimation = Object.values(actions)[0];
    firstAnimation?.reset().fadeIn(0.3).play();
    return () => Object.values(actions).forEach((action) => action.fadeOut(0.2));
  }, [actions]);

  return (
    <group ref={group}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

function LoadingModel() {
  return (
    <mesh>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial color="#70b5ff" wireframe />
    </mesh>
  );
}

export default function ThreeDViewer({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const model = route?.params?.model ?? glbModels[0];

  return (
    <View style={styles.screen}>
      <StatusBar hidden backgroundColor="#090f1b" />
      <Canvas style={StyleSheet.absoluteFill} camera={{ position: [0, 1, 4], fov: 40 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#090f1b']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#79baff" />
        <Suspense fallback={<LoadingModel />}>
          <Bounds fit clip margin={1.25}>
            <GlbModel source={model.source} uri={model.uri} />
          </Bounds>
        </Suspense>
        <OrbitControls makeDefault enableDamping minDistance={0.8} maxDistance={18} />
      </Canvas>

      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <FontAwesomeIcon icon={faArrowLeft} size={16} color="#f1f7ff" />
        </TouchableOpacity>
        <View style={styles.namePill}>
          <Text style={styles.eyebrow}>GLB MODEL</Text>
          <Text numberOfLines={1} style={styles.title}>{model.name}</Text>
        </View>
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
        <View style={styles.instructionPill}>
          <FontAwesomeIcon icon={faRotate} size={12} color="#cce4ff" />
          <Text style={styles.instructionText}>Drag to rotate · Pinch or scroll to zoom</Text>
        </View>
        <Text numberOfLines={2} style={styles.description}>{model.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b', overflow: 'hidden' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  backButton: { width: 46, height: 46, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(17,29,47,0.78)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.2)' },
  namePill: { flex: 1, minWidth: 0, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 17, backgroundColor: 'rgba(17,29,47,0.78)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.2)' },
  eyebrow: { color: '#86bdff', fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 3 },
  title: { color: '#f3f7ff', fontSize: 14, fontWeight: '700' },
  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 18, paddingTop: 30, backgroundColor: 'rgba(9,15,27,0.42)' },
  instructionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(17,29,47,0.82)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.17)' },
  instructionText: { color: '#d6e8fb', fontSize: 11, fontWeight: '600' },
  description: { maxWidth: 560, color: '#a7bad2', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 9 },
});
