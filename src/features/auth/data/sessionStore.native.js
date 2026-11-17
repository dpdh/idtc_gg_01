// Local session id lives in the OS keychain/keystore (expo-secure-store) instead of plain AsyncStorage,
// so a rooted device or a leaked app-data folder does not reveal it. AsyncStorage is only read once to
// migrate sessions created by older builds and is then cleared.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'twini.session.v1';
const LEGACY_KEY = '@twini/session/v1';

export async function loadSessionId() {
  try {
    const stored = await SecureStore.getItemAsync(KEY);
    if (stored) return stored;
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    await SecureStore.setItemAsync(KEY, legacy);
    await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    return legacy;
  } catch {
    return null;
  }
}

export async function saveSessionId(userId) {
  await SecureStore.setItemAsync(KEY, String(userId));
  // Drop a migrated copy so the id exists in exactly one place.
  await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
}

export async function clearSessionId() {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
  await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
}
