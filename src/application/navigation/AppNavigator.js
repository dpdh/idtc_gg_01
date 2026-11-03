import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeDashboard from '../../features/home/screens/HomeDashboard';
import ThreeDCategories from '../../features/categories/screens/ThreeDCategories';
import MapsScreen from '../../features/maps/screens/MapsScreen';
import SimulationScreen from '../../features/simulation/screens/SimulationScreen';
import UserProfile from '../../features/profile/screens/UserProfile';
import OnboardingScreen from '../../features/onboarding/screens/OnboardingScreen';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RegisterScreen from '../../features/auth/screens/RegisterScreen';
import ThreeDLibrary from '../../features/library/screens/ThreeDLibrary';
import ThreeDViewer from '../../features/viewer/screens/ThreeDViewer';
import MeshyGeneratorScreen from '../../features/meshy/screens/MeshyGeneratorScreen';
import TwiniSurvivalScreen from '../../features/survival/screens/TwiniSurvivalScreen';
import AppErrorBoundary from '../components/AppErrorBoundary';
import { useAuth } from '../../features/auth/data/AuthContext';

const SCREENS = {
  SPLASH: 'SPLASH',
  ONBOARDING: 'ONBOARDING',
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  MAIN: 'MAIN',
  LIBRARY: 'LIBRARY',
  VIEWER: 'VIEWER',
  MESHY_GENERATOR: 'MESHY_GENERATOR',
  CITY_BUILDER: 'CITY_BUILDER',
};

const tabScreens = {
  Home: HomeDashboard,
  Explore: ThreeDCategories,
  Maps: TwiniSurvivalScreen,
  Simulation: SimulationScreen,
  Profile: UserProfile,
};

const tabItems = [
  { name: 'Home', label: 'Home', icon: '🏠' },
  { name: 'Explore', label: 'Explore', icon: '🔍' },
  { name: 'Maps', label: 'TWINI', icon: '🗺️' },
  { name: 'Simulation', label: 'Simulasi', icon: '🎮' },
  { name: 'Profile', label: 'Profile', icon: '👤' },
];

function BottomTabBar({ tab, onTabPress }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = Math.min(Math.max(width - 32, 0), 400);

  return (
    <View style={[styles.tabBarSafeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.tabBar, { width: barWidth }]}>
        {tabItems.map((item) => {
          const isActive = tab === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => onTabPress(item.name)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.tabIconBox, isActive && styles.tabIconBoxActive]}>
                <Text style={styles.tabIcon}>{item.icon}</Text>
              </View>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{item.label}</Text>
              <View style={[styles.tabActiveDot, isActive && styles.tabActiveDotVisible]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
export default function AppNavigator() {
  const [screen, setScreen] = useState(SCREENS.MAIN);
  const [tab, setTab] = useState('Home');
  const [bottomNavigationVisible, setBottomNavigationVisible] = useState(true);
  const [viewerParams, setViewerParams] = useState(null);
  const { isReady } = useAuth();

  const navigate = useCallback((name, params) => {
    switch (name) {
      case 'Onboarding':
        setScreen(SCREENS.ONBOARDING);
        break;
      case 'Login':
        setScreen(SCREENS.LOGIN);
        break;
      case 'Register':
        setScreen(SCREENS.REGISTER);
        break;
      case 'Library':
        setScreen(SCREENS.LIBRARY);
        break;
      case 'Viewer':
        setScreen(SCREENS.VIEWER);
        setViewerParams(params);
        break;
      case 'MeshyGenerator':
        setScreen(SCREENS.MESHY_GENERATOR);
        break;
      case 'CityBuilder':
      case 'Maps':
        setScreen(SCREENS.CITY_BUILDER);
        break;
      case 'Main':
        setScreen(SCREENS.MAIN);
        break;
      default:
        setTab(name);
    }
  }, []);

  const goBack = useCallback(() => {
    setScreen(SCREENS.MAIN);
    setViewerParams(null);
  }, []);

  const renderTabScreen = () => {
    const TabScreen = tabScreens[tab];
    if (!TabScreen) return null;
    return <TabScreen navigation={{ navigate, goBack, setBottomNavigationVisible }} />;
  };

  const handleTabPress = (nextTab) => {
    setBottomNavigationVisible(true);
    setTab(nextTab);
  };

  const showTabBar =
    screen === SCREENS.MAIN || screen === SCREENS.LIBRARY || screen === SCREENS.VIEWER;

  if (!isReady) {
    return (
      <SafeAreaProvider style={styles.appBackground}>
        <View style={styles.loadingScreen}><Text style={styles.loadingText}>TWINI</Text></View>
      </SafeAreaProvider>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider style={styles.appBackground}>
        {screen === SCREENS.SPLASH && null}
        {screen === SCREENS.ONBOARDING && (
          <OnboardingScreen
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {screen === SCREENS.LOGIN && (
          <LoginScreen
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {screen === SCREENS.REGISTER && (
          <RegisterScreen
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {screen === SCREENS.MAIN && renderTabScreen()}
        {screen === SCREENS.LIBRARY && (
          <ThreeDLibrary
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {screen === SCREENS.VIEWER && viewerParams && (
          <ThreeDViewer
            navigation={{ navigate, goBack }}
            route={{ params: viewerParams }}
          />
        )}
        {screen === SCREENS.MESHY_GENERATOR && (
          <MeshyGeneratorScreen
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {screen === SCREENS.CITY_BUILDER && (
          <MapsScreen
            navigation={{ navigate, goBack }}
            route={{ params: {} }}
          />
        )}
        {showTabBar && bottomNavigationVisible && <BottomTabBar tab={tab} onTabPress={handleTabPress} />}
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appBackground: { flex: 1, backgroundColor: '#090f1b' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#7fb8ff', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  tabBarSafeArea: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 6,
  },
  tabBar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    paddingHorizontal: 4,
    borderRadius: 28,
    backgroundColor: 'rgba(17,29,46,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(225,239,255,0.24)',
    shadowColor: '#83bcff',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 14,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 68,
    padding: 0,
  },
  tabIconBox: {
    width: 42,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabIconBoxActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  tabIcon: {
    width: 30,
    fontSize: 21,
    lineHeight: 26,
    textAlign: 'center',
  },
  tabLabel: {
    width: '100%',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    color: '#8292aa',
    textAlign: 'center',
    maxWidth: '100%',
  },
  tabLabelActive: {
    color: '#b9dcff',
  },
  tabActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  tabActiveDotVisible: { backgroundColor: '#8fc5ff', shadowColor: '#8fc5ff', shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
});
