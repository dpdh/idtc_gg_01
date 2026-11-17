// Run: node --test __tests__/shopDistrict.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/survival/data/shopDistrict.js', import.meta.url), 'utf8');
const district = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { SHOP_DISTRICT, SHOP_BUILDINGS, SHOP_PANELS } = district;

const footprint = (b) => [b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2];

test('lima bangunan berjejer rapi pada satu baris dengan jarak seragam', () => {
  assert.equal(SHOP_BUILDINGS.length, 5);
  const zs = new Set(SHOP_BUILDINGS.map((b) => b.z));
  assert.equal(zs.size, 1, 'semua bangunan memakai satu garis z');
  assert.equal([...zs][0], SHOP_DISTRICT.rowZ);

  const sorted = [...SHOP_BUILDINGS].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = (sorted[i].x - sorted[i].w / 2) - (sorted[i - 1].x + sorted[i - 1].w / 2);
    assert.ok(Math.abs(gap - SHOP_DISTRICT.gap) < 1e-9, `gap ${i} = ${gap}`);
  }
});

test('tidak ada bangunan yang saling menimpa dan semuanya di dalam pelataran', () => {
  SHOP_BUILDINGS.forEach((a) => {
    const ra = footprint(a);
    assert.ok(ra[0] >= SHOP_DISTRICT.pad.x0 && ra[2] <= SHOP_DISTRICT.pad.x1, `${a.id} keluar batas X`);
    assert.ok(ra[1] >= SHOP_DISTRICT.pad.z0 && ra[3] <= SHOP_DISTRICT.pad.z1, `${a.id} keluar batas Z`);
    SHOP_BUILDINGS.forEach((b) => {
      if (a.id >= b.id) return;
      const rb = footprint(b);
      const overlap = ra[0] < rb[2] && rb[0] < ra[2] && ra[1] < rb[3] && rb[1] < ra[3];
      assert.equal(overlap, false, `${a.id} menimpa ${b.id}`);
    });
  });
});

test('pintu tiap bangunan berada di depan fasad dan dekat trotoar', () => {
  SHOP_BUILDINGS.forEach((b) => {
    assert.equal(b.front, b.z - b.d / 2);
    assert.ok(b.door[1] < b.front, `${b.id}: pintu harus di sisi depan (-Z)`);
    assert.ok(Math.abs(b.front - b.door[1] - 0.5) < 1e-9);
    assert.ok(district.insideShopDistrict(b.door[0], b.door[1]));
  });
  assert.deepEqual(SHOP_DISTRICT.door, SHOP_BUILDINGS[0].door, 'titik utama = pintu Toko TWINI');
});

test('insideShopDistrict dan nearestShopBuilding memakai radius yang benar', () => {
  const store = SHOP_BUILDINGS[0];
  assert.equal(district.insideShopDistrict(store.door[0], store.door[1]), true);
  assert.equal(district.insideShopDistrict(store.door[0], store.door[1] + 12), false);
  assert.equal(district.insideShopDistrict(store.door[0], store.door[1], 12), true);

  const hit = district.nearestShopBuilding(store.door[0], store.door[1]);
  assert.equal(hit.building.id, 'toko-twini');
  assert.ok(hit.distance < 0.001);
  assert.equal(district.nearestShopBuilding(0, 0), null);

  const garage = SHOP_BUILDINGS.find((b) => b.id === 'garasi-kendaraan');
  assert.equal(district.nearestShopBuilding(garage.door[0] + 3.5, garage.door[1], 1), null, 'di luar radius tidak terdeteksi');
});

test('distrik berada di luar jalan lingkar Monas (utara Jalan M. H. Saleh Ishak)', () => {
  assert.ok(SHOP_DISTRICT.pad.z0 > 33.1, 'pelataran harus di utara jalan lingkar');
  assert.ok(SHOP_DISTRICT.pad.x0 > 10 && SHOP_DISTRICT.pad.x1 < 46);
  assert.equal(district.insideShopDistrict(28, 30), false, 'tidak menutup jalan/plaza');
});

test('setiap bangunan punya panel toko yang valid dan warna/ukuran wajar', () => {
  SHOP_BUILDINGS.forEach((b) => {
    assert.ok(b.name && b.short && b.role, b.id);
    assert.ok(SHOP_PANELS.includes(b.panel), `${b.id}: panel ${b.panel}`);
    assert.ok(b.w >= 3 && b.w <= 6 && b.d >= 3 && b.d <= 5 && b.h >= 2 && b.h <= 5, `${b.id}: dimensi`);
    assert.match(b.color, /^#[0-9a-f]{6}$/i);
  });
  assert.deepEqual([...new Set(SHOP_BUILDINGS.map((b) => b.panel))].sort(), ['accessories', 'buildings', 'vehicles', 'weapons']);
});
