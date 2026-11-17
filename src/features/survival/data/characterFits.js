// Proporsi tubuh tiap karakter Twini (rasio terhadap tinggi avatar 0..1) dipakai CharacterCosmetics
// supaya topi, pakaian, sepatu, dan lencana duduk pas di kepala/dada/kaki model yang berbeda-beda.
//
// - `headTop`  : tinggi puncak kepala (tempat topi diletakkan)
// - `headR`    : radius kepala (lebar topi mengikuti)
// - `chestY`   : tinggi dada (pakaian & lencana)
// - `torsoW`   : lebar tubuh (diameter), `torsoD` : tebal tubuh
// - `footY`    : tinggi mata kaki, `footGap` : jarak kaki dari sumbu tengah, `footLen` : panjang sepatu
const HUMANOID = {
  body: 'humanoid',
  headTop: 0.925, headR: 0.083, neckY: 0.845,
  chestY: 0.64, waistY: 0.52,
  torsoW: 0.21, torsoD: 0.115, shoulderW: 0.27,
  footY: 0.03, footGap: 0.078, footLen: 0.16,
  hatLift: 0.015,
};

// Avatar fallback TWINI adalah "digital guardian" chibi: kepala besar, badan pendek.
const CHIBI = {
  body: 'chibi',
  headTop: 0.86, headR: 0.215, neckY: 0.64,
  chestY: 0.45, waistY: 0.35,
  torsoW: 0.38, torsoD: 0.32, shoulderW: 0.46,
  footY: 0.03, footGap: 0.1, footLen: 0.18,
  hatLift: 0.02,
};

// Penyempurnaan per karakter (model GLB punya bentuk kepala/bahu sedikit berbeda).
export const CHARACTER_FITS = {
  'twini-idtc': { ...HUMANOID, headR: 0.086, torsoW: 0.225, shoulderW: 0.28 },
  'insan-adhi': { ...HUMANOID, headR: 0.079, chestY: 0.65, torsoW: 0.2 },
  'insan-adhi-w01': { ...HUMANOID, headR: 0.077, torsoW: 0.19, shoulderW: 0.255 },
  'dni-01': { ...HUMANOID, headR: 0.09, torsoW: 0.235, shoulderW: 0.295 },
  'dni-02': { ...HUMANOID, headR: 0.082, torsoW: 0.215 },
  'asn-ihsan': { ...HUMANOID, headR: 0.085, chestY: 0.67, torsoW: 0.215, shoulderW: 0.29 },
};

export const FALLBACK_FIT = CHIBI;
export const characterFit = (characterId) => CHARACTER_FITS[characterId] || HUMANOID;

// Gabungkan rasio bawaan dengan ukuran kotak model (lebar/tebal) agar pakaian tidak terlalu sempit
// atau melebar pada model yang proporsinya berbeda.
export function resolveFit(characterId, frame) {
  const base = characterFit(characterId);
  const size = frame?.size;
  const h = size?.[1];
  if (!size || !(h > 0)) return base;
  const w = size[0] / h;
  const d = size[2] / h;
  if (!(w > 0) || !(d > 0)) return base;
  return {
    ...base,
    // Siluet manusia +/- 0,2–0,35 dari tinggi; pakai campuran rasio bawaan & hasil ukur.
    torsoW: Math.min(0.34, Math.max(0.14, base.torsoW * 0.5 + w * 0.42)),
    torsoD: Math.min(0.26, Math.max(0.07, base.torsoD * 0.5 + d * 0.45)),
    shoulderW: Math.min(0.42, Math.max(0.18, base.shoulderW * 0.5 + w * 0.5)),
  };
}
