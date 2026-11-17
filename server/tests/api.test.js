'use strict';
// Run: node --test server/tests
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { openDatabase } = require('../db');
const game = require('../game');
const { createApi } = require('../api');
const content = require('../../src/features/game/data/gameContent.json');

let server;
let base;
let db;

test.before(async () => {
  db = openDatabase(':memory:');
  game.seedContent(db, content);
  game.bootstrapAdmin(db, 'admin@test.local', 'AdminPass123');
  const api = createApi(db);
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    api(req, res, url.pathname.replace(/^\/api/, ''), url.searchParams);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(() => server.close());

async function call(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await res.json() };
}

const key = () => `k${Math.random().toString(36).slice(2, 12)}`;
const window = (seconds) => ({ startedAt: new Date(Date.now() - seconds * 1000).toISOString(), completedAt: new Date().toISOString() });
let player;
let adminToken;

test('register + login + me', async () => {
  const reg = await call('POST', '/auth/register', { body: { email: 'Player@Test.local', password: 'password123', fullName: 'Pemain Uji' } });
  assert.equal(reg.status, 201);
  const dup = await call('POST', '/auth/register', { body: { email: 'player@test.local', password: 'password123' } });
  assert.equal(dup.status, 409);
  const bad = await call('POST', '/auth/login', { body: { email: 'player@test.local', password: 'wrong-pass' } });
  assert.equal(bad.status, 401);
  const ok = await call('POST', '/auth/login', { body: { email: 'player@test.local', password: 'password123' } });
  assert.equal(ok.status, 200);
  player = ok.data.token;
  const me = await call('GET', '/auth/me', { token: player });
  assert.equal(me.data.user.email, 'player@test.local');
  assert.equal(me.data.user.role, 'player');
  adminToken = (await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'AdminPass123' } })).data.token;
});

test('protected routes reject anonymous and non-admin users', async () => {
  assert.equal((await call('GET', '/wallet')).status, 401);
  assert.equal((await call('GET', '/admin/overview', { token: player })).status, 403);
  assert.equal((await call('GET', '/admin/overview', { token: adminToken })).status, 200);
});

test('mission claims: locked, too fast, success, duplicate, replay', async () => {
  const locked = await call('POST', '/missions/m02/claim', { token: player, body: { idempotencyKey: key(), ...window(60) } });
  assert.equal(locked.status, 422);
  assert.equal(locked.data.code, 'locked');

  const fast = await call('POST', '/missions/m01/claim', { token: player, body: { idempotencyKey: key(), ...window(2) } });
  assert.equal(fast.data.code, 'too_fast');

  const k = key();
  const ok = await call('POST', '/missions/m01/claim', { token: player, body: { idempotencyKey: k, ...window(60), tp: 999999 } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.tp, 100, 'reward comes from the mission definition, not the client');

  const replay = await call('POST', '/missions/m01/claim', { token: player, body: { idempotencyKey: k, ...window(60) } });
  assert.equal(replay.data.replayed, true);
  const dup = await call('POST', '/missions/m01/claim', { token: player, body: { idempotencyKey: key(), ...window(60) } });
  assert.equal(dup.status, 409);

  const wallet = await call('GET', '/wallet', { token: player });
  assert.equal(wallet.data.balance, 100);

  const flags = db.prepare('SELECT reason FROM fraud_flags').all().map((r) => r.reason);
  assert.ok(flags.includes('locked_claim') && flags.includes('too_fast'), 'rejected claims are flagged even though the transaction rolled back');
});

test('daily mission repeats per period only once', async () => {
  const first = await call('POST', '/missions/d-energy-hunt/claim', { token: player, body: { idempotencyKey: key(), ...window(60) } });
  assert.equal(first.status, 200);
  const again = await call('POST', '/missions/d-energy-hunt/claim', { token: player, body: { idempotencyKey: key(), ...window(60) } });
  assert.equal(again.status, 409);
});

test('team missions and out-of-schedule events are rejected', async () => {
  assert.equal((await call('POST', '/missions/w-team/claim', { token: player, body: { idempotencyKey: key(), ...window(400) } })).data.code, 'team_required');
  assert.equal((await call('POST', '/missions/s-independence/claim', { token: player, body: { idempotencyKey: key(), ...window(400) } })).data.code, 'not_scheduled');
});

test('asset discovery requires a matching object or mission', async () => {
  assert.equal((await call('POST', '/assets/a-cctv/discover', { token: player, body: { objectId: 'light-01' } })).status, 422);
  const ok = await call('POST', '/assets/a-cctv/discover', { token: player, body: { objectId: 'cctv-01' } });
  assert.equal(ok.data.new, true);
  const profile = await call('GET', '/player/profile', { token: player });
  assert.ok(profile.data.assets.some((a) => a.assetId === 'a-road-segment'), 'm01 reward asset granted');
});

test('redemption: insufficient points, voucher flow, cancel refund', async () => {
  const poor = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-sticker', idempotencyKey: key(), delivery: { name: 'Uji', phone: '08123456789', address: 'Jl. Medan Merdeka 1, Jakarta' } } });
  assert.equal(poor.data.code, 'insufficient_points');

  const users = (await call('GET', '/admin/players', { token: adminToken })).data.players;
  const target = users.find((u) => u.email === 'player@test.local');
  await call('POST', `/admin/players/${target.id}/points`, { token: adminToken, body: { amount: 3000, reason: 'uji coba' } });

  const empty = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-data-1gb', idempotencyKey: key() } });
  assert.equal(empty.data.code, 'out_of_stock');
  const gen = await call('POST', '/admin/vouchers/generate', { token: adminToken, body: { productId: 'p-data-1gb', count: 2 } });
  assert.equal(gen.data.inserted, 2);

  const k = key();
  const redeemed = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-data-1gb', idempotencyKey: k } });
  assert.equal(redeemed.status, 201);
  assert.equal(redeemed.data.status, 'REDEEMED');
  assert.match(redeemed.data.voucherCode, /^TWV-/);
  const replay = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-data-1gb', idempotencyKey: k } });
  assert.equal(replay.data.id, redeemed.data.id, 'same idempotency key does not charge twice');

  const before = (await call('GET', '/wallet', { token: player })).data.balance;
  const cancel = await call('POST', `/admin/redemptions/${redeemed.data.id}/status`, { token: adminToken, body: { status: 'CANCELLED' } });
  assert.equal(cancel.data.status, 'CANCELLED');
  const after = (await call('GET', '/wallet', { token: player })).data.balance;
  assert.equal(after - before, 1500);
  const voucher = (await call('GET', `/admin/vouchers/validate?code=${redeemed.data.voucherCode}`, { token: adminToken })).data;
  assert.equal(voucher.status, 'void', 'revealed voucher is voided, not reissued');
});

test('merch redemption needs delivery data and moves through statuses', async () => {
  const noAddress = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-keychain', idempotencyKey: key() } });
  assert.equal(noAddress.data.code, 'invalid_delivery');
  const ok = await call('POST', '/store/redeem', { token: player, body: { productId: 'p-keychain', idempotencyKey: key(), delivery: { name: 'Uji', phone: '08123456789', address: 'Jl. Medan Merdeka 1, Jakarta' } } });
  assert.ok(['CONFIRMED', 'PENDING'].includes(ok.data.status));
  if (ok.data.status === 'CONFIRMED') {
    const bad = await call('POST', `/admin/redemptions/${ok.data.id}/status`, { token: adminToken, body: { status: 'DELIVERED' } });
    assert.equal(bad.data.code, 'invalid_transition');
    for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) {
      assert.equal((await call('POST', `/admin/redemptions/${ok.data.id}/status`, { token: adminToken, body: { status } })).data.status, status);
    }
  }
});

test('points expire FIFO', () => {
  const { user } = game.register(db, { email: 'expiry@test.local', password: 'password123' });
  const insert = db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, idempotency_key, expires_at, created_at) VALUES (?, ?, ?, 'test', ?, ?, ?)`);
  insert.run(user.id, 100, 'earn', 'lot-old', '2000-01-01T00:00:00.000Z', '1999-01-01T00:00:00.000Z');
  insert.run(user.id, -30, 'spend', 'spend-1', null, '1999-06-01T00:00:00.000Z');
  insert.run(user.id, 200, 'earn', 'lot-new', '2999-01-01T00:00:00.000Z', new Date().toISOString());
  assert.equal(game.balance(db, user.id), 200, 'unspent 70 of the expired lot is written off; the spend consumed the oldest lot first');
  assert.equal(game.balance(db, user.id), 200, 'write-off is idempotent');
});

test('admin rejects non-GLB uploads and invalid missions', async () => {
  const upload = await fetch(`${base}/admin/assets/a-cctv/model`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: 'solid cube' });
  assert.equal(upload.status, 415);
  const invalid = await call('PUT', '/admin/missions/x1', { token: adminToken, body: { category: 'campaign', title: 'X', objectives: [{ event: 'hack', count: 1 }] } });
  assert.equal(invalid.status, 400);
  const created = await call('PUT', '/admin/missions/new-mission', { token: adminToken, body: { category: 'daily', title: 'Misi Baru', difficulty: 'easy', objectives: [{ event: 'collect_core', count: 2 }], rewardTp: 70, status: 'published' } });
  assert.equal(created.status, 200);
  const list = (await call('GET', '/content/missions')).data.missions;
  assert.ok(list.some((m) => m.id === 'new-mission'), 'published mission is visible to clients without a code change');
});

test('banned players lose access', async () => {
  const users = (await call('GET', '/admin/players', { token: adminToken })).data.players;
  const target = users.find((u) => u.email === 'player@test.local');
  await call('PATCH', `/admin/players/${target.id}`, { token: adminToken, body: { status: 'banned' } });
  assert.equal((await call('GET', '/wallet', { token: player })).status, 401);
});

test('google sign-in: rejected when unconfigured, then creates & links accounts', async () => {
  const cfg = await call('GET', '/auth/config');
  assert.equal(cfg.data.google.enabled, false);
  const off = await call('POST', '/auth/google', { body: { idToken: 'x'.repeat(40) } });
  assert.equal(off.status, 503);

  process.env.TWINI_GOOGLE_WEB_CLIENT_ID = 'web-client.apps.googleusercontent.com';
  const exp = Math.floor(Date.now() / 1000) + 600;
  game.setGoogleVerifier(async (token) => {
    if (token.startsWith('wrongaud')) return { aud: 'someone-else', iss: 'accounts.google.com', exp, email: 'a@gmail.com', email_verified: 'true', sub: '1' };
    if (token.startsWith('unverified')) return { aud: 'web-client.apps.googleusercontent.com', iss: 'accounts.google.com', exp, email: 'u@gmail.com', email_verified: 'false', sub: '2' };
    const [, email, sub] = token.split('|');
    return { aud: 'web-client.apps.googleusercontent.com', iss: 'https://accounts.google.com', exp, email, email_verified: true, sub, name: 'Gmail User', picture: 'https://example.com/p.png' };
  });
  try {
    assert.equal((await call('POST', '/auth/google', { body: { idToken: `wrongaud${'x'.repeat(30)}` } })).status, 401);
    assert.equal((await call('POST', '/auth/google', { body: { idToken: `unverified${'x'.repeat(30)}` } })).status, 401);
    const fresh = await call('POST', '/auth/google', { body: { idToken: `ok|new.twini@gmail.com|sub-new|${'x'.repeat(20)}` } });
    assert.equal(fresh.status, 200);
    assert.equal(fresh.data.user.provider, 'google');
    assert.ok(fresh.data.token);
    // Same Google account again → same user.
    const again = await call('POST', '/auth/google', { body: { idToken: `ok|new.twini@gmail.com|sub-new|${'y'.repeat(20)}` } });
    assert.equal(again.data.user.id, fresh.data.user.id);
    // Existing password account with the same email gets linked.
    const reg = await call('POST', '/auth/register', { body: { email: 'linked@gmail.com', password: 'Password123', fullName: 'Linked' } });
    const linked = await call('POST', '/auth/google', { body: { idToken: `ok|linked@gmail.com|sub-linked|${'z'.repeat(20)}` } });
    assert.equal(linked.data.user.id, reg.data.user.id);
    assert.equal(linked.data.user.provider, 'password+google');
    // Google-only account can set a first password, then log in with it.
    assert.equal((await call('POST', '/auth/password', { token: fresh.data.token, body: { newPassword: 'NewPassword9' } })).status, 200);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'new.twini@gmail.com', password: 'NewPassword9' } })).status, 200);
  } finally {
    game.setGoogleVerifier(null);
    delete process.env.TWINI_GOOGLE_WEB_CLIENT_ID;
  }
});

test('admin user management: search, detail, create, ban with reason, revoke, delete', async () => {
  const admin = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'AdminPass123' } });
  const token = admin.data.token;
  const created = await call('POST', '/admin/players', { token, body: { email: 'managed@test.local', password: 'Managed1234', fullName: 'Managed User' } });
  assert.equal(created.status, 201);
  const id = created.data.user.id;
  const search = await call('GET', '/admin/players?q=managed', { token });
  assert.equal(search.data.players.length, 1);
  assert.equal(search.data.players[0].provider, 'password');
  const login = await call('POST', '/auth/login', { body: { email: 'managed@test.local', password: 'Managed1234' } });
  assert.equal(login.status, 200);
  const detail = await call('GET', `/admin/players/${id}`, { token });
  assert.equal(detail.data.user.email, 'managed@test.local');
  assert.equal(detail.data.stats.activeSessions, 1);
  assert.equal((await call('PATCH', `/admin/players/${id}`, { token, body: { fullName: 'Renamed', status: 'banned', reason: 'Spam' } })).status, 200);
  const banned = await call('POST', '/auth/login', { body: { email: 'managed@test.local', password: 'Managed1234' } });
  assert.equal(banned.status, 403);
  assert.match(banned.data.error, /Spam/);
  assert.equal((await call('GET', '/auth/me', { token: login.data.token })).status, 401); // sessions revoked on ban
  assert.equal((await call('GET', '/admin/players?status=banned&q=renamed', { token })).data.players.length, 1);
  assert.equal((await call('PATCH', `/admin/players/${id}`, { token, body: { status: 'active' } })).status, 200);
  assert.equal((await call('POST', `/admin/players/${id}/revoke-sessions`, { token })).status, 200);
  assert.equal((await call('DELETE', `/admin/players/${id}`, { token })).status, 200);
  const gone = await call('GET', `/admin/players/${id}`, { token });
  assert.match(gone.data.user.email, /@twini\.invalid$/);
  assert.equal((await call('DELETE', `/admin/players/${admin.data.user.id}`, { token })).status, 422);
});
