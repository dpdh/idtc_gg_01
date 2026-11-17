import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { faArrowRight, faCity, faGift, faGraduationCap, faRocket } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '../../../shared/components/Icon';

const native = Platform.OS !== 'web';
const slides = [
  {
    key: 'explore',
    eyebrow: 'JELAJAHI',
    title: 'Kota Digital 3D',
    description: 'Bawa Twini menjelajah Monas dan area digital twin lain — kota pintar, pesisir, sampai dataran tinggi — dengan joystick yang halus.',
    image: require('../../../assets/splash/twini_urban.jpg'),
    icon: faCity,
    accent: '#5fd3ff',
    chips: ['Monas', 'Smart City', 'Pesisir'],
  },
  {
    key: 'missions',
    eyebrow: 'SELESAIKAN',
    title: 'Misi Seru Setiap Hari',
    description: 'Aktifkan sensor IoT, pindai landmark, bantu warga, dan hadapi badai simulasi. Misi harian & mingguan menunggumu.',
    image: require('../../../assets/splash/twini_engineer.jpg'),
    icon: faRocket,
    accent: '#ffc54d',
    chips: ['Scan IoT', 'Rescue', 'Event'],
  },
  {
    key: 'rewards',
    eyebrow: 'KUMPULKAN',
    title: 'Twin Points & Hadiah',
    description: 'Poin divalidasi server dan bisa ditukar voucher pulsa, data, e-wallet, sampai merchandise eksklusif Twini.',
    image: require('../../../assets/splash/twini_mechanical.jpg'),
    icon: faGift,
    accent: '#ff8fd8',
    chips: ['Voucher', 'Merchandise', 'Leaderboard'],
  },
  {
    key: 'learn',
    eyebrow: 'BELAJAR',
    title: 'Masa Depan Digital Twin',
    description: 'Kenali profesi digital twin Indonesia: insinyur, geodesi, perencana kota, dan ilmuwan komputer — bersama komunitas IDTC.',
    image: require('../../../assets/splash/twini_geodesy.jpg'),
    icon: faGraduationCap,
    accent: '#7dffb5',
    chips: ['IDTC', 'Edukasi', 'Komunitas'],
  },
];

export default function OnboardingScreen({ navigation, onFinish }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef(null);
  const floatY = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const art = Math.min(width * 0.72, height * 0.36, 340);
  const last = index === slides.length - 1;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatY, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(floatY, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ])).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: native })).start();
  }, [floatY, spin]);

  const finish = (target = 'Main') => {
    onFinish?.();
    navigation?.navigate?.(target);
  };
  const goTo = (next) => {
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };
  const slide = slides[index];
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return <View style={styles.root}>
    <LinearGradient colors={['#04122b', '#0b2252', '#061532']} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.orb, { backgroundColor: slide.accent, top: -80, right: -120 }]} />
    <View pointerEvents="none" style={[styles.orb, { backgroundColor: '#2f7bff', bottom: -140, left: -140 }]} />
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.brand}><Image source={require('../../../assets/imageTwini/ITDC_icon.png')} style={styles.brandLogo} resizeMode="contain" /><Text style={styles.brandText}>TWINI</Text></View>
        {!last ? <TouchableOpacity onPress={() => finish()} style={styles.skip} accessibilityRole="button" accessibilityLabel="Lewati pengenalan"><Text style={styles.skipText}>Lewati</Text></TouchableOpacity> : <View style={styles.skip} />}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
      >
        {slides.map((item) => <View key={item.key} style={[styles.page, { width }]}>
          <Animated.View style={[styles.artWrap, { width: art + 60, height: art + 60, transform: [{ translateY }] }]}>
            <Animated.View style={[styles.artRing, { width: art + 56, height: art + 56, borderRadius: (art + 56) / 2, borderColor: item.accent, transform: [{ rotate }] }]} />
            <View style={[styles.artCard, { width: art, height: art, borderRadius: art / 2, shadowColor: item.accent }]}>
              <Image source={item.image} style={{ width: art - 8, height: art - 8 }} resizeMode="cover" />
            </View>
            <View style={[styles.artBadge, { backgroundColor: item.accent }]}><FontAwesomeIcon icon={item.icon} size={20} color="#071321" /></View>
          </Animated.View>
          <View style={styles.chips}>{item.chips.map((chip) => <View key={chip} style={[styles.chip, { borderColor: `${item.accent}88` }]}><Text style={[styles.chipText, { color: item.accent }]}>{chip}</Text></View>)}</View>
          <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
          <Text accessibilityRole="header" style={[styles.title, { fontSize: width < 380 ? 27 : 32 }]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>)}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: slides.length, now: index + 1 }}>
          {slides.map((item, i) => <TouchableOpacity key={item.key} onPress={() => goTo(i)} accessibilityLabel={`Halaman ${i + 1}`}><View style={[styles.dot, i === index && { width: 26, backgroundColor: slide.accent }]} /></TouchableOpacity>)}
        </View>
        <TouchableOpacity onPress={() => (last ? finish() : goTo(index + 1))} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={last ? 'Mulai petualangan' : 'Lanjut'}>
          <LinearGradient colors={last ? ['#ffd56e', '#f59e0b'] : ['#5fd3ff', '#2f7bff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <Text style={styles.ctaText}>{last ? 'Mulai Petualangan' : 'Lanjut'}</Text>
            <FontAwesomeIcon icon={faArrowRight} size={15} color="#071321" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.authRow}>
          <TouchableOpacity onPress={() => finish('Login')} style={styles.authButton} accessibilityRole="button"><Text style={styles.authText}>Masuk / Google</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => finish('Register')} style={styles.authButton} accessibilityRole="button"><Text style={styles.authText}>Buat Akun</Text></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#04122b', overflow: 'hidden' },
  orb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.2 },
  safe: { flex: 1 },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 28, height: 28 },
  brandText: { color: '#eaf4ff', fontSize: 15, fontWeight: '900', letterSpacing: 4 },
  skip: { minWidth: 64, alignItems: 'flex-end', paddingVertical: 8 },
  skipText: { color: '#a9c2df', fontSize: 14, fontWeight: '700' },
  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  artWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  artRing: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', opacity: 0.85 },
  artCard: { overflow: 'hidden', backgroundColor: '#dfe6ee', borderWidth: 4, borderColor: '#ffffff', shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  artBadge: { position: 'absolute', right: 18, bottom: 22, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff' },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 6 },
  title: { color: '#ffffff', fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  description: { maxWidth: 420, color: '#b6c8de', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 14, gap: 14, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(191,230,255,0.28)' },
  cta: { minWidth: 260, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  ctaText: { color: '#071321', fontSize: 16, fontWeight: '900' },
  authRow: { flexDirection: 'row', gap: 10 },
  authButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(191,230,255,0.25)' },
  authText: { color: '#dce9f8', fontSize: 13, fontWeight: '700' },
});
