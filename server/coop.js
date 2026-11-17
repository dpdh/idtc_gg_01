'use strict';
// Co-op multiplayer rooms ("join bareng"): pemain membuat ruangan untuk sebuah misi, membagikan kode
// 6 karakter, lalu progres objektif dilaporkan ke server dan digabungkan. Setelah semua objektif
// terpenuhi, setiap anggota bisa mengklaim reward TP/XP satu kali (idempoten).
const crypto = require('node:crypto');
const game = require('./game');
const { transaction, now } = require('./db');

const { ApiError } = game;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const COMPLETED_TTL_MS = 60 * 60 * 1000;
const DAY = 86400000;

const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const upper = (code) => String(code || '').trim().toUpperCase();
const makeCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]).join('');
const maskName = (name) => {
  const text = String(name || 'Pemain').trim();
  const parts = text.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : text.slice(0, 14);
};

function purgeStale(db) {
  const nowMs = Date.now();
  db.prepare("UPDATE coop_rooms SET status = 'closed' WHERE status = 'open' AND created_at < ?").run(new Date(nowMs - ROOM_TTL_MS).toISOString());
  db.prepare("UPDATE coop_rooms SET status = 'closed' WHERE status = 'completed' AND updated_at < ?").run(new Date(nowMs - COMPLETED_TTL_MS).toISOString());
}

function missionFor(db, missionId) {
  const row = db.prepare("SELECT * FROM missions WHERE id = ? AND status = 'published'").get(String(missionId || ''));
  if (!row) throw new ApiError(404, 'mission_not_found', 'Misi tidak ditemukan atau belum dipublikasikan.');
  const objectives = parse(row.objectives_json, []);
  if (!objectives.length) throw new ApiError(422, 'mission_invalid', 'Misi ini tidak punya objektif.');
  return { row, objectives };
}

function roomRow(db, code) {
  purgeStale(db);
  const row = db.prepare('SELECT * FROM coop_rooms WHERE code = ?').get(upper(code));
  if (!row) throw new ApiError(404, 'room_not_found', 'Kode ruangan tidak ditemukan.');
  return row;
}

const memberRow = (db, roomId, userId) => db.prepare('SELECT * FROM coop_members WHERE room_id = ? AND user_id = ?').get(roomId, userId) || null;

function roomView(db, row, userId) {
  const objectives = parse(row.objectives_json, []);
  const totals = parse(row.totals_json, []);
  const members = db.prepare('SELECT user_id AS userId, name, discipline, contribution, claimed, joined_at AS joinedAt FROM coop_members WHERE room_id = ? ORDER BY joined_at').all(row.id);
  const me = members.find((m) => m.userId === userId) || null;
  return {
    id: row.id,
    code: row.code,
    missionId: row.mission_id,
    status: row.status,
    maxPlayers: row.max_players,
    rewardTp: row.reward_tp,
    rewardXp: row.reward_xp,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    objectives: objectives.map((objective, index) => ({
      event: objective.event,
      target: objective.target || null,
      label: objective.label || objective.event,
      count: objective.count,
      progress: Math.min(objective.count, totals[index] || 0),
    })),
    members: members.map((m) => ({ ...m, name: maskName(m.name) })),
    isMember: !!me,
    myContribution: me?.contribution || 0,
    canClaim: !!me && !me.claimed && row.status === 'completed',
    claimed: !!me?.claimed,
  };
}

function createRoom(db, user, body = {}) {
  const { row: mission, objectives } = missionFor(db, body.missionId);
  const maxPlayers = Math.max(2, Math.min(MAX_PLAYERS, Number(body.maxPlayers) || 4));
  const discipline = String(body.discipline || 'civil').slice(0, 32);
  let code = makeCode();
  for (let i = 0; i < 5 && db.prepare('SELECT 1 FROM coop_rooms WHERE code = ?').get(code); i += 1) code = makeCode();
  const id = newId('coop');
  const at = now();
  transaction(db, () => {
    db.prepare(`INSERT INTO coop_rooms (id, code, mission_id, max_players, status, objectives_json, totals_json, reward_tp, reward_xp, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, code, mission.id, maxPlayers, JSON.stringify(objectives), JSON.stringify(objectives.map(() => 0)), Number(mission.reward_tp) || 0, Number(mission.reward_xp) || 0, user.id, at, at);
    db.prepare(`INSERT INTO coop_members (room_id, user_id, name, discipline, contribution, claimed, joined_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?)`).run(id, user.id, user.full_name, discipline, at, at);
  });
  return roomView(db, db.prepare('SELECT * FROM coop_rooms WHERE id = ?').get(id), user.id);
}

function joinRoom(db, user, code, body = {}) {
  const row = roomRow(db, code);
  if (row.status !== 'open') throw new ApiError(409, 'room_closed', 'Ruangan sudah selesai/ditutup.');
  const count = db.prepare('SELECT COUNT(*) AS n FROM coop_members WHERE room_id = ?').get(row.id).n;
  if (!memberRow(db, row.id, user.id) && count >= row.max_players) throw new ApiError(409, 'room_full', 'Ruangan sudah penuh.');
  const at = now();
  db.prepare(`INSERT INTO coop_members (room_id, user_id, name, discipline, contribution, claimed, joined_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 0, ?, ?)
    ON CONFLICT(room_id, user_id) DO UPDATE SET name = excluded.name, discipline = excluded.discipline, updated_at = excluded.updated_at`)
    .run(row.id, user.id, user.full_name, String(body.discipline || 'civil').slice(0, 32), at, at);
  return roomView(db, row, user.id);
}

function awardMember(db, row, member) {
  const key = `coop:${row.id}:${member.user_id}`;
  if (db.prepare('SELECT 1 FROM point_transactions WHERE idempotency_key = ?').get(key)) return { tp: 0, xp: 0, replayed: true };
  const at = now();
  if (row.reward_tp > 0) {
    db.prepare(`INSERT INTO point_transactions (user_id, amount, type, source, ref, idempotency_key, expires_at, meta_json, created_at)
      VALUES (?, ?, 'earn', 'coop_mission', ?, ?, ?, ?, ?)`).run(member.user_id, row.reward_tp, row.code, key, new Date(Date.now() + 365 * DAY).toISOString(), JSON.stringify({ missionId: row.mission_id, roomId: row.id }), at);
  }
  db.prepare('INSERT OR IGNORE INTO players (user_id, updated_at) VALUES (?, ?)').run(member.user_id, at);
  db.prepare('UPDATE players SET xp = xp + ?, updated_at = ? WHERE user_id = ?').run(row.reward_xp, at, member.user_id);
  db.prepare('UPDATE coop_members SET claimed = 1, updated_at = ? WHERE room_id = ? AND user_id = ?').run(at, row.id, member.user_id);
  return { tp: row.reward_tp, xp: row.reward_xp, replayed: false };
}

function reportProgress(db, user, code, body = {}) {
  const row = roomRow(db, code);
  const member = memberRow(db, row.id, user.id);
  if (!member) throw new ApiError(403, 'not_member', 'Anda belum bergabung di ruangan ini.');
  if (row.status === 'closed') throw new ApiError(409, 'room_closed', 'Ruangan sudah ditutup.');
  const event = String(body.event || '');
  const amount = Math.max(1, Math.min(50, Number(body.amount) || 1));
  const objectives = parse(row.objectives_json, []);
  const totals = parse(row.totals_json, []);
  let matched = false;
  objectives.forEach((objective, index) => {
    if (objective.event !== event) return;
    if (objective.target && body.target && objective.target !== body.target) return;
    matched = true;
    totals[index] = Math.min(objective.count, (totals[index] || 0) + amount);
  });
  if (!matched) return roomView(db, row, user.id);
  const completed = objectives.every((objective, index) => (totals[index] || 0) >= objective.count);
  const at = now();
  db.prepare('UPDATE coop_rooms SET totals_json = ?, status = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(totals), completed ? 'completed' : row.status, at, row.id);
  db.prepare('UPDATE coop_members SET contribution = contribution + ?, updated_at = ? WHERE room_id = ? AND user_id = ?').run(amount, at, row.id, user.id);
  return roomView(db, db.prepare('SELECT * FROM coop_rooms WHERE id = ?').get(row.id), user.id);
}

function claimRoom(db, user, code) {
  const row = roomRow(db, code);
  const member = memberRow(db, row.id, user.id);
  if (!member) throw new ApiError(403, 'not_member', 'Anda belum bergabung di ruangan ini.');
  if (row.status !== 'completed') throw new ApiError(409, 'not_completed', 'Misi tim belum selesai.');
  const result = transaction(db, () => awardMember(db, row, member));
  game.audit(db, user.id, 'coop.claim', row.code);
  return { ...result, room: roomView(db, db.prepare('SELECT * FROM coop_rooms WHERE id = ?').get(row.id), user.id) };
}

function leaveRoom(db, user, code) {
  const row = roomRow(db, code);
  db.prepare('DELETE FROM coop_members WHERE room_id = ? AND user_id = ?').run(row.id, user.id);
  const left = db.prepare('SELECT COUNT(*) AS n FROM coop_members WHERE room_id = ?').get(row.id).n;
  if (!left) db.prepare("UPDATE coop_rooms SET status = 'closed', updated_at = ? WHERE id = ?").run(now(), row.id);
  return { ok: true };
}

function myRooms(db, user) {
  purgeStale(db);
  const rows = db.prepare(`SELECT r.* FROM coop_rooms r JOIN coop_members m ON m.room_id = r.id
    WHERE m.user_id = ? AND r.status IN ('open','completed') ORDER BY r.updated_at DESC LIMIT 5`).all(user.id);
  return rows.map((row) => roomView(db, row, user.id));
}

// A single room by code; non-members may look it up to preview before joining.
function getRoom(db, user, code) {
  return roomView(db, roomRow(db, code), user.id);
}

function coopLeaderboard(db, limit = 20) {
  return db.prepare(`SELECT u.id, u.full_name AS name, SUM(m.contribution) AS points, COUNT(DISTINCT m.room_id) AS rooms, MAX(m.discipline) AS discipline
      FROM coop_members m JOIN users u ON u.id = m.user_id
      WHERE u.status = 'active' GROUP BY u.id ORDER BY points DESC, rooms DESC LIMIT ?`)
    .all(Math.min(100, Math.max(1, Number(limit) || 20)))
    .map((row, index) => ({ rank: index + 1, userId: row.id, name: maskName(row.name), points: row.points, rooms: row.rooms, discipline: row.discipline }));
}

module.exports = { createRoom, joinRoom, reportProgress, claimRoom, leaveRoom, myRooms, getRoom, coopLeaderboard, MAX_PLAYERS };
