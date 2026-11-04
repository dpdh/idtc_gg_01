import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faCube, faWandMagicSparkles, faGamepad } from '@fortawesome/free-solid-svg-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TwiniHeroBackground from '../components/TwiniHeroBackground';
import { useAuth } from '../../auth/data/AuthContext';

const quickLinks = [
  { title: 'Explore 3D Models', icon: faCube, route: 'Library', description: 'Browse your digital assets' },
  { title: 'Create with AI', icon: faWandMagicSparkles, route: 'MeshyGenerator', description: 'Generate a 3D model' },
  { title: 'Play TWINI', icon: faGamepad, route: 'Maps', description: 'Catch digital energy orbs' },
];

const HomeDashboard = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const compact = width < 640;
  const horizontalPadding = width < 380 ? 14 : width < 768 ? 20 : 32;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.content, { maxWidth: 1240, paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.headerLeft}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Hallo sobat Twini,</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={styles.notificationButton}>
                <FontAwesomeIcon icon={faBell} size={17} color="#dbeafe" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
            <Text numberOfLines={1} style={styles.greetingName}>{user?.fullName || 'Sobat Twini'}</Text>
          </View>
        </View>

        <View style={[styles.heroSection, compact && styles.heroCompact]}>
          <LinearGradient
            colors={['rgba(38,65,96,0.76)', 'rgba(23,43,70,0.7)', 'rgba(12,20,34,0.82)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.heroGlassHighlight} />
          <View style={[styles.heroContent, compact && styles.heroContentCompact]}>
            <View style={styles.heroBrandGlass}>
              <Text style={styles.heroEyebrow}>TWINI · IDTC</Text>
            </View>
          </View>
          <View pointerEvents="box-none" style={[styles.twiniContainer, compact ? styles.twiniCompact : styles.twiniWide]}>
            <TwiniHeroBackground />
          </View>
          <View style={styles.heroTaglineGlass}>
            <Text style={styles.heroSubheadline}>Explore, create and simulate the future.</Text>
          </View>
          <View pointerEvents="none" style={[styles.heroGlow, compact && styles.heroGlowCompact]} />
          <View style={styles.heroFooterGlass}>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Library')}>
              <Text style={styles.heroButtonText}>Explore models</Text>
              <FontAwesomeIcon icon={faCube} size={14} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroFooterNote}>TWINI · INDONESIA DIGITAL TWIN COMMUNITY</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>GET STARTED</Text>
            <Text style={styles.sectionTitle}>Quick access</Text>
          </View>
        </View>
        <View style={styles.quickAccess}>
          {quickLinks.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.accessCard, { flexBasis: width < 580 ? '100%' : width < 900 ? '47%' : '31%' }]}
              onPress={() => navigation.navigate(item.route)}
              accessibilityRole="button"
            >
              <View style={styles.accessIcon}>
                <FontAwesomeIcon icon={item.icon} color="#8fc2ff" size={18} />
              </View>
              <View style={styles.accessCopy}>
                <Text style={styles.accessTitle}>{item.title}</Text>
                <Text style={styles.accessDescription}>{item.description}</Text>
              </View>
              <Text style={styles.accessArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR WORKSPACE</Text>
            <Text style={styles.sectionTitle}>Discover more</Text>
          </View>
        </View>
        <View style={styles.sections}>
          {[
            ['Featured 3D Objects', 'Explore curated digital assets for your next project.'],
            ['Popular Categories', 'Find models across buildings, transport and smart cities.'],
            ['Recently Viewed', 'Pick up where you left off in your workspace.'],
          ].map(([title, description]) => (
            <TouchableOpacity
              key={title}
              onPress={() => navigation.navigate(title === 'Popular Categories' ? 'Explore' : title === 'Featured 3D Objects' ? 'Library' : 'Simulation')}
              style={[styles.section, { flexBasis: width < 620 ? '100%' : '31%' }]}
            >
              <View style={styles.sectionMark}><FontAwesomeIcon icon={faCube} color="#7db8ff" size={16} /></View>
              <Text style={styles.sectionCardTitle}>{title}</Text>
              <Text style={styles.sectionDescription}>{description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  content: { width: '100%', alignSelf: 'center', paddingTop: 22 },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    padding: 16,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(144, 178, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(238, 247, 255, 0.24)',
    shadowColor: '#75baff',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  headerCompact: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  headerLeft: { flex: 1, minWidth: 120 },
  greetingRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  greeting: { color: '#91a1b8', fontSize: 13 },
  greetingName: { color: '#f5f8ff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  searchBox: { flex: 1, minWidth: 0, height: 44, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(230,242,255,0.16)' },
  searchInput: { flex: 1, minWidth: 0, color: '#f5f8ff', fontSize: 14, paddingVertical: 0 },
  notificationButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(167,204,255,0.12)', borderWidth: 1, borderColor: 'rgba(230,242,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#60a5fa', borderWidth: 1, borderColor: '#1a2940' },
  heroSection: { minHeight: 510, borderRadius: 32, overflow: 'hidden', padding: 22, marginBottom: 28, position: 'relative', borderWidth: 1, borderColor: 'rgba(236,246,255,0.34)', backgroundColor: 'rgba(19,32,51,0.82)', shadowColor: '#77baff', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 9 },
  heroCompact: { minHeight: 500, padding: 16, borderRadius: 28 },
  heroGlassHighlight: { position: 'absolute', top: 1, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.58)' },
  heroContent: { zIndex: 8, width: '100%', alignItems: 'center' },
  heroContentCompact: { width: '100%' },
  heroBrandGlass: { minWidth: 180, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, backgroundColor: 'rgba(208,226,255,0.09)', borderWidth: 1, borderColor: 'rgba(241,248,255,0.2)' },
  heroTaglineGlass: { position: 'absolute', zIndex: 11, left: 14, right: 14, top: 67, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(12,22,38,0.68)', borderWidth: 1, borderColor: 'rgba(241,248,255,0.19)' },
  heroEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#a8d2ff', marginBottom: 7 },
  heroHeadline: { color: '#f7faff', fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginBottom: 4 },
  heroSubheadline: { color: '#c1d0e3', fontSize: 8, lineHeight: 11, textAlign: 'center' },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 10, minWidth: 176, marginTop: 0, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 18, backgroundColor: 'rgba(88,157,255,0.78)', borderWidth: 1, borderColor: 'rgba(245,250,255,0.58)', shadowColor: '#7db9ff', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  heroButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  twiniContainer: { position: 'absolute', zIndex: 10, left: 0, right: 0, top: 54, bottom: 0 },
  twiniWide: { top: 54, bottom: 0 },
  twiniCompact: { top: 58, bottom: 0 },
  heroGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#347ed2', opacity: 0.16, alignSelf: 'center', top: 125 },
  heroGlowCompact: { width: 245, height: 245, top: 140, alignSelf: 'center' },
  heroFooterGlass: { position: 'absolute', zIndex: 12, left: 18, right: 18, bottom: 14, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 23, backgroundColor: 'rgba(213,230,250,0.1)', borderWidth: 1, borderColor: 'rgba(244,249,255,0.24)' },
  heroFooterNote: { color: '#b8cbe0', fontSize: 8, fontWeight: '700', letterSpacing: 1.35, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 },
  sectionEyebrow: { color: '#71839e', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  sectionTitle: { color: '#f2f6fd', fontSize: 21, fontWeight: '700' },
  quickAccess: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  accessCard: { flexGrow: 1, minWidth: 0, minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 21, backgroundColor: 'rgba(177,204,239,0.09)', borderWidth: 1, borderColor: 'rgba(239,247,255,0.22)', shadowColor: '#8fc2ff', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  accessIcon: { width: 46, height: 46, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(106,171,255,0.18)', borderWidth: 1, borderColor: 'rgba(205,230,255,0.18)' },
  accessCopy: { flex: 1, minWidth: 0 },
  accessTitle: { color: '#f2f6fd', fontSize: 14, fontWeight: '700' },
  accessDescription: { color: '#8292aa', fontSize: 12, marginTop: 4 },
  accessArrow: { color: '#91bfff', fontSize: 26, lineHeight: 28, paddingLeft: 4 },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { flexGrow: 1, minWidth: 0, minHeight: 146, padding: 18, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(224,240,255,0.15)', shadowColor: '#8fc2ff', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  sectionMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(106,171,255,0.18)', borderWidth: 1, borderColor: 'rgba(205,230,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  sectionCardTitle: { color: '#f2f6fd', fontSize: 15, fontWeight: '700', marginBottom: 7 },
  sectionDescription: { color: '#8292aa', fontSize: 12, lineHeight: 18 },
});

export default HomeDashboard;
