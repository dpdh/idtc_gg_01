import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { colors } from '../theme';

function FloatingBubble({ seed }) {
  const motion = useRef(new Animated.Value(0)).current;
  const config = useRef({
    x: 10 + Math.random() * 80,
    y: 16 + Math.random() * 68,
    driftX: 5 + Math.random() * 12,
    driftY: 5 + Math.random() * 10,
    duration: 1600 + Math.random() * 2100,
    delay: seed * 170 + Math.random() * 650,
    size: 4 + Math.random() * 5,
  }).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(motion, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: config.duration * 0.9,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [config, motion]);

  const translateX = motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-config.driftX, config.driftX, -config.driftX] });
  const translateY = motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [config.driftY, -config.driftY, config.driftY] });
  const opacity = motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.72, 0.12] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          left: `${config.x}%`,
          top: `${config.y}%`,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
}

function TabButton({ route, descriptor, navigation, icon, focused, width, showLabels }) {
  const scale = useRef(new Animated.Value(1)).current;
  const options = descriptor.options;
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const color = focused ? '#f8fbff' : colors.textMuted;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.24, speed: 27, bounciness: 11, useNativeDriver: false }),
        Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 7, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 4, useNativeDriver: false }).start();
    }
  }, [focused, scale]);

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
      onPress={onPress}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={[styles.tabButton, { width }, !showLabels && styles.tabButtonCompact]}
      activeOpacity={0.78}
    >
      <Animated.View style={[styles.iconBox, !showLabels && styles.iconBoxCompact, { transform: [{ scale }] }]}>
        <FontAwesomeIcon icon={icon} size={18} color={color} />
      </Animated.View>
      {showLabels && <Text numberOfLines={1} style={[styles.label, { color, opacity: focused ? 1 : 0.76 }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export default function LiquidTabBar({ state, descriptors, navigation, icons }) {
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = Math.min(Math.max(viewportWidth - 32, 0), 680);
  const contentWidth = Math.max(barWidth - 8, 0);
  const itemWidth = contentWidth / state.routes.length;
  const indicatorWidth = Math.max(itemWidth - 8, 0);
  const showLabels = viewportWidth >= 390;
  const barHeight = showLabels ? 66 : 56;
  const indicatorX = useRef(new Animated.Value(state.index * itemWidth + 4)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: state.index * itemWidth + 4,
        speed: 17,
        bounciness: 12,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(indicatorScale, { toValue: 1.13, duration: 100, useNativeDriver: false }),
        Animated.spring(indicatorScale, { toValue: 1, speed: 15, bounciness: 12, useNativeDriver: false }),
      ]),
    ]).start();
  }, [indicatorScale, indicatorX, itemWidth, state.index]);

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.bar, { width: barWidth, height: barHeight }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.liquidIndicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorX }, { scaleX: indicatorScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(117,185,255,0.48)', 'rgba(44,121,230,0.42)', 'rgba(87,155,255,0.38)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.liquidGradient}
          >
            {[0, 1, 2, 3, 4].map((seed) => <FloatingBubble key={seed} seed={seed} />)}
          </LinearGradient>
        </Animated.View>
        {state.routes.map((route, index) => (
          <TabButton
            key={route.key}
            route={route}
            descriptor={descriptors[route.key]}
            navigation={navigation}
            icon={icons[route.name]}
            focused={state.index === index}
            width={itemWidth}
            showLabels={showLabels}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 4,
    borderRadius: 26,
    backgroundColor: 'rgba(20,31,48,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.18)',
    shadowColor: '#83bcff',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 7 },
    elevation: 12,
    overflow: 'hidden',
  },
  liquidIndicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235,247,255,0.3)',
  },
  liquidGradient: { flex: 1, borderRadius: 22, overflow: 'hidden' },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(245,251,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#d8efff',
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  tabButton: { height: 58, zIndex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 },
  tabButtonCompact: { height: 48, gap: 0 },
  iconBox: { width: 28, height: 27, alignItems: 'center', justifyContent: 'center' },
  iconBoxCompact: { width: 36, height: 34 },
  label: { maxWidth: '100%', fontSize: 10, lineHeight: 13, fontWeight: '600', letterSpacing: 0.1 },
});
