// Engine wilayah pengembangan (petak darat & laut) — fungsi murni state-in/state-out supaya mudah diuji
// dan disimpan ke AsyncStorage lewat saveExtra.
//
// state = {
//   owned: { [plotId]: { boughtAt, buildingId, builtAt } },
//   lastCollect: number,                          // waktu terakhir pendapatan wilayah diklaim (ms)
//   lifetime: { coins: number, growth: number },  // total yang pernah diklaim
// }
import {
  DISTRICT_BUILDING_BY_ID,
  DISTRICT_PLOTS,
  DISTRICT_PLOT_BY_ID,
} from '../../survival/data/districtPlots';

const MINUTE = 60000;
export const MAX_COLLECT_MINUTES = 180; // pendapatan berhenti menumpuk setelah 3 jam
const MAX_BUILDING_VALUE = 18;

export function createDistrictState() {
  return { owned: {}, lastCollect: 0, lifetime: { coins: 0, growth: 0 } };
}

export const districtOwnedCount = (state) => Object.keys(state?.owned || {}).length;
export const districtPlotOwned = (state, plotId) => !!state?.owned?.[plotId];
export const districtBuildingOn = (state, plotId) => {
  const entry = state?.owned?.[plotId];
  return entry?.buildingId ? DISTRICT_BUILDING_BY_ID[entry.buildingId] || null : null;
};

// Alasan sebuah petak belum bisa dibeli (null = boleh dibeli).
export function districtLockReason(state, plot, cleared = 0) {
  if (!plot) return 'Petak tidak dikenal.';
  const owned = districtOwnedCount(state);
  const needOwned = Math.max(0, (plot.unlockOwned || 0) - owned);
  if (needOwned > 0) return `Butuh ${needOwned} petak lain dimiliki lebih dulu.`;
  const needCleared = Math.max(0, (plot.requireCleared || 0) - Math.max(0, Number(cleared) || 0));
  if (needCleared > 0) return `Butuh ${needCleared} wabah dinetralkan lebih dulu.`;
  return null;
}

// Diskon disiplin (Arsitek/Urban) juga berlaku untuk harga petak, bukan hanya aset kota.
export function effectivePlotPrice(plot, modifiers = {}) {
  if (!plot) return 0;
  const raw = Number(modifiers.plotDiscount ?? modifiers.buildDiscount) || 0;
  const discount = Math.max(0, Math.min(0.75, raw));
  return Math.max(20, Math.round(plot.price * (1 - discount)));
}

export function canBuyPlot(state, coins, plotId, ctx = {}) {
  const plot = DISTRICT_PLOT_BY_ID[plotId];
  if (!plot) return { ok: false, error: 'Petak tidak dikenal.' };
  if (districtPlotOwned(state, plotId)) return { ok: false, error: 'Petak ini sudah dimiliki.' };
  const reason = districtLockReason(state, plot, ctx.cleared);
  if (reason) return { ok: false, error: reason };
  const price = effectivePlotPrice(plot, ctx.modifiers);
  if ((Number(coins) || 0) < price) return { ok: false, error: `Koin kurang ${price - (Number(coins) || 0)}.` };
  return { ok: true, plot, price };
}

export function buyPlot(state, coins, plotId, now = Date.now(), ctx = {}) {
  const check = canBuyPlot(state, coins, plotId, ctx);
  if (!check.ok) return { ...check, state, coins };
  const { plot, price } = check;
  return {
    ok: true,
    plot,
    price,
    coins: (Number(coins) || 0) - price,
    state: {
      ...state,
      owned: { ...state.owned, [plotId]: { boughtAt: now, buildingId: null, builtAt: null } },
    },
  };
}

// Biaya bangun memakai poin pertumbuhan kota + diskon/potongan disiplin yang sama seperti aset kota.
export function effectiveDistrictBuildCost(building, modifiers = {}) {
  if (!building) return 0;
  const discount = Math.max(0, Math.min(0.9, Number(modifiers.buildDiscount) || 0));
  const discounted = building.cost * (1 - discount);
  return Math.max(1, Math.round(discounted) - Math.max(0, Math.floor(Number(modifiers.buildFlat) || 0)));
}

export function canBuildOnPlot(state, plotId, buildingId, points, modifiers = {}) {
  const plot = DISTRICT_PLOT_BY_ID[plotId];
  const building = DISTRICT_BUILDING_BY_ID[buildingId];
  if (!plot) return { ok: false, error: 'Petak tidak dikenal.' };
  if (!building) return { ok: false, error: 'Bangunan tidak dikenal.' };
  if (!districtPlotOwned(state, plotId)) return { ok: false, error: 'Beli petak ini dulu sebelum membangun.' };
  if (building.allowed !== plot.kind) {
    return { ok: false, error: `${building.name} hanya bisa dibangun di petak ${building.allowed === 'sea' ? 'laut' : 'darat'}.` };
  }
  const existing = districtBuildingOn(state, plotId);
  const cost = effectiveDistrictBuildCost(building, modifiers);
  if ((Number(points) || 0) < cost) return { ok: false, error: `Poin pertumbuhan kurang ${cost - (Number(points) || 0)}.` };
  return { ok: true, plot, building, cost, existing };
}

export function buildOnDistrictPlot(state, plotId, buildingId, points, now = Date.now(), modifiers = {}) {
  const check = canBuildOnPlot(state, plotId, buildingId, points, modifiers);
  if (!check.ok) return { ...check, state, points };
  const { plot, building, cost } = check;
  return {
    ok: true,
    plot,
    building,
    cost,
    points: (Number(points) || 0) - cost,
    state: {
      ...state,
      owned: { ...state.owned, [plotId]: { ...state.owned[plotId], buildingId, builtAt: now } },
    },
  };
}

export function districtSummary(state) {
  const totals = { coinsPerMin: 0, growthPerMin: 0, population: 0, jobs: 0, eco: 0, happiness: 0, value: 0 };
  const byCategory = {};
  let built = 0;
  let owned = 0;
  Object.entries(state?.owned || {}).forEach(([plotId, entry]) => {
    if (!DISTRICT_PLOT_BY_ID[plotId]) return;
    owned += 1;
    const building = DISTRICT_BUILDING_BY_ID[entry?.buildingId];
    if (!building) return;
    built += 1;
    totals.value += building.value;
    totals.coinsPerMin += building.coinsPerMin;
    totals.growthPerMin += building.growthPerMin;
    totals.population += building.population;
    totals.jobs += building.jobs;
    totals.eco += building.eco;
    totals.happiness += building.happiness;
    byCategory[building.category] = (byCategory[building.category] || 0) + 1;
  });
  const capacity = DISTRICT_PLOTS.length * MAX_BUILDING_VALUE;
  const score = Math.min(100, Math.round((totals.value / capacity) * 100));
  return {
    ...totals,
    owned,
    built,
    plotsTotal: DISTRICT_PLOTS.length,
    byCategory,
    score,
    level: 1 + Math.min(4, Math.floor(score / 20)),
  };
}

// Pendapatan wilayah menumpuk sesuai menit berjalan (maksimal 3 jam), lalu diklaim sekaligus.
export function pendingDistrictIncome(state, now = Date.now()) {
  const summary = districtSummary(state);
  const last = Number(state?.lastCollect) || 0;
  // Belum pernah klaim: hitung dari bangunan pertama supaya pendapatan tidak "tertahan" selamanya
  // (kalau baseline = 0, tombol klaim akan selalu bernilai 0 dan tidak pernah bisa memulai).
  const builtTimes = Object.values(state?.owned || {})
    .map((entry) => Number(entry?.builtAt) || 0)
    .filter((time) => time > 0);
  const baseline = last || (builtTimes.length ? Math.min(...builtTimes) : 0);
  if (!baseline) return { minutes: 0, coins: 0, growth: 0, summary };
  const minutes = Math.max(0, Math.min(MAX_COLLECT_MINUTES, (now - baseline) / MINUTE));
  return {
    minutes,
    coins: Math.floor(summary.coinsPerMin * minutes),
    growth: Math.floor(summary.growthPerMin * minutes),
    summary,
  };
}

export function collectDistrictIncome(state, now = Date.now()) {
  const pending = pendingDistrictIncome(state, now);
  if (pending.coins <= 0 && pending.growth <= 0) {
    return { ok: false, error: 'Belum ada pendapatan yang bisa diklaim.', state, coins: 0, growth: 0 };
  }
  return {
    ok: true,
    coins: pending.coins,
    growth: pending.growth,
    minutes: pending.minutes,
    state: {
      ...state,
      lastCollect: now,
      lifetime: {
        coins: (state?.lifetime?.coins || 0) + pending.coins,
        growth: (state?.lifetime?.growth || 0) + pending.growth,
      },
    },
  };
}

// Status satu petak untuk UI: harga, kunci, dan bangunan yang berdiri.
export function districtPlotStatus(state, plotId, ctx = {}) {
  const plot = DISTRICT_PLOT_BY_ID[plotId];
  if (!plot) return { plot: null, owned: false, locked: true, reason: 'Petak tidak dikenal.', price: 0, building: null };
  const owned = districtPlotOwned(state, plotId);
  const reason = owned ? null : districtLockReason(state, plot, ctx.cleared);
  return {
    plot,
    owned,
    locked: !owned && !!reason,
    reason,
    price: effectivePlotPrice(plot, ctx.modifiers),
    building: districtBuildingOn(state, plotId),
  };
}

export function nextDistrictPlot(state, cleared = 0) {
  return DISTRICT_PLOTS.find((plot) => !districtPlotOwned(state, plot.id) && !districtLockReason(state, plot, cleared)) || null;
}

export function normalizeDistrictState(raw) {
  const base = createDistrictState();
  if (!raw || typeof raw !== 'object') return base;
  const owned = {};
  Object.entries(raw.owned || {}).forEach(([plotId, entry]) => {
    const plot = DISTRICT_PLOT_BY_ID[plotId];
    if (!plot) return;
    const building = entry?.buildingId ? DISTRICT_BUILDING_BY_ID[entry.buildingId] : null;
    const valid = building && building.allowed === plot.kind ? building.id : null;
    owned[plotId] = {
      boughtAt: Number(entry?.boughtAt) || Date.now(),
      buildingId: valid,
      builtAt: valid ? Number(entry?.builtAt) || Date.now() : null,
    };
  });
  return {
    owned,
    lastCollect: Math.max(0, Number(raw.lastCollect) || 0),
    lifetime: {
      coins: Math.max(0, Math.floor(Number(raw.lifetime?.coins) || 0)),
      growth: Math.max(0, Math.floor(Number(raw.lifetime?.growth) || 0)),
    },
  };
}
