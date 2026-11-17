// Run: node --test __tests__/cityGrowth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = async (relativePath) => {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
};

const growth = await load('../src/features/game/engine/cityGrowth.js');
const wabah = await load('../src/features/survival/data/wabah.js');
const content = JSON.parse(readFileSync(new URL('../src/features/game/data/gameContent.json', import.meta.url), 'utf8'));

test('wabah down adds growth points, clears counter and per-kind stats', () => {
  const start = growth.createGrowthState();
  const afterGhost = growth.recordWabahDown(start, 'data_ghost', 1);
  const afterVirus = growth.recordWabahDown(afterGhost, 'kernel_virus', 3);
  assert.equal(afterVirus.points, 4);
  assert.equal(afterVirus.cleared, 2);
  assert.equal(afterVirus.byKind.data_ghost, 1);
  assert.equal(afterVirus.byKind.kernel_virus, 1);
  assert.equal(start.points, 0, 'pure reducers must not mutate the input state');
});

test('plots unlock progressively and locked plots reject construction', () => {
  const state = growth.createGrowthState();
  assert.equal(growth.plotStatus(state, 'plot-park-1').unlocked, true);
  assert.equal(growth.plotStatus(state, 'plot-smart-1').unlocked, false);
  const locked = growth.buildOnPlot(state, 'plot-smart-1', 'eco_park');
  assert.equal(locked.ok, false);
  assert.match(locked.error, /terkunci/i);
  const unlocked = growth.recordWabahDown(state, 'data_ghost', 2);
  assert.equal(growth.plotStatus(unlocked, 'plot-smart-1').unlocked, true);
});

test('building an asset spends points and records the plot', () => {
  let state = growth.recordWabahDown(growth.createGrowthState(), 'kernel_virus', 3);
  state = growth.recordWabahDown(state, 'algae_bloom', 2);
  const result = growth.buildOnPlot(state, 'plot-park-1', 'eco_park', 1234);
  assert.equal(result.ok, true);
  assert.equal(result.state.points, 5 - 2);
  assert.deepEqual(result.state.built['plot-park-1'], { buildingId: 'eco_park', builtAt: 1234 });
  assert.equal(growth.plotStatus(result.state, 'plot-park-1').building.id, 'eco_park');
});

test('insufficient growth points are rejected', () => {
  const state = growth.recordWabahDown(growth.createGrowthState(), 'data_ghost', 1);
  const result = growth.buildOnPlot(state, 'plot-park-1', 'transit_hub');
  assert.equal(result.ok, false);
  assert.match(result.error, /kurang/i);
  assert.equal(result.state.points, 1, 'a rejected build must not change the balance');
});

test('growth summary aggregates benefits and score', () => {
  let state = growth.createGrowthState();
  state = growth.recordWabahDown(state, 'kernel_virus', 3);
  state = growth.recordWabahDown(state, 'kernel_virus', 3);
  state = growth.recordWabahDown(state, 'kernel_virus', 3);
  state = growth.buildOnPlot(state, 'plot-park-1', 'eco_park').state;
  state = growth.buildOnPlot(state, 'plot-smart-1', 'sensor_hub').state;
  const summary = growth.growthSummary(state);
  assert.equal(summary.buildings, 2);
  assert.equal(summary.eco, 3);
  assert.equal(summary.data, 3);
  assert.equal(summary.health, 1);
  assert.ok(summary.score > 0 && summary.score <= 100);
  assert.ok(summary.level >= 1 && summary.level <= 5);
});

test('normalizeGrowthState drops stale plot/building ids', () => {
  const raw = { points: -10, cleared: '3', byKind: { data_ghost: 2, ghost: -1 }, built: { 'plot-park-1': { buildingId: 'eco_park', builtAt: 5 }, 'plot-removed': { buildingId: 'eco_park' }, 'plot-smart-1': { buildingId: 'removed_asset' } } };
  const state = growth.normalizeGrowthState(raw);
  assert.equal(state.points, 0);
  assert.equal(state.cleared, 3);
  assert.deepEqual(state.byKind, { data_ghost: 2 });
  assert.deepEqual(Object.keys(state.built), ['plot-park-1']);
  assert.equal(state.built['plot-park-1'].builtAt, 5);
  assert.deepEqual(growth.normalizeGrowthState(null), growth.createGrowthState());
});

test('content integrity: wabah spawns, plots, zones and missions', () => {
  const zoneIds = new Set(content.zones.map((zone) => zone.id));
  const missionById = (id) => content.missions.find((mission) => mission.id === id);
  wabah.WABAH_SPAWNS.forEach((spawn) => {
    assert.ok(wabah.WABAH_TYPES[spawn.kind], `spawn ${spawn.id} has unknown kind`);
    assert.ok(zoneIds.has(spawn.zone), `spawn ${spawn.id} has unknown zone`);
    assert.ok(Math.abs(spawn.position[0]) > 5.8 || Math.abs(spawn.position[1]) > 5.8, `spawn ${spawn.id} is inside the Monas tower`);
  });
  growth.GROWTH_PLOTS.forEach((plot) => {
    assert.ok(zoneIds.has(plot.zoneId), `plot ${plot.id} has unknown zone`);
    assert.ok(plot.size > 0);
  });
  growth.BUILDING_CATALOG.forEach((building) => {
    assert.ok(building.cost > 0, `${building.id} must cost growth points`);
    const total = building.benefit.eco + building.benefit.energy + building.benefit.data + building.benefit.health;
    assert.ok(total > 0, `${building.id} must give a city benefit`);
  });
  assert.ok(growth.GROWTH_PLOTS.length >= 6, 'at least six plots to grow the city');
  assert.ok(Object.keys(wabah.WABAH_TYPES).length >= 4, 'several ecosystem plagues');
  assert.ok(wabah.wabahSpawnsInZone('park').length >= 1, 'park spawns for the first plot');
  const wabahMission = missionById('w-wabah-digital');
  assert.equal(wabahMission.objectives[0].event, 'purge_wabah');
  const growthMission = missionById('w-kota-hijau');
  assert.equal(growthMission.objectives[0].event, 'build_city_asset');
});
