// Run: node --test __tests__/missionEngine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/game/engine/missionEngine.js', import.meta.url), 'utf8');
const engine = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const content = JSON.parse(readFileSync(new URL('../src/features/game/data/gameContent.json', import.meta.url), 'utf8'));
const { STATUS } = engine;
const missions = content.missions;
const byId = (id) => missions.find((m) => m.id === id);
const T0 = Date.parse('2026-11-09T03:00:00Z');

test('campaign unlock chain and auto-activation', () => {
  let state = engine.createMissionState();
  let done = engine.completedCampaignIds(state);
  assert.equal(engine.missionStatus(state, byId('m01'), done, T0).status, STATUS.AVAILABLE);
  assert.equal(engine.missionStatus(state, byId('m02'), done, T0).status, STATUS.LOCKED);
  state = engine.autoActivate(state, missions, done, T0);
  assert.equal(engine.missionStatus(state, byId('m01'), done, T0).status, STATUS.ACTIVE);
  assert.equal(engine.missionStatus(state, byId('m07'), done, T0).status, STATUS.LOCKED);
});

test('unique objectives ignore repeats and complete the mission', () => {
  let state = engine.autoActivate(engine.createMissionState(), missions, new Set(), T0);
  const zone = (id) => ({ type: 'explore_zone', id });
  ({ state } = engine.applyEvent(state, missions, zone('gateway'), T0 + 1000));
  ({ state } = engine.applyEvent(state, missions, zone('gateway'), T0 + 2000));
  assert.equal(state.entries.m01.progress[0], 1);
  ({ state } = engine.applyEvent(state, missions, zone('merdeka'), T0 + 3000));
  const result = engine.applyEvent(state, missions, zone('monument'), T0 + 4000);
  assert.ok(result.completed.includes('m01'));
  assert.equal(result.state.entries.m01.status, STATUS.COMPLETED);
  const done = engine.completedCampaignIds(result.state);
  assert.equal(engine.missionStatus(result.state, byId('m02'), done, T0 + 5000).status, STATUS.AVAILABLE);
});

test('target filter only counts matching object types', () => {
  let state = engine.autoActivate(engine.createMissionState(), missions, new Set(), T0);
  ({ state } = engine.applyEvent(state, missions, { type: 'scan_object', id: 'cctv-01', target: 'cctv' }, T0));
  assert.equal(state.entries['d-environment'].progress[0], 0);
  assert.equal(state.entries['d-object-scanner'].progress[0], 1);
  ({ state } = engine.applyEvent(state, missions, { type: 'scan_object', id: 'aq-01', target: 'air_quality' }, T0));
  assert.equal(state.entries['d-environment'].progress[0], 1);
});

test('timed missions need a manual start and fail when time runs out', () => {
  const m06 = byId('m06');
  assert.equal(engine.needsManualStart(m06), true);
  const done = new Set(['m01', 'm02', 'm03']);
  let state = engine.autoActivate(engine.createMissionState(), missions, done, T0);
  assert.equal(engine.missionStatus(state, m06, done, T0).status, STATUS.AVAILABLE);
  state = engine.startMission(state, m06, T0);
  assert.equal(engine.remainingSeconds(m06, state.entries.m06, T0 + 60000), 540);
  const { state: after, failed } = engine.checkTimeLimits(state, missions, T0 + 601000);
  assert.deepEqual(failed, ['m06']);
  assert.equal(engine.missionStatus(after, m06, done, T0 + 601000).status, STATUS.FAILED);
  const retried = engine.startMission(after, m06, T0 + 602000);
  assert.equal(retried.entries.m06.status, STATUS.ACTIVE);
});

test('daily missions reset in a new WIB day', () => {
  let state = engine.autoActivate(engine.createMissionState(), missions, new Set(), T0);
  for (let i = 0; i < 3; i += 1) ({ state } = engine.applyEvent(state, missions, { type: 'collect_core' }, T0));
  assert.equal(state.entries['d-energy-hunt'].status, STATUS.COMPLETED);
  const tomorrow = T0 + 86400000;
  assert.equal(engine.missionStatus(state, byId('d-energy-hunt'), new Set(), tomorrow).status, STATUS.AVAILABLE);
  assert.equal(engine.periodKeyFor(byId('d-energy-hunt'), Date.parse('2026-11-09T17:30:00Z')), '2026-11-10', 'WIB midnight rolls the day');
});

test('scheduled and team missions stay locked', () => {
  const state = engine.createMissionState();
  assert.equal(engine.missionStatus(state, byId('s-independence'), new Set(), T0).status, STATUS.LOCKED);
  assert.equal(engine.missionStatus(state, byId('w-team'), new Set(), T0).status, STATUS.LOCKED);
  assert.equal(engine.missionStatus(state, byId('s-community'), new Set(), T0).status, STATUS.AVAILABLE);
});

test('content integrity: requirements, assets, objects', () => {
  const missionIds = new Set(missions.map((m) => m.id));
  const assetIds = new Set(content.assets.map((a) => a.id));
  const objectIds = new Set(content.objects.map((o) => o.id));
  assert.equal(missions.filter((m) => m.category === 'campaign').length, 12);
  for (const m of missions) {
    m.requires.forEach((id) => assert.ok(missionIds.has(id), `${m.id} requires unknown ${id}`));
    if (m.rewardAssetId) assert.ok(assetIds.has(m.rewardAssetId), `${m.id} rewards unknown asset`);
  }
  for (const a of content.assets) (a.discovery.objects || []).forEach((id) => assert.ok(objectIds.has(id), `${a.id} discovery object ${id}`));
  for (const o of content.objects) {
    assert.ok(content.objectTypes[o.type], `object ${o.id} has unknown type`);
    if (o.assetId) assert.ok(assetIds.has(o.assetId), `object ${o.id} asset`);
    assert.ok(Math.abs(o.position[0]) > 5.8 || Math.abs(o.position[1]) > 5.8, `object ${o.id} is inside the solid Monas tower`);
  }
  // Every campaign objective must be achievable with the objects in the world.
  const count = (type) => content.objects.filter((o) => o.type === type).length;
  assert.ok(count('iot_sensor') >= 10 && count('pollution') >= 5 && count('drainage') >= 3 && count('npc') >= 5 && count('energy_station') >= 3 && count('infra_challenge') >= 3);
  const syncable = content.objects.filter((o) => content.objectTypes[o.type].action === 'sync').length;
  assert.ok(syncable >= 10, `need 10 syncable objects, have ${syncable}`);
});
