import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../data/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 480;

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      navigation.navigate('Main');
    } catch (loginError) {
      setError(loginError.message || 'Could not sign in. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.card, compact && styles.cardCompact]}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text accessibilityRole="header" style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Sign in to continue to your TWINI workspace.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#718096"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                style={styles.input}
                keyboardType="email-address"
                returnKeyType="next"
                accessibilityLabel="Email address"
              />
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordField}>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#718096"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                  textContentType="password"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>{isLoading ? 'Signing in…' : 'Sign in'}</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to TWINI? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="link">
                <Text style={styles.link}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#090f1b' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 460, padding: 36, borderRadius: 24, backgroundColor: '#121c2b', borderWidth: 1, borderColor: 'rgba(180,205,235,0.14)' },
  cardCompact: { padding: 24, borderRadius: 20 },
  brandMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', marginBottom: 24 },
  brandMarkText: { color: '#fff', fontSize: 21, fontWeight: '800' },
  eyebrow: { color: '#7fb8ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.7, marginBottom: 8 },
  title: { color: '#f4f8ff', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#91a1b8', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 28 },
  form: { gap: 9 },
  label: { color: '#d5e0ef', fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: { width: '100%', height: 52, paddingHorizontal: 15, backgroundColor: '#0b1320', borderWidth: 1, borderColor: '#26364d', borderRadius: 12, fontSize: 15, color: '#f8fafc' },
  passwordField: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 68 },
  passwordToggle: { position: 'absolute', right: 14, paddingVertical: 10 },
  passwordToggleText: { color: '#82b9ff', fontSize: 13, fontWeight: '700' },
  error: { color: '#ff9c9c', fontSize: 13, lineHeight: 19, marginTop: 14 },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3478f6', borderRadius: 12, marginTop: 22 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: '#91a1b8', fontSize: 13 },
  link: { color: '#82b9ff', fontSize: 13, fontWeight: '700' },
});
