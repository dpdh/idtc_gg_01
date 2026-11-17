// Engine kosmetik karakter — fungsi murni (state in → state out) supaya mudah diuji & disimpan.
//
// Setiap karakter Twini punya PROFIL aksesori sendiri, jadi Twini Engineer bisa memakai helm proyek
// sementara model lain tampil tanpa topi, dst.
//
// state = {
//   disciplineId: string,
//   owned: string[],                                  // item yang sudah dimiliki (lintas karakter)
//   profiles: {
//     [characterId]: {
//       equipped: { [slot]: itemId | null },          // item yang dipilih per slot
//       enabled:  { [slot]: boolean },                // dipakai atau tidak (toggle ON/OFF)
//     },
//   },
// }
import {
  COSMETIC_SLOTS,
  cosmeticById,
  cosmeticsForDiscipline,
} from '../../survival/data/disciplineCosmetics';

export const DEFAULT_CHARACTER_ID = 'twini-idtc';

const starterItems = (disciplineId) => cosmeticsForDiscipline(disciplineId).filter((item) => !item.premium);

export function emptyProfile(disciplineId) {
  const starters = starterItems(disciplineId);
  const equipped = {};
  const enabled = {};
  COSMETIC_SLOTS.forEach((slot) => {
    equipped[slot] = starters.find((item) => item.slot === slot)?.id || null;
    enabled[slot] = true;
  });
  return { equipped, enabled };
}

export function defaultCosmetics(disciplineId, characterIds = [DEFAULT_CHARACTER_ID]) {
  const profiles = {};
  characterIds.forEach((id) => { profiles[id] = emptyProfile(disciplineId); });
  if (!profiles[DEFAULT_CHARACTER_ID]) profiles[DEFAULT_CHARACTER_ID] = emptyProfile(disciplineId);
  return { disciplineId, owned: starterItems(disciplineId).map((item) => item.id), profiles };
}

export const cosmeticOwned = (state, id) => !!state?.owned?.includes(id);

// Profil karakter (default dibentuk dari item dasar disiplin bila belum ada).
export function profileFor(state, characterId = DEFAULT_CHARACTER_ID) {
  return state?.profiles?.[characterId] || emptyProfile(state?.disciplineId);
}

export const withProfile = (state, characterId) => {
  if (state.profiles?.[characterId]) return state;
  return { ...state, profiles: { ...state.profiles, [characterId]: emptyProfile(state.disciplineId) } };
};

// Item yang benar-benar tampil di badan: harus dimiliki, dipilih, DAN slotnya diaktifkan.
export function equippedItem(state, slot, characterId = DEFAULT_CHARACTER_ID) {
  const profile = profileFor(state, characterId);
  if (!profile.enabled?.[slot]) return null;
  const item = cosmeticById(profile.equipped?.[slot]);
  if (!item || !cosmeticOwned(state, item.id)) return null;
  return item;
}

// Dipakai saat pemain mengganti disiplin: set baru otomatis dipakai tiap karakter, item premium yang
// pernah dibeli untuk disiplin itu tetap tersimpan di `owned`.
export function cosmeticsForDisciplineChange(previous, nextDisciplineId, characterIds = [DEFAULT_CHARACTER_ID]) {
  const fresh = defaultCosmetics(nextDisciplineId, characterIds);
  const keep = (previous?.owned || []).filter((id) => {
    const item = cosmeticById(id);
    return item && item.discipline === nextDisciplineId;
  });
  return { ...fresh, owned: Array.from(new Set([...fresh.owned, ...keep])) };
}

export function buyCosmetic(state, id, coins, characterId = DEFAULT_CHARACTER_ID) {
  const item = cosmeticById(id);
  if (!item) return { ok: false, error: 'Atribut tidak dikenal.', state, coins };
  if (item.discipline !== state.disciplineId) return { ok: false, error: 'Atribut ini milik disiplin lain.', state, coins };
  if (cosmeticOwned(state, id)) return { ok: false, error: 'Atribut ini sudah dimiliki.', state, coins };
  const price = Math.max(0, Number(item.price) || 0);
  if ((Number(coins) || 0) < price) return { ok: false, error: `Koin kurang ${price - (Number(coins) || 0)}.`, state, coins };
  const base = withProfile(state, characterId);
  const profile = profileFor(base, characterId);
  return {
    ok: true,
    item,
    price,
    coins: (Number(coins) || 0) - price,
    state: {
      ...base,
      owned: [...base.owned, id],
      profiles: {
        ...base.profiles,
        [characterId]: {
          equipped: { ...profile.equipped, [item.slot]: id },
          enabled: { ...profile.enabled, [item.slot]: true },
        },
      },
    },
  };
}

export function equipCosmetic(state, id, characterId = DEFAULT_CHARACTER_ID) {
  const item = cosmeticById(id);
  if (!item) return { ok: false, error: 'Atribut tidak dikenal.', state };
  if (item.discipline !== state.disciplineId) return { ok: false, error: 'Atribut ini milik disiplin lain.', state };
  if (!cosmeticOwned(state, id)) return { ok: false, error: 'Beli atribut ini terlebih dahulu.', state };
  const base = withProfile(state, characterId);
  const profile = profileFor(base, characterId);
  return {
    ok: true,
    item,
    state: {
      ...base,
      profiles: {
        ...base.profiles,
        [characterId]: {
          equipped: { ...profile.equipped, [item.slot]: id },
          enabled: { ...profile.enabled, [item.slot]: true },
        },
      },
    },
  };
}

export function unequipCosmeticSlot(state, slot, characterId = DEFAULT_CHARACTER_ID) {
  if (!COSMETIC_SLOTS.includes(slot)) return { ok: false, error: 'Slot tidak dikenal.', state };
  const base = withProfile(state, characterId);
  const profile = profileFor(base, characterId);
  return {
    ok: true,
    state: { ...base, profiles: { ...base.profiles, [characterId]: { ...profile, equipped: { ...profile.equipped, [slot]: null } } } },
  };
}

// ON/OFF: aksesori tetap tersimpan di slot, hanya disembunyikan dari badan karakter.
export function setCosmeticSlotEnabled(state, slot, characterId, enabled) {
  if (!COSMETIC_SLOTS.includes(slot)) return { ok: false, error: 'Slot tidak dikenal.', state };
  const base = withProfile(state, characterId);
  const profile = profileFor(base, characterId);
  return {
    ok: true,
    enabled: !!enabled,
    state: {
      ...base,
      profiles: {
        ...base.profiles,
        [characterId]: { ...profile, enabled: { ...profile.enabled, [slot]: !!enabled } },
      },
    },
  };
}

export function toggleCosmeticSlot(state, slot, characterId = DEFAULT_CHARACTER_ID) {
  const profile = profileFor(state, characterId);
  return setCosmeticSlotEnabled(state, slot, characterId, !profile.enabled?.[slot]);
}

// Salin tampilan satu karakter ke semua karakter lain (praktis setelah menyusun set favorit).
export function applyProfileToAll(state, fromCharacterId, characterIds = []) {
  const source = profileFor(state, fromCharacterId);
  const profiles = { ...state.profiles };
  characterIds.forEach((id) => {
    profiles[id] = { equipped: { ...source.equipped }, enabled: { ...source.enabled } };
  });
  return { ...state, profiles };
}

export function cosmeticsSummary(state, characterId = DEFAULT_CHARACTER_ID) {
  const profile = profileFor(state, characterId);
  const items = cosmeticsForDiscipline(state?.disciplineId).map((item) => ({
    ...item,
    owned: cosmeticOwned(state, item.id),
    equipped: profile.equipped?.[item.slot] === item.id,
    active: profile.equipped?.[item.slot] === item.id && !!profile.enabled?.[item.slot],
    slotEnabled: !!profile.enabled?.[item.slot],
  }));
  return {
    items,
    profile,
    owned: items.filter((item) => item.owned).length,
    total: items.length,
    equipped: COSMETIC_SLOTS.filter((slot) => !!profile.equipped?.[slot]).length,
    active: COSMETIC_SLOTS.filter((slot) => !!profile.equipped?.[slot] && profile.enabled?.[slot]).length,
    charactersConfigured: Object.keys(state?.profiles || {}).length,
  };
}

// State dari penyimpanan bisa berasal dari versi lama (equipped di root) atau disiplin lain.
export function normalizeCosmetics(raw, disciplineId, characterIds = [DEFAULT_CHARACTER_ID]) {
  const base = defaultCosmetics(disciplineId, characterIds);
  if (!raw || typeof raw !== 'object') return base;
  const valid = new Set(cosmeticsForDiscipline(disciplineId).map((item) => item.id));
  const owned = new Set(base.owned);
  (raw.owned || []).forEach((id) => { if (valid.has(id)) owned.add(id); });

  const ids = new Set([...characterIds, ...Object.keys(raw.profiles || {})]);
  if (!ids.size) ids.add(DEFAULT_CHARACTER_ID);
  const profiles = {};
  ids.forEach((characterId) => {
    const defaults = emptyProfile(disciplineId);
    // Migrasi save lama: `equipped` di root dipakai sebagai profil awal semua karakter.
    const source = raw.profiles?.[characterId] || { equipped: raw.equipped, enabled: raw.enabled };
    const equipped = { ...defaults.equipped };
    COSMETIC_SLOTS.forEach((slot) => {
      const id = source.equipped?.[slot];
      if (id === null) { equipped[slot] = null; return; }
      const item = cosmeticById(id);
      if (item && item.discipline === disciplineId && item.slot === slot && owned.has(id)) equipped[slot] = id;
    });
    const enabled = { ...defaults.enabled };
    COSMETIC_SLOTS.forEach((slot) => {
      if (typeof source.enabled?.[slot] === 'boolean') enabled[slot] = source.enabled[slot];
    });
    profiles[characterId] = { equipped, enabled };
  });
  return { disciplineId, owned: Array.from(owned), profiles };
}
