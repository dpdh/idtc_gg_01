// Distrik Toko TWINI: satu baris bangunan penunjang di luar jalan lingkar Monas (utara-timur).
// Data ini dipakai bersama oleh scene 3D (ShopDistrictLayer) dan layar game (prompt INTERACT,
// teleport, dan pembukaan tab toko), sehingga koordinat tidak pernah berbeda.
//
// Denah (sumbu X = lebar baris, -Z = sisi depan menghadap Monas):
//
//   barat  [Toko TWINI] [Bengkel Laser] [Garasi] [Gudang Aset] [Pos Layanan]  timur
//          └──────────────────── trotoar + 6 lampu + planter ─────────────────┘
//                        (selatan, menghadap pelataran Monas)

const GAP = 1.5;
const ROW_Z = 37.2; // 0,8 unit di utara jalan lingkar Jalan M. H. Saleh Ishak (z ≈ 33,1)

// Ukuran tiap unit. Total lebar = 27,2 unit; pad 29,2 × 6,2 unit.
const UNITS = [
  {
    id: 'toko-twini', type: 'store', name: 'Toko TWINI', short: 'TOKO',
    role: 'Senjata, aksesori & upgrade', panel: 'weapons',
    w: 5.6, d: 4.4, h: 3.8, color: '#7cf5ff',
  },
  {
    id: 'bengkel-laser', type: 'weapons', name: 'Bengkel Laser', short: 'BENGKEL',
    role: 'Aksesori & perawatan senjata', panel: 'accessories',
    w: 4.0, d: 3.4, h: 2.9, color: '#b798ff',
  },
  {
    id: 'garasi-kendaraan', type: 'garage', name: 'Garasi Kendaraan', short: 'GARASI',
    role: 'Turbo, suspensi & armor', panel: 'vehicles',
    w: 4.0, d: 3.4, h: 2.7, color: '#ffd56e',
  },
  {
    id: 'gudang-aset', type: 'warehouse', name: 'Gudang Aset Kota', short: 'GUDANG',
    role: 'Poin pertumbuhan & aset kota', panel: 'buildings',
    w: 4.0, d: 3.4, h: 3.1, color: '#6ee7a8',
  },
  {
    id: 'pos-layanan', type: 'service', name: 'Pos Layanan Warga', short: 'LAYANAN',
    role: 'Info, misi & bantuan', panel: 'buildings',
    w: 3.6, d: 3.2, h: 2.6, color: '#ff9be8',
  },
];

const totalWidth = UNITS.reduce((sum, unit) => sum + unit.w, 0) + GAP * (UNITS.length - 1);
const startX = 28 - totalWidth / 2; // baris dipusatkan di x = 28

let cursor = startX;
export const SHOP_BUILDINGS = UNITS.map((unit) => {
  const x = cursor + unit.w / 2;
  cursor += unit.w + GAP;
  const doorZ = ROW_Z - unit.d / 2 - 0.5; // 0,5 unit di depan fasad
  return {
    ...unit,
    x,
    z: ROW_Z,
    door: [x, doorZ],
    front: ROW_Z - unit.d / 2,
  };
});

const PAD_MARGIN_X = 1.0;
const PAD_FRONT = 1.2;
const PAD_BACK = 0.9;

export const SHOP_DISTRICT = {
  id: 'twini-shop-district',
  name: 'Twini Shop District',
  gap: GAP,
  rowZ: ROW_Z,
  totalWidth,
  pad: {
    x0: startX - PAD_MARGIN_X,
    x1: startX + totalWidth + PAD_MARGIN_X,
    z0: ROW_Z - 4.4 / 2 - PAD_FRONT,
    z1: ROW_Z + 4.4 / 2 + PAD_BACK,
  },
  // Titik interaksi utama: pintu Toko TWINI.
  door: SHOP_BUILDINGS[0].door,
  // Gapura kecil di sisi barat (menghadap gerbang/spawn Monas).
  gate: [startX - PAD_MARGIN_X + 0.2, ROW_Z],
  buildings: SHOP_BUILDINGS,
};

export const SHOP_BUILDING_BY_ID = Object.fromEntries(SHOP_BUILDINGS.map((b) => [b.id, b]));
export const SHOP_PANELS = ['weapons', 'accessories', 'buildings', 'vehicles'];

export function insideShopDistrict(x, z, margin = 0) {
  const pad = SHOP_DISTRICT.pad;
  return x >= pad.x0 - margin && x <= pad.x1 + margin && z >= pad.z0 - margin && z <= pad.z1 + margin;
}

// Bangunan dengan pintu terdekat (untuk prompt INTERACT). Radius default 3,2 unit.
export function nearestShopBuilding(x, z, radius = 3.2) {
  let best = null;
  SHOP_BUILDINGS.forEach((building) => {
    const distance = Math.hypot(building.door[0] - x, building.door[1] - z);
    if (distance <= radius && (!best || distance < best.distance)) best = { building, distance };
  });
  return best;
}
