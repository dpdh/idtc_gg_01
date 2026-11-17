// Geometri pelataran Monas (dipakai scene 3D, tower, dan unit test).
// Pelataran = plinth persegi 13,4×13,4 (half 6,7) pada ketinggian 0,95 dengan tangga lebar di 4 sisi.
// Tabrakan hanya pada badan tugu (half 3,2) supaya pelataran benar-benar bisa diakses.
export const MONAS_WALK_Y = 0.95;
export const MONAS_TERRACE_HALF = 6.7;
export const MONAS_TOWER_HALF = 3.2;
export const MONAS_STAIR_RUN = 1.7;   // panjang tangga dari tepi pelataran ke tanah
export const MONAS_STAIR_HALF = 2.3;  // setengah lebar tangga

export function monasRaisedHeight(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const outer = Math.max(ax, az);
  const along = Math.min(ax, az);
  if (outer <= MONAS_TERRACE_HALF) return MONAS_WALK_Y;
  if (along <= MONAS_STAIR_HALF && outer <= MONAS_TERRACE_HALF + MONAS_STAIR_RUN) {
    const t = (outer - MONAS_TERRACE_HALF) / MONAS_STAIR_RUN;
    return Math.max(0, MONAS_WALK_Y * (1 - t));
  }
  return 0;
}

// True bila titik berada di dalam badan tugu (tidak bisa dipijak).
export const insideMonasTower = (x, z) => Math.abs(x) < MONAS_TOWER_HALF && Math.abs(z) < MONAS_TOWER_HALF;
