'use strict';
// REST routes for the TWINI game backend. Mounted under /api by server.js.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const game = require('./game');
const worldContent = require('../src/features/game/data/gameContent.json');

const { ApiError } = game;
const STORAGE_DIR = path.join(__dirname, 'storage', 'assets');
const MAX_JSON = 64 * 1024;
const MAX_MODEL = 25 * 1024 * 1024;

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new ApiError(413, 'too_large', 'Request terlalu besar.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const raw = (await readBody(req, MAX_JSON)).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new ApiError(400, 'invalid_json', 'Body JSON tidak valid.'); }
}

// Simple in-memory sliding window, enough for a single-process server.
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const nowMs = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => nowMs - t < windowMs);
  if (hits.length >= max) throw new ApiError(429, 'rate_limited', 'Terlalu banyak percobaan. Tunggu sebentar.');
  hits.push(nowMs);
  buckets.set(key, hits);
  if (buckets.size > 10000) buckets.clear();
}

function createApi(db) {
  const routes = [];
  const route = (method, pattern, handler, { auth = 'none' } = {}) => {
    const keys = [];
    const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, key) => { keys.push(key); return '([^/]+)'; })}/?$`);
    routes.push({ method, regex, keys, handler, auth });
  };

  // ----- auth -----
  route('POST', '/auth/register', async (ctx) => {
    rateLimit(`register:${ctx.ip}`, 10, 3_600_000);
    const body = await readJson(ctx.req);
    return [201, game.register(db, body)];
  });
  route('POST', '/auth/login', async (ctx) => {
    const body = await readJson(ctx.req);
    rateLimit(`login:${ctx.ip}:${String(body.email || '').toLowerCase()}`, 8, 60_000);
    return game.login(db, body);
  });
  route('POST', '/auth/logout', (ctx) => { game.logout(db, ctx.token); return { ok: true }; }, { auth: 'user' });
  route('GET', '/auth/me', (ctx) => ({ user: game.publicUser(ctx.user) }), { auth: 'user' });

  // ----- public content -----
  route('GET', '/content/world', () => ({ zones: worldContent.zones, safeZones: worldContent.safeZones, objectTypes: worldContent.objectTypes, objects: worldContent.objects.filter((o) => o.type !== 'treasure') }));
  route('GET', '/content/missions', () => ({ missions: game.listMissions(db) }));
  route('GET', '/content/assets', () => ({ assets: game.listAssets(db) }));
  route('GET', '/store/products', () => ({ products: game.listProducts(db) }));
  route('GET', '/leaderboard', (ctx) => ({ leaderboard: game.leaderboard(db, ctx.query.get('period') === 'weekly' ? 'weekly' : 'all') }));

  // ----- player -----
  route('GET', '/player/profile', (ctx) => game.playerProfile(db, ctx.user), { auth: 'user' });
  route('POST', '/player/checkin', (ctx) => game.dailyCheckin(db, ctx.user), { auth: 'user' });
  route('GET', '/wallet', (ctx) => ({ balance: game.balance(db, ctx.user.id), transactions: game.transactions(db, ctx.user.id, Number(ctx.query.get('limit') || 50)) }), { auth: 'user' });
  route('POST', '/missions/:id/claim', async (ctx) => game.claimMission(db, ctx.user, ctx.params.id, await readJson(ctx.req)), { auth: 'user' });
  route('POST', '/assets/:id/discover', async (ctx) => game.discoverAsset(db, ctx.user, ctx.params.id, await readJson(ctx.req)), { auth: 'user' });
  route('POST', '/assets/:id/upgrade', async (ctx) => game.upgradeAsset(db, ctx.user, ctx.params.id, await readJson(ctx.req)), { auth: 'user' });
  route('POST', '/store/redeem', async (ctx) => {
    rateLimit(`redeem:${ctx.user.id}`, 10, 60_000);
    return [201, game.redeem(db, ctx.user, await readJson(ctx.req))];
  }, { auth: 'user' });
  route('GET', '/store/redemptions', (ctx) => ({ redemptions: game.listRedemptions(db, ctx.user.id) }), { auth: 'user' });

  // ----- admin (role-based) -----
  const admin = { auth: 'admin' };
  route('GET', '/admin/overview', () => game.adminOverview(db), admin);
  route('GET', '/admin/missions', () => ({ missions: game.listMissions(db, { includeUnpublished: true }) }), admin);
  route('PUT', '/admin/missions/:id', async (ctx) => {
    const body = await readJson(ctx.req);
    game.upsertMission(db, { ...body, id: ctx.params.id });
    game.audit(db, ctx.user.id, 'mission.upsert', ctx.params.id, body.status);
    return { ok: true };
  }, admin);
  route('DELETE', '/admin/missions/:id', (ctx) => {
    db.prepare("UPDATE missions SET status = 'archived', updated_at = ? WHERE id = ?").run(new Date().toISOString(), ctx.params.id);
    game.audit(db, ctx.user.id, 'mission.archive', ctx.params.id);
    return { ok: true };
  }, admin);
  route('GET', '/admin/assets', () => ({ assets: game.listAssets(db, { includeUnpublished: true }) }), admin);
  route('PUT', '/admin/assets/:id', async (ctx) => {
    const body = await readJson(ctx.req);
    game.upsertAsset(db, { ...body, id: ctx.params.id });
    game.audit(db, ctx.user.id, 'asset.upsert', ctx.params.id);
    return { ok: true };
  }, admin);
  route('POST', '/admin/assets/:id/model', async (ctx) => {
    const asset = db.prepare('SELECT id FROM assets WHERE id = ?').get(ctx.params.id);
    if (!asset) throw new ApiError(404, 'not_found', 'Aset tidak ditemukan.');
    const data = await readBody(ctx.req, MAX_MODEL);
    // Only binary glTF is accepted at runtime; other formats must be converted to GLB first.
    if (data.length < 20 || data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2) {
      throw new ApiError(415, 'unsupported_model', 'Hanya file GLB (glTF 2.0 biner) yang diterima. Konversi FBX/OBJ/IFC ke GLB terlebih dahulu.');
    }
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    const file = `${ctx.params.id}-${crypto.randomBytes(6).toString('hex')}.glb`;
    fs.writeFileSync(path.join(STORAGE_DIR, file), data);
    const url = `/storage/assets/${file}`;
    db.prepare('UPDATE assets SET model_url = ?, updated_at = ? WHERE id = ?').run(url, new Date().toISOString(), ctx.params.id);
    game.audit(db, ctx.user.id, 'asset.model_upload', ctx.params.id, `${file} (${data.length} B)`);
    return { modelUrl: url, bytes: data.length };
  }, admin);
  route('GET', '/admin/products', () => ({ products: game.listProducts(db, { includeInactive: true }) }), admin);
  route('PUT', '/admin/products/:id', async (ctx) => {
    const body = await readJson(ctx.req);
    game.upsertProduct(db, { ...body, id: ctx.params.id });
    game.audit(db, ctx.user.id, 'product.upsert', ctx.params.id);
    return { ok: true };
  }, admin);
  route('GET', '/admin/vouchers', (ctx) => ({
    vouchers: db.prepare(`SELECT id, product_id AS productId, code, status, redemption_id AS redemptionId, created_at AS createdAt FROM vouchers
      ${ctx.query.get('productId') ? 'WHERE product_id = ?' : ''} ORDER BY id DESC LIMIT 500`).all(...(ctx.query.get('productId') ? [ctx.query.get('productId')] : [])),
  }), admin);
  route('POST', '/admin/vouchers/generate', async (ctx) => {
    const body = await readJson(ctx.req);
    return game.generateVouchers(db, ctx.user, body.productId, body.count, body.codes);
  }, admin);
  route('GET', '/admin/vouchers/validate', (ctx) => game.validateVoucher(db, ctx.query.get('code')), admin);
  route('GET', '/admin/redemptions', () => ({ redemptions: game.listRedemptions(db, null) }), admin);
  route('POST', '/admin/redemptions/:id/status', async (ctx) => game.updateRedemptionStatus(db, ctx.user, ctx.params.id, (await readJson(ctx.req)).status), admin);
  route('GET', '/admin/players', () => ({ players: game.adminPlayers(db) }), admin);
  route('PATCH', '/admin/players/:id', async (ctx) => game.adminUpdatePlayer(db, ctx.user, ctx.params.id, await readJson(ctx.req)), admin);
  route('POST', '/admin/players/:id/points', async (ctx) => {
    const body = await readJson(ctx.req);
    return game.adminAdjustPoints(db, ctx.user, ctx.params.id, body.amount, body.reason);
  }, admin);
  route('GET', '/admin/transactions', () => game.adminTransactions(db), admin);
  route('POST', '/admin/fraud/:id/resolve', (ctx) => game.resolveFlag(db, ctx.user, Number(ctx.params.id)), admin);
  route('GET', '/admin/leaderboard', (ctx) => ({ leaderboard: game.leaderboard(db, ctx.query.get('period') === 'weekly' ? 'weekly' : 'all', 100) }), admin);
  route('GET', '/admin/config', () => ({ config: game.getConfig(db) }), admin);
  route('PUT', '/admin/config', async (ctx) => {
    const config = game.updateConfig(db, await readJson(ctx.req));
    game.audit(db, ctx.user.id, 'config.update');
    return { config };
  }, admin);
  route('GET', '/admin/audit', () => ({ audit: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all() }), admin);

  return async function handle(req, res, pathname, query) {
    const match = routes.find((r) => r.method === req.method && r.regex.test(pathname));
    if (!match) return send(res, routes.some((r) => r.regex.test(pathname)) ? 405 : 404, { error: 'Endpoint tidak ditemukan.', code: 'not_found' });
    const values = pathname.match(match.regex).slice(1);
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    const ctx = {
      req, query, token,
      ip: req.socket.remoteAddress || 'unknown',
      params: Object.fromEntries(match.keys.map((key, i) => [key, decodeURIComponent(values[i])])),
      user: null,
    };
    try {
      if (match.auth !== 'none') {
        ctx.user = game.userFromToken(db, token);
        if (!ctx.user) throw new ApiError(401, 'unauthorized', 'Silakan login terlebih dahulu.');
        if (ctx.user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
        if (match.auth === 'admin' && ctx.user.role !== 'admin') throw new ApiError(403, 'forbidden', 'Akses khusus administrator.');
      }
      const result = await match.handler(ctx);
      const [status, data] = Array.isArray(result) ? result : [200, result];
      send(res, status, data);
    } catch (error) {
      if (error instanceof ApiError) return send(res, error.status, { error: error.message, code: error.code });
      console.error('[api]', req.method, pathname, error);
      send(res, 500, { error: 'Terjadi kesalahan server.', code: 'internal' });
    }
  };
}

module.exports = { createApi, STORAGE_DIR };
