// World rules for the Monas survival map: zones, proximity, survival stat decay, day/night and weather.
// All hazards here are fictional game mechanics, not real safety conditions at Monas.
import content from '../data/gameContent.json';

export const ZONES = content.zones;
export const SAFE_ZONES = content.safeZones;
export const OBJECT_TYPES = content.objectTypes;
export const WORLD_OBJECTS = content.objects;
export const INTERACT_RADIUS = 2.6;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function zoneAt(position) {
  let best = null;
  for (const zone of ZONES) {
    if (dist(position, zone.center) <= zone.radius && (!best || zone.radius < best.radius)) best = zone;
  }
  return best;
}

export const safeZoneAt = (position) => SAFE_ZONES.find((zone) => dist(position, zone.center) <= zone.radius) || null;

/**
 * Nearest object the player can use right now.
 * objectState[id] = { scanned, done, synced, lastUsed }
 */
export function nearestInteractable(position, objectState, now = Date.now(), radius = INTERACT_RADIUS) {
  let best = null;
  for (const object of WORLD_OBJECTS) {
    const d = dist(position, object.position);
    if (d > radius || (best && d >= best.distance)) continue;
    const type = OBJECT_TYPES[object.type];
    const state = objectState[object.id] || {};
    if (['activate', 'identify', 'rescue', 'challenge', 'treasure'].includes(type.action) && state.done) continue;
    best = { object, type, state, distance: d, cooling: cooldownLeft(object, state, now) };
  }
  return best;
}

export function cooldownLeft(object, state, now = Date.now()) {
  const type = OBJECT_TYPES[object.type];
  if (!type.cooldownSec || !state.lastUsed) return 0;
  return Math.max(0, Math.ceil(type.cooldownSec - (now - state.lastUsed) / 1000));
}

export const clamp = (value) => Math.max(0, Math.min(100, value));

/**
 * Per-second survival update for the new indicators.
 * stats: { health, hydration, connection, supply }
 */
export function tickSurvival(stats, { running = false, moving = false, zone = null, safe = false, storm = false, dtSec = 1, healBonus = 0 }) {
  let { health, hydration, connection } = stats;
  hydration -= (0.06 + (moving ? 0.04 : 0) + (running ? 0.08 : 0) + (storm ? 0.05 : 0)) * dtSec;
  if (hydration <= 0) health -= 0.5 * dtSec;
  if (storm && !safe) health -= 0.45 * dtSec;
  if (zone?.hazard && !safe) health -= 0.3 * dtSec;
  if (safe) health += 0.6 * (1 + Math.max(0, Number(healBonus) || 0)) * dtSec;
  if (zone?.interference) connection -= 1.4 * dtSec;
  else if (!storm) connection += 0.12 * dtSec;
  else connection -= 0.2 * dtSec;
  return { ...stats, health: clamp(health), hydration: clamp(hydration), connection: clamp(connection) };
}

// One real minute = one game hour; a full day takes 24 minutes. Starts at 08:00.
export const timeOfDayAt = (seconds) => (8 + seconds / 60) % 24;

export function lightingFor(hour, weather) {
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)); // 0 at night, 1 at noon
  const dim = weather === 'storm' ? 0.35 : weather === 'rain' ? 0.6 : weather === 'cloudy' ? 0.8 : 1;
  const level = (0.25 + daylight * 0.75) * dim;
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const sky = [mix(14, 141, level), mix(22, 181, level), mix(44, 193, level)];
  const fogNear = weather === 'storm' ? 12 : weather === 'rain' ? 22 : 35;
  const fogFar = weather === 'storm' ? 60 : weather === 'rain' ? 95 : 140;
  return { ambient: 0.35 + level * 1.15, sun: 0.2 + level * 2.1, sky: `rgb(${sky.join(',')})`, fogNear, fogFar, isNight: daylight < 0.15 };
}

const WEATHER_CYCLE = ['clear', 'clear', 'cloudy', 'clear', 'rain', 'cloudy'];
// Ambient weather changes every 3 game minutes; the storm only happens during storm missions.
export const ambientWeatherAt = (seconds) => WEATHER_CYCLE[Math.floor(seconds / 180) % WEATHER_CYCLE.length];
export const WEATHER_LABEL = { clear: 'Cerah', cloudy: 'Berawan', rain: 'Hujan', storm: 'BADAI (simulasi)' };
