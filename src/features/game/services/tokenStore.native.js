import * as SecureStore from 'expo-secure-store';

const KEY = 'twini.cloud.session.v1';

export async function loadSession() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
