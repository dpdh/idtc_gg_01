const KEY = 'twini.cloud.session.v1';

export async function loadSession() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(session)); } catch { /* storage blocked: session lasts for this page only */ }
}

export async function clearSession() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}
