// Run: node --test __tests__/monasTerrace.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = async (relativePath) => {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
};

const terrace = await load('../src/features/survival/data/monasTerrace.js');

test('pelataran Monas punya tinggi walkable 0.95 di seluruh plinth', () => {
  assert.equal(terrace.monasRaisedHeight(0, 0), terrace.MONAS_WALK_Y);
  assert.equal(terrace.monasRaisedHeight(0, 6.6), terrace.MONAS_WALK_Y);
  assert.equal(terrace.monasRaisedHeight(6.6, 0), terrace.MONAS_WALK_Y);
  assert.equal(terrace.monasRaisedHeight(-6.6, -6.6), terrace.MONAS_WALK_Y);
  assert.equal(terrace.monasRaisedHeight(4.5, 3.1), terrace.MONAS_WALK_Y);
});

test('tangga di 4 sisi menurun dari pelataran ke tanah', () => {
  const edge = terrace.MONAS_TERRACE_HALF;
  const run = terrace.MONAS_STAIR_RUN;
  const mid = edge + run * 0.5;
  const topZ = terrace.monasRaisedHeight(0, edge);
  const topX = terrace.monasRaisedHeight(edge, 0);
  const midZ = terrace.monasRaisedHeight(0, mid);
  const midX = terrace.monasRaisedHeight(mid, 0);
  const midNegZ = terrace.monasRaisedHeight(0, -mid);
  const midNegX = terrace.monasRaisedHeight(-mid, 0);
  assert.ok(topZ > 0.9 && topX > 0.9, 'tepi pelataran setinggi teras');
  for (const value of [midZ, midX, midNegZ, midNegX]) {
    assert.ok(value > 0 && value < terrace.MONAS_WALK_Y, `tangga harus menurun (got ${value})`);
  }
  assert.equal(terrace.monasRaisedHeight(0, edge + run + 0.05), 0);
  assert.equal(terrace.monasRaisedHeight(0, -(edge + run + 0.05)), 0);
  assert.equal(terrace.monasRaisedHeight(edge + run + 0.05, 0), 0);
  assert.equal(terrace.monasRaisedHeight(-(edge + run + 0.05), 0), 0);
});

test('di luar tangga tidak ada lantai melayang', () => {
  const edge = terrace.MONAS_TERRACE_HALF;
  // Titik di luar lebar tangga (along > 2,3) dan di luar pelataran harus tanah, bukan melayang.
  assert.equal(terrace.monasRaisedHeight(3.5, edge + 0.2), 0, 'z di luar pelataran+luar tangga harus tanah');
  assert.equal(terrace.monasRaisedHeight(edge + 0.2, 3.5), 0, 'x di luar pelataran+luar tangga harus tanah');
  const rampAt02 = terrace.monasRaisedHeight(edge + 0.2, 0);
  assert.ok(Math.abs(rampAt02 - terrace.MONAS_WALK_Y * (1 - 0.2 / terrace.MONAS_STAIR_RUN)) < 1e-9, 'titik 0,2 di atas tepi tangga masih menurun');
  assert.equal(terrace.monasRaisedHeight(5, 5), terrace.MONAS_WALK_Y);
});

test('badan tugu tetap solid dan lebih kecil dari pelataran', () => {
  assert.equal(terrace.insideMonasTower(0, 0), true);
  assert.equal(terrace.insideMonasTower(3.1, 3.1), true);
  assert.equal(terrace.insideMonasTower(3.3, 0), false);
  assert.equal(terrace.insideMonasTower(0, 5.5), false, 'pelataran (3.2–6.7) harus walkable');
  assert.ok(terrace.MONAS_TERRACE_HALF > terrace.MONAS_TOWER_HALF + 2, 'pelataran minimal 2 unit lebih lebar');
});

test('tinggi pelataran konsisten dengan tinggi visual tower', () => {
  assert.ok(Math.abs(terrace.MONAS_WALK_Y - 0.95) < 1e-9);
});
