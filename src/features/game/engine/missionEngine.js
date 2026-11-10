// Data-driven mission engine. Pure functions: (state, definitions, event) -> new state.
// Statuses: LOCKED, AVAILABLE, ACTIVE, COMPLETED, FAILED.

export const STATUS = { LOCKED: 'LOCKED', AVAILABLE: 'AVAILABLE', ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', FAILED: 'FAILED' };
const DAY = 86400000;
const TZ_OFFSET_MIN = 420; // WIB, mirrors the server config default

// Must match server/game.js periodKey so a local completion maps to the same server claim period.
export function periodKeyFor(mission, now = Date.now()) {
  const local = new Date(now + TZ_OFFSET_MIN * 60000);
  if (mission.category === 'daily') return local.toISOString().slice(0, 10);
  if (mission.category === 'weekly') {
    const day = (local.getUTCDay() + 6) % 7;
    return `W${new Date(local.getTime() - day * DAY).toISOString().slice(0, 10)}`;
  }
  if (mission.category === 'special') return `event:${mission.startsAt || 'always'}`;
  return 'once';
}

export const isScheduled = (mission, now = Date.now()) => !(mission.startsAt && now < Date.parse(mission.startsAt)) && !(mission.endsAt && now > Date.parse(mission.endsAt));

// Missions with a timer or a storm wait for the player to press Start; others begin as soon as they unlock.
export const needsManualStart = (mission) => !!(mission.timeLimitSec || mission.triggersStorm);

export function createMissionState() {
  return { entries: {} };
}

function currentEntry(state, mission, now) {
  const entry = state.entries[mission.id];
  return entry && entry.periodKey === periodKeyFor(mission, now) ? entry : null;
}

export function completedCampaignIds(state, serverCompleted = []) {
  const ids = new Set(serverCompleted);
  Object.entries(state.entries).forEach(([id, entry]) => { if (entry.periodKey === 'once' && entry.status === STATUS.COMPLETED) ids.add(id); });
  return ids;
}

export function missionStatus(state, mission, completed, now = Date.now()) {
  if (mission.category === 'campaign' && completed.has(mission.id)) return { status: STATUS.COMPLETED };
  if (mission.requiresTeam) return { status: STATUS.LOCKED, reason: 'Butuh tim 3–5 pemain (Phase 2)' };
  if (!isScheduled(mission, now)) {
    const upcoming = mission.startsAt && now < Date.parse(mission.startsAt);
    return { status: STATUS.LOCKED, reason: upcoming ? `Dimulai ${new Date(mission.startsAt).toLocaleDateString('id-ID')}` : 'Event telah berakhir' };
  }
  const missing = (mission.requires || []).filter((id) => !completed.has(id));
  if (missing.length) return { status: STATUS.LOCKED, reason: `Selesaikan ${missing.join(', ')}` };
  const entry = currentEntry(state, mission, now);
  if (!entry) return { status: STATUS.AVAILABLE };
  return { status: entry.status, entry };
}

function freshEntry(mission, now) {
  return {
    status: STATUS.ACTIVE,
    periodKey: periodKeyFor(mission, now),
    progress: mission.objectives.map(() => 0),
    seen: mission.objectives.map(() => []),
    startedAt: now,
    completedAt: null,
    failReason: null,
  };
}

export function startMission(state, mission, now = Date.now()) {
  return { ...state, entries: { ...state.entries, [mission.id]: freshEntry(mission, now) } };
}

export function failMission(state, missionId, reason) {
  const entry = state.entries[missionId];
  if (!entry || entry.status !== STATUS.ACTIVE) return state;
  return { ...state, entries: { ...state.entries, [missionId]: { ...entry, status: STATUS.FAILED, failReason: reason } } };
}

// Starts every unlocked mission that does not need an explicit Start press.
export function autoActivate(state, missions, completed, now = Date.now()) {
  let next = state;
  for (const mission of missions) {
    if (needsManualStart(mission)) continue;
    if (missionStatus(next, mission, completed, now).status === STATUS.AVAILABLE) next = startMission(next, mission, now);
  }
  return next;
}

const matches = (objective, event) => objective.event === event.type && (!objective.target || objective.target === event.target);

/**
 * event: { type, id?, target?, amount? }
 *  - id: unique source (zone id, object id) used for `unique` objectives
 *  - target: object type, for objectives restricted to one type (e.g. air_quality)
 * Returns { state, completed: [missionIds] }.
 */
export function applyEvent(state, missions, event, now = Date.now()) {
  const completed = [];
  let entries = state.entries;
  for (const mission of missions) {
    const entry = currentEntry({ entries }, mission, now);
    if (!entry || entry.status !== STATUS.ACTIVE) continue;
    let changed = false;
    const progress = [...entry.progress];
    const seen = entry.seen.map((list) => [...list]);
    mission.objectives.forEach((objective, index) => {
      if (!matches(objective, event) || progress[index] >= objective.count) return;
      if (objective.unique) {
        if (!event.id || seen[index].includes(event.id)) return;
        seen[index].push(event.id);
        progress[index] += 1;
      } else {
        progress[index] = Math.min(objective.count, progress[index] + (event.amount || 1));
      }
      changed = true;
    });
    if (!changed) continue;
    const done = mission.objectives.every((objective, index) => progress[index] >= objective.count);
    entries = { ...entries, [mission.id]: { ...entry, progress, seen, status: done ? STATUS.COMPLETED : STATUS.ACTIVE, completedAt: done ? now : null } };
    if (done) completed.push(mission.id);
  }
  return { state: entries === state.entries ? state : { ...state, entries }, completed };
}

// Fails ACTIVE missions whose time limit has run out.
export function checkTimeLimits(state, missions, now = Date.now()) {
  let next = state;
  const failed = [];
  for (const mission of missions) {
    if (!mission.timeLimitSec) continue;
    const entry = currentEntry(next, mission, now);
    if (entry?.status === STATUS.ACTIVE && now - entry.startedAt > mission.timeLimitSec * 1000) {
      next = failMission(next, mission.id, 'Waktu habis');
      failed.push(mission.id);
    }
  }
  return { state: next, failed };
}

export function remainingSeconds(mission, entry, now = Date.now()) {
  if (!mission.timeLimitSec || !entry || entry.status !== STATUS.ACTIVE) return null;
  return Math.max(0, Math.ceil(mission.timeLimitSec - (now - entry.startedAt) / 1000));
}

export function progressRatio(mission, entry) {
  if (!entry) return 0;
  const total = mission.objectives.reduce((sum, o) => sum + o.count, 0);
  const done = mission.objectives.reduce((sum, o, i) => sum + Math.min(o.count, entry.progress[i] || 0), 0);
  return total ? done / total : 0;
}

export const DIFFICULTY_LABEL = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit', expert: 'Ahli', legendary: 'Legendaris' };
export const CATEGORY_LABEL = { campaign: 'Campaign', daily: 'Harian', weekly: 'Mingguan', special: 'Event Spesial' };
