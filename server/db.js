'use strict';
// SQLite persistence for the TWINI game backend (Node's built-in node:sqlite, no extra dependencies).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const MIGRATIONS = [
  {
    version: 1,
    name: 'init',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE TABLE players (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        xp INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        last_checkin TEXT,
        character_id TEXT,
        stats_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );
      CREATE TABLE missions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('campaign','daily','weekly','special')),
        chapter INTEGER,
        chapter_title TEXT,
        sort INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        difficulty TEXT NOT NULL DEFAULT 'easy',
        start_zone TEXT,
        objectives_json TEXT NOT NULL,
        time_limit_sec INTEGER NOT NULL DEFAULT 0,
        min_duration_sec INTEGER NOT NULL DEFAULT 0,
        reward_tp INTEGER NOT NULL DEFAULT 0,
        reward_xp INTEGER NOT NULL DEFAULT 0,
        multiplier REAL NOT NULL DEFAULT 1,
        requires_json TEXT NOT NULL DEFAULT '[]',
        reward_asset_id TEXT,
        triggers_storm INTEGER NOT NULL DEFAULT 0,
        requires_team INTEGER NOT NULL DEFAULT 0,
        starts_at TEXT,
        ends_at TEXT,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE mission_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mission_id TEXT NOT NULL,
        period_key TEXT NOT NULL,
        tp INTEGER NOT NULL,
        xp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, mission_id, period_key)
      );
      CREATE TABLE point_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('earn','spend','refund','expire','adjust')),
        source TEXT NOT NULL,
        ref TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        expires_at TEXT,
        meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_tx_user ON point_transactions(user_id, created_at);
      CREATE TABLE fraud_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        detail TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        rarity TEXT NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
        icon TEXT,
        description TEXT NOT NULL DEFAULT '',
        model_ref TEXT,
        model_url TEXT,
        max_level INTEGER NOT NULL DEFAULT 3,
        upgrade_cost_tp INTEGER NOT NULL DEFAULT 0,
        properties_json TEXT NOT NULL DEFAULT '{}',
        discovery_json TEXT NOT NULL DEFAULT '{}',
        placement_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE player_assets (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        level INTEGER NOT NULL DEFAULT 1,
        source TEXT,
        discovered_at TEXT NOT NULL,
        PRIMARY KEY (user_id, asset_id)
      );
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('digital','merch')),
        kind TEXT NOT NULL CHECK (kind IN ('voucher','merch')),
        icon TEXT,
        image_url TEXT,
        description TEXT NOT NULL DEFAULT '',
        price_tp INTEGER NOT NULL CHECK (price_tp > 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        redemption_limit INTEGER NOT NULL DEFAULT 1,
        delivery_info TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','void')),
        redemption_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        price_tp INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','REDEEMED','CANCELLED')),
        reference TEXT NOT NULL UNIQUE,
        voucher_code TEXT,
        delivery_json TEXT NOT NULL DEFAULT '{}',
        history_json TEXT NOT NULL DEFAULT '[]',
        idempotency_key TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE config (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT,
        action TEXT NOT NULL,
        target TEXT,
        detail TEXT,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'user_management_google',
    sql: `
      ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password';
      ALTER TABLE users ADD COLUMN google_sub TEXT;
      ALTER TABLE users ADD COLUMN avatar_url TEXT;
      ALTER TABLE users ADD COLUMN last_login_at TEXT;
      ALTER TABLE users ADD COLUMN status_reason TEXT;
      ALTER TABLE users ADD COLUMN updated_at TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `,
  },
  {
    version: 3,
    name: 'coop_rooms',
    sql: `
      CREATE TABLE coop_rooms (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        mission_id TEXT NOT NULL,
        max_players INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','closed')),
        objectives_json TEXT NOT NULL,
        totals_json TEXT NOT NULL DEFAULT '[]',
        reward_tp INTEGER NOT NULL DEFAULT 0,
        reward_xp INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE coop_members (
        room_id TEXT NOT NULL REFERENCES coop_rooms(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '',
        discipline TEXT NOT NULL DEFAULT 'civil',
        contribution INTEGER NOT NULL DEFAULT 0,
        claimed INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (room_id, user_id)
      );
      CREATE INDEX idx_coop_members_user ON coop_members(user_id);
      CREATE INDEX idx_coop_rooms_status ON coop_rooms(status, updated_at);
    `,
  },
];

const now = () => new Date().toISOString();

function openDatabase(file = process.env.TWINI_DB || path.join(__dirname, 'data', 'twini.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    transaction(db, () => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(migration.version, migration.name, now());
    });
  }
  return db;
}

// BEGIN IMMEDIATE takes the write lock up front so balance checks and debits cannot interleave.
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { openDatabase, transaction, now, MIGRATIONS };
