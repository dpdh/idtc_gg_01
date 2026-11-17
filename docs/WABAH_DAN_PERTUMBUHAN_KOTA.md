# Wabah Digital & Pertumbuhan Kota

Fitur baru di **TWINI Survival**: skenario pencarian **Wabah Digital** — ancaman fiktif yang menyerang
ekosistem Digital Twin Jakarta. Pemain mencari wabah, menembaknya dengan karakter Twini, lalu
menggunakan **Poin Pertumbuhan Kota** untuk membangun petak tanah dan aset bangunan sehingga kawasan
tumbuh secara visual di dalam scene 3D.

> Semua ancaman di dokumen ini adalah mekanik permainan (simulasi), bukan kondisi lingkungan nyata.

---

## 1. Alur permainan

1. **Cari wabah** — buka menu `Wabah & Pertumbuhan Kota` (atau tombol `WABAH` di HUD dalam game).
   Panel menampilkan jenis wabah, zona kemunculan, dan tombol **Cari & Tembak Wabah**.
2. **Tembak** — Twini otomatis menghadap wabah terdekat lalu meluncurkan plasma (sistem lock-on
   pelontar yang sudah ada). Jika jarak > 26 m, permainan memasang waypoint kuning supaya Twini
   mendekat dulu. Bisa juga menembak manual dengan tombol **FIRE**.
3. **Dapatkan reward** — setiap wabah hancur memberi XP, koin, energi, dan **Poin Pertumbuhan Kota**.
4. **Bangun kota** — belanjakan poin pada petak bidang tanah (plot) yang sudah terbuka untuk membangun
   aset kota. Bangunan langsung muncul di scene 3D pada koordinat petak tersebut.
5. **Buka petak baru** — petak terbuka bertahap sesuai jumlah wabah yang sudah dinetralkan.

Posisi petak & wabah, saldo poin, dan daftar bangunan disimpan otomatis (autosave 5 detik) melalui
`extra` pada `useTwinGame`, jadi progres bertahan setelah aplikasi ditutup.

---

## 2. Jenis wabah (`src/features/survival/data/wabah.js`)

| Wabah | HP | Zona | Reward | Poin tumbuh |
| --- | --- | --- | --- | --- |
| 👻 Fantom Data | 1 | Gateway, Merdeka, Monument | 40 XP · 10 koin · 5 energi | 1 |
| 🧩 Simpul Glitch | 2 | Smart Infra, Monument | 60 XP · 14 koin · 7 energi | 2 |
| 🦠 Wabah Alga Digital | 2 | Water Management, Green Park | 70 XP · 16 koin · 8 energi | 2 |
| 🌫️ Gerombolan Emisi | 1 | Smart Infra, Energy | 45 XP · 11 koin · 5 energi | 1 |
| ☣️ Virus Kernel | 3 | Monument, Energy, Emergency | 110 XP · 24 koin · 10 energi | 3 |

Total ada **16 titik pencarian** (`WABAH_SPAWNS`). Setiap wabah muncul kembali 24 detik setelah
dihancurkan, sehingga poin pertumbuhan selalu bisa ditambah.

---

## 3. Petak tanah & aset kota (`src/features/game/engine/cityGrowth.js`)

Delapan petak (`GROWTH_PLOTS`) tersebar di zona Park, Smart Infra, Energy, Water, Merdeka,
Emergency, dan Gateway. Petak terbuka berdasarkan jumlah wabah yang dinetralkan
(`unlockCleared`), dan setiap petak menampilkan bidang tanah, tiang sudut, serta beacon untuk petak
yang masih kosong.

Aset yang bisa dibangun (`BUILDING_CATALOG`):

| Aset | Biaya | Manfaat |
| --- | --- | --- |
| 🌳 Taman Ekologi | 2 poin | ekosistem +3, kesehatan +1 |
| 📡 Hub Sensor | 3 poin | data +3, energi +1 |
| 🔆 Kanopi Surya | 3 poin | energi +3, ekosistem +1 |
| 💧 Taman Air | 4 poin | ekosistem +2, data +1, kesehatan +1 |
| 🌱 Pertanian Vertikal | 5 poin | ekosistem +2, energi +1, kesehatan +2 |
| 🏥 Pos Sehat | 5 poin | kesehatan +3, data +1 |
| 🏙️ Twin Tower | 6 poin | data +3, energi +2, ekosistem +1 |
| 🚉 Hub Transit | 7 poin | ekosistem +1, energi +2, data +2, kesehatan +1 |

Ringkasan manfaat menghasilkan **Indeks Pertumbuhan Kota** (0–100%) dan level 1–5 yang tampil di
panel. Bangunan bisa diganti di petak yang sama dengan membayar biaya aset baru.

---

## 4. Misi baru

Ditambahkan ke `src/features/game/data/gameContent.json` (kategori **weekly**, reward divalidasi server):

| ID | Judul | Objektif | Reward |
| --- | --- | --- | --- |
| `w-wabah-digital` | Wabah Digital Ekosistem | `purge_wabah` × 8 | 320 TP · 180 XP |
| `w-kota-hijau` | Pertumbuhan Kota Hijau | `build_city_asset` × 3 (unik per petak) | 400 TP · 220 XP |

Event `purge_wabah` dan `build_city_asset` juga ditambahkan ke whitelist `OBJECTIVE_EVENTS` di
`server/game.js`, sehingga misi bisa diklaim dan divalidasi server seperti misi lain.

---

## 5. Struktur teknis

| File | Peran |
| --- | --- |
| `src/features/survival/data/wabah.js` | Definisi 5 jenis wabah + 16 titik spawn + helper |
| `src/features/game/engine/cityGrowth.js` | State pertumbuhan kota, 8 petak, 8 aset, fungsi murni (build/unlock/summary) |
| `src/features/survival/components/WabahLayer.js` | Simulasi + render 3D wabah, HP, respawn, publish ke `controlRef` |
| `src/features/survival/components/CityGrowthLayer.js` | Render bidang tanah, beacon, dan mesh bangunan |
| `src/features/survival/components/Combat.js` | Lock-on & hit test plasma juga mengenai wabah |
| `src/features/game/components/CityGrowthPanel.js` | Panel UI: statistik, jenis wabah, pembangunan petak |
| `src/features/survival/screens/TwiniSurvivalScreen.js` | State `growth`, handler `onWabah`, panel `wabah`, tombol HUD/menu |
| `__tests__/cityGrowth.test.mjs` | 7 unit test untuk aturan pertumbuhan kota & integritas konten |

### Integrasi 3D

- `WabahLayer` menulis `controlRef.current.wabah` (array entri hidup dengan `pos` dan `alive`) dan
  `controlRef.current.wabahSim` (metode `damage(id)`). `CombatLayer` membaca keduanya di frame loop
  yang sama, jadi tidak ada state React per frame.
- Setiap tembakan mengirim event `{ type: 'hit' | 'down', id, kind, zone }` ke
  `controlRef.current.onWabah`, yang dipasang oleh layar game untuk memberi reward dan memicu misi.
- Pertumbuhan kota dirender oleh `CityGrowthLayer` dari prop `growth` (state React), sehingga
  bangunan baru langsung tampil tanpa reload scene.

---

## 6. Pengujian

```bash
npm run test:growth   # 7 test pertumbuhan kota
npm test              # mission engine + city growth + API server (27 test)
```

