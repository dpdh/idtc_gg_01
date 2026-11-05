import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faCog, faMessage, faDownload, faFilter, faArrowLeft, faCompass } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import { useAuth } from '../../auth/data/AuthContext';
import { useTheme } from '../../../shared/theme/ThemeContext';
import ThemeSelector from '../../../shared/components/ThemeSelector';

const UserProfile = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, themeId, setTheme, themes, themeIds } = useTheme();
  const [themeModal, setThemeModal] = React.useState(false);
  const [accountModal, setAccountModal] = React.useState(null);
  const [profileDraft, setProfileDraft] = React.useState({});
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [accountError, setAccountError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const openProfileEditor = () => {
    setProfileDraft({
      fullName: user?.fullName || '',
      email: user?.email || '',
      organization: user?.organization || '',
      industry: user?.industry || '',
      country: user?.country || '',
    });
    setAccountError('');
    setAccountModal('profile');
  };

  const openAccountModal = (modal) => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setAccountError('');
    setAccountModal(modal);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setAccountError('');
    try {
      await updateProfile(profileDraft);
      setAccountModal(null);
    } catch (error) {
      setAccountError(error.message || 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) {
      setAccountError('New passwords do not match.');
      return;
    }
    setIsSaving(true);
    setAccountError('');
    try {
      await changePassword(currentPassword, newPassword);
      setAccountModal(null);
    } catch (error) {
      setAccountError(error.message || 'Could not change your password.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeAccount = async () => {
    setIsSaving(true);
    setAccountError('');
    try {
      await deleteAccount(currentPassword);
      setAccountModal(null);
      navigation.navigate('Login');
    } catch (error) {
      setAccountError(error.message || 'Could not delete your account.');
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigation.navigate('Login');
  };

  const initials = user?.fullName?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'G';

  const renderField = (label, value, onChangeText, props = {}) => (
    <View style={styles.modalField} key={label}>
      <Text style={styles.modalFieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.modalInput}
        placeholderTextColor="#77869c"
        autoCapitalize={props.autoCapitalize || 'words'}
        keyboardType={props.keyboardType || 'default'}
        secureTextEntry={props.secureTextEntry || false}
        autoComplete={props.autoComplete}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ResponsiveContent>
      <View style={styles.profileHeader}>
        <View style={styles.profileImage}><Text style={styles.profileInitials}>{initials}</Text></View>
        <View style={styles.profileName}>
          <Text style={styles.nameText}>{user?.fullName || 'Guest mode'}</Text>
          <Text style={styles.emailText}>{user?.email || 'Sign in to manage your account'}</Text>
        </View>
        {!user && <View style={styles.authActions}>
          <TouchableOpacity style={styles.authButton} onPress={() => navigation.navigate('Login')} accessibilityRole="button"><Text style={styles.authButtonText}>Sign in</Text></TouchableOpacity>
          <TouchableOpacity style={styles.authButtonSecondary} onPress={() => navigation.navigate('Register')} accessibilityRole="button"><Text style={styles.authButtonSecondaryText}>Create account</Text></TouchableOpacity>
        </View>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{user?.fullName || '—'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || '—'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Organization</Text>
          <Text style={styles.infoValue}>{user?.organization || '—'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Industry</Text>
          <Text style={styles.infoValue}>{user?.industry || '—'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Country</Text>
          <Text style={styles.infoValue}>{user?.country || '—'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My 3D Library</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { flexBasis: width < 400 ? '100%' : '30%' }]}>
            <FontAwesomeIcon icon={faDownload} size="16" color="#3b82f6" />
            <View style={styles.statCopy}><Text style={styles.statText}>0</Text><Text style={styles.statLabel}>Downloaded</Text></View>
          </View>
          <View style={[styles.statItem, { flexBasis: width < 400 ? '100%' : '30%' }]}>
            <FontAwesomeIcon icon={faUser} size="16" color="#3b82f6" />
            <View style={styles.statCopy}><Text style={styles.statText}>0</Text><Text style={styles.statLabel}>Favorite models</Text></View>
          </View>
          <View style={[styles.statItem, { flexBasis: width < 400 ? '100%' : '30%' }]}>
            <FontAwesomeIcon icon={faFilter} size="16" color="#3b82f6" />
            <View style={styles.statCopy}><Text style={styles.statText}>0</Text><Text style={styles.statLabel}>Projects</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account management</Text>
        {user ? (
          <>
            <TouchableOpacity style={styles.settingItem} onPress={openProfileEditor} accessibilityRole="button">
              <FontAwesomeIcon icon={faUser} size="16" color="#60a5fa" />
              <View style={styles.settingCopy}><Text style={styles.settingText}>Edit profile</Text><Text style={styles.settingDescription}>Update your name, email and organization</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => openAccountModal('password')} accessibilityRole="button">
              <FontAwesomeIcon icon={faCog} size="16" color="#60a5fa" />
              <View style={styles.settingCopy}><Text style={styles.settingText}>Change password</Text><Text style={styles.settingDescription}>Update your device-stored sign-in password</Text></View>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.settingDescription}>Sign in or create an account to manage your profile.</Text>
        )}
        <Text style={[styles.sectionTitle, styles.settingsHeading]}>Settings</Text>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Onboarding')} accessibilityRole="button">
          <FontAwesomeIcon icon={faCompass} size="16" color="#60a5fa" />
          <View style={styles.settingCopy}>
            <Text style={styles.settingText}>Onboarding</Text>
            <Text style={styles.settingDescription}>View the getting started guide</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => setThemeModal(true)} accessibilityRole="button">
          <FontAwesomeIcon icon={faCog} size="16" color="#64748b" />
          <View style={styles.settingCopy}>
            <Text style={styles.settingText}>Theme</Text>
            <Text style={styles.settingDescription}>{theme.name} — pilih dari 10 tema</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => alert('Help')} accessibilityRole="button">
          <FontAwesomeIcon icon={faMessage} size="16" color="#64748b" />
          <Text style={styles.settingText}>Help Center</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={themeModal} transparent animationType="fade" onRequestClose={() => setThemeModal(false)}>
        <ThemeSelector onClose={() => setThemeModal(false)} />
      </Modal>

      {user && <>
        <TouchableOpacity style={styles.logout} onPress={signOut} accessibilityRole="button">
          <FontAwesomeIcon icon={faArrowLeft} size="16" color="#ef4444" />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountButton} onPress={() => openAccountModal('delete')} accessibilityRole="button">
          <Text style={styles.deleteAccountText}>Delete this account</Text>
        </TouchableOpacity>
      </>}
      </ResponsiveContent>

      <Modal visible={!!accountModal} transparent animationType="fade" onRequestClose={() => setAccountModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{accountModal === 'profile' ? 'Edit profile' : accountModal === 'password' ? 'Change password' : 'Delete account'}</Text>
              {accountModal === 'profile' && <>
                {renderField('Full name', profileDraft.fullName || '', (value) => setProfileDraft((draft) => ({ ...draft, fullName: value })))}
                {renderField('Email address', profileDraft.email || '', (value) => setProfileDraft((draft) => ({ ...draft, email: value })), { autoCapitalize: 'none', keyboardType: 'email-address' })}
                {renderField('Organization', profileDraft.organization || '', (value) => setProfileDraft((draft) => ({ ...draft, organization: value })))}
                {renderField('Industry', profileDraft.industry || '', (value) => setProfileDraft((draft) => ({ ...draft, industry: value })))}
                {renderField('Country', profileDraft.country || '', (value) => setProfileDraft((draft) => ({ ...draft, country: value })))}
              </>}
              {accountModal === 'password' && <>
                <Text style={styles.modalHint}>Use at least 8 characters.</Text>
                {renderField('Current password', currentPassword, setCurrentPassword, { secureTextEntry: true, autoComplete: 'current-password' })}
                {renderField('New password', newPassword, setNewPassword, { secureTextEntry: true, autoComplete: 'new-password' })}
                {renderField('Confirm new password', confirmPassword, setConfirmPassword, { secureTextEntry: true, autoComplete: 'new-password' })}
              </>}
              {accountModal === 'delete' && <>
                <Text style={styles.deleteWarning}>This permanently removes this account and its saved profile from this device.</Text>
                {renderField('Confirm with your password', currentPassword, setCurrentPassword, { secureTextEntry: true, autoComplete: 'current-password' })}
              </>}
              {!!accountError && <Text accessibilityRole="alert" style={styles.modalError}>{accountError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setAccountModal(null)} disabled={isSaving} accessibilityRole="button"><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, accountModal === 'delete' && styles.modalDelete, isSaving && styles.modalDisabled]}
                  onPress={accountModal === 'profile' ? saveProfile : accountModal === 'password' ? savePassword : removeAccount}
                  disabled={isSaving}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalSaveText}>{isSaving ? 'Saving…' : accountModal === 'profile' ? 'Save changes' : accountModal === 'password' ? 'Update password' : 'Delete account'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  container: { flexGrow: 1, paddingTop: 26, paddingBottom: 30 },
  profileHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.18)',
    shadowColor: '#6ab5ff',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: { color: '#fff', fontSize: 24, fontWeight: '800' },
  profileName: {
    flex: 1,
    minWidth: 160,
    alignItems: 'center',
  },
  authActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  authButton: { minWidth: 110, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  authButtonText: { color: '#fff', fontSize: 13, fontFamily: 'Inter Medium' },
  authButtonSecondary: { minWidth: 130, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(230,244,255,0.2)', alignItems: 'center' },
  authButtonSecondaryText: { color: '#dce8f8', fontSize: 13, fontFamily: 'Inter Medium' },
  nameText: {
    fontFamily: 'Inter Bold',
    fontSize: 18,
    color: '#f8fafc',
  },
  emailText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.065)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.15)',
    borderRadius: 20,
    shadowColor: '#6ab5ff',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter Bold',
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: 'Inter Medium',
    flexShrink: 1,
    maxWidth: '68%',
    textAlign: 'right',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: {
    flexGrow: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(220,238,255,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(230,244,255,0.12)',
    borderRadius: 13,
    gap: 9,
  },
  statCopy: { flexShrink: 1 },
  statText: {
    color: '#f8fafc',
    fontSize: 12,
    marginLeft: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    marginBottom: 8,
  },
  settingText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Inter Medium',
  },
  settingCopy: { flex: 1, minWidth: 0 },
  settingDescription: { color: '#8292aa', fontSize: 11, marginTop: 3 },
  settingsHeading: { marginTop: 16 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: 'rgba(239,68,68,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,230,0.28)',
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter Medium',
    flex: 1,
    textAlign: 'center',
  },
  deleteAccountButton: { alignSelf: 'center', padding: 12, marginBottom: 20 },
  deleteAccountText: { color: '#ff8585', fontSize: 12, fontFamily: 'Inter Medium' },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(3,8,16,0.78)', paddingHorizontal: 18 },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  modalCard: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(230,244,255,0.18)', backgroundColor: '#151f30' },
  modalTitle: { color: '#f4f8ff', fontSize: 22, fontFamily: 'Inter Bold', marginBottom: 16 },
  modalHint: { color: '#91a1b8', fontSize: 13, marginBottom: 12 },
  deleteWarning: { color: '#ffc0c0', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  modalField: { marginBottom: 12 },
  modalFieldLabel: { color: '#91a1b8', fontSize: 12, marginBottom: 6 },
  modalInput: { minHeight: 48, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)', backgroundColor: '#0d1522', color: '#f4f8ff', fontSize: 15 },
  modalError: { color: '#ff8585', fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(230,244,255,0.16)' },
  modalCancelText: { color: '#c2d1e5', fontSize: 13, fontFamily: 'Inter Medium' },
  modalSave: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#347fe5' },
  modalDelete: { backgroundColor: '#bd4141' },
  modalDisabled: { opacity: 0.65 },
  modalSaveText: { color: '#fff', fontSize: 13, fontFamily: 'Inter Medium' },
});

export default UserProfile;
