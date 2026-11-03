import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SplashScreen = () => {
  const [logoScale, setLogoScale] = useState(new Animated.Value(0));
  const [alpha, setAlpha] = useState(new Animated.Value(0));
  const [titleAlpha, setTitleAlpha] = useState(new Animated.Value(0));
  const navigation = useNavigation();

  useEffect(() => {
    // Animate logo scale in
    const animateIn = Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(alpha, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(titleAlpha, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
    ]);

    animateIn.start();

    // Navigate to Onboarding after animation completes
    const timer = setTimeout(() => navigation.navigate('Onboarding'), 1500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/twini-logo.png')}
          style={[
            styles.logo,
            { transform: [{ scale: logoScale }] },
          ]}
        />
      </Animated.View>
      
      <Animated.View style={styles.titleContainer}>
        <Text style={[styles.title, { opacity: titleAlpha }]}>TWINI</Text>
        <Text style={[styles.subtitle, { opacity: titleAlpha }]}>Digital Twin Simulation Platform</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    width: '100%',
  },
  title: {
    fontFamily: 'Inter Bold',
    fontSize: 48,
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  titleContainer: {
    marginTop: 40,
    alignItems: 'center',
    opacity: 0, // Will be animated
  },
});
