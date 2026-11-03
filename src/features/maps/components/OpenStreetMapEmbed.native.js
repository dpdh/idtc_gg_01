import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';

const MAP_URL = 'https://www.openstreetmap.org/#map=14/-6.208/106.816';

export default function OpenStreetMapEmbed() {
  return (
    <View style={styles.fallback}>
      <FontAwesomeIcon icon={faMapLocationDot} size={27} color="#4f9d82" />
      <Text style={styles.title}>OpenStreetMap</Text>
      <Text style={styles.description}>Peta interaktif tersedia melalui browser perangkat.</Text>
      <TouchableOpacity onPress={() => Linking.openURL(MAP_URL).catch(() => {})} style={styles.button} accessibilityRole="link">
        <Text style={styles.buttonText}>Buka peta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#e7eee7' },
  title: { color: '#20382e', fontSize: 15, fontWeight: '800', marginTop: 12 },
  description: { color: '#536c60', fontSize: 11, textAlign: 'center', marginTop: 6 },
  button: { marginTop: 13, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12, backgroundColor: '#c6e3d4' },
  buttonText: { color: '#18392d', fontSize: 11, fontWeight: '800' },
});
