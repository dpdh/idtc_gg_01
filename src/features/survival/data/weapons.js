// Katalog senjata laser (pistol), aksesori senjata, upgrade bangunan, dan upgrade kendaraan.
// Semua dibeli dengan koin permainan (bukan TP) supaya toko tetap bisa dipakai offline.

export const WEAPONS = [
  {
    id: 'pulse', name: 'Pulse Pistol', short: 'PULSE', tier: 1, cost: 0, icon: '🔫', color: '#7cf5ff',
    damage: 1, cooldown: 1, ammo: 10, speed: 18,
    description: 'Pistol laser standar Twini. Akurat, ringan, dan selalu tersedia.',
  },
  {
    id: 'ion', name: 'Ion Blaster', short: 'ION', tier: 2, cost: 450, icon: '⚡', color: '#9fd5ff',
    damage: 2, cooldown: 0.9, ammo: 12, speed: 22,
    description: 'Berkas ion dua kali lebih kuat dengan proyektil lebih cepat.',
  },
  {
    id: 'plasma', name: 'Plasma Magnum', short: 'PLASMA', tier: 3, cost: 900, icon: '🔥', color: '#ff9be8',
    damage: 3, cooldown: 0.8, ammo: 8, speed: 26,
    description: 'Kaliber plasma besar: satu tembakan menghancurkan wabah kecil.',
  },
  {
    id: 'quantum', name: 'Quantum Repeater', short: 'QUANTUM', tier: 4, cost: 1600, icon: '🌀', color: '#b798ff',
    damage: 2, cooldown: 0.45, ammo: 16, speed: 30,
    description: 'Pistol otomatis quantum: tembakan cepat dengan sel besar.',
  },
  {
    id: 'nova', name: 'Nova Cannon', short: 'NOVA', tier: 5, cost: 2600, icon: '💥', color: '#ffd56e',
    damage: 5, cooldown: 1.15, ammo: 6, speed: 34,
    description: 'Meriam genggam kelas Nova. Lambat tetapi menghancurkan apa pun.',
  },
];

export const WEAPON_ACCESSORIES = [
  { id: 'holo_sight', name: 'Holo Sight', cost: 200, icon: '🎯', mods: { damage: 1 }, description: '+1 damage per tembakan.' },
  { id: 'cooling_core', name: 'Cooling Core', cost: 260, icon: '❄️', mods: { cooldown: 0.85 }, description: 'Jeda tembak −15%.' },
  { id: 'expanded_cell', name: 'Expanded Cell', cost: 300, icon: '🔋', mods: { ammo: 4 }, description: 'Kapasitas plasma +4.' },
  { id: 'accelerator', name: 'Accelerator Coil', cost: 380, icon: '🚀', mods: { speed: 1.25 }, description: 'Kecepatan proyektil +25%.' },
  { id: 'overcharge', name: 'Overcharge Chip', cost: 520, icon: '☢️', mods: { damage: 1, cooldown: 0.95 }, description: '+1 damage dan jeda tembak −5%.' },
];

export const BUILDING_UPGRADES = [
  { id: 'solar_roof', name: 'Atap Surya', cost: 240, icon: '🔆', bonus: { energy: 2 }, description: 'Setiap aset kota +2 energi.' },
  { id: 'sensor_array', name: 'Array Sensor', cost: 280, icon: '📡', bonus: { data: 2 }, description: 'Setiap aset kota +2 data.' },
  { id: 'green_retrofit', name: 'Retrofit Hijau', cost: 320, icon: '🌿', bonus: { eco: 2, health: 1 }, description: 'Setiap aset kota +2 ekosistem, +1 kesehatan.' },
];

export const VEHICLE_UPGRADES = [
  { id: 'turbo', name: 'Turbo Kit', cost: 220, icon: '🏎️', mods: { speed: 1.2 }, description: 'Kecepatan kendaraan +20%.' },
  { id: 'offroad', name: 'Off-road Suspension', cost: 260, icon: '🛞', mods: { speed: 1.1, grip: 1.25 }, description: 'Kecepatan +10%, cengkeraman +25%.' },
  { id: 'armor', name: 'Armor Plate', cost: 300, icon: '🛡️', mods: { armor: 1 }, description: 'Benturan tidak mengurangi health sebesar sebelumnya.' },
];

// Paket Poin Pertumbuhan yang bisa dibeli dengan koin: jalur "beli aset kota" dari toko
// tanpa harus menembak wabah dulu (harga sengaja lebih mahal daripada menembak langsung).
export const GROWTH_PACKS = [
  { id: 'growth-5', points: 5, cost: 120, icon: '🌱' },
  { id: 'growth-12', points: 12, cost: 260, icon: '🌳' },
  { id: 'growth-25', points: 25, cost: 480, icon: '🏙️' },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((item) => [item.id, item]));
export const ACCESSORY_BY_ID = Object.fromEntries(WEAPON_ACCESSORIES.map((item) => [item.id, item]));
export const BUILDING_UPGRADE_BY_ID = Object.fromEntries(BUILDING_UPGRADES.map((item) => [item.id, item]));
export const VEHICLE_UPGRADE_BY_ID = Object.fromEntries(VEHICLE_UPGRADES.map((item) => [item.id, item]));

export const DEFAULT_WEAPON_ID = 'pulse';
