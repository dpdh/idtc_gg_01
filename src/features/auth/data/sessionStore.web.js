// Web build: there is no OS keychain, so the session id stays in localStorage (via AsyncStorage).
// The stored value is only an opaque profile id — never a password or cloud token.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@twini/session/v1';

export async function loadSessionId() {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function saveSessionId(userId) {
  try { await AsyncStorage.setItem(KEY, String(userId)); } catch { /* storage blocked */ }
}

export async function clearSessionId() {
  try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
}
