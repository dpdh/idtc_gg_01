// 2D futuristic backdrop behind the hero's 3D canvas: shifting neon gradients, holographic grid,
// scan light and energy waves. Only opacity/transform are animated (native driver = GPU).
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LAYERS = [
  ['rgba(34,230,255,0.42)', 'rgba(61,123,255,0.18)', 'rgba(6,10,26,0)'],
  ['rgba(155,92,255,0.45)', 'rgba(255,63,210,0.2)', 'rgba(6,10,26,0)'],
  ['rgba(47,245,200,0.32)', 'rgba(255,201,77,0.18)', 'rgba(6,10,26,0)'],
];

function useLoop(duration, reduceMotion, { delay = 0, easing = Easing.inOut(Easing.sin) } = {}) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { value.setValue(0.5); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [value, duration, delay, easing, reduceMotion]);
  return value;
}

function EnergyWave({ center, size, delay, reduceMotion, color }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { value.setValue(0.4); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 4200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [value, delay, reduceMotion]);
  return <Animated.View pointerEvents="none" style={[styles.wave, {
    width: size, height: size, borderRadius: size / 2, left: center.x - size / 2, top: center.y - size / 2, borderColor: color,
    opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.25] }) }],
  }]} />;
}

export default function HeroBackdrop({ height = 600, stage, reduceMotion }) {
  const a = useLoop(5200, reduceMotion);
  const b = useLoop(6400, reduceMotion, { delay: 1800 });
  const c = useLoop(7600, reduceMotion, { delay: 3600 });
  const scan = useLoop(5600, reduceMotion, { easing: Easing.inOut(Easing.quad) });
  const opacities = [a, b, c].map((v) => v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.95] }));
  const center = stage ? { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.55 } : null;
  const waveSize = stage ? Math.min(stage.width, stage.height) * 1.05 : 0;

  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={['#050817', '#0a1236', '#160a33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    {LAYERS.map((colors, i) => <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity: opacities[i] }]}>
      <LinearGradient colors={colors} start={[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }][i]} end={[{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0.5, y: 0 }][i]} style={StyleSheet.absoluteFill} />
    </Animated.View>)}
    {/* Holographic floor grid */}
    <View style={styles.grid}>
      {Array.from({ length: 7 }, (_, i) => <View key={`h${i}`} style={[styles.gridLine, { bottom: `${(i / 7) ** 1.6 * 100}%`, opacity: 0.35 - i * 0.04 }]} />)}
      {Array.from({ length: 9 }, (_, i) => <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 0.5) * (100 / 9)}%` }]} />)}
    </View>
    {center ? <>
      <View style={[styles.halo, { width: waveSize * 0.9, height: waveSize * 0.9, borderRadius: waveSize * 0.45, left: center.x - waveSize * 0.45, top: center.y - waveSize * 0.45 }]} />
      <EnergyWave center={center} size={waveSize} delay={0} reduceMotion={reduceMotion} color="rgba(34,230,255,0.9)" />
      <EnergyWave center={center} size={waveSize} delay={2100} reduceMotion={reduceMotion} color="rgba(255,63,210,0.8)" />
    </> : null}
    {/* Holographic scan light */}
    {!reduceMotion ? <Animated.View style={[styles.scan, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-120, height] }) }] }]}>
      <LinearGradient colors={['rgba(34,230,255,0)', 'rgba(34,230,255,0.13)', 'rgba(34,230,255,0)']} style={StyleSheet.absoluteFill} />
    </Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#22e6ff' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(34,230,255,0.12)' },
  halo: { position: 'absolute', backgroundColor: 'rgba(61,123,255,0.16)' },
  wave: { position: 'absolute', borderWidth: 2 },
  scan: { position: 'absolute', left: 0, right: 0, height: 120 },
});
