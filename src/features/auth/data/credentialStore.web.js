const KEY_PREFIX = 'twini.credentials.v1.';
const ITERATIONS = 310_000;

function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser storage requires HTTPS or localhost.');
  }
  return globalThis.crypto;
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function derive(password, salt) {
  const crypto = cryptoApi();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256));
}

export async function saveCredential(userId, password) {
  const crypto = cryptoApi();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify({ salt: toHex(salt), hash: toHex(hash), iterations: ITERATIONS }));
}

export async function verifyCredential(userId, password) {
  const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
  if (!raw) return false;
  let record;
  try { record = JSON.parse(raw); } catch { return false; }
  const salt = Uint8Array.from(record.salt.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
  const expected = record.hash || '';
  const actual = toHex(await derive(password, salt));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i += 1) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

export async function removeCredential(userId) {
  localStorage.removeItem(`${KEY_PREFIX}${userId}`);
}
