// Run: node --test __tests__/district.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

// File aplikasi memakai ESM dengan import relatif; salin ke folder temp sebagai .mjs agar bisa diimpor.
const dir = mkdtempSync(join(tmpdir(), 'twini-district-'));
const write = (name, source) => {
  const target = join(dir, name);
  writeFileSync(target, source);
  return pathToFileURL(target).href;
};

const plotsUrl = write('districtPlots.mjs', read('../src/features/survival/data/districtPlots.js'));
const districtUrl = write(
  'district.mjs',
  read('../src/features/game/engine/district.js').replace("'../../survival/data/districtPlots'", "'./districtPlots.mjs'"),
);
const cosmeticDataUrl = write('disciplineCosmetics.mjs', read('../src/features/survival/data/disciplineCosmetics.js'));
const cosmeticsUrl = write(
  'cosmetics.mjs',
  read('../src/features/game/engine/cosmetics.js').replace("'../../survival/data/disciplineCosmetics'", "'./disciplineCosmetics.mjs'"),
);

const plots = await import(plotsUrl);
const district = await import(districtUrl);
const cosmeticData = await import(cosmeticDataUrl);
const cosmetics = await import(cosmeticsUrl);

// Ikuti angka di Ocean.js: pulau kering r ≤ 52, wade ≤ 55.5, perahu ≥ 56.2, dermaga x ∈ [−2.1, 2.1].
const OPEN_WATER_R = 57;
const PIER_Z = [-81, -51];

test('petak harus dibeli dengan koin dan mengikuti syarat kepemilikan/wabah', () => {
  const start = district.createDistrictState();
  const poor = district.buyPlot(start, 10, 'land-s1', 1000, { cleared: 0 });
  assert.equal(poor.ok, false);
  assert.match(poor.error, /koin/i);

  // Petak kedua butuh 1 petak lain dimiliki.
  const locked = district.buyPlot(start, 1000, 'land-s2', 1000, { cleared: 0 });
  assert.equal(locked.ok, false);
  assert.match(locked.error, /petak lain/i);

  const first = district.buyPlot(start, 100, 'land-s1', 1000, { cleared: 0 });
  assert.equal(first.ok, true);
  assert.equal(first.coins, 20);
  assert.equal(first.state.owned['land-s1'].buildingId, null);
  assert.equal(start.owned['land-s1'], undefined, 'reducer tidak boleh mengubah state lama');

  const second = district.buyPlot(first.state, first.coins, 'land-s2', 2000, { cleared: 0 });
  assert.equal(second.ok, false, 'koin 20 tidak cukup untuk petak 90');
  const rich = district.buyPlot(first.state, 500, 'land-s2', 2000, { cleared: 0 });
  assert.equal(rich.ok, true);
  assert.equal(district.districtOwnedCount(rich.state), 2);
});

test('diskon disiplin menurunkan harga petak', () => {
  const plot = plots.DISTRICT_PLOT_BY_ID['land-e1'];
  assert.equal(district.effectivePlotPrice(plot, {}), plot.price);
  assert.ok(district.effectivePlotPrice(plot, { buildDiscount: 0.25 }) < plot.price);
  assert.equal(district.effectivePlotPrice(plot, { buildDiscount: 5 }), Math.max(20, Math.round(plot.price * 0.25)));
});

test('bangun hanya di petak milik sendiri, jenis petak cocok, dan poin cukup', () => {
  let state = district.createDistrictState();
  const notOwned = district.buildOnDistrictPlot(state, 'land-s1', 'rumah_tapak', 10);
  assert.equal(notOwned.ok, false);
  assert.match(notOwned.error, /beli petak/i);

  state = district.buyPlot(state, 1000, 'land-s1', 1, { cleared: 0 }).state;
  const wrongKind = district.buildOnDistrictPlot(state, 'land-s1', 'resort_bahari', 10);
  assert.equal(wrongKind.ok, false);
  assert.match(wrongKind.error, /petak laut/i);

  const poor = district.buildOnDistrictPlot(state, 'land-s1', 'pabrik_ringan', 2);
  assert.equal(poor.ok, false);
  assert.match(poor.error, /poin/i);

  const built = district.buildOnDistrictPlot(state, 'land-s1', 'rumah_tapak', 10, 5000);
  assert.equal(built.ok, true);
  assert.equal(built.points, 7);
  assert.equal(built.building.id, 'rumah_tapak');
  assert.equal(built.state.owned['land-s1'].buildingId, 'rumah_tapak');
  assert.equal(built.state.owned['land-s1'].builtAt, 5000);
  assert.equal(state.owned['land-s1'].buildingId, null, 'state lama tetap utuh');
});

test('ringkasan wilayah menjumlahkan nilai, pendapatan, populasi, dan kategori', () => {
  let state = district.createDistrictState();
  state = district.buyPlot(state, 5000, 'land-s1', 1, { cleared: 0 }).state;
  state = district.buyPlot(state, 5000, 'land-s2', 2, { cleared: 0 }).state;
  state = district.buildOnDistrictPlot(state, 'land-s1', 'kantor_kota', 99).state;
  state = district.buildOnDistrictPlot(state, 'land-s2', 'taman_rekreasi', 99).state;
  const summary = district.districtSummary(state);
  assert.equal(summary.owned, 2);
  assert.equal(summary.built, 2);
  assert.equal(summary.value, 11 + 9);
  assert.equal(summary.coinsPerMin, 6 + 4);
  assert.equal(summary.population, 2 + 1);
  assert.equal(summary.jobs, 14 + 4);
  assert.equal(summary.byCategory.office, 1);
  assert.equal(summary.byCategory.recreation, 1);
  assert.ok(summary.score > 0 && summary.level >= 1);
});

test('pendapatan wilayah menumpuk per menit, dibatasi 3 jam, lalu direset', () => {
  let state = district.createDistrictState();
  state = district.buyPlot(state, 5000, 'land-s1', 0, { cleared: 0 }).state;
  state = district.buildOnDistrictPlot(state, 'land-s1', 'pabrik_ringan', 99, 0).state;
  state = { ...state, lastCollect: 1000 };
  const noClock = district.pendingDistrictIncome(state, 1000);
  assert.equal(noClock.coins, 0, 'tanpa waktu berjalan belum ada pendapatan');

  const tenMin = district.pendingDistrictIncome(state, 1000 + 10 * 60000);
  assert.equal(tenMin.coins, 80);
  assert.equal(tenMin.growth, 20);

  const capped = district.pendingDistrictIncome(state, 1000 + 999 * 60000);
  assert.equal(capped.minutes, district.MAX_COLLECT_MINUTES);
  assert.equal(capped.coins, 8 * district.MAX_COLLECT_MINUTES);

  const collected = district.collectDistrictIncome(state, 1000 + 10 * 60000);
  assert.equal(collected.ok, true);
  assert.equal(collected.coins, 80);
  assert.equal(collected.state.lastCollect, 1000 + 10 * 60000);
  assert.equal(collected.state.lifetime.coins, 80);
  const again = district.collectDistrictIncome(collected.state, 1000 + 10 * 60000);
  assert.equal(again.ok, false);
});

test('pendapatan mulai menumpuk dari bangunan pertama walau belum pernah klaim', () => {
  let state = district.createDistrictState();
  state = district.buyPlot(state, 5000, 'land-s1', 0, { cleared: 0 }).state;
  state = district.buildOnDistrictPlot(state, 'land-s1', 'rumah_tapak', 99, 1000).state;
  const pending = district.pendingDistrictIncome(state, 1000 + 5 * 60000);
  assert.equal(pending.coins, 15, '3 koin/menit × 5 menit');
  assert.equal(pending.growth, 5);
  const collected = district.collectDistrictIncome(state, 1000 + 5 * 60000);
  assert.equal(collected.ok, true);
  assert.equal(collected.coins, 15);
  assert.equal(collected.state.lifetime.coins, 15);
});

test('normalizeDistrictState membuang id asing dan bangunan yang salah jenis', () => {
  const raw = {
    owned: {
      'land-s1': { boughtAt: 5, buildingId: 'rumah_tapak', builtAt: 6 },
      'land-s2': { boughtAt: 7, buildingId: 'resort_bahari' },
      'plot-hilang': { boughtAt: 1, buildingId: 'rumah_tapak' },
    },
    lastCollect: -20,
    lifetime: { coins: 12.7, growth: -4 },
  };
  const state = district.normalizeDistrictState(raw);
  assert.deepEqual(Object.keys(state.owned), ['land-s1', 'land-s2']);
  assert.equal(state.owned['land-s1'].buildingId, 'rumah_tapak');
  assert.equal(state.owned['land-s2'].buildingId, null, 'bangunan laut tidak boleh di petak darat');
  assert.equal(state.lastCollect, 0);
  assert.equal(state.lifetime.coins, 12);
  assert.equal(state.lifetime.growth, 0);
  assert.deepEqual(district.normalizeDistrictState(null), district.createDistrictState());
});

test('tata letak petak aman: darat di pulau, laut di air terbuka dekat dermaga', () => {
  plots.DISTRICT_PLOTS.forEach((plot) => {
    const [x, z] = plot.center;
    assert.ok(plot.price > 0, `${plot.id} harus punya harga`);
    assert.ok(plot.size >= 4.5, `${plot.id} terlalu kecil`);
    if (plot.kind === 'land') {
      const r = Math.hypot(x, z);
      assert.ok(r < 49, `${plot.id} keluar dari pulau (${r.toFixed(1)})`);
      assert.ok(r > 19.5, `${plot.id} menimpa pelataran Monas`);
      assert.ok(!(x > 12.8 && x < 43.2 && z > 33.2 && z < 40.9), `${plot.id} menimpa distrik toko`);
    } else {
      const r = Math.hypot(x, z);
      assert.ok(r >= OPEN_WATER_R, `${plot.id} belum masuk air terbuka (${r.toFixed(1)})`);
      assert.ok(z > PIER_Z[0] && z < PIER_Z[1], `${plot.id} di luar koridor dermaga`);
      assert.ok(Math.abs(x) <= 30, `${plot.id} terlalu jauh dari dermaga`);
    }
  });
  for (let i = 0; i < plots.DISTRICT_PLOTS.length; i += 1) {
    for (let j = i + 1; j < plots.DISTRICT_PLOTS.length; j += 1) {
      const a = plots.DISTRICT_PLOTS[i];
      const b = plots.DISTRICT_PLOTS[j];
      const d = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]);
      assert.ok(d > (a.size + b.size) / 2, `${a.id} menimpa ${b.id}`);
    }
  }
});

test('katalog bangunan lengkap: 4 kategori di darat & laut dengan biaya dan manfaat', () => {
  const categories = new Set(plots.DISTRICT_CATEGORIES.map((item) => item.id));
  assert.equal(categories.size, 4);
  ['land', 'sea'].forEach((kind) => {
    const list = plots.districtBuildingsFor(kind);
    assert.equal(list.length, 4, `${kind} harus punya 4 bangunan`);
    assert.deepEqual(new Set(list.map((item) => item.category)), categories);
  });
  plots.DISTRICT_BUILDINGS.forEach((building) => {
    assert.ok(building.cost > 0, `${building.id} harus berbiaya`);
    assert.ok(building.value > 0, `${building.id} harus menambah nilai wilayah`);
    assert.ok(building.coinsPerMin >= 0 && building.growthPerMin >= 0);
    assert.ok(building.description.length > 10);
    assert.ok(plots.DISTRICT_BUILDING_BY_ID[building.id]);
  });
  const plotIds = new Set(plots.DISTRICT_PLOTS.map((plot) => plot.id));
  assert.equal(plotIds.size, plots.DISTRICT_PLOTS.length, 'id petak harus unik');
  assert.equal(plots.districtPlotsFor('land').length, 12);
  assert.equal(plots.districtPlotsFor('sea').length, 6);
});

test('kosmetik: tiap disiplin punya 4 slot + 2 premium, beli & equip divalidasi', () => {
  const disciplines = [...new Set(cosmeticData.COSMETIC_ITEMS.map((item) => item.discipline))];
  assert.ok(disciplines.length >= 11, 'semua disiplin harus punya atribut');
  disciplines.forEach((id) => {
    const items = cosmeticData.cosmeticsForDiscipline(id);
    cosmeticData.COSMETIC_SLOTS.forEach((slot) => {
      assert.ok(items.some((item) => item.slot === slot && !item.premium), `${id} kurang ${slot}`);
    });
    assert.equal(items.filter((item) => item.premium).length, 2, `${id} butuh 2 item premium`);
  });

  const state = cosmetics.defaultCosmetics('civil');
  const profile = cosmetics.profileFor(state, 'twini-idtc');
  assert.equal(state.owned.length, 4);
  assert.equal(profile.equipped.hat, 'civil-hat');
  assert.equal(profile.equipped.accessory, 'civil-accessory');
  assert.equal(profile.enabled.hat, true);
  assert.equal(cosmetics.cosmeticsSummary(state).equipped, 4);

  const poor = cosmetics.buyCosmetic(state, 'civil-hat-gold', 10);
  assert.equal(poor.ok, false);
  assert.match(poor.error, /koin/i);

  const bought = cosmetics.buyCosmetic(state, 'civil-hat-gold', 500);
  assert.equal(bought.ok, true);
  assert.equal(bought.coins, 500 - 180);
  assert.equal(cosmetics.profileFor(bought.state, 'twini-idtc').equipped.hat, 'civil-hat-gold', 'item baru langsung dipakai');
  assert.equal(state.owned.includes('civil-hat-gold'), false, 'state lama tidak berubah');

  const foreign = cosmetics.equipCosmetic(state, 'tni-hat');
  assert.equal(foreign.ok, false);
  assert.match(foreign.error, /disiplin lain/i);

  const notOwned = cosmetics.equipCosmetic(state, 'civil-hat-gold');
  assert.equal(notOwned.ok, false);
  assert.match(notOwned.error, /beli/i);

  const unequipped = cosmetics.unequipCosmeticSlot(bought.state, 'hat');
  assert.equal(cosmetics.profileFor(unequipped.state, 'twini-idtc').equipped.hat, null);
  assert.equal(cosmetics.equippedItem(unequipped.state, 'hat'), null);
});

test('profil aksesori terpisah untuk setiap karakter Twini', () => {
  let state = cosmetics.defaultCosmetics('civil', ['twini-idtc', 'dni-01', 'insan-adhi']);
  assert.deepEqual(Object.keys(state.profiles).sort(), ['dni-01', 'insan-adhi', 'twini-idtc']);
  cosmeticData.COSMETIC_SLOTS.forEach((slot) => {
    assert.equal(cosmetics.profileFor(state, 'dni-01').enabled[slot], true, `${slot} aktif secara default`);
  });

  // Item premium dibeli & dipakai khusus untuk dni-01.
  state = cosmetics.buyCosmetic(state, 'civil-hat-gold', 500, 'dni-01').state;
  assert.equal(cosmetics.profileFor(state, 'dni-01').equipped.hat, 'civil-hat-gold');
  assert.equal(cosmetics.profileFor(state, 'twini-idtc').equipped.hat, 'civil-hat', 'karakter lain tidak berubah');
  state = cosmetics.equipCosmetic(state, 'civil-shoes', 'insan-adhi').state;
  assert.equal(cosmetics.profileFor(state, 'insan-adhi').equipped.shoes, 'civil-shoes');
  assert.equal(cosmetics.profileFor(state, 'twini-idtc').equipped.hat, 'civil-hat');

  // "Terapkan ke semua karakter" menyalin tampilan satu karakter ke yang lain.
  const applied = cosmetics.applyProfileToAll(state, 'dni-01', ['twini-idtc', 'dni-01', 'insan-adhi']);
  cosmeticData.COSMETIC_SLOTS.forEach((slot) => {
    assert.equal(cosmetics.profileFor(applied, 'twini-idtc').equipped[slot], cosmetics.profileFor(applied, 'dni-01').equipped[slot]);
  });
});

test('toggle pakai/tidak per slot menyembunyikan aksesori tanpa menghapus pilihan', () => {
  let state = cosmetics.defaultCosmetics('civil');
  assert.equal(cosmetics.equippedItem(state, 'hat')?.id, 'civil-hat');

  const off = cosmetics.toggleCosmeticSlot(state, 'hat');
  assert.equal(off.ok, true);
  assert.equal(cosmetics.profileFor(off.state, 'twini-idtc').enabled.hat, false);
  assert.equal(cosmetics.profileFor(off.state, 'twini-idtc').equipped.hat, 'civil-hat', 'pilihan item tetap tersimpan');
  assert.equal(cosmetics.equippedItem(off.state, 'hat'), null, 'tidak dirender saat OFF');
  assert.equal(cosmetics.cosmeticsSummary(off.state).active, 3);

  const on = cosmetics.setCosmeticSlotEnabled(off.state, 'hat', 'twini-idtc', true);
  assert.equal(cosmetics.equippedItem(on.state, 'hat')?.id, 'civil-hat');
  assert.equal(cosmetics.cosmeticsSummary(on.state).active, 4);

  // Memakai item lain otomatis menyalakan kembali slotnya.
  state = cosmetics.buyCosmetic(state, 'civil-hat-gold', 500).state;
  state = cosmetics.setCosmeticSlotEnabled(state, 'hat', 'twini-idtc', false).state;
  const reEquipped = cosmetics.equipCosmetic(state, 'civil-hat-gold').state;
  assert.equal(cosmetics.profileFor(reEquipped, 'twini-idtc').enabled.hat, true);
});

test('ganti disiplin mempertahankan item premium & mereset profil tiap karakter', () => {
  let state = cosmetics.defaultCosmetics('civil', ['twini-idtc', 'dni-01']);
  state = cosmetics.buyCosmetic(state, 'civil-accessory-gold', 1000, 'dni-01').state;
  const same = cosmetics.cosmeticsForDisciplineChange(state, 'civil', ['twini-idtc', 'dni-01']);
  assert.ok(same.owned.includes('civil-accessory-gold'), 'premium tetap tersimpan saat disiplin sama');
  const moved = cosmetics.cosmeticsForDisciplineChange(state, 'tni', ['twini-idtc', 'dni-01']);
  assert.equal(moved.disciplineId, 'tni');
  cosmeticData.COSMETIC_SLOTS.forEach((slot) => {
    assert.equal(cosmetics.profileFor(moved, 'dni-01').equipped[slot], cosmetics.profileFor(moved, 'twini-idtc').equipped[slot], 'set baru dipakai semua karakter');
  });
  assert.equal(cosmetics.profileFor(moved, 'dni-01').equipped.hat, 'tni-hat');
  assert.ok(moved.owned.includes('tni-shoes'));
  assert.equal(moved.owned.some((id) => id.startsWith('civil-')), false, 'atribut disiplin lama tidak terbawa');
});

test('normalizeCosmetics memigrasi save lama & menolak item/slot tidak valid', () => {
  const raw = {
    disciplineId: 'data',
    owned: ['data-hat', 'civil-hat', 'data-shoes'],
    equipped: { hat: 'civil-hat', shoes: 'tni-shoes', accessory: null, clothing: 'data-clothing' },
  };
  const state = cosmetics.normalizeCosmetics(raw, 'data', ['twini-idtc', 'dni-02']);
  assert.equal(state.disciplineId, 'data');
  assert.ok(state.owned.includes('data-hat'));
  assert.equal(state.owned.includes('civil-hat'), false);
  assert.deepEqual(Object.keys(state.profiles).sort(), ['dni-02', 'twini-idtc']);
  ['twini-idtc', 'dni-02'].forEach((id) => {
    const profile = cosmetics.profileFor(state, id);
    assert.equal(profile.equipped.hat, 'data-hat', 'kembali ke item dasar bila item tersimpan tidak valid');
    assert.equal(profile.equipped.shoes, 'data-shoes');
    assert.equal(profile.equipped.accessory, null, 'slot yang dilepas tetap kosong');
    assert.equal(profile.enabled.hat, true);
  });
  assert.deepEqual(
    cosmetics.normalizeCosmetics(null, 'civil', ['twini-idtc']),
    cosmetics.defaultCosmetics('civil', ['twini-idtc']),
  );
});
