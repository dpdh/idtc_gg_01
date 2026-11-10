'use strict';
// TWINI game services. All point balances are derived server-side from the transaction ledger;
// the client can only *claim* things (mission ids, object ids), never send amounts.
const crypto = require('node:crypto');
const { transaction, now } = require('./db');

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const parse = (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } };
const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
const DAY = 86_400_000;

// ---------- content & config ----------

function seedContent(db, content) {
  transaction(db, () => {
    if (!db.prepare('SELECT COUNT(*) AS n FROM missions').get().n) content.missions.forEach((m) => upsertMission(db, m));
    if (!db.prepare('SELECT COUNT(*) AS n FROM assets').get().n) content.assets.forEach((a) => upsertAsset(db, a));
    if (!db.prepare('SELECT COUNT(*) AS n FROM products').get().n) content.products.forEach((p) => upsertProduct(db, p));
    const setConfig = db.prepare('INSERT OR IGNORE INTO config (key, value_json) VALUES (?, ?)');
    Object.entries(content.config).forEach(([key, value]) => setConfig.run(key, JSON.stringify(value)));
  });
}

function getConfig(db) {
  return Object.fromEntries(db.prepare('SELECT key, value_json FROM config').all().map((row) => [row.key, parse(row.value_json, null)]));
}

const CONFIG_RULES = {
  globalMultiplier: [0.1, 10], pointsExpiryDays: [1, 3650], maxClaimsPerHour: [1, 1000],
  dailyCheckinTp: [0, 1000], fraudReviewThreshold: [1, 100], timezoneOffsetMinutes: [-720, 840],
};

function updateConfig(db, changes) {
  const stmt = db.prepare('INSERT INTO config (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json');
  for (const [key, value] of Object.entries(changes || {})) {
    const rule = CONFIG_RULES[key];
    if (!rule) throw new ApiError(400, 'invalid_config', `Konfigurasi tidak dikenal: ${key}`);
    const number = Number(value);
    if (!Number.isFinite(number) || number < rule[0] || number > rule[1]) throw new ApiError(400, 'invalid_config', `${key} harus antara ${rule[0]} dan ${rule[1]}`);
    stmt.run(key, JSON.stringify(number));
  }
  return getConfig(db);
}

// ---------- missions ----------

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'legendary'];
const OBJECTIVE_EVENTS = ['explore_zone', 'collect_core', 'scan_object', 'activate_sensor', 'identify_pollution', 'repair_drainage', 'survive_storm', 'rescue_npc', 'restore_station', 'sync_object', 'infra_challenge', 'restore_core', 'find_treasure', 'team_challenge'];

function validateMission(m) {
  if (!/^[a-z0-9-]{2,40}$/.test(m.id || '')) throw new ApiError(400, 'invalid_mission', 'ID misi: 2–40 karakter a-z, 0-9, -');
  if (!['campaign', 'daily', 'weekly', 'special'].includes(m.category)) throw new ApiError(400, 'invalid_mission', 'Kategori tidak valid');
  if (!m.title || String(m.title).length > 80) throw new ApiError(400, 'invalid_mission', 'Judul wajib (maks 80 karakter)');
  if (!DIFFICULTIES.includes(m.difficulty || 'easy')) throw new ApiError(400, 'invalid_mission', 'Tingkat kesulitan tidak valid');
  if (!Array.isArray(m.objectives) || !m.objectives.length) throw new ApiError(400, 'invalid_mission', 'Minimal satu objektif');
  m.objectives.forEach((o) => {
    if (!OBJECTIVE_EVENTS.includes(o.event)) throw new ApiError(400, 'invalid_mission', `Event objektif tidak dikenal: ${o.event}`);
    if (!Number.isInteger(o.count) || o.count < 1 || o.count > 100000) throw new ApiError(400, 'invalid_mission', 'Jumlah objektif harus bilangan bulat ≥ 1');
  });
  const tp = Number(m.rewardTp || 0);
  if (!Number.isInteger(tp) || tp < 0 || tp > 5000) throw new ApiError(400, 'invalid_mission', 'Reward TP harus 0–5000');
  const mult = Number(m.multiplier ?? 1);
  if (!(mult > 0 && mult <= 10)) throw new ApiError(400, 'invalid_mission', 'Multiplier harus > 0 dan ≤ 10');
  for (const key of ['startsAt', 'endsAt']) if (m[key] && Number.isNaN(Date.parse(m[key]))) throw new ApiError(400, 'invalid_mission', `${key} bukan tanggal yang valid`);
}

function upsertMission(db, m) {
  validateMission(m);
  db.prepare(`INSERT INTO missions (id, category, chapter, chapter_title, sort, title, description, difficulty, start_zone, objectives_json,
      time_limit_sec, min_duration_sec, reward_tp, reward_xp, multiplier, requires_json, reward_asset_id, triggers_storm, requires_team, starts_at, ends_at, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET category=excluded.category, chapter=excluded.chapter, chapter_title=excluded.chapter_title, sort=excluded.sort,
      title=excluded.title, description=excluded.description, difficulty=excluded.difficulty, start_zone=excluded.start_zone, objectives_json=excluded.objectives_json,
      time_limit_sec=excluded.time_limit_sec, min_duration_sec=excluded.min_duration_sec, reward_tp=excluded.reward_tp, reward_xp=excluded.reward_xp,
      multiplier=excluded.multiplier, requires_json=excluded.requires_json, reward_asset_id=excluded.reward_asset_id, triggers_storm=excluded.triggers_storm,
      requires_team=excluded.requires_team, starts_at=excluded.starts_at, ends_at=excluded.ends_at, status=excluded.status, updated_at=excluded.updated_at`)
    .run(m.id, m.category, m.chapter ?? null, m.chapterTitle ?? null, Number(m.sort || 0), String(m.title), String(m.description || ''), m.difficulty || 'easy',
      m.startZone ?? null, JSON.stringify(m.objectives), Number(m.timeLimitSec || 0), Number(m.minDurationSec || 0), Number(m.rewardTp || 0), Number(m.rewardXp || 0),
      Number(m.multiplier ?? 1), JSON.stringify(m.requires || []), m.rewardAssetId ?? null, m.triggersStorm ? 1 : 0, m.requiresTeam ? 1 : 0,
      m.startsAt ?? null, m.endsAt ?? null, m.status || 'published', now());
}

function missionRow(row) {
  return {
    id: row.id, category: row.category, chapter: row.chapter, chapterTitle: row.chapter_title, sort: row.sort, title: row.title,
    description: row.description, difficulty: row.difficulty, startZone: row.start_zone, objectives: parse(row.objectives_json, []),
    timeLimitSec: row.time_limit_sec, minDurationSec: row.min_duration_sec, rewardTp: row.reward_tp, rewardXp: row.reward_xp,
    multiplier: row.multiplier, requires: parse(row.requires_json, []), rewardAssetId: row.reward_asset_id, triggersStorm: !!row.triggers_storm,
    requiresTeam: !!row.requires_team, startsAt: row.starts_at, endsAt: row.ends_at, status: row.status, updatedAt: row.updated_at,
  };
}

function listMissions(db, { includeUnpublished = false } = {}) {
  const rows = db.prepare(`SELECT * FROM missions ${includeUnpublished ? '' : "WHERE status = 'published'"} ORDER BY category, sort`).all();
  return rows.map(missionRow);
}

// Period keys make daily/weekly missions repeatable while the UNIQUE constraint blocks duplicates in a period.
function periodKey(mission, config, at = Date.now()) {
  const local = new Date(at + (config.timezoneOffsetMinutes ?? 420) * 60_000);
  if (mission.category === 'daily') return local.toISOString().slice(0, 10);
  if (mission.category === 'weekly') {
    const day = (local.getUTCDay() + 6) % 7; // Monday = 0
    const monday = new Date(local.getTime() - day * DAY);
    return `W${monday.toISOString().slice(0, 10)}`;
  }
  if (mission.category === 'special') return `event:${mission.startsAt || 'always'}`;
  return 'once';
}

function isScheduled(mission, at = Date.now()) {
  if (mission.startsAt && at < Date.parse(mission.startsAt)) return false;
  if (mission.endsAt && at > Date.parse(mission.endsAt)) return false;
  return true;
}

function flag(db, userId, reason, detail) {
  db.prepare('INSERT INTO fraud_flags (user_id, reason, detail, created_at) VALUES (?, ?, ?, ?)').run(userId, reason, detail ? String(detail).slice(0, 500) : null, now());
}

function claimMission(db, user, missionId, body = {}) {
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  const key = String(body.idempotencyKey || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw new ApiError(400, 'invalid_key', 'idempotencyKey wajib (8–80 karakter).');
  const fullKey = `claim:${user.id}:${key}`;
  // Fraud flags must survive the ROLLBACK of a rejected claim, so they are written afterwards.
  const flags = [];
  const raise = (reason, detail) => flags.push([reason, detail]);

  try { return transaction(db, () => {
    const replay = db.prepare('SELECT * FROM point_transactions WHERE idempotency_key = ?').get(fullKey);
    if (replay) return { replayed: true, tp: replay.amount, missionId: replay.ref };

    const row = db.prepare("SELECT * FROM missions WHERE id = ? AND status = 'published'").get(missionId);
    if (!row) throw new ApiError(404, 'mission_not_found', 'Misi tidak ditemukan.');
    const mission = missionRow(row);
    if (mission.requiresTeam) throw new ApiError(422, 'team_required', 'Misi tim belum tersedia di Phase 1.');
    if (!isScheduled(mission)) throw new ApiError(422, 'not_scheduled', 'Misi ini di luar jadwal event.');

    const config = getConfig(db);
    const completed = new Set(db.prepare("SELECT mission_id FROM mission_claims WHERE user_id = ? AND period_key = 'once'").all(user.id).map((r) => r.mission_id));
    const missing = mission.requires.filter((id) => !completed.has(id));
    if (missing.length) {
      raise('locked_claim', `${missionId} sebelum ${missing.join(',')}`);
      throw new ApiError(422, 'locked', `Misi masih terkunci (butuh ${missing.join(', ')}).`);
    }

    const startedAt = Date.parse(body.startedAt);
    const completedAt = Date.parse(body.completedAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) throw new ApiError(400, 'invalid_time', 'startedAt/completedAt tidak valid.');
    if (completedAt > Date.now() + 120_000) {
      raise('future_timestamp', `${missionId} completedAt=${body.completedAt}`);
      throw new ApiError(422, 'invalid_time', 'Waktu selesai berada di masa depan.');
    }
    const durationSec = (completedAt - startedAt) / 1000;
    if (durationSec < mission.minDurationSec) {
      raise('too_fast', `${missionId} ${durationSec.toFixed(1)}s < ${mission.minDurationSec}s`);
      throw new ApiError(422, 'too_fast', 'Misi diselesaikan terlalu cepat untuk divalidasi.');
    }
    if (mission.timeLimitSec && durationSec > mission.timeLimitSec + 30) throw new ApiError(422, 'time_limit', 'Batas waktu misi terlewati.');

    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const recent = db.prepare('SELECT COUNT(*) AS n FROM mission_claims WHERE user_id = ? AND created_at > ?').get(user.id, hourAgo).n;
    if (recent >= (config.maxClaimsPerHour || 30)) {
      raise('rate_limit', `${recent} klaim/jam`);
      throw new ApiError(429, 'rate_limited', 'Terlalu banyak klaim. Coba lagi nanti.');
    }

    const period = periodKey(mission, config);
    if (db.prepare('SELECT 1 FROM mission_claims WHERE user_id = ? AND mission_id = ? AND period_key = ?').get(user.id, missionId, period)) {
      throw new ApiError(409, 'already_claimed', 'Reward misi ini sudah diklaim untuk periode ini.');
    }

    const tp = Math.round(mission.rewardTp * (mission.multiplier || 1) * (config.globalMultiplier || 1));
    const xp = mission.rewardXp;
    const at = now();
    db.prepare('INSERT INTO mission_claims (user_id, mission_id, period_key, tp, xp, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, missionId, period, tp, xp, at);
    const expiresAt = new Date(Date.now() + (config.pointsExpiryDays || 365) * DAY).toISOString();
    db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, expires_at, meta_json, created_at)
      VALUES (?, ?, 'earn', ?, ?, ?, ?, ?, ?)`).run(user.id, tp, `mission:${mission.category}`, missionId, fullKey, expiresAt, JSON.stringify({ period, durationSec: Math.round(durationSec) }), at);
    ensurePlayer(db, user.id);
    db.prepare('UPDATE players SET xp = xp + ?, updated_at = ? WHERE user_id = ?').run(xp, at, user.id);
    let asset = null;
    if (mission.rewardAssetId) asset = grantAsset(db, user.id, mission.rewardAssetId, `mission:${missionId}`);
    return { replayed: false, missionId, tp, xp, period, asset };
  }); } finally {
    flags.forEach(([reason, detail]) => flag(db, user.id, reason, detail));
  }
}

// ---------- players & wallet ----------

function ensurePlayer(db, userId) {
  db.prepare('INSERT OR IGNORE INTO players (user_id, updated_at) VALUES (?, ?)').run(userId, now());
}

const levelFromXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

// Points expire FIFO: debits consume the oldest earn lots first; any remainder of a lot past its
// expiry date is written off once with an idempotent 'expire' transaction.
function sweepExpiry(db, userId) {
  const txs = db.prepare('SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at, id').all(userId);
  let debits = txs.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0);
  const nowIso = now();
  for (const lot of txs.filter((t) => t.amount > 0)) {
    const used = Math.min(lot.amount, debits);
    debits -= used;
    const remaining = lot.amount - used;
    if (remaining > 0 && lot.expires_at && lot.expires_at < nowIso) {
      db.prepare(`INSERT OR IGNORE INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, created_at)
        VALUES (?, ?, 'expire', 'expiry', ?, ?, ?)`).run(userId, -remaining, String(lot.id), `expire:${lot.id}`, nowIso);
    }
  }
}

function balance(db, userId) {
  sweepExpiry(db, userId);
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM point_transactions WHERE user_id = ?').get(userId).b;
}

function playerProfile(db, user) {
  ensurePlayer(db, user.id);
  const player = db.prepare('SELECT * FROM players WHERE user_id = ?').get(user.id);
  const earned = db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM point_transactions WHERE user_id = ? AND type = 'earn'").get(user.id).n;
  const claims = db.prepare('SELECT mission_id, period_key, tp, xp, created_at FROM mission_claims WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  const campaignDone = claims.filter((c) => c.period_key === 'once').map((c) => c.mission_id);
  const level = levelFromXp(player.xp);
  return {
    user: publicUser(user),
    xp: player.xp, level, xpForLevel: (level - 1) ** 2 * 100, xpForNext: level ** 2 * 100,
    twinPoints: balance(db, user.id), lifetimeEarned: earned, streak: player.streak, lastCheckin: player.last_checkin,
    completedMissions: campaignDone,
    claims: claims.slice(0, 50).map((c) => ({ missionId: c.mission_id, period: c.period_key, tp: c.tp, xp: c.xp, at: c.created_at })),
    badges: badgesFor(campaignDone, player),
    assets: db.prepare('SELECT asset_id AS assetId, level, discovered_at AS discoveredAt FROM player_assets WHERE user_id = ?').all(user.id),
  };
}

function badgesFor(done, player) {
  const has = (ids) => ids.every((id) => done.includes(id));
  const badges = [];
  if (has(['m01', 'm02', 'm03'])) badges.push({ id: 'chapter-1', name: 'The Awakening', icon: '🌅' });
  if (has(['m04', 'm05', 'm06'])) badges.push({ id: 'chapter-2', name: 'City Restorer', icon: '🏙️' });
  if (has(['m07', 'm08', 'm09'])) badges.push({ id: 'chapter-3', name: 'Survivor', icon: '🛡️' });
  if (has(['m10', 'm11', 'm12'])) badges.push({ id: 'chapter-4', name: 'Digital Twin Master', icon: '💠' });
  if (player.streak >= 7) badges.push({ id: 'streak-7', name: 'Login 7 Hari', icon: '🔥' });
  return badges;
}

function dailyCheckin(db, user) {
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  return transaction(db, () => {
    ensurePlayer(db, user.id);
    const config = getConfig(db);
    const offset = (config.timezoneOffsetMinutes ?? 420) * 60_000;
    const today = new Date(Date.now() + offset).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() + offset - DAY).toISOString().slice(0, 10);
    const player = db.prepare('SELECT * FROM players WHERE user_id = ?').get(user.id);
    if (player.last_checkin === today) return { alreadyCheckedIn: true, streak: player.streak, tp: 0 };
    const streak = player.last_checkin === yesterday ? player.streak + 1 : 1;
    const tp = Number(config.dailyCheckinTp || 0);
    db.prepare('UPDATE players SET streak = ?, last_checkin = ?, updated_at = ? WHERE user_id = ?').run(streak, today, now(), user.id);
    if (tp > 0) {
      db.prepare(`INSERT OR IGNORE INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, expires_at, created_at)
        VALUES (?, ?, 'earn', 'daily_checkin', ?, ?, ?, ?)`).run(user.id, tp, today, `checkin:${user.id}:${today}`, new Date(Date.now() + (config.pointsExpiryDays || 365) * DAY).toISOString(), now());
    }
    return { alreadyCheckedIn: false, streak, tp };
  });
}

function transactions(db, userId, limit = 50) {
  sweepExpiry(db, userId);
  return db.prepare('SELECT id, amount, type, source, ref, expires_at AS expiresAt, created_at AS createdAt FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(userId, Math.min(200, Math.max(1, limit)));
}

function leaderboard(db, period = 'all', limit = 20) {
  const since = period === 'weekly' ? new Date(Date.now() - 7 * DAY).toISOString() : '0000';
  return db.prepare(`SELECT u.id, u.full_name AS name, COALESCE(SUM(t.amount), 0) AS points, p.xp
      FROM users u JOIN point_transactions t ON t.user_id = u.id AND t.type = 'earn' AND t.created_at > ?
      LEFT JOIN players p ON p.user_id = u.id
      WHERE u.status = 'active' GROUP BY u.id ORDER BY points DESC, p.xp DESC LIMIT ?`).all(since, Math.min(100, limit))
    .map((row, index) => ({ rank: index + 1, userId: row.id, name: maskName(row.name), points: row.points, level: levelFromXp(row.xp || 0) }));
}

const maskName = (name) => {
  const parts = String(name || 'Pemain').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

// ---------- assets ----------

function upsertAsset(db, a) {
  if (!/^[a-z0-9-]{2,40}$/.test(a.id || '')) throw new ApiError(400, 'invalid_asset', 'ID aset: 2–40 karakter a-z, 0-9, -');
  if (!['common', 'rare', 'epic', 'legendary'].includes(a.rarity)) throw new ApiError(400, 'invalid_asset', 'Rarity tidak valid');
  if (!a.name || !a.category) throw new ApiError(400, 'invalid_asset', 'Nama dan kategori wajib');
  db.prepare(`INSERT INTO assets (id, name, category, rarity, icon, description, model_ref, model_url, max_level, upgrade_cost_tp, properties_json, discovery_json, placement_json, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, rarity=excluded.rarity, icon=excluded.icon, description=excluded.description,
      model_ref=excluded.model_ref, model_url=COALESCE(excluded.model_url, assets.model_url), max_level=excluded.max_level, upgrade_cost_tp=excluded.upgrade_cost_tp,
      properties_json=excluded.properties_json, discovery_json=excluded.discovery_json, placement_json=excluded.placement_json, status=excluded.status, updated_at=excluded.updated_at`)
    .run(a.id, a.name, a.category, a.rarity, a.icon ?? null, a.description || '', a.modelRef ?? null, a.modelUrl ?? null, Number(a.maxLevel || 3),
      Number(a.upgradeCostTp || 0), JSON.stringify(a.properties || {}), JSON.stringify(a.discovery || {}), JSON.stringify(a.placement || {}), a.status || 'published', now());
}

function assetRow(row) {
  return {
    id: row.id, name: row.name, category: row.category, rarity: row.rarity, icon: row.icon, description: row.description,
    modelRef: row.model_ref, modelUrl: row.model_url, maxLevel: row.max_level, upgradeCostTp: row.upgrade_cost_tp,
    properties: parse(row.properties_json, {}), discovery: parse(row.discovery_json, {}), placement: parse(row.placement_json, {}), status: row.status,
  };
}

function listAssets(db, { includeUnpublished = false } = {}) {
  return db.prepare(`SELECT * FROM assets ${includeUnpublished ? '' : "WHERE status = 'published'"} ORDER BY category, name`).all().map(assetRow);
}

function grantAsset(db, userId, assetId, source) {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
  if (!asset) return null;
  const result = db.prepare('INSERT OR IGNORE INTO player_assets (user_id, asset_id, level, source, discovered_at) VALUES (?, ?, 1, ?, ?)').run(userId, assetId, source, now());
  return { assetId, name: asset.name, new: result.changes > 0 };
}

function discoverAsset(db, user, assetId, body = {}) {
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  const row = db.prepare("SELECT * FROM assets WHERE id = ? AND status = 'published'").get(assetId);
  if (!row) throw new ApiError(404, 'asset_not_found', 'Aset tidak ditemukan.');
  const discovery = parse(row.discovery_json, {});
  if (body.objectId && Array.isArray(discovery.objects) && discovery.objects.includes(body.objectId)) {
    return grantAsset(db, user.id, assetId, `scan:${body.objectId}`);
  }
  if (discovery.mission && db.prepare("SELECT 1 FROM mission_claims WHERE user_id = ? AND mission_id = ? AND period_key = 'once'").get(user.id, discovery.mission)) {
    return grantAsset(db, user.id, assetId, `mission:${discovery.mission}`);
  }
  throw new ApiError(422, 'not_discoverable', 'Syarat penemuan aset belum terpenuhi.');
}

function upgradeAsset(db, user, assetId, body = {}) {
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  const key = String(body.idempotencyKey || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw new ApiError(400, 'invalid_key', 'idempotencyKey wajib.');
  return transaction(db, () => {
    const fullKey = `upgrade:${user.id}:${key}`;
    if (db.prepare('SELECT 1 FROM point_transactions WHERE idempotency_key = ?').get(fullKey)) {
      return { replayed: true, ...db.prepare('SELECT level FROM player_assets WHERE user_id = ? AND asset_id = ?').get(user.id, assetId) };
    }
    const owned = db.prepare('SELECT * FROM player_assets WHERE user_id = ? AND asset_id = ?').get(user.id, assetId);
    if (!owned) throw new ApiError(422, 'not_owned', 'Aset belum dimiliki.');
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    if (owned.level >= asset.max_level) throw new ApiError(422, 'max_level', 'Aset sudah level maksimal.');
    const cost = asset.upgrade_cost_tp * owned.level;
    if (balance(db, user.id) < cost) throw new ApiError(422, 'insufficient_points', `Butuh ${cost} TP.`);
    db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, created_at) VALUES (?, ?, 'spend', 'asset_upgrade', ?, ?, ?)`)
      .run(user.id, -cost, assetId, fullKey, now());
    db.prepare('UPDATE player_assets SET level = level + 1 WHERE user_id = ? AND asset_id = ?').run(user.id, assetId);
    return { replayed: false, assetId, level: owned.level + 1, cost };
  });
}

// ---------- store & redemption ----------

function upsertProduct(db, p) {
  if (!/^[a-z0-9-]{2,40}$/.test(p.id || '')) throw new ApiError(400, 'invalid_product', 'ID produk: 2–40 karakter a-z, 0-9, -');
  if (!['digital', 'merch'].includes(p.category) || !['voucher', 'merch'].includes(p.kind)) throw new ApiError(400, 'invalid_product', 'Kategori/jenis tidak valid');
  const price = Number(p.priceTp);
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) throw new ApiError(400, 'invalid_product', 'Harga TP harus 1–1.000.000');
  const stock = Number(p.stock || 0);
  if (!Number.isInteger(stock) || stock < 0) throw new ApiError(400, 'invalid_product', 'Stok harus bilangan bulat ≥ 0');
  db.prepare(`INSERT INTO products (id, name, category, kind, icon, image_url, description, price_tp, stock, redemption_limit, delivery_info, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, kind=excluded.kind, icon=excluded.icon, image_url=excluded.image_url,
      description=excluded.description, price_tp=excluded.price_tp, stock=excluded.stock, redemption_limit=excluded.redemption_limit,
      delivery_info=excluded.delivery_info, status=excluded.status, updated_at=excluded.updated_at`)
    .run(p.id, String(p.name), p.category, p.kind, p.icon ?? null, p.imageUrl ?? null, p.description || '', price, stock,
      Number(p.redemptionLimit || 1), p.deliveryInfo || '', p.status || 'active', now());
}

function listProducts(db, { includeInactive = false } = {}) {
  const rows = db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM vouchers v WHERE v.product_id = p.id AND v.status = 'available') AS voucher_stock
    FROM products p ${includeInactive ? '' : "WHERE p.status = 'active'"} ORDER BY p.category, p.price_tp`).all();
  return rows.map((row) => {
    const stock = row.kind === 'voucher' ? row.voucher_stock : row.stock;
    return {
      id: row.id, name: row.name, category: row.category, kind: row.kind, icon: row.icon, imageUrl: row.image_url, description: row.description,
      priceTp: row.price_tp, stock, redemptionLimit: row.redemption_limit, deliveryInfo: row.delivery_info, status: row.status,
      availability: row.status !== 'active' ? 'inactive' : stock > 0 ? 'available' : 'out_of_stock',
    };
  });
}

function validateDelivery(delivery) {
  const d = delivery || {};
  const name = String(d.name || '').trim();
  const phone = String(d.phone || '').trim();
  const address = String(d.address || '').trim();
  if (name.length < 2 || name.length > 80) throw new ApiError(400, 'invalid_delivery', 'Nama penerima wajib.');
  if (!/^\+?[0-9 -]{8,20}$/.test(phone)) throw new ApiError(400, 'invalid_delivery', 'Nomor telepon tidak valid.');
  if (address.length < 10 || address.length > 300) throw new ApiError(400, 'invalid_delivery', 'Alamat lengkap wajib (min 10 karakter).');
  return { name, phone, address };
}

function redeem(db, user, body = {}) {
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  const key = String(body.idempotencyKey || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw new ApiError(400, 'invalid_key', 'idempotencyKey wajib.');
  const fullKey = `redeem:${user.id}:${key}`;
  return transaction(db, () => {
    const existing = db.prepare('SELECT * FROM redemptions WHERE idempotency_key = ?').get(fullKey);
    if (existing) return redemptionRow(existing);
    const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").get(body.productId);
    if (!product) throw new ApiError(404, 'product_not_found', 'Produk tidak tersedia.');
    const used = db.prepare("SELECT COUNT(*) AS n FROM redemptions WHERE user_id = ? AND product_id = ? AND status != 'CANCELLED'").get(user.id, product.id).n;
    if (used >= product.redemption_limit) throw new ApiError(422, 'limit_reached', 'Batas penukaran produk ini sudah tercapai.');
    const delivery = product.kind === 'merch' ? validateDelivery(body.delivery) : {};
    let voucher = null;
    if (product.kind === 'voucher') {
      voucher = db.prepare("SELECT * FROM vouchers WHERE product_id = ? AND status = 'available' ORDER BY id LIMIT 1").get(product.id);
      if (!voucher) throw new ApiError(422, 'out_of_stock', 'Stok voucher habis.');
    } else if (product.stock < 1) {
      throw new ApiError(422, 'out_of_stock', 'Stok merchandise habis.');
    }
    const points = balance(db, user.id);
    if (points < product.price_tp) throw new ApiError(422, 'insufficient_points', `Twin Points tidak cukup (butuh ${product.price_tp}, saldo ${points}).`);

    const config = getConfig(db);
    const openFlags = db.prepare('SELECT COUNT(*) AS n FROM fraud_flags WHERE user_id = ? AND resolved = 0').get(user.id).n;
    const needsReview = openFlags >= (config.fraudReviewThreshold || 3);
    const id = newId('rdm');
    const reference = `TWN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const at = now();
    // Under review the voucher stays reserved but its code is only revealed after an admin confirms.
    const status = needsReview ? 'PENDING' : product.kind === 'voucher' ? 'REDEEMED' : 'CONFIRMED';
    const history = [{ status: 'PENDING', at }, ...(needsReview ? [] : [{ status, at }])];
    db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, created_at) VALUES (?, ?, 'spend', 'redemption', ?, ?, ?)`)
      .run(user.id, -product.price_tp, id, fullKey, at);
    if (voucher) db.prepare("UPDATE vouchers SET status = 'assigned', redemption_id = ? WHERE id = ?").run(id, voucher.id);
    else db.prepare('UPDATE products SET stock = stock - 1, updated_at = ? WHERE id = ?').run(at, product.id);
    db.prepare(`INSERT INTO redemptions (id, user_id, product_id, price_tp, status, reference, voucher_code, delivery_json, history_json, idempotency_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, user.id, product.id, product.price_tp, status, reference, voucher ? voucher.code : null, JSON.stringify(delivery), JSON.stringify(history), fullKey, at, at);
    return redemptionRow(db.prepare('SELECT * FROM redemptions WHERE id = ?').get(id));
  });
}

function redemptionRow(row, { revealCode = true } = {}) {
  return {
    id: row.id, userId: row.user_id, productId: row.product_id, priceTp: row.price_tp, status: row.status, reference: row.reference,
    voucherCode: revealCode && row.status === 'REDEEMED' ? row.voucher_code : null,
    delivery: parse(row.delivery_json, {}), history: parse(row.history_json, []), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function listRedemptions(db, userId) {
  const products = Object.fromEntries(db.prepare('SELECT id, name, icon FROM products').all().map((p) => [p.id, p]));
  const rows = userId
    ? db.prepare('SELECT * FROM redemptions WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    : db.prepare('SELECT * FROM redemptions ORDER BY created_at DESC LIMIT 500').all();
  return rows.map((row) => ({ ...redemptionRow(row), productName: products[row.product_id]?.name, productIcon: products[row.product_id]?.icon }));
}

const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'REDEEMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  REDEEMED: ['CANCELLED'], // e.g. fraud: the revealed code is voided and the points refunded
  CANCELLED: [],
};

function updateRedemptionStatus(db, actor, redemptionId, nextStatus) {
  return transaction(db, () => {
    const row = db.prepare('SELECT * FROM redemptions WHERE id = ?').get(redemptionId);
    if (!row) throw new ApiError(404, 'not_found', 'Penukaran tidak ditemukan.');
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(row.product_id);
    let target = nextStatus;
    if (row.status === 'PENDING' && target === 'CONFIRMED' && product.kind === 'voucher') target = 'REDEEMED';
    if (!TRANSITIONS[row.status]?.includes(target)) throw new ApiError(422, 'invalid_transition', `Status ${row.status} tidak bisa diubah ke ${nextStatus}.`);
    if (product.kind === 'voucher' && target !== 'REDEEMED' && target !== 'CANCELLED') throw new ApiError(422, 'invalid_transition', 'Voucher hanya bisa REDEEMED atau CANCELLED.');
    const at = now();
    if (target === 'CANCELLED') {
      db.prepare(`INSERT OR IGNORE INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, expires_at, created_at)
        VALUES (?, ?, 'refund', 'redemption_cancel', ?, ?, ?, ?)`).run(row.user_id, row.price_tp, row.id, `refund:${row.id}`, new Date(Date.now() + 365 * DAY).toISOString(), at);
      if (product.kind === 'merch') db.prepare('UPDATE products SET stock = stock + 1 WHERE id = ?').run(product.id);
      // A voucher whose code was never revealed (PENDING) goes back to the pool; a revealed one is voided.
      else db.prepare(`UPDATE vouchers SET status = ?, redemption_id = NULL WHERE redemption_id = ?`).run(row.status === 'PENDING' ? 'available' : 'void', row.id);
    }
    const history = [...parse(row.history_json, []), { status: target, at, by: actor.id }];
    db.prepare('UPDATE redemptions SET status = ?, history_json = ?, updated_at = ? WHERE id = ?').run(target, JSON.stringify(history), at, row.id);
    audit(db, actor.id, 'redemption.status', row.id, `${row.status} → ${target}`);
    return redemptionRow(db.prepare('SELECT * FROM redemptions WHERE id = ?').get(row.id));
  });
}

function generateVouchers(db, actor, productId, count, codes) {
  const product = db.prepare("SELECT * FROM products WHERE id = ? AND kind = 'voucher'").get(productId);
  if (!product) throw new ApiError(404, 'not_found', 'Produk voucher tidak ditemukan.');
  const list = Array.isArray(codes) && codes.length
    ? codes.map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z0-9-]{6,40}$/.test(c))
    : Array.from({ length: Math.min(500, Math.max(1, Number(count) || 0)) }, () => `TWV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
  if (!list.length) throw new ApiError(400, 'invalid_codes', 'Tidak ada kode valid.');
  let inserted = 0;
  transaction(db, () => {
    const stmt = db.prepare('INSERT OR IGNORE INTO vouchers (product_id, code, created_at) VALUES (?, ?, ?)');
    for (const code of list) inserted += stmt.run(productId, code, now()).changes;
  });
  audit(db, actor.id, 'voucher.generate', productId, `${inserted} kode`);
  return { inserted };
}

function validateVoucher(db, code) {
  const row = db.prepare('SELECT v.code, v.status, v.product_id AS productId, r.reference, r.status AS redemptionStatus FROM vouchers v LEFT JOIN redemptions r ON r.id = v.redemption_id WHERE v.code = ?')
    .get(String(code || '').trim().toUpperCase());
  return row || { code, status: 'unknown' };
}

// ---------- users & sessions ----------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [scheme, n, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: SCRYPT.r, p: SCRYPT.p });
  return crypto.timingSafeEqual(actual, expected);
}

const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const publicUser = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, status: u.status, createdAt: u.created_at });

function validateCredentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) throw new ApiError(400, 'invalid_email', 'Email tidak valid.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) throw new ApiError(400, 'invalid_password', 'Password minimal 8 karakter.');
}

function register(db, { email, password, fullName }) {
  const normalized = normalizeEmail(email);
  validateCredentials(normalized, password);
  const name = String(fullName || '').trim().slice(0, 80) || normalized.split('@')[0];
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalized)) throw new ApiError(409, 'email_taken', 'Email sudah terdaftar.');
  const id = newId('usr');
  db.prepare('INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, normalized, name, hashPassword(password), now());
  ensurePlayer(db, id);
  return createSession(db, db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

function login(db, { email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email));
  // Always run scrypt so response time does not reveal whether the email exists.
  const ok = verifyPassword(String(password || ''), user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'invalid_credentials', 'Email atau password salah.');
  if (user.status !== 'active') throw new ApiError(403, 'banned', 'Akun dibekukan.');
  return createSession(db, user);
}

function createSession(db, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').run(user.id, now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, user.id, now(), new Date(Date.now() + 30 * DAY).toISOString());
  return { token, user: publicUser(user) };
}

function userFromToken(db, token) {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').get(tokenHash, now()) || null;
}

function logout(db, token) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(crypto.createHash('sha256').update(String(token || '')).digest('hex'));
}

function bootstrapAdmin(db, email, password) {
  if (!email || !password) return null;
  const normalized = normalizeEmail(email);
  validateCredentials(normalized, password);
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
  if (existing) {
    // Always reset to the operator-supplied password so a pre-existing account's old password cannot become an admin login.
    db.prepare("UPDATE users SET role = 'admin', status = 'active', password_hash = ? WHERE id = ?").run(hashPassword(password), existing.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    return existing.id;
  }
  const id = newId('usr');
  db.prepare("INSERT INTO users (id, email, full_name, password_hash, role, created_at) VALUES (?, ?, 'Administrator', ?, 'admin', ?)").run(id, normalized, hashPassword(password), now());
  ensurePlayer(db, id);
  return id;
}

// ---------- admin ----------

function audit(db, actorId, action, target, detail) {
  db.prepare('INSERT INTO audit_log (actor_id, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?)').run(actorId, action, target ?? null, detail ?? null, now());
}

function adminOverview(db) {
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const dayAgo = new Date(Date.now() - DAY).toISOString();
  return {
    players: one('SELECT COUNT(*) AS n FROM users').n,
    activeToday: one('SELECT COUNT(DISTINCT user_id) AS n FROM mission_claims WHERE created_at > ?', dayAgo).n,
    pointsIssued: one("SELECT COALESCE(SUM(amount),0) AS n FROM point_transactions WHERE type = 'earn'").n,
    pointsSpent: -one("SELECT COALESCE(SUM(amount),0) AS n FROM point_transactions WHERE type = 'spend'").n,
    claims: one('SELECT COUNT(*) AS n FROM mission_claims').n,
    redemptionsPending: one("SELECT COUNT(*) AS n FROM redemptions WHERE status IN ('PENDING','CONFIRMED','PROCESSING')").n,
    openFraudFlags: one('SELECT COUNT(*) AS n FROM fraud_flags WHERE resolved = 0').n,
    missionsPublished: one("SELECT COUNT(*) AS n FROM missions WHERE status = 'published'").n,
    topMissions: db.prepare('SELECT mission_id AS missionId, COUNT(*) AS completions FROM mission_claims GROUP BY mission_id ORDER BY completions DESC LIMIT 8').all(),
  };
}

function adminPlayers(db) {
  return db.prepare(`SELECT u.id, u.email, u.full_name AS fullName, u.role, u.status, u.created_at AS createdAt, COALESCE(p.xp,0) AS xp, COALESCE(p.streak,0) AS streak,
      (SELECT COALESCE(SUM(amount),0) FROM point_transactions t WHERE t.user_id = u.id) AS twinPoints,
      (SELECT COUNT(*) FROM fraud_flags f WHERE f.user_id = u.id AND f.resolved = 0) AS openFlags
    FROM users u LEFT JOIN players p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 500`).all();
}

function adminUpdatePlayer(db, actor, userId, changes = {}) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new ApiError(404, 'not_found', 'Pemain tidak ditemukan.');
  if (changes.role && !['player', 'admin'].includes(changes.role)) throw new ApiError(400, 'invalid_role', 'Role tidak valid.');
  if (changes.status && !['active', 'banned'].includes(changes.status)) throw new ApiError(400, 'invalid_status', 'Status tidak valid.');
  if (userId === actor.id && (changes.role === 'player' || changes.status === 'banned')) throw new ApiError(422, 'self_lockout', 'Tidak bisa menurunkan/membekukan akun sendiri.');
  if (changes.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(changes.role, userId);
  if (changes.status) {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(changes.status, userId);
    if (changes.status === 'banned') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
  audit(db, actor.id, 'player.update', userId, JSON.stringify(changes));
  return { ok: true };
}

function adminAdjustPoints(db, actor, userId, amount, reason) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value === 0 || Math.abs(value) > 100000) throw new ApiError(400, 'invalid_amount', 'Jumlah harus bilangan bulat bukan nol (maks 100.000).');
  if (!reason || String(reason).trim().length < 3) throw new ApiError(400, 'reason_required', 'Alasan penyesuaian wajib.');
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId)) throw new ApiError(404, 'not_found', 'Pemain tidak ditemukan.');
  db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, expires_at, meta_json, created_at) VALUES (?, ?, 'adjust', 'admin', ?, ?, ?, ?, ?)`)
    .run(userId, value, actor.id, `adjust:${newId('adj')}`, value > 0 ? new Date(Date.now() + 365 * DAY).toISOString() : null, JSON.stringify({ reason: String(reason).slice(0, 200) }), now());
  audit(db, actor.id, 'points.adjust', userId, `${value} (${reason})`);
  return { balance: balance(db, userId) };
}

function adminTransactions(db) {
  return {
    transactions: db.prepare(`SELECT t.id, t.user_id AS userId, u.email, t.amount, t.type, t.source, t.ref, t.created_at AS createdAt
      FROM point_transactions t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC, t.id DESC LIMIT 300`).all(),
    flags: db.prepare(`SELECT f.id, f.user_id AS userId, u.email, f.reason, f.detail, f.resolved, f.created_at AS createdAt
      FROM fraud_flags f JOIN users u ON u.id = f.user_id ORDER BY f.resolved, f.created_at DESC LIMIT 300`).all(),
  };
}

function resolveFlag(db, actor, flagId) {
  db.prepare('UPDATE fraud_flags SET resolved = 1 WHERE id = ?').run(flagId);
  audit(db, actor.id, 'fraud.resolve', String(flagId));
  return { ok: true };
}

module.exports = {
  ApiError, seedContent, getConfig, updateConfig,
  listMissions, upsertMission, claimMission, periodKey, isScheduled,
  playerProfile, dailyCheckin, balance, transactions, leaderboard, levelFromXp,
  listAssets, upsertAsset, discoverAsset, upgradeAsset, grantAsset,
  listProducts, upsertProduct, redeem, listRedemptions, updateRedemptionStatus, generateVouchers, validateVoucher,
  register, login, logout, userFromToken, bootstrapAdmin, publicUser,
  audit, adminOverview, adminPlayers, adminUpdatePlayer, adminAdjustPoints, adminTransactions, resolveFlag,
};
