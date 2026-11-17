// Loadout pemain: senjata yang dimiliki/dipakai, aksesori senjata, upgrade bangunan & kendaraan.
// Semua fungsi murni (state -> state) dan dibeli memakai koin permainan, sehingga mudah diuji.
import {
  ACCESSORY_BY_ID, BUILDING_UPGRADE_BY_ID, DEFAULT_WEAPON_ID, VEHICLE_UPGRADE_BY_ID, WEAPON_BY_ID,
} from '../data/weapons';

export function createLoadout() {
  return {
    weapons: [DEFAULT_WEAPON_ID],
    equippedWeapon: DEFAULT_WEAPON_ID,
    accessories: [],
    ownedAccessories: [],
    buildingUpgrades: [],
    vehicleUpgrades: [],
  };
}

export function normalizeLoadout(raw) {
  const base = createLoadout();
  if (!raw || typeof raw !== 'object') return base;
  const weapons = Array.isArray(raw.weapons) ? raw.weapons.filter((id) => WEAPON_BY_ID[id]) : [];
  if (!weapons.includes(DEFAULT_WEAPON_ID)) weapons.unshift(DEFAULT_WEAPON_ID);
  const equippedWeapon = weapons.includes(raw.equippedWeapon) ? raw.equippedWeapon : DEFAULT_WEAPON_ID;
  const accessories = Array.isArray(raw.accessories) ? raw.accessories.filter((id) => ACCESSORY_BY_ID[id]) : [];
  // Saves from before ownership tracking: everything installed counts as owned.
  const ownedAccessories = Array.isArray(raw.ownedAccessories)
    ? raw.ownedAccessories.filter((id) => ACCESSORY_BY_ID[id])
    : accessories;
  return {
    weapons: [...new Set(weapons)],
    equippedWeapon,
    accessories: [...new Set(accessories.filter((id) => ownedAccessories.includes(id)))],
    ownedAccessories: [...new Set(ownedAccessories)],
    buildingUpgrades: Array.isArray(raw.buildingUpgrades) ? [...new Set(raw.buildingUpgrades.filter((id) => BUILDING_UPGRADE_BY_ID[id]))] : [],
    vehicleUpgrades: Array.isArray(raw.vehicleUpgrades) ? [...new Set(raw.vehicleUpgrades.filter((id) => VEHICLE_UPGRADE_BY_ID[id]))] : [],
  };
}

// Jeda tembak efektif (ms). `cooldown` di katalog adalah pengali dari 260 ms dasar;
// perk disiplin (mis. IT) mempercepat dengan multiplier < 1.
export const SHOT_BASE_MS = 260;
export const shotIntervalMs = (stats, multiplier = 1) => Math.max(150, Math.round(SHOT_BASE_MS * (stats?.cooldown || 1) * multiplier));

// Statistik senjata aktif setelah aksesori dipasang.
export function weaponStats(loadout) {
  const weapon = WEAPON_BY_ID[loadout?.equippedWeapon] || WEAPON_BY_ID[DEFAULT_WEAPON_ID];
  const stats = {
    id: weapon.id, name: weapon.name, short: weapon.short, tier: weapon.tier, color: weapon.color,
    damage: weapon.damage, cooldown: weapon.cooldown, ammo: weapon.ammo, speed: weapon.speed,
  };
  (loadout?.accessories || []).forEach((id) => {
    const mods = ACCESSORY_BY_ID[id]?.mods;
    if (!mods) return;
    if (mods.damage) stats.damage += mods.damage;
    if (mods.cooldown) stats.cooldown *= mods.cooldown;
    if (mods.ammo) stats.ammo += mods.ammo;
    if (mods.speed) stats.speed *= mods.speed;
  });
  stats.damage = Math.max(1, Math.round(stats.damage));
  stats.ammo = Math.max(1, Math.round(stats.ammo));
  stats.cooldown = Math.max(0.25, Number(stats.cooldown.toFixed(3)));
  stats.speed = Math.max(10, Math.round(stats.speed));
  return stats;
}

// Bonus manfaat kota dari upgrade bangunan yang sudah dibeli.
export function buildingUpgradeBonus(loadout) {
  const bonus = { eco: 0, energy: 0, data: 0, health: 0 };
  (loadout?.buildingUpgrades || []).forEach((id) => {
    const add = BUILDING_UPGRADE_BY_ID[id]?.bonus;
    if (!add) return;
    bonus.eco += add.eco || 0;
    bonus.energy += add.energy || 0;
    bonus.data += add.data || 0;
    bonus.health += add.health || 0;
  });
  return bonus;
}

// Pengali/peningkatan kendaraan (dipakai scene untuk kecepatan & cengkeraman).
export function vehicleStats(loadout) {
  const stats = { speed: 1, grip: 1, armor: 0 };
  (loadout?.vehicleUpgrades || []).forEach((id) => {
    const mods = VEHICLE_UPGRADE_BY_ID[id]?.mods;
    if (!mods) return;
    if (mods.speed) stats.speed *= mods.speed;
    if (mods.grip) stats.grip *= mods.grip;
    if (mods.armor) stats.armor += mods.armor;
  });
  return { speed: Number(stats.speed.toFixed(3)), grip: Number(stats.grip.toFixed(3)), armor: stats.armor };
}

const charge = (coins, cost) => {
  if (coins < cost) return { ok: false, error: `Koin kurang ${cost - coins}.` };
  return { ok: true, coins: coins - cost };
};

export function buyWeapon(loadout, coins, id) {
  const weapon = WEAPON_BY_ID[id];
  if (!weapon) return { ok: false, error: 'Senjata tidak dikenal.' };
  if (loadout.weapons.includes(id)) return { ok: false, error: 'Senjata ini sudah dimiliki.' };
  const payment = charge(coins, weapon.cost);
  if (!payment.ok) return payment;
  return { ok: true, loadout: { ...loadout, weapons: [...loadout.weapons, id], equippedWeapon: id }, coins: payment.coins, cost: weapon.cost };
}

export function equipWeapon(loadout, id) {
  if (!loadout.weapons.includes(id)) return { ok: false, error: 'Beli senjata ini terlebih dahulu.' };
  return { ok: true, loadout: { ...loadout, equippedWeapon: id } };
}

export function buyAccessory(loadout, coins, id) {
  const accessory = ACCESSORY_BY_ID[id];
  if (!accessory) return { ok: false, error: 'Aksesori tidak dikenal.' };
  if (loadout.ownedAccessories.includes(id)) return { ok: false, error: 'Aksesori ini sudah dimiliki.' };
  const payment = charge(coins, accessory.cost);
  if (!payment.ok) return payment;
  return {
    ok: true,
    loadout: { ...loadout, accessories: [...loadout.accessories, id], ownedAccessories: [...loadout.ownedAccessories, id] },
    coins: payment.coins,
    cost: accessory.cost,
  };
}

// Hanya bisa dipasang/dilepas bila sudah dibeli; melepas tidak menghapus kepemilikan.
export function toggleAccessory(loadout, id) {
  if (!ACCESSORY_BY_ID[id] || !loadout.ownedAccessories.includes(id)) return loadout;
  const active = loadout.accessories.includes(id);
  return { ...loadout, accessories: active ? loadout.accessories.filter((item) => item !== id) : [...loadout.accessories, id] };
}

export function buyBuildingUpgrade(loadout, coins, id) {
  const upgrade = BUILDING_UPGRADE_BY_ID[id];
  if (!upgrade) return { ok: false, error: 'Upgrade bangunan tidak dikenal.' };
  if (loadout.buildingUpgrades.includes(id)) return { ok: false, error: 'Upgrade ini sudah dibeli.' };
  const payment = charge(coins, upgrade.cost);
  if (!payment.ok) return payment;
  return { ok: true, loadout: { ...loadout, buildingUpgrades: [...loadout.buildingUpgrades, id] }, coins: payment.coins, cost: upgrade.cost };
}

export function buyVehicleUpgrade(loadout, coins, id) {
  const upgrade = VEHICLE_UPGRADE_BY_ID[id];
  if (!upgrade) return { ok: false, error: 'Upgrade kendaraan tidak dikenal.' };
  if (loadout.vehicleUpgrades.includes(id)) return { ok: false, error: 'Upgrade ini sudah dibeli.' };
  const payment = charge(coins, upgrade.cost);
  if (!payment.ok) return payment;
  return { ok: true, loadout: { ...loadout, vehicleUpgrades: [...loadout.vehicleUpgrades, id] }, coins: payment.coins, cost: upgrade.cost };
}
