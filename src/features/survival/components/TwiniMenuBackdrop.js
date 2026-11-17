import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPLASH_FRAMES } from '../../splash/screens/TwiniSplash';

// Lively backdrop for the TWINI menu: the five Twini profession portraits cross-fade with a slow zoom,
// a colourful gradient wash keeps the text readable, iridescent bubbles hop their way up the screen
// (random size, colour, speed and path every lap) and little stars twinkle. All animations run on the
// native driver (transform / opacity only), so the menu stays smooth on phones.

const native = Platform.OS !== 'web';
const BUBBLE_COLORS = [
  ['#ff6ec7', '#ffb86b'], ['#5fe8ff', '#7d7bff'], ['#7dffb5', '#2fd3c4'], ['#ffd56e', '#ff8a5c'],
  ['#c6a7ff', '#ff7be0'], ['#8fdcff', '#5ea8ff'], ['#ff9f9f', '#ffd56e'], ['#a7ff9f', '#5fe8ff'],
];
const SPARK_COLORS = ['#ffe36e', '#7fe9ff', '#ff9be8', '#b8ffcf', '#ffffff', '#c6a7ff'];
const rand = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------------------ cycling Twini portraits
export function CyclingTwini({ style, interval = 4500, opacity = 1, resizeMode = 'cover', onIndex }) {
  const fades = useRef(SPLASH_FRAMES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const zoom = useRef(new Animated.Value(0)).current;
  const index = useRef(0);
  useEffect(() => {
    const kenBurns = () => { zoom.setValue(0); Animated.timing(zoom, { toValue: 1, duration: interval + 900, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(); };
    kenBurns();
    const id = setInterval(() => {
      const from = index.current;
      const to = (from + 1) % SPLASH_FRAMES.length;
      index.current = to;
      onIndex?.(to);
      Animated.parallel([
        Animated.timing(fades[from], { toValue: 0, duration: 900, useNativeDriver: native }),
        Animated.timing(fades[to], { toValue: 1, duration: 900, useNativeDriver: native }),
      ]).start();
      kenBurns();
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);
  const scale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.16] });
  return <View pointerEvents="none" style={[styles.fillClip, style]}>
    {SPLASH_FRAMES.map((frame, i) => <Animated.Image key={frame.label} source={frame.image} resizeMode={resizeMode}
      style={[StyleSheet.absoluteFill, styles.fullImage, { opacity: Animated.multiply(fades[i], opacity), transform: [{ scale }] }]} />)}
  </View>;
}

// ------------------------------------------------------------------------------ bouncing bubbles
function makeBubble(width, height, first) {
  const size = rand(16, 74) * (Math.random() < 0.18 ? 1.5 : 1);
  const hops = Math.round(rand(5, 9));
  const lane = rand(0.02, 0.98) * width;
  // zig-zag: the bubble "bounces" between random horizontal offsets on its way up
  const drift = Array.from({ length: hops + 1 }, (_, i) => (i === 0 ? 0 : rand(-1, 1) * Math.min(90, width * 0.18)));
  return { key: Math.random(), size, hops, lane, drift, colors: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)], duration: rand(6500, 13000) * (height / 760), delay: first ? rand(0, 6000) : rand(0, 1400), alpha: rand(0.55, 0.95) };
}

function Bubble({ width, height, first }) {
  const [spec, setSpec] = useState(() => makeBubble(width, height, first));
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: spec.duration, delay: spec.delay, easing: Easing.linear, useNativeDriver: native });
    anim.start(({ finished }) => { if (finished) setSpec(makeBubble(width, height, false)); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);
  const tracks = useMemo(() => {
    const { hops, size, drift } = spec;
    const travel = height + size * 2.4;
    const step = travel / hops;
    const input = [];
    const y = [];
    const x = [];
    const sx = [];
    const sy = [];
    const glint = [];
    for (let i = 0; i < hops; i += 1) {
      const a = i / hops;
      const peak = (i + 0.62) / hops;
      // land (squashed) → spring up past the next level → settle back down onto it
      input.push(a, peak);
      y.push(-i * step, -(i + 1.28) * step);
      x.push(drift[i], drift[i] + (drift[i + 1] - drift[i]) * 0.7);
      sx.push(1.14, 0.94);
      sy.push(0.86, 1.08);
      glint.push(i % 2 ? 1 : 0.15, i % 2 ? 0.15 : 1);
    }
    input.push(1); y.push(-travel); x.push(drift[hops]); sx.push(1); sy.push(1); glint.push(0.6);
    return { input, y, x, sx, sy, glint };
  }, [spec, height]);
  const { size, colors, lane, alpha } = spec;
  const it = (outputRange) => progress.interpolate({ inputRange: tracks.input, outputRange });
  return <Animated.View pointerEvents="none" style={[styles.bubble, {
    width: size, height: size, borderRadius: size / 2, left: lane - size / 2, top: height + size * 0.2,
    opacity: progress.interpolate({ inputRange: [0, 0.04, 0.86, 1], outputRange: [0, alpha, alpha, 0] }),
    transform: [{ translateX: it(tracks.x) }, { translateY: it(tracks.y) }, { scaleX: it(tracks.sx) }, { scaleY: it(tracks.sy) }],
  }]}>
    <LinearGradient colors={[`${colors[0]}cc`, `${colors[1]}66`, 'rgba(255,255,255,0.10)']} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
    <View style={[styles.bubbleRim, { borderRadius: size / 2, borderColor: `${colors[0]}` }]} />
    <View style={[styles.bubbleShine, { width: size * 0.34, height: size * 0.2, borderRadius: size * 0.12, top: size * 0.14, left: size * 0.16 }]} />
    <View style={[styles.bubbleDot, { width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, bottom: size * 0.2, right: size * 0.2 }]} />
    <Animated.Text style={[styles.bubbleGlint, { fontSize: Math.max(8, size * 0.3), top: -size * 0.08, right: -size * 0.02, opacity: it(tracks.glint) }]}>✦</Animated.Text>
  </Animated.View>;
}

// ------------------------------------------------------------------------------ twinkling stars
function Sparkle({ width, height, index }) {
  const twinkle = useRef(new Animated.Value(0)).current;
  const spec = useMemo(() => ({ left: rand(0.03, 0.95) * width, top: rand(0.03, 0.95) * height, size: rand(9, 22), color: SPARK_COLORS[index % SPARK_COLORS.length], duration: rand(900, 2200), delay: rand(0, 2500) }), [width, height, index]);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(spec.delay),
      Animated.timing(twinkle, { toValue: 1, duration: spec.duration * 0.45, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.timing(twinkle, { toValue: 0, duration: spec.duration * 0.55, easing: Easing.in(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [spec, twinkle]);
  return <Animated.Text pointerEvents="none" style={[styles.sparkle, { left: spec.left, top: spec.top, fontSize: spec.size, color: spec.color, opacity: twinkle, transform: [{ scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) }, { rotate: twinkle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }]}>✦</Animated.Text>;
}

export function BubbleField({ width, height, count = 18, sparkles = 14 }) {
  if (!width || !height) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Array.from({ length: sparkles }, (_, i) => <Sparkle key={`s${i}`} width={width} height={height} index={i} />)}
    {Array.from({ length: count }, (_, i) => <Bubble key={`b${i}`} width={width} height={height} first />)}
  </View>;
}

// ------------------------------------------------------------------------------ futuristic FX
const loopValue = (value, duration, easing = Easing.linear) => Animated.loop(Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: native }));

// Neon "synthwave" floor: a perspective grid whose horizontal lines scroll towards the viewer.
function NeonGrid({ width, height }) {
  const scroll = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = loopValue(scroll, 1600); l.start(); return () => l.stop(); }, [scroll]);
  const gridH = height * 0.46;
  const cell = 44;
  const rows = Math.ceil(gridH / cell) + 2;
  const cols = Math.ceil((width * 2.4) / cell) + 1;
  return <View pointerEvents="none" style={[styles.gridWrap, { height: gridH }]}>
    <Animated.View style={{ position: 'absolute', left: -width * 0.7, width: width * 2.4, top: -cell, height: gridH + cell * 2, transform: [{ perspective: 420 }, { rotateX: '62deg' }, { translateY: scroll.interpolate({ inputRange: [0, 1], outputRange: [0, cell] }) }] }}>
      {Array.from({ length: rows }, (_, i) => <View key={`h${i}`} style={[styles.gridLineH, { top: i * cell }]} />)}
      {Array.from({ length: cols }, (_, i) => <View key={`v${i}`} style={[styles.gridLineV, { left: i * cell }]} />)}
    </Animated.View>
    <LinearGradient colors={['rgba(42,15,92,0.95)', 'rgba(42,15,92,0)']} style={styles.gridFade} />
  </View>;
}

// A bright scan line sweeping down the screen.
function ScanLine({ height }) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = loopValue(sweep, 5200, Easing.inOut(Easing.quad)); l.start(); return () => l.stop(); }, [sweep]);
  return <Animated.View pointerEvents="none" style={[styles.scan, { opacity: sweep.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.9, 0.9, 0] }), transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] }) }] }]}>
    <LinearGradient colors={['rgba(95,232,255,0)', 'rgba(95,232,255,0.55)', 'rgba(255,255,255,0.9)', 'rgba(255,110,199,0.55)', 'rgba(255,110,199,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
  </Animated.View>;
}

// Rotating HUD rings (dashed neon circles with tick marks).
function HudRing({ size, left, top, color, duration, reverse }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = loopValue(spin, duration); l.start(); return () => l.stop(); }, [spin, duration]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  const inner = spin.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['0deg', '720deg'] : ['720deg', '0deg'] });
  return <View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size }}>
    <Animated.View style={[styles.ring, { borderRadius: size / 2, borderColor: color, borderStyle: 'dashed', transform: [{ rotate }] }]}>
      {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.ringTick, { backgroundColor: color, transform: [{ rotate: `${i * 90}deg` }, { translateY: -size / 2 + 3 }] }]} />)}
    </Animated.View>
    <Animated.View style={[styles.ring, { margin: size * 0.16, borderRadius: size / 2, borderColor: '#ffffff', borderWidth: 1, opacity: 0.5, borderTopColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: inner }] }]} />
    <View style={[styles.ringCore, { margin: size * 0.36, borderRadius: size / 2, backgroundColor: `${color}33`, borderColor: color }]} />
  </View>;
}

// Big soft colour orbs that breathe and drift: the "aurora" behind everything.
function GlowOrb({ size, left, top, colors, duration }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    l.start();
    return () => l.stop();
  }, [pulse, duration]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }) }, { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [-18, 22] }) }] }}>
    <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
  </Animated.View>;
}

// Full-screen backdrop: portraits + vivid colour washes + futuristic FX + bubbles.
export default function TwiniMenuBackdrop({ width, height, calm = false }) {
  const hue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(hue, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(hue, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [hue]);
  const wide = width > 700;
  const short = Math.min(width, height);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]}>
    <CyclingTwini opacity={0.8} />
    {/* Two vivid washes cross-fade: pink → violet → cyan  ⇄  gold → coral → mint */}
    <LinearGradient colors={['rgba(255,60,172,0.62)', 'rgba(120,75,255,0.5)', 'rgba(43,210,255,0.58)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: hue }]}>
      <LinearGradient colors={['rgba(255,196,60,0.62)', 'rgba(255,70,120,0.5)', 'rgba(60,255,190,0.55)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
    <GlowOrb size={short * 0.7} left={-width * 0.18} top={-height * 0.08} colors={['rgba(255,110,199,0.9)', 'rgba(255,184,107,0.25)']} duration={4200} />
    <GlowOrb size={short * 0.62} left={width * 0.55} top={height * 0.3} colors={['rgba(95,232,255,0.85)', 'rgba(125,123,255,0.25)']} duration={5200} />
    <GlowOrb size={short * 0.5} left={width * 0.1} top={height * 0.62} colors={['rgba(125,255,181,0.8)', 'rgba(255,213,110,0.25)']} duration={3600} />
    <NeonGrid width={width} height={height} />
    <HudRing size={wide ? 220 : 150} left={width - (wide ? 190 : 120)} top={-30} color="#5fe8ff" duration={14000} />
    <HudRing size={wide ? 170 : 120} left={-40} top={height * 0.52} color="#ff6ec7" duration={11000} reverse />
    {!calm && <HudRing size={wide ? 120 : 90} left={width * 0.62} top={height * 0.72} color="#ffd56e" duration={9000} />}
    <ScanLine height={height} />
    <BubbleField width={width} height={height} count={calm ? 10 : wide ? 24 : 16} sparkles={calm ? 8 : wide ? 20 : 12} />
    {/* light vignette so text stays readable without killing the colours */}
    <LinearGradient colors={['rgba(14,6,44,0.42)', 'rgba(14,6,44,0.08)', 'rgba(14,6,44,0.5)']} style={StyleSheet.absoluteFill} />
  </View>;
}

// Bubbles that float IN FRONT of the menu cards (touches pass straight through).
export function MenuOverlayFx({ width, height, count = 9 }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <BubbleField width={width} height={height} count={count} sparkles={6} />
  </View>;
}

// ------------------------------------------------------------------------------ happy background music
// Loops a small synthesised tune through expo-audio. The module is loaded lazily and guarded, so an app
// binary built before expo-audio was added simply stays silent instead of crashing.
export function useHappyMusic(enabled, volume = 0.6) {
  const player = useRef(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    let instance = null;
    try {
      // eslint-disable-next-line global-require
      const audio = require('expo-audio');
      audio.setAudioModeAsync?.({ playsInSilentMode: true })?.catch?.(() => {});
      // eslint-disable-next-line global-require
      instance = audio.createAudioPlayer(require('../../../assets/audio/twini_happy.wav'));
      instance.loop = true;
      player.current = instance;
    } catch (error) {
      console.warn('[useHappyMusic] audio unavailable', error?.message || error);
      setAvailable(false);
    }
    return () => {
      player.current = null;
      try { instance?.pause(); instance?.remove?.(); } catch (error) { /* already released */ }
    };
  }, []);
  useEffect(() => {
    const p = player.current;
    if (!p) return undefined;
    const start = () => { try { p.volume = volume; p.play()?.catch?.(() => {}); } catch (error) { /* ignore */ } };
    try { p.volume = volume; } catch (error) { /* ignore */ }
    if (!enabled) { try { p.pause(); } catch (error) { /* ignore */ } return undefined; }
    start();
    // Browsers block autoplay until the first user gesture: retry then.
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => { window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); };
  }, [enabled, volume, available]);
  return available;
}

const styles = StyleSheet.create({
  backdrop: { overflow: 'hidden', backgroundColor: '#2a0f5c' },
  fillClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  fullImage: { width: '100%', height: '100%' },
  bubble: { position: 'absolute', overflow: 'visible' },
  bubbleRim: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, opacity: 0.9 },
  bubbleShine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-28deg' }] },
  bubbleDot: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)' },
  bubbleGlint: { position: 'absolute', color: '#ffffff', fontWeight: '900' },
  sparkle: { position: 'absolute', fontWeight: '900' },
  gridWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,110,199,0.85)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(95,232,255,0.8)' },
  gridFade: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
  scan: { position: 'absolute', left: 0, right: 0, top: 0, height: 34 },
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ringTick: { position: 'absolute', width: 3, height: 10, borderRadius: 2 },
  ringCore: { ...StyleSheet.absoluteFillObject, borderWidth: 1 },
});
