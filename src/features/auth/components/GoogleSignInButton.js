import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { gameApi } from '../../game/services/gameApi';
import { useAuth } from '../data/AuthContext';

WebBrowser.maybeCompleteAuthSession();

// Client IDs come from the game server (/auth/config) so the same APK works once an admin configures
// Google Cloud OAuth (web + Android + iOS client IDs) on the server.
function platformClientId(config) {
  if (!config?.enabled) return null;
  if (Platform.OS === 'android') return config.androidClientId;
  if (Platform.OS === 'ios') return config.iosClientId;
  return config.webClientId;
}

function GoogleLauncher({ config, onSignedIn, onError, label }) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: config.webClientId || undefined,
    androidClientId: config.androidClientId || undefined,
    iosClientId: config.iosClientId || undefined,
    selectAccount: true,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') { setBusy(false); if (response.type === 'error') onError?.('Login Google dibatalkan atau gagal.'); return; }
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) { setBusy(false); onError?.('Google tidak mengembalikan ID token.'); return; }
    signInWithGoogle(idToken)
      .then((account) => onSignedIn?.(account))
      .catch((e) => onError?.(e.message || 'Login Google gagal.'))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return <GoogleButtonView label={label} busy={busy} disabled={!request || busy} onPress={() => { setBusy(true); onError?.(''); promptAsync().catch(() => setBusy(false)); }} />;
}

function GoogleButtonView({ label, busy, disabled, onPress, hint }) {
  return <View>
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[styles.button, disabled && !busy && styles.disabled]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.logo}><Text style={styles.g}>G</Text></View>
      <Text style={styles.text}>{label}</Text>
      {busy ? <ActivityIndicator color="#1f1f1f" size="small" /> : null}
    </TouchableOpacity>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}

export default function GoogleSignInButton({ onSignedIn, onError, label = 'Masuk dengan Google' }) {
  const [config, setConfig] = useState(undefined);
  useEffect(() => {
    let alive = true;
    gameApi.authConfig().then((r) => alive && setConfig(r.google)).catch(() => alive && setConfig(null));
    return () => { alive = false; };
  }, []);
  if (config === undefined) return <GoogleButtonView label={label} busy disabled />;
  if (!platformClientId(config)) {
    return <GoogleButtonView label={label} disabled hint={config === null ? 'Server TWINI belum terhubung — login Google butuh koneksi ke server.' : 'Login Google belum diaktifkan admin (Client ID Google OAuth belum diisi di server).'} />;
  }
  return <GoogleLauncher config={config} onSignedIn={onSignedIn} onError={onError} label={label} />;
}

const styles = StyleSheet.create({
  button: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 14, backgroundColor: '#ffffff', paddingHorizontal: 16, borderWidth: 1, borderColor: '#dadce0' },
  disabled: { opacity: 0.55 },
  logo: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e8eaed' },
  g: { color: '#4285F4', fontWeight: '900', fontSize: 15 },
  text: { color: '#1f1f1f', fontSize: 15, fontWeight: '700' },
  hint: { color: '#8ea6c1', fontSize: 11, textAlign: 'center', marginTop: 6 },
});
