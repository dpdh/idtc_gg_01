// "Wabah Digital" — ancaman fiktif yang menyerang ekosistem Digital Twin Jakarta.
// Setiap wabah adalah entitas data rusak (bukan kondisi lingkungan nyata). Pemain mencari lalu
// menembaknya dengan pelontar plasma Twini; setiap wabah yang dinetralkan memberi XP, koin,
// energi, dan Poin Pertumbuhan Kota yang dipakai untuk membangun aset pada petak tanah.
//
// Semua posisi memakai koordinat dunia game (x, z) dan sengaja dijauhkan dari menara Monas
// (|x| < 6 && |z| < 6) supaya target selalu bisa dikunci dari luar bangunan.

export const WABAH_TYPES = {
  data_ghost: {
    id: 'data_ghost',
    name: 'Fantom Data',
    icon: '👻',
    threat: 'Salinan data sensor yang mati tetapi masih mengirim telemetri palsu.',
    fix: 'Tembak inti fantom agar data twin kembali bersih.',
    color: '#7cf5ff',
    shell: '#1d6b7a',
    hp: 1,
    hitRadius: 1.25,
    scale: 1,
    rewardXp: 40,
    rewardCoins: 10,
    rewardEnergy: 5,
    growth: 1,
    zones: ['gateway', 'merdeka', 'monument'],
  },
  glitch_node: {
    id: 'glitch_node',
    name: 'Simpul Glitch',
    icon: '🧩',
    threat: 'Simpul jaringan yang retak dan memecah model 3D kota.',
    fix: 'Hancurkan simpul agar mesh kota tidak lagi terbelah.',
    color: '#b798ff',
    shell: '#3d2a78',
    hp: 2,
    hitRadius: 1.3,
    scale: 1.15,
    rewardXp: 60,
    rewardCoins: 14,
    rewardEnergy: 7,
    growth: 2,
    zones: ['smart', 'monument'],
  },
  algae_bloom: {
    id: 'algae_bloom',
    name: 'Wabah Alga Digital',
    icon: '🦠',
    threat: 'Bloom alga pada sensor kualitas air, mengunci ekosistem danau.',
    fix: 'Netralkan gumpalan agar sensor air kembali membaca kondisi nyata.',
    color: '#67f7a3',
    shell: '#145c39',
    hp: 2,
    hitRadius: 1.45,
    scale: 1.25,
    rewardXp: 70,
    rewardCoins: 16,
    rewardEnergy: 8,
    growth: 2,
    zones: ['water', 'park'],
  },
  emission_swarm: {
    id: 'emission_swarm',
    name: 'Gerombolan Emisi',
    icon: '🌫️',
    threat: 'Kawanan partikel emisi yang menutupi sensor udara dan panel surya.',
    fix: 'Bubarkan gerombolan sebelum menutup grid energi.',
    color: '#ffb066',
    shell: '#7a3d12',
    hp: 1,
    hitRadius: 1.2,
    scale: 1.05,
    rewardXp: 45,
    rewardCoins: 11,
    rewardEnergy: 5,
    growth: 1,
    zones: ['smart', 'energy'],
  },
  kernel_virus: {
    id: 'kernel_virus',
    name: 'Virus Kernel',
    icon: '☣️',
    threat: 'Virus inti pada server digital twin yang melemahkan seluruh kota.',
    fix: 'Tembak tiga lapis pelindungnya untuk memulihkan inti kota.',
    color: '#ff6b9d',
    shell: '#6d1638',
    hp: 3,
    hitRadius: 1.35,
    scale: 1.3,
    rewardXp: 110,
    rewardCoins: 24,
    rewardEnergy: 10,
    growth: 3,
    zones: ['monument', 'energy', 'emergency'],
  },
};

// Titik pencarian wabah yang tetap (deterministik) agar misi harian/mingguan bisa diulang.
export const WABAH_SPAWNS = [
  { id: 'wabah-gateway-01', kind: 'data_ghost', zone: 'gateway', position: [0, 27.5] },
  { id: 'wabah-gateway-02', kind: 'emission_swarm', zone: 'gateway', position: [-5.5, 29.5] },
  { id: 'wabah-merdeka-01', kind: 'data_ghost', zone: 'merdeka', position: [-4, 17.5] },
  { id: 'wabah-merdeka-02', kind: 'glitch_node', zone: 'merdeka', position: [4.5, 13.5] },
  { id: 'wabah-monument-01', kind: 'glitch_node', zone: 'monument', position: [7.5, 3] },
  { id: 'wabah-monument-02', kind: 'kernel_virus', zone: 'monument', position: [-7.5, -3.5] },
  { id: 'wabah-monument-03', kind: 'data_ghost', zone: 'monument', position: [0, 9.5] },
  { id: 'wabah-park-01', kind: 'algae_bloom', zone: 'park', position: [-26, 10] },
  { id: 'wabah-park-02', kind: 'algae_bloom', zone: 'park', position: [-20.5, 16.5] },
  { id: 'wabah-smart-01', kind: 'glitch_node', zone: 'smart', position: [22, -10] },
  { id: 'wabah-smart-02', kind: 'emission_swarm', zone: 'smart', position: [27.5, -17] },
  { id: 'wabah-water-01', kind: 'algae_bloom', zone: 'water', position: [-25, -14] },
  { id: 'wabah-water-02', kind: 'glitch_node', zone: 'water', position: [-19.5, -20] },
  { id: 'wabah-energy-01', kind: 'emission_swarm', zone: 'energy', position: [25, 12.5] },
  { id: 'wabah-energy-02', kind: 'kernel_virus', zone: 'energy', position: [29, 18] },
  { id: 'wabah-emergency-01', kind: 'kernel_virus', zone: 'emergency', position: [0, -27] },
];

export const wabahType = (kind) => WABAH_TYPES[kind] || WABAH_TYPES.data_ghost;

export const wabahSpawnsInZone = (zoneId) => WABAH_SPAWNS.filter((spawn) => spawn.zone === zoneId);

// Ringkasan untuk panel: jumlah wabah per jenis (dipakai UI misi & pertumbuhan kota).
export const WABAH_TOTAL_GROWTH = WABAH_SPAWNS.reduce((sum, spawn) => sum + wabahType(spawn.kind).growth, 0);
