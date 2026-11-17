import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PixelRatio, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '../../../shared/components/Icon';
import { faBell, faChevronLeft, faChevronRight, faCube, faGamepad, faHandPointer, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import HeroBackdrop from '../components/HeroBackdrop';
import { useAuth } from '../../auth/data/AuthContext';
import glbModels from '../../library/data/glbModels';
import { glbSourceFor } from '../../viewer/utils/glbSource';
import useReducedMotion from '../../../shared/hooks/useReducedMotion';

// The hero character is a WebGL scene (three.js + GLTF loader). Loading it through React.lazy keeps
// those modules out of the launch path: the dashboard paints instantly and the 3D engine arrives on
// demand, only for this screen.
const TwiniHeroBackground = React.lazy(() => import('../components/TwiniHeroBackground'));

const TWINI_FALLBACK = require('../../../assets/imageTwini/Meshy_AI_Twiny Engineer High-Res Render_no.webp');
const TAB_BAR_SPACE = 104; // floating bottom tab bar (see AppNavigator) + breathing room
const LOW_END = Platform.OS === 'android' && PixelRatio.get() <= 2;

const quickLinks = [
  { title: 'Explore 3D Models', icon: faCube, route: 'Library', description: 'Browse your digital assets', accent: '#22e6ff' },
  { title: 'Create with AI', icon: faWandMagicSparkles, route: 'MeshyGenerator', description: 'Generate a 3D model', accent: '#ff3fd2' },
  { title: 'Play TWINI', icon: faGamepad, route: 'Maps', description: 'Monas Survival Adventure', accent: '#ffc94d' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const firstName = (name) => String(name || 'Sobat').trim().split(/\s+/)[0];

function SpeechBubble({ text, signal, reduceMotion }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!text) return undefined;
    anim.setValue(0);
    const seq = Animated.sequence([
      reduceMotion ? Animated.timing(anim, { toValue: 1, duration: 1, useNativeDriver: true }) : Animated.spring(anim, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.delay(3400),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [anim, text, signal, reduceMotion]);
  if (!text) return null;
  return <Animated.View pointerEvents="none" style={[styles.speech, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
    <Text style={styles.speechText}>{text}</Text>
    <View style={styles.speechTail} />
  </Animated.View>;
}

function FallbackTwini({ reduceMotion }) {
  // Shown only if the 3D model cannot be rendered on a device, so Twini is always visible.
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);
  return <Animated.View pointerEvents="none" style={[styles.fallbackWrap, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}>
    <Image source={TWINI_FALLBACK} style={styles.fallbackImage} resizeMode="contain" accessibilityLabel="Twini" />
  </Animated.View>;
}

const HomeDashboard = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const wide = width >= 760 && width > height * 1.05;
  const short = height < 560; // phone landscape & small windows
  const compact = width < 640;
  const gutter = width < 380 ? 14 : width < 768 ? 18 : 32;
  const padLeft = Math.max(gutter, insets.left + 8);
  const padRight = Math.max(gutter, insets.right + 8);

  // Stage = the box the 3D character is framed into. Portrait: below the title, above the buttons.
  // Landscape/desktop: the right column. Its height is what is left of the first screen after the
  // measured header/title and the floating tab bar, so the whole body is visible without scrolling.
  const [headerH, setHeaderH] = useState(78);
  const [heroTopH, setHeroTopH] = useState(short ? 90 : 190);
  const tabBarVisual = 78 + Math.max(insets.bottom, 12);
  const firstScreenTop = insets.top + 12 + headerH + 14;
  const stageHeight = wide
    ? clamp(height - tabBarVisual - firstScreenTop - 48, 200, 560)
    : clamp(height - tabBarVisual - firstScreenTop - 16 - heroTopH - 12 - 10, 260, 540);

  const twiniIndex = Math.max(0, glbModels.findIndex((m) => m.id === 'twini-idtc'));
  const [modelIndex, setModelIndex] = useState(twiniIndex);
  const model = glbModels[modelIndex];
  const source = glbSourceFor(model.source);
  const [heroSize, setHeroSize] = useState(null);
  const [innerOffset, setInnerOffset] = useState({ x: 0, y: 0 });
  const [stageLayout, setStageLayout] = useState(null);
  const [greetSignal, setGreetSignal] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [speech, setSpeech] = useState(null);
  const lookRef = useRef({ x: 0, y: 0 });
  const impulseRef = useRef(0);
  const lookTimer = useRef(null);
  const greetCount = useRef(0);

  const stage = stageLayout ? { x: innerOffset.x + stageLayout.x, y: innerOffset.y + stageLayout.y, width: stageLayout.width, height: stageLayout.height } : null;
  const name = firstName(user?.fullName);
  const lines = [
    `Halo, ${name}! Siap menjelajahi Monas? 🚀`,
    'Aku Twini, teman Digital Twin-mu 🤖',
    'Ayo selesaikan misi & kumpulkan Twin Points! ⭐',
    'Sentuh aku lagi, aku senang menyapa! 👋',
    'Explore. Survive. Learn. Build the Future.',
  ];

  const onReady = useCallback(() => { setReady(true); setFailed(false); }, []);
  useEffect(() => { if (ready) setSpeech({ text: lines[0], at: Date.now() }); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(lookTimer.current), []);
  useEffect(() => { setReady(false); setFailed(false); }, [modelIndex]);

  const greet = (event) => {
    const { locationX = 0, locationY = 0 } = event?.nativeEvent || {};
    if (stageLayout) lookRef.current = { x: clamp((locationX / stageLayout.width) * 2 - 1, -1, 1), y: clamp((locationY / stageLayout.height) * 2 - 1, -1, 1) };
    clearTimeout(lookTimer.current);
    lookTimer.current = setTimeout(() => { lookRef.current = { x: 0, y: 0 }; }, 2600);
    impulseRef.current = Date.now();
    greetCount.current += 1;
    setGreetSignal((n) => n + 1);
    setSpeech({ text: lines[greetCount.current % lines.length], at: Date.now() });
  };
  const switchModel = (direction) => setModelIndex((i) => (i + direction + glbModels.length) % glbModels.length);

  const headlineSize = short ? 21 : wide ? 38 : height < 780 || compact ? 26 : 32;
  const heroTop = <View style={[styles.heroTop, wide && styles.heroTopWide, short && styles.heroTopShort]} onLayout={(e) => setHeroTopH(Math.round(e.nativeEvent.layout.height))}>
    <View style={styles.brandChip}><View style={styles.brandDot} /><Text numberOfLines={1} style={styles.brandText}>{width < 420 ? 'TWINI · IDTC' : 'TWINI · IDTC · DIGITAL TWIN UNIVERSE'}</Text></View>
    <Text style={[styles.headline, { fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.18), textAlign: wide ? 'left' : 'center' }]}>
      Explore. Survive.{short ? ' ' : '\n'}<Text style={styles.headlineAccent}>Learn. Build the Future.</Text>
    </Text>
    {!short ? <Text style={[styles.tagline, { textAlign: wide ? 'left' : 'center' }]}>Twini, AI companion-mu, siap memandu dunia Digital Twin Indonesia.</Text> : null}
  </View>;

  const heroActions = <View style={[styles.actions, wide && styles.actionsWide, short && styles.actionsShort]}>
    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Maps')} accessibilityRole="button" accessibilityLabel="Main TWINI">
      <FontAwesomeIcon icon={faGamepad} size={15} color="#05101f" /><Text style={styles.primaryButtonText}>Main TWINI</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Library')} accessibilityRole="button" accessibilityLabel="Explore models">
      <FontAwesomeIcon icon={faCube} size={14} color="#e9f6ff" /><Text style={styles.secondaryButtonText}>Explore models</Text>
    </TouchableOpacity>
    {!short ? <Text style={[styles.footNote, wide && { textAlign: 'left', width: '100%' }]}>INDONESIA DIGITAL TWIN COMMUNITY</Text> : null}
  </View>;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <View style={[styles.content, { paddingLeft: padLeft, paddingRight: padRight }]}>
        <View style={[styles.header, short && styles.headerShort]} onLayout={(e) => setHeaderH(Math.round(e.nativeEvent.layout.height))}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hallo sobat Twini,</Text>
            <Text numberOfLines={1} style={[styles.greetingName, short && { fontSize: 16 }]}>{user?.fullName || 'Sobat Twini'}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={styles.notificationButton}>
            <FontAwesomeIcon icon={faBell} size={17} color="#dbeafe" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero} onLayout={(e) => setHeroSize(e.nativeEvent.layout)}>
          <HeroBackdrop height={heroSize?.height || 700} stage={stage} reduceMotion={reduceMotion} />
          {/* One WebGL canvas for character + bubbles; it never takes touches (the stage Pressable does). */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {heroSize ? (
              <React.Suspense fallback={null}>
                <TwiniHeroBackground source={source} stage={stage} greetSignal={greetSignal} reduceMotion={reduceMotion} lowEnd={LOW_END}
                  onReady={onReady} onError={() => setFailed(true)} lookRef={lookRef} impulseRef={impulseRef} />
              </React.Suspense>
            ) : null}
          </View>
          <View pointerEvents="none" style={styles.heroBorderGlow} />

          <View style={[styles.heroInner, wide && styles.heroInnerWide, wide && short && { padding: 14, gap: 14 }]} onLayout={(e) => setInnerOffset({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })}>
            {wide ? <View style={styles.leftColumn}>{heroTop}{heroActions}</View> : heroTop}

            <View style={[styles.stage, { height: stageHeight }, wide && styles.stageWide]} onLayout={(e) => setStageLayout(e.nativeEvent.layout)}>
              <Pressable onPress={greet} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Sapa Twini" accessibilityHint="Twini melambai dan menyapa" />
              {failed ? <FallbackTwini reduceMotion={reduceMotion} /> : null}
              <SpeechBubble text={speech?.text} signal={speech?.at} reduceMotion={reduceMotion} />
              <TouchableOpacity onPress={() => switchModel(-1)} style={[styles.arrow, styles.arrowLeft]} accessibilityRole="button" accessibilityLabel="Karakter sebelumnya" hitSlop={8}>
                <FontAwesomeIcon icon={faChevronLeft} size={14} color="#eff7ff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => switchModel(1)} style={[styles.arrow, styles.arrowRight]} accessibilityRole="button" accessibilityLabel="Karakter berikutnya" hitSlop={8}>
                <FontAwesomeIcon icon={faChevronRight} size={14} color="#eff7ff" />
              </TouchableOpacity>
              <View pointerEvents="none" style={styles.stageFooter}>
                <View style={styles.modelChip}><Text numberOfLines={1} style={styles.modelChipText}>{model.name}{!ready && !failed ? ' · memuat…' : ''}</Text></View>
                <View style={styles.touchChip}><FontAwesomeIcon icon={faHandPointer} size={10} color="#ffe49a" /><Text style={styles.touchChipText}>Sentuh Twini</Text></View>
              </View>
            </View>

            {!wide ? heroActions : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>GET STARTED</Text>
          <Text style={styles.sectionTitle}>Quick access</Text>
        </View>
        <View style={styles.quickAccess}>
          {quickLinks.map((item) => (
            <TouchableOpacity key={item.route} style={[styles.accessCard, { flexBasis: width < 580 ? '100%' : width < 900 ? '47%' : '31%', borderColor: `${item.accent}44` }]} onPress={() => navigation.navigate(item.route)} accessibilityRole="button">
              <View style={[styles.accessIcon, { backgroundColor: `${item.accent}22`, borderColor: `${item.accent}55` }]}><FontAwesomeIcon icon={item.icon} color={item.accent} size={18} /></View>
              <View style={styles.accessCopy}>
                <Text style={styles.accessTitle}>{item.title}</Text>
                <Text style={styles.accessDescription}>{item.description}</Text>
              </View>
              <Text style={[styles.accessArrow, { color: item.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>YOUR WORKSPACE</Text>
          <Text style={styles.sectionTitle}>Discover more</Text>
        </View>
        <View style={styles.sections}>
          {[
            ['Featured 3D Objects', 'Explore curated digital assets for your next project.', '#22e6ff'],
            ['Popular Categories', 'Find models across buildings, transport and smart cities.', '#9b5cff'],
            ['Recently Viewed', 'Pick up where you left off in your workspace.', '#2ff5c8'],
          ].map(([title, description, accent]) => (
            <TouchableOpacity key={title} onPress={() => navigation.navigate(title === 'Popular Categories' ? 'Explore' : title === 'Featured 3D Objects' ? 'Library' : 'Simulation')} style={[styles.section, { flexBasis: width < 620 ? '100%' : '31%' }]}>
              <View style={[styles.sectionMark, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}><FontAwesomeIcon icon={faCube} color={accent} size={16} /></View>
              <Text style={styles.sectionCardTitle}>{title}</Text>
              <Text style={styles.sectionDescription}>{description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const glass = { backgroundColor: 'rgba(14,22,48,0.55)', borderWidth: 1, borderColor: 'rgba(160,220,255,0.22)' };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050817' },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center' },
  header: { ...glass, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 14, borderRadius: 18 },
  headerLeft: { flex: 1, minWidth: 0 },
  greeting: { color: '#9fb2cf', fontSize: 13 },
  greetingName: { color: '#f5f8ff', fontSize: 21, fontWeight: '800', marginTop: 2 },
  notificationButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(167,204,255,0.12)', borderWidth: 1, borderColor: 'rgba(230,242,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff3fd2' },

  hero: { position: 'relative', borderRadius: 30, overflow: 'hidden', marginBottom: 26, backgroundColor: '#050817', borderWidth: 1, borderColor: 'rgba(120,220,255,0.38)' },
  heroBorderGlow: { ...StyleSheet.absoluteFill, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,63,210,0.22)', margin: 3 },
  heroInner: { padding: 16, gap: 12 },
  heroInnerWide: { flexDirection: 'row', alignItems: 'stretch', padding: 24, gap: 20 },
  leftColumn: { flex: 1, justifyContent: 'space-between', gap: 18, maxWidth: 440 },
  heroTop: { ...glass, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 22 },
  heroTopWide: { alignItems: 'flex-start', paddingVertical: 20 },
  heroTopShort: { paddingVertical: 10 },
  headerShort: { paddingVertical: 8, marginBottom: 10 },
  actionsShort: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(34,230,255,0.12)', borderWidth: 1, borderColor: 'rgba(34,230,255,0.4)', marginBottom: 8 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22e6ff' },
  brandText: { color: '#aef3ff', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4 },
  headline: { color: '#f7faff', fontWeight: '900', letterSpacing: -0.6, textShadowColor: 'rgba(34,230,255,0.45)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  headlineAccent: { color: '#ffc94d', textShadowColor: 'rgba(255,63,210,0.5)' },
  tagline: { color: '#c3d4ee', fontSize: 13.5, lineHeight: 19, marginTop: 6 },

  stage: { position: 'relative', width: '100%' },
  stageWide: { flex: 1, width: undefined, minWidth: 0 },
  speech: { position: 'absolute', top: 6, right: '6%', maxWidth: 230, backgroundColor: 'rgba(10,18,40,0.9)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,201,77,0.65)', paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#ffc94d', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  speechText: { color: '#fff6dc', fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  speechTail: { position: 'absolute', bottom: -6, left: 22, width: 12, height: 12, backgroundColor: 'rgba(10,18,40,0.9)', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,201,77,0.65)', transform: [{ rotate: '45deg' }] },
  arrow: { position: 'absolute', top: '46%', width: 38, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, ...glass },
  arrowLeft: { left: 4 },
  arrowRight: { right: 4 },
  stageFooter: { position: 'absolute', left: 0, right: 0, bottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  modelChip: { ...glass, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '55%' },
  modelChipText: { color: '#cfe6ff', fontSize: 10.5, fontWeight: '800' },
  touchChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(77,52,12,0.75)', borderWidth: 1, borderColor: 'rgba(255,202,92,0.6)' },
  touchChipText: { color: '#ffe49a', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  fallbackWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingVertical: '6%' },
  fallbackImage: { width: '86%', height: '92%' },

  actions: { ...glass, alignItems: 'center', gap: 10, padding: 14, borderRadius: 22 },
  actionsWide: { alignItems: 'flex-start' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 210, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 18, backgroundColor: '#22e6ff', shadowColor: '#22e6ff', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  primaryButtonText: { color: '#05101f', fontSize: 15, fontWeight: '900' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minWidth: 210, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18, backgroundColor: 'rgba(155,92,255,0.22)', borderWidth: 1, borderColor: 'rgba(200,160,255,0.55)' },
  secondaryButtonText: { color: '#eef4ff', fontSize: 13.5, fontWeight: '800' },
  footNote: { color: '#9fb6d6', fontSize: 9, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center' },

  sectionHeader: { marginBottom: 12, marginTop: 4 },
  sectionEyebrow: { color: '#7fa0c9', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  sectionTitle: { color: '#f2f6fd', fontSize: 21, fontWeight: '800' },
  quickAccess: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  accessCard: { ...glass, flexGrow: 1, minWidth: 0, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 21 },
  accessIcon: { width: 46, height: 46, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  accessCopy: { flex: 1, minWidth: 0 },
  accessTitle: { color: '#f2f6fd', fontSize: 14, fontWeight: '800' },
  accessDescription: { color: '#93a6c2', fontSize: 12, marginTop: 4 },
  accessArrow: { fontSize: 26, lineHeight: 28, paddingLeft: 4 },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { ...glass, flexGrow: 1, minWidth: 0, minHeight: 140, padding: 18, borderRadius: 21 },
  sectionMark: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  sectionCardTitle: { color: '#f2f6fd', fontSize: 15, fontWeight: '800', marginBottom: 7 },
  sectionDescription: { color: '#93a6c2', fontSize: 12, lineHeight: 18 },
});

export default HomeDashboard;
