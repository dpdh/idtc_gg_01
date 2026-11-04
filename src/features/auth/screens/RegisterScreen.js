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

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 480;

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Complete your name, email, and password fields.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the terms and privacy notice to continue.');
      return;
    }
    setIsLoading(true);
    try {
      await register({ fullName, email, organization, industry, country }, password);
      navigation.navigate('Main');
    } catch (registerError) {
      setError(registerError.message || 'Could not create your account. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPassword = (label, value, setValue, visible, setVisible, confirm = false) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordField}>
        <TextInput
          placeholder={confirm ? 'Re-enter your password' : 'At least 8 characters'}
          placeholderTextColor="#718096"
          value={value}
          onChangeText={setValue}
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!visible}
          style={[styles.input, styles.passwordInput]}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <Text style={styles.passwordToggleText}>{visible ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, compact && styles.cardCompact]}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View>
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text accessibilityRole="header" style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Set up your TWINI workspace in a few steps.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Full name</Text>
              <TextInput placeholder="Your name" placeholderTextColor="#718096" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" style={styles.input} returnKeyType="next" accessibilityLabel="Full name" />
              <Text style={styles.label}>Email address</Text>
              <TextInput placeholder="you@example.com" placeholderTextColor="#718096" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" style={styles.input} returnKeyType="next" accessibilityLabel="Email address" />
              {renderPassword('Password', password, setPassword, showPassword, setShowPassword)}
              {renderPassword('Confirm password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, true)}
              <Text style={[styles.label, styles.optionalLabel]}>Workspace details <Text style={styles.optionalText}>· optional</Text></Text>
              <TextInput placeholder="Organization" placeholderTextColor="#718096" value={organization} onChangeText={setOrganization} style={styles.input} returnKeyType="next" accessibilityLabel="Organization, optional" />
              <View style={styles.optionalRow}>
                <TextInput placeholder="Industry" placeholderTextColor="#718096" value={industry} onChangeText={setIndustry} style={[styles.input, styles.optionalInput]} accessibilityLabel="Industry, optional" />
                <TextInput placeholder="Country" placeholderTextColor="#718096" value={country} onChangeText={setCountry} style={[styles.input, styles.optionalInput]} accessibilityLabel="Country, optional" />
              </View>
            </View>

            <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted((accepted) => !accepted)} accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}><Text style={styles.checkmark}>{termsAccepted ? '✓' : ''}</Text></View>
              <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.</Text>
            </TouchableOpacity>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <TouchableOpacity style={[styles.primaryButton, isLoading && styles.disabledButton]} onPress={handleRegister} disabled={isLoading} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{isLoading ? 'Creating account…' : 'Create account'}</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="link"><Text style={styles.link}>Sign in</Text></TouchableOpacity>
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
  card: { width: '100%', maxWidth: 540, padding: 36, borderRadius: 24, backgroundColor: '#121c2b', borderWidth: 1, borderColor: 'rgba(180,205,235,0.14)' },
  cardCompact: { padding: 24, borderRadius: 20 },
  brandMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', marginBottom: 22 },
  brandMarkText: { color: '#fff', fontSize: 21, fontWeight: '800' },
  eyebrow: { color: '#7fb8ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.7, marginBottom: 8 },
  title: { color: '#f4f8ff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#91a1b8', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  form: { gap: 8 },
  label: { color: '#d5e0ef', fontSize: 12, fontWeight: '600', marginTop: 3 },
  optionalLabel: { marginTop: 10 },
  optionalText: { color: '#8292aa', fontWeight: '400' },
  input: { width: '100%', height: 48, paddingHorizontal: 14, backgroundColor: '#0b1320', borderWidth: 1, borderColor: '#26364d', borderRadius: 11, fontSize: 14, color: '#f8fafc' },
  passwordField: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 66 },
  passwordToggle: { position: 'absolute', right: 13, paddingVertical: 9 },
  passwordToggleText: { color: '#82b9ff', fontSize: 12, fontWeight: '700' },
  optionalRow: { flexDirection: 'row', gap: 10 },
  optionalInput: { flex: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1.5, borderColor: '#53647c', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  checkboxChecked: { backgroundColor: '#3478f6', borderColor: '#3478f6' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 16 },
  termsText: { flex: 1, color: '#a9b7ca', fontSize: 12, lineHeight: 18 },
  termsLink: { color: '#82b9ff', fontWeight: '600' },
  error: { color: '#ff9c9c', fontSize: 13, lineHeight: 19, marginTop: 12 },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3478f6', borderRadius: 12, marginTop: 18 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { color: '#91a1b8', fontSize: 13 },
  link: { color: '#82b9ff', fontSize: 13, fontWeight: '700' },
});
