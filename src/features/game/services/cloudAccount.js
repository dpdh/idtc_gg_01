// Links the local TWINI login to the game backend account so Twin Points can be validated server-side.
import { gameApi, GameApiError } from './gameApi';
import { clearSession, loadSession, saveSession } from './tokenStore';

const listeners = new Set();
export const onCloudSessionChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = (session) => listeners.forEach((fn) => { try { fn(session); } catch { /* ignore */ } });

export async function getCloudSession() {
  return loadSession();
}

export async function cloudSignIn(email, password, fullName) {
  let result;
  try {
    result = await gameApi.login(email, password);
  } catch (error) {
    if (!(error instanceof GameApiError) || error.status !== 401) throw error;
    // No cloud account yet (or a different password): try to create one with the same credentials.
    try {
      result = await gameApi.register(email, password, fullName);
    } catch (registerError) {
      if (registerError.status === 409) throw new GameApiError('Akun cloud dengan email ini memakai password lain. Masuk lewat panel Akun Cloud.', { status: 409, code: 'password_mismatch' });
      throw registerError;
    }
  }
  const session = { token: result.token, user: result.user };
  await saveSession(session);
  notify(session);
  return session;
}

export async function cloudRegister(email, password, fullName) {
  const result = await gameApi.register(email, password, fullName);
  const session = { token: result.token, user: result.user };
  await saveSession(session);
  notify(session);
  return session;
}

// Google Sign-In: the server verifies the Google ID token and returns a normal game session.
export async function cloudGoogleSignIn(idToken) {
  const result = await gameApi.googleLogin(idToken);
  const session = { token: result.token, user: result.user };
  await saveSession(session);
  notify(session);
  return session;
}

export async function cloudSignOut() {
  const session = await loadSession();
  if (session?.token) gameApi.logout(session.token).catch(() => {});
  await clearSession();
  notify(null);
}

// Called by AuthContext after a successful local login/registration. Never throws: the game works offline.
export function linkCloudAccountInBackground(email, password, fullName) {
  cloudSignIn(email, password, fullName).catch(() => {});
}
