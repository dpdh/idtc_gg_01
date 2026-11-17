// Atribut karakter (kosmetik) khas tiap disiplin: topi, pakaian, sepatu, dan aksesori baju/lencana.
//
// Item dibuat dari tabel gaya yang ringkas supaya konsisten dan mudah ditambah:
//   4 item dasar per disiplin (langsung dimiliki saat disiplin dipilih), plus
//   2 item premium (topi emas & lencana emas) yang dibeli dengan koin permainan.
//
// `shape` dipakai CharacterCosmetics untuk memilih model 3D, `color`/`accent` untuk warnanya.
export const COSMETIC_SLOTS = ['hat', 'clothing', 'shoes', 'accessory'];

export const SLOT_META = {
  hat: { label: 'Topi', icon: '🧢' },
  clothing: { label: 'Pakaian', icon: '🥼' },
  shoes: { label: 'Sepatu', icon: '🥾' },
  accessory: { label: 'Aksesori & Lencana', icon: '🎖️' },
};

const HAT_NAME = {
  hardhat: 'Helm Proyek', fieldcap: 'Topi Lapangan', beret: 'Baret Dinas', visor: 'Visor Digital',
  toga: 'Topi Toga', nurse: 'Topi Perawat', straw: 'Topi Jerami', helmet: 'Helm Taktis',
  hood: 'Hood Teknisi', fedora: 'Topi Arsitek',
};
const CLOTHING_NAME = {
  vest: 'Rompi Kerja', jacket: 'Jaket Lapangan', coat: 'Jas Laboratorium', blazer: 'Blazer Dinas',
  apron: 'Celemek Hijau', uniform: 'Seragam Lapangan',
};
const SHOES_NAME = {
  boot: 'Sepatu Safety', sneaker: 'Sepatu Lari', formal: 'Sepatu Formal', sandal: 'Sandal Lapangan',
};
const ACCESSORY_NAME = {
  badge: 'Lencana Disiplin', sash: 'Selempang Dinas', idcard: 'Kartu Identitas', scarf: 'Syal Dinas',
  medal: 'Medali Penghargaan',
};

// Satu baris = satu disiplin. `shape` mengikuti daftar di atas.
const STYLES = {
  civil: { hat: 'hardhat', clothing: 'vest', shoes: 'boot', accessory: 'badge', color: '#ffc94d', accent: '#2f8be8' },
  geodesy: { hat: 'fieldcap', clothing: 'jacket', shoes: 'sneaker', accessory: 'idcard', color: '#5fd3ff', accent: '#2f6b4f' },
  urban: { hat: 'fedora', clothing: 'blazer', shoes: 'formal', accessory: 'badge', color: '#b898ff', accent: '#6b4ad0' },
  data: { hat: 'visor', clothing: 'jacket', shoes: 'sneaker', accessory: 'idcard', color: '#7cf5ff', accent: '#2f8fd0' },
  architect: { hat: 'beret', clothing: 'blazer', shoes: 'formal', accessory: 'scarf', color: '#ffb066', accent: '#c0642a' },
  planology: { hat: 'straw', clothing: 'vest', shoes: 'boot', accessory: 'sash', color: '#8ef07a', accent: '#3f8f5c' },
  it: { hat: 'hood', clothing: 'jacket', shoes: 'sneaker', accessory: 'badge', color: '#9fd5ff', accent: '#3d7bff' },
  professor: { hat: 'toga', clothing: 'coat', shoes: 'formal', accessory: 'medal', color: '#ffe27a', accent: '#b28a2c' },
  health: { hat: 'nurse', clothing: 'coat', shoes: 'sneaker', accessory: 'idcard', color: '#ff8e9c', accent: '#d03a52' },
  environment: { hat: 'straw', clothing: 'apron', shoes: 'boot', accessory: 'sash', color: '#67f7a3', accent: '#2f7a4c' },
  tni: { hat: 'helmet', clothing: 'uniform', shoes: 'boot', accessory: 'medal', color: '#c9ddf5', accent: '#8f1f2b' },
};

const NAMES = { hat: HAT_NAME, clothing: CLOTHING_NAME, shoes: SHOES_NAME, accessory: ACCESSORY_NAME };
const PREMIUM_SLOTS = ['hat', 'accessory'];
const PREMIUM_PRICE = { hat: 180, accessory: 250 };

const buildItem = (discipline, slot, shape, style, premium = false) => ({
  id: `${discipline}-${slot}${premium ? '-gold' : ''}`,
  discipline,
  slot,
  shape,
  premium,
  name: `${NAMES[slot][shape] || slot}${premium ? ' Emas' : ''}`,
  color: premium ? '#f2c45f' : style.color,
  accent: premium ? style.color : style.accent,
  price: premium ? PREMIUM_PRICE[slot] || 200 : 0,
});

export const COSMETIC_ITEMS = Object.entries(STYLES).flatMap(([discipline, style]) => {
  const base = COSMETIC_SLOTS.map((slot) => buildItem(discipline, slot, style[slot], style));
  const premium = PREMIUM_SLOTS.map((slot) => buildItem(discipline, slot, style[slot], style, true));
  return [...base, ...premium];
});

export const COSMETIC_BY_ID = Object.fromEntries(COSMETIC_ITEMS.map((item) => [item.id, item]));
export const cosmeticsForDiscipline = (disciplineId) => COSMETIC_ITEMS.filter((item) => item.discipline === disciplineId);
export const cosmeticItemsInSlot = (disciplineId, slot) => cosmeticsForDiscipline(disciplineId).filter((item) => item.slot === slot);
export const cosmeticById = (id) => COSMETIC_BY_ID[id] || null;
