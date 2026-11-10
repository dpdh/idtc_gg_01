import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Canvas, OrbitControls, useAnimations, useGLTF, getGLTFSource } from '../components/ThreeDRenderer';
import { glbSourceFor } from '../utils/glbSource';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faRotate } from '@fortawesome/free-solid-svg-icons';
import { getGLTFFrame } from '../utils/glbBounds';
import glbModels from '../../library/data/glbModels';

class ModelErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[ThreeDViewer] GLB model failed to load', error);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function GlbModel({ source, uri, onReady }) {
  const group = useRef(null);
  const { scene, animations } = useGLTF(getGLTFSource(source, uri));
  const modelFrame = React.useMemo(() => getGLTFFrame(scene), [scene]);
  const { actions } = useAnimations(animations, group);

  useEffect(() => { onReady(); }, [onReady, scene]);

  useEffect(() => {
    const availableActions = Object.values(actions).filter((action) => action && typeof action.reset === 'function');
    const firstAnimation = availableActions[0];
    firstAnimation?.reset();
    firstAnimation?.fadeIn?.(0.3);
    firstAnimation?.play?.();
    return () => availableActions.forEach((action) => action.fadeOut?.(0.2));
  }, [actions]);

  return <group ref={group} scale={modelFrame.scale}>
    <group position={modelFrame.center.map((value) => -value)}><primitive object={scene} /></group>
  </group>;
}

function LoadingModel() {
  return (
    <mesh>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial color="#70b5ff" wireframe />
    </mesh>
  );
}

function ModelLoadingOverlay() {
  return <View style={styles.loading} pointerEvents="none">
    <ActivityIndicator color="#86bdff" />
    <Text style={styles.loadingText}>Memuat model 3D…</Text>
  </View>;
}

export default function ThreeDViewer({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const model = route?.params?.model ?? glbModels[0];
  const [modelUri, setModelUri] = useState(model.uri || null);
  const [modelReady, setModelReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleModelError = useCallback(() => setLoadError(true), []);

  useEffect(() => {
    let active = true;
    setModelUri(model.uri || null);
    setModelReady(false);
    setLoadError(false);
    if (model.uri || !model.source) return () => { active = false; };
    // Native resolves the bundled module itself (works in Android release builds); web gets the URL.
    const resolved = glbSourceFor(model.source);
    if (resolved != null) setModelUri(resolved);
    else setLoadError(true);
    return () => { active = false; };
  }, [model]);

  return (
    <View style={styles.screen}>
      <StatusBar hidden backgroundColor="#090f1b" />
      <Canvas
        style={StyleSheet.absoluteFill}
        camera={{
          position: [0, 0, 4.5],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#090f1b']} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[2, 4, 5]} intensity={1.8} />
        <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#79baff" />
        <Suspense fallback={<LoadingModel />}>
          {modelUri ? (
            <ModelErrorBoundary key={`${model.id}-${modelUri}`} onError={handleModelError}>
              <GlbModel source={model.source} uri={modelUri} onReady={handleModelReady} />
            </ModelErrorBoundary>
          ) : <LoadingModel />}
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          minDistance={1}
          maxDistance={20}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
/>
      </Canvas>

      {modelUri && !modelReady && !loadError && <ModelLoadingOverlay />}
      {!modelUri && !loadError && <ModelLoadingOverlay />}
      {loadError && <View style={styles.loading}><Text style={styles.errorText}>Model tidak dapat dimuat. Coba buka kembali.</Text></View>}

      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesomeIcon icon={faArrowLeft} size={16} color="#f1f7ff" />
        </TouchableOpacity>
        <View style={styles.namePill}>
          <Text style={styles.eyebrow}>GLB MODEL</Text>
          <Text numberOfLines={1} style={styles.title}>{model.id === 'twini-idtc' ? 'TWINI-IDTC' : model.name}</Text>
        </View>
      </View>

      <View
        style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 14) }]}
        pointerEvents="box-none"
      >
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
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(9,15,27,0.72)' },
  loadingText: { color: '#d6e8fb', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#ffd0ce', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(17,29,47,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.2)',
  },
  namePill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(17,29,47,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.2)',
  },
  resetButton: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(17,29,47,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.2)',
    marginLeft: 8,
  },
  eyebrow: { color: '#86bdff', fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 3 },
  title: { color: '#f3f7ff', fontSize: 13.5, fontWeight: '700' },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 30,
    backgroundColor: 'rgba(9,15,27,0.42)',
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(17,29,47,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.17)',
  },
  instructionText: { color: '#d6e8fb', fontSize: 11, fontWeight: '600' },
  description: { maxWidth: 560, color: '#a7bad2', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 9 },
});
