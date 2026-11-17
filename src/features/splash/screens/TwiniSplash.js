import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Five Twini professions cross-fade inside a neon ring; the whole splash lasts 3 seconds.
export const SPLASH_FRAMES = [
  { image: require('../../../assets/splash/twini_scientist.jpg'), label: 'Computer Scientist' },
  { image: require('../../../assets/splash/twini_engineer.jpg'), label: 'Civil Engineer' },
  { image: require('../../../assets/splash/twini_geodesy.jpg'), label: 'Geodesy & Mapping' },
  { image: require('../../../assets/splash/twini_mechanical.jpg'), label: 'Mechanical & Electrical' },
  { image: require('../../../assets/splash/twini_urban.jpg'), label: 'Urban Planner' },
];
const DURATION = 3000;
const STEP = DURATION / SPLASH_FRAMES.length;
const native = Platform.OS !== 'web';

export default function TwiniSplash({ onDone }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.68, height * 0.4, 320);
  const [index, setIndex] = useState(0);
  const fades = useRef(SPLASH_FRAMES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const zoom = useRef(new Animated.Value(0.9)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: native })).start();
    Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    const timers = SPLASH_FRAMES.slice(1).map((_, i) => setTimeout(() => {
      const next = i + 1;
      setIndex(next);
      zoom.setValue(0.92);
      Animated.parallel([
        Animated.timing(fades[next - 1], { toValue: 0, duration: 260, useNativeDriver: native }),
        Animated.timing(fades[next], { toValue: 1, duration: 260, useNativeDriver: native }),
        Animated.spring(zoom, { toValue: 1, friction: 6, tension: 80, useNativeDriver: native }),
      ]).start();
    }, STEP * (i + 1)));
    const finish = setTimeout(() => { if (!done.current) { done.current = true; onDone?.(); } }, DURATION + 120);
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateBack = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const sparks = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 37) % 100}%`, top: `${(i * 53 + 11) % 100}%`, s: 2 + (i % 3) * 1.5, o: 0.25 + (i % 4) * 0.15,
  })), []);

  return <View style={styles.root} accessibilityLabel="Memuat TWINI">
    <LinearGradient colors={['#04122b', '#0a1f4a', '#06142f']} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.orb, { backgroundColor: '#2f7bff', top: '12%', left: '-20%' }]} />
    <View pointerEvents="none" style={[styles.orb, { backgroundColor: '#ffb93a', bottom: '8%', right: '-25%', opacity: 0.16 }]} />
    {sparks.map((p, i) => <View key={i} pointerEvents="none" style={[styles.spark, { left: p.left, top: p.top, width: p.s, height: p.s, borderRadius: p.s, opacity: p.o }]} />)}

    <Animated.View style={[styles.stage, { opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
      <Animated.View style={[styles.ring, { width: size + 44, height: size + 44, borderRadius: (size + 44) / 2, transform: [{ rotate }] }]} />
      <Animated.View style={[styles.ringInner, { width: size + 22, height: size + 22, borderRadius: (size + 22) / 2, transform: [{ rotate: rotateBack }] }]} />
      <Animated.View style={[styles.card, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: zoom }] }]}>
        {SPLASH_FRAMES.map((frame, i) => <Animated.Image key={frame.label} source={frame.image} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: size - 8, height: size - 8, opacity: fades[i] }} />)}
      </Animated.View>
    </Animated.View>

    <Animated.View style={[styles.copy, { opacity: intro }]}>
      <Text style={styles.title}>TWINI</Text>
      <Text style={styles.subtitle}>DIGITAL TWIN UNIVERSE · IDTC</Text>
      <View style={styles.rolePill}><View style={styles.roleDot} /><Text style={styles.roleText}>{SPLASH_FRAMES[index].label}</Text></View>
      <View style={styles.dots}>{SPLASH_FRAMES.map((frame, i) => <View key={frame.label} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
      <View style={styles.track}><Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>
      <Text style={styles.footer}>Explore · Survive · Learn · Build the Future</Text>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#04122b', overflow: 'hidden' },
  orb: { position: 'absolute', width: 360, height: 360, borderRadius: 180, opacity: 0.22 },
  spark: { position: 'absolute', backgroundColor: '#bfe6ff' },
  stage: { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring: { position: 'absolute', borderWidth: 3, borderColor: 'rgba(95,211,255,0.85)', borderStyle: 'dashed' },
  ringInner: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,197,77,0.85)', borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  card: { overflow: 'hidden', backgroundColor: '#dfe6ee', borderWidth: 4, borderColor: '#ffffff' },
  copy: { alignItems: 'center', paddingHorizontal: 24 },
  title: { color: '#ffffff', fontSize: 44, fontWeight: '900', letterSpacing: 10, textShadowColor: 'rgba(95,211,255,0.7)', textShadowRadius: 18 },
  subtitle: { color: '#8fdcff', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,197,77,0.14)', borderWidth: 1, borderColor: 'rgba(255,197,77,0.55)' },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffc54d' },
  roleText: { color: '#ffe3a3', fontSize: 13, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(191,230,255,0.3)' },
  dotActive: { width: 22, backgroundColor: '#5fd3ff' },
  track: { width: 200, height: 4, borderRadius: 2, marginTop: 18, backgroundColor: 'rgba(191,230,255,0.15)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#5fd3ff' },
  footer: { color: 'rgba(191,230,255,0.55)', fontSize: 11, marginTop: 14, letterSpacing: 1 },
});
