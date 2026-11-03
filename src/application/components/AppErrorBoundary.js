import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <View style={styles.screen}>
      <Text style={styles.eyebrow}>TWINI · DIAGNOSTIC</Text>
      <Text style={styles.title}>Layar mengalami error</Text>
      <Text style={styles.help}>Salin pesan di bawah untuk menemukan komponen yang gagal dimuat.</Text>
      <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorContent}>
        <Text selectable style={styles.errorText}>{this.state.error?.stack || this.state.error?.message || String(this.state.error)}</Text>
      </ScrollView>
      <TouchableOpacity onPress={() => this.setState({ error: null })} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>Muat ulang layar</Text>
      </TouchableOpacity>
    </View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#090f1b' },
  eyebrow: { color: '#92c6ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#f3f7ff', fontSize: 23, fontWeight: '800', marginTop: 8 },
  help: { color: '#9baec5', fontSize: 12, lineHeight: 18, marginTop: 8 },
  errorBox: { maxHeight: 260, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#161f2d', borderWidth: 1, borderColor: '#674552' },
  errorContent: { flexGrow: 1 },
  errorText: { color: '#ffb7bf', fontFamily: 'monospace', fontSize: 10, lineHeight: 15 },
  retry: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#9dcbff', marginTop: 14 },
  retryText: { color: '#071321', fontSize: 11, fontWeight: '800' },
});
