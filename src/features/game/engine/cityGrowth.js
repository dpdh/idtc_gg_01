// Pertumbuhan kota dari pembersihan wabah digital.
//
// Pemain mengumpulkan Poin Pertumbuhan (growth) setiap kali wabah dinetralkan, lalu membelanjakan
// poin itu untuk membangun aset kota pada petak bidang tanah (plot) di dalam environment. Semua
// fungsi di file ini murni (state in -> state out) supaya mudah diuji dan disimpan ke AsyncStorage.
//
// state = {
//   points: number,                 // saldo poin pertumbuhan
//   cleared: number,                // total wabah yang pernah dinetralkan
//   byKind: { [kind]: number },     // statistik per jenis wabah
//   built: { [plotId]: { buildingId, builtAt } },
// }

export const GROWTH_PLOTS = [
  { id: 'plot-park-1', zoneId: 'park', name: 'Petak Taman Utara', center: [-21, 7], size: 4.4, unlockCleared: 0 },
  { id: 'plot-smart-1', zoneId: 'smart', name: 'Petak Distrik IoT', center: [20, -18], size: 4.4, unlockCleared: 1 },
  { id: 'plot-energy-1', zoneId: 'energy', name: 'Petak Grid Energi', center: [22, 19], size: 4.4, unlockCleared: 2 },
  { id: 'plot-park-2', zoneId: 'park', name: 'Petak Taman Selatan', center: [-31, 17], size: 4.4, unlockCleared: 3 },
  { id: 'plot-water-1', zoneId: 'water', name: 'Petak Pengelolaan Air', center: [-29, -21], size: 4.4, unlockCleared: 4 },
  { id: 'plot-merdeka-1', zoneId: 'merdeka', name: 'Petak Alun-Alun', center: [-5, 21], size: 4.4, unlockCleared: 5 },
  { id: 'plot-emergency-1', zoneId: 'emergency', name: 'Petak Tanggap Darurat', center: [5, -26], size: 4.4, unlockCleared: 6 },
  { id: 'plot-gateway-1', zoneId: 'gateway', name: 'Petak Gerbang Kota', center: [5, 33], size: 4.4, unlockCleared: 8 },
];

export const BUILDING_CATALOG = [
  {
    id: 'eco_park', name: 'Taman Ekologi', icon: '🌳', kind: 'park', cost: 2, color: '#57e08a',
    benefit: { eco: 3, energy: 0, data: 0, health: 1 },
    description: 'Menyerap emisi simulasi dan memulihkan ekosistem sekitar petak.',
  },
  {
    id: 'sensor_hub', name: 'Hub Sensor', icon: '📡', kind: 'hub', cost: 3, color: '#5fd3ff',
    benefit: { eco: 0, energy: 1, data: 3, health: 0 },
    description: 'Menggabungkan telemetri IoT agar data digital twin akurat kembali.',
  },
  {
    id: 'solar_canopy', name: 'Kanopi Surya', icon: '🔆', kind: 'solar', cost: 3, color: '#ffc94d',
    benefit: { eco: 1, energy: 3, data: 0, health: 0 },
    description: 'Menyuplai energi bersih untuk grid kota pintar.',
  },
  {
    id: 'water_garden', name: 'Taman Air', icon: '💧', kind: 'water', cost: 4, color: '#4fc3ff',
    benefit: { eco: 2, energy: 0, data: 1, health: 1 },
    description: 'Filter alami dan sensor kualitas air untuk zona pengelolaan air.',
  },
  {
    id: 'vertical_farm', name: 'Pertanian Vertikal', icon: '🌱', kind: 'farm', cost: 5, color: '#8ef07a',
    benefit: { eco: 2, energy: 1, data: 0, health: 2 },
    description: 'Ketahanan pangan kota yang juga menyerap polusi simulasi.',
  },
  {
    id: 'health_post', name: 'Pos Sehat', icon: '🏥', kind: 'clinic', cost: 5, color: '#ff8e9c',
    benefit: { eco: 0, energy: 0, data: 1, health: 3 },
    description: 'Fasilitas kesehatan untuk pemulihan Twini di zona emergency.',
  },
  {
    id: 'twin_tower', name: 'Twin Tower', icon: '🏙️', kind: 'tower', cost: 6, color: '#b798ff',
    benefit: { eco: 1, energy: 2, data: 3, health: 0 },
    description: 'Menara data yang mempercepat sinkronisasi digital twin kota.',
  },
  {
    id: 'transit_hub', name: 'Hub Transit', icon: '🚉', kind: 'transit', cost: 7, color: '#ffd178',
    benefit: { eco: 1, energy: 2, data: 2, health: 1 },
    description: 'Simpul mobilitas pintar penghubung seluruh zona kawasan.',
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDING_CATALOG.map((item) => [item.id, item]));
export const PLOT_BY_ID = Object.fromEntries(GROWTH_PLOTS.map((item) => [item.id, item]));

export function createGrowthState() {
  return { points: 0, cleared: 0, byKind: {}, built: {} };
}

// Saved state comes from AsyncStorage and may be from an older build: keep only known ids/values.
export function normalizeGrowthState(raw) {
  const base = createGrowthState();
  if (!raw || typeof raw !== 'object') return base;
  const built = {};
  Object.entries(raw.built || {}).forEach(([plotId, entry]) => {
    if (!PLOT_BY_ID[plotId] || !entry || !BUILDING_BY_ID[entry.buildingId]) return;
    built[plotId] = { buildingId: entry.buildingId, builtAt: Number(entry.builtAt) || Date.now() };
  });
  const byKind = {};
  Object.entries(raw.byKind || {}).forEach(([kind, count]) => {
    if (Number(count) > 0) byKind[kind] = Math.floor(Number(count));
  });
  return {
    points: Math.max(0, Math.floor(Number(raw.points) || 0)),
    cleared: Math.max(0, Math.floor(Number(raw.cleared) || 0)),
    byKind,
    built,
  };
}

export function addGrowthPoints(state, amount) {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  return safe ? { ...state, points: state.points + safe } : state;
}

// Called for every neutralised wabah: keeps the lifetime counter and the per-type statistics.
export function recordWabahDown(state, kind, points) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  return {
    ...state,
    points: state.points + safePoints,
    cleared: state.cleared + 1,
    byKind: { ...state.byKind, [kind]: (state.byKind[kind] || 0) + 1 },
  };
}

export const plotUnlocked = (state, plot, bonus = 0) => state.cleared + bonus >= (plot?.unlockCleared || 0);

export function plotStatus(state, plotId, bonus = 0) {
  const plot = PLOT_BY_ID[plotId];
  if (!plot) return { plot: null, unlocked: false, building: null };
  return {
    plot,
    unlocked: plotUnlocked(state, plot, bonus),
    building: BUILDING_BY_ID[state.built?.[plotId]?.buildingId] || null,
    builtAt: state.built?.[plotId]?.builtAt || null,
  };
}

// Disiplin (Arsitek/Urban/Sipil) memodifikasi harga aset: diskon persen + potongan poin tetap.
export function effectiveBuildCost(building, modifiers = {}) {
  if (!building) return 0;
  const discounted = building.cost * (1 - Math.max(0, Math.min(0.9, Number(modifiers.buildDiscount) || 0)));
  return Math.max(1, Math.round(discounted) - Math.max(0, Math.floor(Number(modifiers.buildFlat) || 0)));
}

export function canBuild(state, plotId, buildingId, modifiers = {}) {
  const plot = PLOT_BY_ID[plotId];
  const building = BUILDING_BY_ID[buildingId];
  if (!plot || !building) return { ok: false, error: 'Petak atau aset kota tidak dikenal.' };
  if (!plotUnlocked(state, plot, modifiers.unlockBonus || 0)) return { ok: false, error: `Petak terkunci: netralkan ${plot.unlockCleared} wabah lebih dulu.` };
  const cost = effectiveBuildCost(building, modifiers);
  if (state.points < cost) return { ok: false, error: `Poin pertumbuhan kurang ${cost - state.points}.` };
  return { ok: true, plot, building, cost };
}

export function buildOnPlot(state, plotId, buildingId, now = Date.now(), modifiers = {}) {
  const check = canBuild(state, plotId, buildingId, modifiers);
  if (!check.ok) return { ...check, state };
  const { plot, building, cost } = check;
  const next = {
    ...state,
    points: state.points - cost,
    built: { ...state.built, [plotId]: { buildingId, builtAt: now } },
  };
  return { ok: true, state: next, plot, building, cost };
}

export function growthSummary(state, unlockBonus = 0) {
  const totals = { eco: 0, energy: 0, data: 0, health: 0 };
  let buildings = 0;
  Object.values(state.built || {}).forEach((entry) => {
    const building = BUILDING_BY_ID[entry?.buildingId];
    if (!building) return;
    buildings += 1;
    totals.eco += building.benefit.eco;
    totals.energy += building.benefit.energy;
    totals.data += building.benefit.data;
    totals.health += building.benefit.health;
  });
  const total = totals.eco + totals.energy + totals.data + totals.health;
  const capacity = GROWTH_PLOTS.length * 7; // maximum benefit sum across all plots
  const score = Math.min(100, Math.round((total / capacity) * 100));
  return {
    ...totals,
    total,
    buildings,
    plotsUsed: buildings,
    plotsUnlocked: GROWTH_PLOTS.filter((plot) => plotUnlocked(state, plot, unlockBonus)).length,
    plotsTotal: GROWTH_PLOTS.length,
    score,
    level: 1 + Math.min(4, Math.floor(score / 20)),
  };
}

// Next plot to unlock, used for the "keep clearing wabah" hint in the UI.
export function nextLockedPlot(state, unlockBonus = 0) {
  return GROWTH_PLOTS.find((plot) => !plotUnlocked(state, plot, unlockBonus)) || null;
}

