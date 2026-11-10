// HTTP client for the TWINI game backend (server/api.js).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const URL_KEY = '@twini/api-url/v1';
const TIMEOUT_MS = 10000;

export class GameApiError extends Error {
  constructor(message, { status = 0, code = 'network' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
  get isNetwork() { return this.status === 0; }
}

let cachedBase;

// Web builds served by server/server.js talk to the same origin. Native builds need an HTTPS URL,
// set at build time (EXPO_PUBLIC_TWINI_API_URL) or by the player in the Account panel.
export async function getBaseUrl() {
  if (cachedBase !== undefined) return cachedBase;
  let stored = null;
  try { stored = await AsyncStorage.getItem(URL_KEY); } catch { /* ignore */ }
  const fromEnv = process.env.EXPO_PUBLIC_TWINI_API_URL || null;
  cachedBase = stored || fromEnv || (Platform.OS === 'web' ? '' : null);
  return cachedBase;
}

export async function setBaseUrl(url) {
  const value = String(url || '').trim().replace(/\/+$/, '');
  if (value && !/^https?:\/\/[^\s]+$/.test(value)) throw new GameApiError('URL server harus diawali http:// atau https://', { code: 'invalid_url' });
  if (value) await AsyncStorage.setItem(URL_KEY, value);
  else await AsyncStorage.removeItem(URL_KEY);
  cachedBase = undefined;
  return getBaseUrl();
}

export async function request(method, path, { token, body } = {}) {
  const base = await getBaseUrl();
  if (base === null) throw new GameApiError('Server game belum dikonfigurasi.', { code: 'not_configured' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${base}/api${path}`, {
      method,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new GameApiError('Tidak dapat terhubung ke server game.');
  } finally {
    clearTimeout(timer);
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new GameApiError(data.error || `Server error ${res.status}`, { status: res.status, code: data.code || 'http_error' });
  return data;
}

export const gameApi = {
  register: (email, password, fullName) => request('POST', '/auth/register', { body: { email, password, fullName } }),
  login: (email, password) => request('POST', '/auth/login', { body: { email, password } }),
  logout: (token) => request('POST', '/auth/logout', { token }),
  missions: () => request('GET', '/content/missions'),
  assets: () => request('GET', '/content/assets'),
  products: () => request('GET', '/store/products'),
  leaderboard: (period = 'all') => request('GET', `/leaderboard?period=${period}`),
  profile: (token) => request('GET', '/player/profile', { token }),
  checkin: (token) => request('POST', '/player/checkin', { token }),
  wallet: (token) => request('GET', '/wallet?limit=60', { token }),
  claim: (token, missionId, payload) => request('POST', `/missions/${encodeURIComponent(missionId)}/claim`, { token, body: payload }),
  discover: (token, assetId, payload) => request('POST', `/assets/${encodeURIComponent(assetId)}/discover`, { token, body: payload }),
  upgrade: (token, assetId, idempotencyKey) => request('POST', `/assets/${encodeURIComponent(assetId)}/upgrade`, { token, body: { idempotencyKey } }),
  redeem: (token, payload) => request('POST', '/store/redeem', { token, body: payload }),
  redemptions: (token) => request('GET', '/store/redemptions', { token }),
};

export function makeKey() {
  const random = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}${random}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
}
