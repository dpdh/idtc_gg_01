import React from 'react';
import { StyleSheet, View } from 'react-native';

const MAP_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=106.776%2C-6.238%2C106.856%2C-6.178&layer=mapnik&marker=-6.208%2C106.816';

export default function OpenStreetMapEmbed() {
  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        title: 'Peta OpenStreetMap',
        src: MAP_URL,
        loading: 'lazy',
        allowFullScreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#dfe8df' } });
