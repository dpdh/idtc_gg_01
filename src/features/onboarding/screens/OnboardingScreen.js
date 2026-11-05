import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const slides = [
  {
    title: 'Explore a 3D world',
    description: 'Browse digital assets and discover models across buildings, infrastructure and more.',
    image: require('../../../assets/imageTwini/Meshy_AI_Twiny Engineer High-Res Render.png_no....png'),
  },
  {
    title: 'Create with AI',
    description: 'Turn ideas into useful 3D assets and bring new concepts into your workspace.',
    image: require('../../../assets/imageTwini/Computer Scientist.png'),
  },
  {
    title: 'Build digital twins',
    description: 'Place models in real-world contexts and explore how your ideas work together.',
    image: require('../../../assets/imageTwini/Urban Planning and Architecture.png'),
  },
  {
    title: 'Make smarter decisions',
    description: 'Use recommendations to find promising locations and improve project layouts.',
    image: require('../../../assets/imageTwini/Geodesy and Urban Planning.png'),
  },
];

export default function OnboardingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const isWide = width >= 760;
  const slide = slides[currentIndex];
  const finish = () => {
    if (navigation?.goBack) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.('Main');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finish} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Close onboarding">
          <FontAwesomeIcon icon={faArrowLeft} size={15} color="#dce8f8" />
        </TouchableOpacity>
        <Text style={styles.brand}>TWINI</Text>
        <TouchableOpacity onPress={finish} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.contentInner, isWide && styles.contentInnerWide]}>
          <View style={[styles.illustrationPanel, isWide && styles.illustrationPanelWide]}>
            <View style={styles.glow} />
            <Image source={slide.image} style={[styles.illustration, { width: isWide ? 330 : Math.min(width * 0.78, 300), height: isWide ? 330 : Math.min(width * 0.78, 300) }]} resizeMode="contain" />
          </View>
          <View style={[styles.copyPanel, isWide && styles.copyPanelWide]}>
            <Text accessibilityRole="header" style={[styles.eyebrow, isWide && styles.wideText]}>{`GETTING STARTED · 0${currentIndex + 1} / 0${slides.length}`}</Text>
            <Text accessibilityRole="header" style={[styles.title, isWide && styles.wideText, { fontSize: width < 380 ? 26 : 32 }]}>{slide.title}</Text>
            <Text style={[styles.description, isWide && styles.wideText]}>{slide.description}</Text>
            <View
              style={styles.indicators}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Onboarding progress"
              accessibilityValue={{ min: 1, max: slides.length, now: currentIndex + 1 }}
            >
              {slides.map((item, index) => (
                <View
                  key={item.title}
                  accessible={false}
                  style={[styles.indicator, index === currentIndex && styles.indicatorActive]}
                />
              ))}
            </View>
            <View style={[styles.actions, isWide && styles.actionsWide]}>
              {currentIndex > 0 && (
                <TouchableOpacity style={styles.previousButton} onPress={() => setCurrentIndex((index) => index - 1)} accessibilityRole="button" accessibilityLabel="Previous step">
                  <Text style={styles.previousText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.nextButton} onPress={() => currentIndex === slides.length - 1 ? finish() : setCurrentIndex((index) => index + 1)} accessibilityRole="button" accessibilityLabel={currentIndex === slides.length - 1 ? 'Finish onboarding' : 'Continue to next step'}>
                <Text style={styles.nextText}>{currentIndex === slides.length - 1 ? 'Done' : 'Continue'}</Text>
                <FontAwesomeIcon icon={faArrowRight} size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation?.navigate?.('Login')} style={styles.signInLink} accessibilityRole="link">
              <Text style={[styles.signInText, isWide && styles.wideText]}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  topBar: { width: '100%', maxWidth: 1040, height: 48, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(220,238,255,0.09)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.17)' },
  brand: { color: '#dce8f8', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  skipButton: { minWidth: 40, alignItems: 'flex-end', paddingVertical: 10 },
  skipText: { color: '#91a1b8', fontSize: 13, fontWeight: '600' },
  contentScroll: { flex: 1, width: '100%' },
  content: { flexGrow: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  contentInner: { width: '100%', maxWidth: 1040, flexDirection: 'column', justifyContent: 'center', gap: 24 },
  contentInnerWide: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  illustrationPanel: { minHeight: 300, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: 28, backgroundColor: '#e2e8ee', borderWidth: 1, borderColor: 'rgba(230,244,255,0.3)' },
  illustrationPanelWide: { flex: 1, minHeight: 420 },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#2563eb', opacity: 0.12 },
  illustration: { maxWidth: '100%' },
  copyPanel: { width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 4, alignItems: 'center' },
  copyPanelWide: { flex: 1, width: 'auto', alignItems: 'flex-start' },
  eyebrow: { color: '#7fb8ff', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12, textAlign: 'center' },
  wideText: { textAlign: 'left' },
  title: { color: '#f4f8ff', fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  description: { maxWidth: 430, color: '#9aabc2', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  indicators: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 25 },
  indicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34445c' },
  indicatorActive: { width: 22, backgroundColor: '#4b9fff' },
  actions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 28 },
  actionsWide: { justifyContent: 'flex-start' },
  nextButton: { minHeight: 46, minWidth: 142, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, borderRadius: 18, backgroundColor: 'rgba(61,139,255,0.76)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.26)' },
  nextText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  previousButton: { minHeight: 46, minWidth: 88, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(220,238,255,0.09)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)' },
  previousText: { color: '#c2d1e5', fontSize: 13, fontWeight: '600' },
  signInLink: { marginTop: 18, paddingVertical: 8 },
  signInText: { color: '#91a1b8', fontSize: 12, textAlign: 'center' },
});
