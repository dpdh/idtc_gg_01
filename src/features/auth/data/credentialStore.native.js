import * as SecureStore from 'expo-secure-store';

const keyFor = (userId) => `twini.credentials.${userId}`;

export async function saveCredential(userId, password) {
  await SecureStore.setItemAsync(keyFor(userId), password);
}

export async function verifyCredential(userId, password) {
  const stored = await SecureStore.getItemAsync(keyFor(userId));
  return stored !== null && stored === password;
}

export async function removeCredential(userId) {
  await SecureStore.deleteItemAsync(keyFor(userId));
}
