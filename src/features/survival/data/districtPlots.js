// Petak wilayah pengembangan TWINI: di darat (3 kawasan × 4 petak) dan di laut (2 dermaga × 3 petak).
//
// Tata letak dipilih dari pemindaian peta: petak darat berada di tanah kosong yang tidak menimpa jalan
// OSM, bangunan OSM, objek misi, sebaran wabah, petak pertumbuhan kota lama, distrik toko, NPC, maupun
// pelataran Monas. Petak laut mengapung di kiri-kanan dermaga (z −51…−81) sehingga bisa dijangkau dari
// titian dermaga, atau dengan perahu.
//
// Setiap petak dibeli memakai koin permainan, lalu dibangun salah satu bangunan sesuai jenisnya
// (rumah tinggal / perkantoran / industri / rekreasi). Bangunan menambah Nilai Wilayah, populasi,
// lapangan kerja, dan pendapatan koin + Poin Pertumbuhan per menit.

export const LAND_PLOT_SIZE = 5.0;
export const SEA_PLOT_SIZE = 5.4;
export const SEA_DECK_Y = 0.42; // dek terapung relatif terhadap 0 (di atas WATER_LEVEL)

const landPlot = (id, name, section, x, z, price, unlockOwned, requireCleared) => ({
  id, name, section, kind: 'land', center: [x, z], size: LAND_PLOT_SIZE, price, unlockOwned, requireCleared,
});

const seaPlot = (id, name, section, x, z, price, unlockOwned, requireCleared) => ({
  id, name, section, kind: 'sea', center: [x, z], size: SEA_PLOT_SIZE, price, unlockOwned, requireCleared,
});

export const DISTRICT_PLOTS = [
  // ── Kawasan Selatan (baris 4 petak, z = −40) ────────────────────────────────────────────────
  landPlot('land-s1', 'Petak Selatan A1', 'Kawasan Selatan', -17, -40, 80, 0, 0),
  landPlot('land-s2', 'Petak Selatan A2', 'Kawasan Selatan', -10.8, -40, 90, 1, 0),
  landPlot('land-s3', 'Petak Selatan A3', 'Kawasan Selatan', -4.6, -40, 110, 2, 0),
  landPlot('land-s4', 'Petak Selatan A4', 'Kawasan Selatan', 1.6, -40, 130, 3, 1),

  // ── Kawasan Utara (baris 4 petak, z = 41) ───────────────────────────────────────────────────
  landPlot('land-n1', 'Petak Utara B1', 'Kawasan Utara', -14, 41, 95, 2, 2),
  landPlot('land-n2', 'Petak Utara B2', 'Kawasan Utara', -7.8, 41, 105, 3, 2),
  landPlot('land-n3', 'Petak Utara B3', 'Kawasan Utara', -1.6, 41, 120, 5, 3),
  landPlot('land-n4', 'Petak Utara B4', 'Kawasan Utara', 4.6, 41, 140, 6, 3),

  // ── Kawasan Timur (baris 4 petak, z = −26.5) ───────────────────────────────────────────────
  landPlot('land-e1', 'Petak Timur C1', 'Kawasan Timur', 25, -26.5, 120, 4, 4),
  landPlot('land-e2', 'Petak Timur C2', 'Kawasan Timur', 31.2, -26.5, 135, 6, 4),
  landPlot('land-e3', 'Petak Timur C3', 'Kawasan Timur', 37.4, -26.5, 150, 8, 5),
  landPlot('land-e4', 'Petak Timur C4', 'Kawasan Timur', 34, -32.5, 170, 10, 6),

  // ── Marina Barat (mengapung di sisi barat dermaga) ─────────────────────────────────────────
  seaPlot('sea-w1', 'Petak Marina Barat 1', 'Marina Barat', -6.6, -58, 180, 6, 6),
  seaPlot('sea-w2', 'Petak Marina Barat 2', 'Marina Barat', -6.6, -67, 200, 8, 7),
  seaPlot('sea-w3', 'Petak Marina Barat 3', 'Marina Barat', -6.6, -76, 225, 10, 8),

  // ── Marina Timur (mengapung di sisi timur dermaga) ─────────────────────────────────────────
  seaPlot('sea-e1', 'Petak Marina Timur 1', 'Marina Timur', 6.6, -58, 190, 6, 6),
  seaPlot('sea-e2', 'Petak Marina Timur 2', 'Marina Timur', 6.6, -67, 215, 8, 7),
  seaPlot('sea-e3', 'Petak Marina Timur 3', 'Marina Timur', 6.6, -76, 240, 12, 8),
];

// Bangunan: `allowed` menentukan petak yang boleh dipakai, `shape` dipakai DistrictLayer untuk model 3D.
export const DISTRICT_BUILDINGS = [
  {
    id: 'rumah_tapak', name: 'Rumah Tinggal', icon: '🏠', category: 'residential', allowed: 'land',
    shape: 'house', cost: 3, value: 6, coinsPerMin: 3, growthPerMin: 1, population: 6, jobs: 0, eco: 0, happiness: 1,
    color: '#ffd08a', description: 'Hunian keluarga dengan taman kecil; menambah populasi kawasan.',
  },
  {
    id: 'kantor_kota', name: 'Perkantoran', icon: '🏢', category: 'office', allowed: 'land',
    shape: 'office', cost: 5, value: 11, coinsPerMin: 6, growthPerMin: 2, population: 2, jobs: 14, eco: -1, happiness: 0,
    color: '#8fd0ff', description: 'Menara kantor penyedia lapangan kerja dan pemasukan koin tetap.',
  },
  {
    id: 'pabrik_ringan', name: 'Industri Ringan', icon: '🏭', category: 'industry', allowed: 'land',
    shape: 'factory', cost: 6, value: 13, coinsPerMin: 8, growthPerMin: 2, population: 1, jobs: 10, eco: -2, happiness: -1,
    color: '#ffb066', description: 'Pabrik bersih berteknologi sensor; pemasukan tinggi, ekosistem turun.',
  },
  {
    id: 'taman_rekreasi', name: 'Rekreasi Kota', icon: '🎡', category: 'recreation', allowed: 'land',
    shape: 'park', cost: 4, value: 9, coinsPerMin: 4, growthPerMin: 2, population: 1, jobs: 4, eco: 2, happiness: 3,
    color: '#7cf5a0', description: 'Ruang rekreasi dan taman kota; menaikkan ekosistem serta kebahagiaan.',
  },
  {
    id: 'rumah_apung', name: 'Rumah Apung', icon: '🛶', category: 'residential', allowed: 'sea',
    shape: 'floating_house', cost: 5, value: 10, coinsPerMin: 5, growthPerMin: 2, population: 8, jobs: 1, eco: 1, happiness: 1,
    color: '#9fe8ff', description: 'Hunian terapung tahan gelombang; menambah populasi pesisir.',
  },
  {
    id: 'menara_marina', name: 'Menara Marina', icon: '🏙️', category: 'office', allowed: 'sea',
    shape: 'marina_tower', cost: 7, value: 16, coinsPerMin: 9, growthPerMin: 3, population: 2, jobs: 18, eco: 0, happiness: 0,
    color: '#b898ff', description: 'Menara kantor di atas dermaga; lapangan kerja terbanyak.',
  },
  {
    id: 'pelabuhan_kargo', name: 'Pelabuhan Kargo', icon: '🚢', category: 'industry', allowed: 'sea',
    shape: 'port', cost: 8, value: 18, coinsPerMin: 12, growthPerMin: 3, population: 1, jobs: 16, eco: -3, happiness: -1,
    color: '#ffc94d', description: 'Terminal logistik laut; pemasukan koin tertinggi, ekosistem turun.',
  },
  {
    id: 'resort_bahari', name: 'Resort Bahari', icon: '🏖️', category: 'recreation', allowed: 'sea',
    shape: 'resort', cost: 6, value: 14, coinsPerMin: 8, growthPerMin: 3, population: 1, jobs: 8, eco: 1, happiness: 3,
    color: '#ff9fd0', description: 'Resort tepi laut; koin besar dengan ekosistem dan kebahagiaan positif.',
  },
];

export const DISTRICT_CATEGORIES = [
  { id: 'residential', label: 'Rumah Tinggal', icon: '🏠', color: '#ffd08a' },
  { id: 'office', label: 'Perkantoran', icon: '🏢', color: '#8fd0ff' },
  { id: 'industry', label: 'Industri', icon: '🏭', color: '#ffb066' },
  { id: 'recreation', label: 'Rekreasi', icon: '🎡', color: '#7cf5a0' },
];

export const DISTRICT_PLOT_BY_ID = Object.fromEntries(DISTRICT_PLOTS.map((plot) => [plot.id, plot]));
export const DISTRICT_BUILDING_BY_ID = Object.fromEntries(DISTRICT_BUILDINGS.map((item) => [item.id, item]));
export const districtPlotsFor = (kind) => DISTRICT_PLOTS.filter((plot) => plot.kind === kind);
export const districtBuildingsFor = (kind) => DISTRICT_BUILDINGS.filter((item) => item.allowed === kind);
export const districtCategory = (id) => DISTRICT_CATEGORIES.find((item) => item.id === id) || DISTRICT_CATEGORIES[0];
