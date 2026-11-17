// Run: node --test __tests__/loadout.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

// The app ships .js ES modules that import each other with relative paths, while this test runs as
// .mjs. Copy the modules into a temp folder as .mjs and load them from there.
const dir = mkdtempSync(join(tmpdir(), 'twini-loadout-'));
const write = (name, source) => {
  const target = join(dir, name);
  writeFileSync(target, source);
  return pathToFileURL(target).href;
};
const weaponsUrl = write('weapons.mjs', read('../src/features/survival/data/weapons.js'));
const loadoutUrl = write('loadout.mjs', read('../src/features/survival/engine/loadout.js').replace("'../data/weapons'", "'./weapons.mjs'"));
const npcsUrl = write('npcs.mjs', read('../src/features/survival/data/npcs.js'));
const startPointsUrl = write('startPoints.mjs', read('../src/features/survival/data/startPoints.js'));

const loadout = await import(loadoutUrl);
const weapons = await import(weaponsUrl);
const npcs = await import(npcsUrl);
const startPoints = await import(startPointsUrl);

test('default loadout owns and equips the pulse pistol, nothing else', () => {
  const state = loadout.createLoadout();
  assert.deepEqual(state.weapons, ['pulse']);
  assert.equal(state.equippedWeapon, 'pulse');
  assert.deepEqual(state.accessories, []);
  assert.deepEqual(state.ownedAccessories, []);
  assert.equal(loadout.weaponStats(state).damage, 1);
  assert.equal(loadout.weaponStats(state).ammo, 10);
});

test('buying a weapon needs enough coins and never mutates the input', () => {
  const start = loadout.createLoadout();
  const poor = loadout.buyWeapon(start, 100, 'nova');
  assert.equal(poor.ok, false);
  assert.match(poor.error, /Koin kurang/);
  assert.deepEqual(start.weapons, ['pulse'], 'reducer must be pure');

  const rich = loadout.buyWeapon(start, 5000, 'ion');
  assert.equal(rich.ok, true);
  assert.equal(rich.coins, 5000 - weapons.WEAPON_BY_ID.ion.cost);
  assert.equal(rich.loadout.equippedWeapon, 'ion');
  assert.deepEqual(rich.loadout.weapons, ['pulse', 'ion']);
  assert.equal(loadout.weaponStats(rich.loadout).damage, 2);
});

test('owned weapons can be swapped but unknown ones are rejected', () => {
  const bought = loadout.buyWeapon(loadout.createLoadout(), 5000, 'plasma').loadout;
  assert.equal(loadout.equipWeapon(bought, 'pulse').ok, true);
  assert.equal(loadout.weaponStats(loadout.equipWeapon(bought, 'pulse').loadout).damage, 1);
  assert.equal(loadout.equipWeapon(bought, 'nova').ok, false);
});

test('weapon accessories stack damage, cooldown, ammo and projectile speed', () => {
  let state = loadout.createLoadout();
  state = loadout.buyAccessory(state, 5000, 'holo_sight').loadout;
  state = loadout.buyAccessory(state, 5000, 'cooling_core').loadout;
  state = loadout.buyAccessory(state, 5000, 'expanded_cell').loadout;
  state = loadout.buyAccessory(state, 5000, 'accelerator').loadout;
  const stats = loadout.weaponStats(state);
  assert.equal(stats.damage, 2);
  assert.equal(stats.ammo, 14);
  assert.equal(stats.cooldown, 0.85);
  assert.equal(stats.speed, 23); // 18 * 1.25 rounded
  const off = loadout.toggleAccessory(state, 'holo_sight');
  assert.equal(loadout.weaponStats(off).damage, 1);
  assert.ok(off.ownedAccessories.includes('holo_sight'), 'detaching must not lose ownership');
  assert.equal(loadout.buyAccessory(off, 5000, 'holo_sight').ok, false, 'owned accessories are not charged twice');
  const again = loadout.toggleAccessory(off, 'holo_sight');
  assert.deepEqual([...again.accessories].sort(), [...state.accessories].sort(), 'toggling twice restores the loadout');
  assert.equal(loadout.weaponStats(again).damage, 2);
  assert.equal(loadout.toggleAccessory(again, 'not-owned'), again, 'unknown accessories are ignored');
});

test('building and vehicle upgrades charge once and expose their bonuses', () => {
  let state = loadout.createLoadout();
  const bought = loadout.buyBuildingUpgrade(state, 1000, 'solar_roof');
  assert.equal(bought.ok, true);
  assert.equal(bought.coins, 1000 - 240);
  assert.deepEqual(loadout.buildingUpgradeBonus(bought.loadout), { eco: 0, energy: 2, data: 0, health: 0 });
  assert.equal(loadout.buyBuildingUpgrade(bought.loadout, 1000, 'solar_roof').ok, false);

  const vehicle = loadout.buyVehicleUpgrade(state, 1000, 'turbo');
  assert.equal(vehicle.ok, true);
  assert.equal(loadout.vehicleStats(vehicle.loadout).speed, 1.2);
  const both = loadout.buyVehicleUpgrade(vehicle.loadout, 1000, 'offroad').loadout;
  assert.equal(loadout.vehicleStats(both).grip, 1.25);
  assert.equal(loadout.vehicleStats(both).speed, 1.32);
});

test('normalizeLoadout drops unknown ids and always keeps the starter pistol', () => {
  const normalized = loadout.normalizeLoadout({
    weapons: ['nova', 'bogus'], equippedWeapon: 'bogus', accessories: ['holo_sight', 'nope'],
    buildingUpgrades: ['solar_roof', 'ghost'], vehicleUpgrades: ['turbo', 'nope'],
  });
  assert.deepEqual(normalized.weapons, ['pulse', 'nova']);
  assert.equal(normalized.equippedWeapon, 'pulse');
  assert.deepEqual(normalized.accessories, ['holo_sight']);
  assert.deepEqual(normalized.ownedAccessories, ['holo_sight'], 'legacy saves keep installed accessories owned');
  assert.deepEqual(normalized.buildingUpgrades, ['solar_roof']);
  assert.deepEqual(normalized.vehicleUpgrades, ['turbo']);
  const detached = loadout.normalizeLoadout({ accessories: [], ownedAccessories: ['cooling_core'] });
  assert.deepEqual(detached.accessories, []);
  assert.deepEqual(detached.ownedAccessories, ['cooling_core']);
  assert.deepEqual(loadout.normalizeLoadout(null), loadout.createLoadout());
});

test('effective fire interval follows the weapon cooldown multiplier and discipline perk', () => {
  const pulse = loadout.createLoadout();
  assert.equal(loadout.SHOT_BASE_MS, 260);
  assert.equal(loadout.shotIntervalMs(loadout.weaponStats(pulse)), 260);
  const quantum = loadout.normalizeLoadout({ weapons: ['quantum'], equippedWeapon: 'quantum' });
  assert.equal(loadout.shotIntervalMs(loadout.weaponStats(quantum)), 150, 'fast weapons clamp at 150 ms');
  const nova = loadout.normalizeLoadout({ weapons: ['nova'], equippedWeapon: 'nova', accessories: ['cooling_core'] });
  assert.equal(loadout.shotIntervalMs(loadout.weaponStats(nova)), 254);
  assert.equal(loadout.shotIntervalMs(loadout.weaponStats(nova), 0.85), 216);
});

test('every NPC is talkable, unique, and placed inside the shared world bounds', () => {
  assert.ok(npcs.NPCS.length >= 4);
  const ids = new Set(npcs.NPCS.map((npc) => npc.id));
  assert.equal(ids.size, npcs.NPCS.length);
  npcs.NPCS.forEach((npc) => {
    assert.ok(npc.name && npc.role && npc.greeting);
    assert.ok(npc.lines.length >= 1);
    assert.ok(npc.reward.coins > 0 && npc.reward.xp > 0);
    assert.equal(npc.position.length, 2);
    assert.ok(Math.hypot(npc.position[0], npc.position[1]) < 60, `${npc.id} sits inside the plaza area`);
  });
  assert.equal(npcs.npcById('npc-raka').name, 'Pak Raka');
  assert.equal(npcs.npcById('missing'), null);
});

test('each environment starts from a defined, safe spawn point', () => {
  ['monas', 'smartcity', 'coastal', 'highland'].forEach((id) => {
    const point = startPoints.startPointFor(id);
    assert.equal(point.id, id);
    assert.equal(point.position.length, 2);
    assert.ok(Math.hypot(point.position[0], point.position[1]) < 40);
  });
  assert.equal(startPoints.startPointFor('unknown').id, 'monas');
  assert.deepEqual(startPoints.startPointFor('unknown').position, [-6, 30]);
});
