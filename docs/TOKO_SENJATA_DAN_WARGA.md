# Start Point, Toko Senjata, Upgrade, dan Warga (NPC)

Dokumen ini menjelaskan empat sistem yang ditambahkan ke mode eksplorasi TWINI:

1. **Start point** tetap untuk setiap permainan baru.
2. **Pistol laser** yang lebih detail dan bisa diganti (5 tipe).
3. **Toko & Upgrade**: aksesori senjata, upgrade aset kota, dan upgrade kendaraan.
4. **Warga (NPC)** di environment yang bisa diajak bicara.

## 1. Start point

- Data: `src/features/survival/data/startPoints.js` → `START_POINTS` + `startPointFor(envId)`.
- Setiap environment punya titik awal `[-6, 30]` (gerbang selatan plaza).
- `startGame()` di `TwiniSurvivalScreen.js` selalu memindahkan Twini ke start point, mengosongkan
  kecepatan/kendaraan, menurunkan Twini dari kendaraan, dan mengisi ulang sel amunisi.
- Visual: `StartPointMarker` di `SurvivalWorldScene.js` — cincin hijau + beacon berputar di titik awal,
  sehingga pemain langsung tahu di mana harus berdiri saat mulai.
- Teleport "Titik awal" tetap memakai `RESPAWN_POINT` shelter, terpisah dari start point permainan.

## 2. Pistol laser

Katalog: `src/features/survival/data/weapons.js`

| Senjata | Tier | Harga | Damage | Tempo efektif | Sel | Kecepatan proyektil |
| --- | --- | --- | --- | --- | --- | --- |
| Pulse Pistol | 1 | 0 (default) | 1 | 260 ms | 10 | 18 |
| Ion Blaster | 2 | 450 | 2 | 234 ms | 12 | 22 |
| Plasma Magnum | 3 | 900 | 3 | 208 ms | 8 | 26 |
| Quantum Repeater | 4 | 1600 | 2 | 150 ms (batas bawah) | 16 | 30 |
| Nova Cannon | 5 | 2600 | 5 | 299 ms | 6 | 34 |

Tempo = `shotIntervalMs(stats, multiplier)` di `engine/loadout.js`: 260 ms × pengali senjata ×
pengali disiplin (mis. IT), minimum 150 ms. Nilai ini juga ditampilkan di toko ("TEMPO … ms").

- Model 3D (`LauncherModel` di `Combat.js`) kini punya rel atas, sight depan/belakang, scope (tier 2+),
  grip + trigger guard, heat-sink fins, energy cell, muzzle brake berventilasi, side rail, mount bahu,
  twin barrel (tier 3+), cincin glow (tier 4+), dan claw muzzle (tier 5). Warna glow dan skala mengikuti
  senjata yang dipakai.
- Damage/kecepatan proyektil dikirim ke `CombatLayer` lewat prop `weapon`; cooldown tembak dan kapasitas
  sel dihitung di layar (`fire()`, `ammoCap`). Ammo tetap terisi otomatis +1/detik.

## 3. Toko & Upgrade

Engine murni: `src/features/survival/engine/loadout.js` (diuji di `__tests__/loadout.test.mjs`).
UI: `src/features/game/components/ShopPanel.js` (4 tab). Buka lewat menu **Toko & Upgrade** atau ketuk
chip TP/koin di HUD saat bermain.

- **Senjata**: beli sekali, otomatis dipakai; bisa ganti ke senjata yang sudah dimiliki.
- **Aksesori** (berlaku untuk semua pistol): Holo Sight (+1 damage), Cooling Core (−15% jeda),
  Expanded Cell (+4 sel), Accelerator Coil (+25% kecepatan proyektil), Overcharge Chip (+1 damage, −5% jeda).
- **Aset kota**: Atap Surya (+2 energi/aset), Array Sensor (+2 data/aset), Retrofit Hijau
  (+2 ekosistem, +1 kesehatan/aset). Bonus tampil di panel Wabah & Pertumbuhan Kota.
  Tab ini juga punya **Beli Poin Pertumbuhan**: 5 poin = 120 koin, 12 poin = 260 koin,
  25 poin = 480 koin (jalur cepat membeli aset kota tanpa menembak wabah).
- **Kendaraan**: Turbo Kit (+20% kecepatan), Off-road Suspension (+10% kecepatan, +25% cengkeraman),
  Armor Plate (mengurangi kehilangan kecepatan saat menabrak). Dibaca `stepVehicle()` lewat `vehicleStats`.
- Mata uang: **koin permainan** (dari wabah, misi, Energy Core, dan percakapan warga). State loadout
  disimpan di `saveExtra` dan dipulihkan dengan `normalizeLoadout()`.

## 4. Warga (NPC)

- Data: `src/features/survival/data/npcs.js` (4 warga: insinyur sipil, geodesi, tenaga kesehatan, TNI).
- Render: `src/features/survival/components/NpcLayer.js` — tubuh manusia + kostum + perlengkapan
  di-merge jadi **satu** geometry per NPC (vertex color, 2,5 rb–4 rb vertex) sehingga badan hanya
  1 draw call, selalu menghadap Twini, punya penanda mengambang, dan tidak memblokir gerakan.
  Perlengkapan khas tiap peran:
  - **Pak Raka** (insinyur sipil): helm proyek kuning dengan brim lebar, rompi high-vis bergaris
    reflektif tegak & mendatar, clipboard dengan kertas dan penjepit.
  - **Bu Sari** (geodesi): topi lapangan, kacamata, ikat rambut, papan peta dengan garis rute.
  - **Dokter Nia**: jas putih berlengan dan berkerah, stetoskop (selang + chest piece), tas P3K
    dengan palang merah.
  - **Prajurit Adi** (TNI): baret merah dengan badge, rompi lapangan berkantong, senapan
    disandang diagonal di punggung.
- Interaksi: saat Twini berada ≤ 2.8 m, prompt `💬 … → INTERACT` muncul. INTERACT memprioritaskan warga
  di atas objek misi. Dialog (`NpcDialogue.js`) menampilkan sapaan, 2 baris percakapan, petunjuk, dan
  hadiah **sekali klaim** (+koin, +XP). Daftar warga yang sudah diajak bicara ikut tersimpan.
- Event `talk_npc` diteruskan ke hook `useTwinGame`/co-op, sehingga misi berbasis interaksi tetap bisa
  memakainya di masa depan.

## 5. Distrik Toko fisik (di luar jalan lingkar Monas)

Data: `src/features/survival/data/shopDistrict.js` — dipakai bersama oleh scene dan layar game.
Render: `src/features/survival/components/ShopDistrictLayer.js`.

Lokasi: **utara-timur pelataran Monas**, tepat di luar jalan lingkar Jalan M. H. Saleh Ishak
(pad `x 13,4 … 42,6` dan `z 33,8 … 40,3`; baris bangunan pada `z = 37,2`). Area ini dipilih karena
bebas jalan OSM, bangunan OSM, objek misi, dan petak kota.

Denah berjejer (jarak antar-bangunan 1,5 unit, total 27,2 unit):

| Posisi | Bangunan | Fungsi saat INTERACT |
| --- | --- | --- |
| 1 (barat) | **Toko TWINI** | Tab *Senjata* (pistol laser & pembelian) |
| 2 | **Bengkel Laser** | Tab *Aksesori* senjata |
| 3 | **Garasi Kendaraan** | Tab *Kendaraan* (turbo/suspensi/armor) |
| 4 | **Gudang Aset Kota** | Tab *Aset Kota* + beli Poin Pertumbuhan |
| 5 (timur) | **Pos Layanan Warga** | Info misi & aset kota |

Detail visual:
- Pelataran paving 29,2 × 6,5 unit dengan trotoar, marka parkir, 3 planter, dan **6 tiang lampu**
  berjarak sama; **gapura barat** bercahaya sebagai penanda masuk dari arah spawn.
- Tiap bangunan punya fasad sendiri: kaca depan, pintu, kanopi/awning bergaris, papan nama glow,
  ikon (tas belanja, crosshair, mobil, kotak aset, palang layanan), AC atap, antena, ban, dan
  container. Geometri digabung per material (padat/kaca/glow) → ±3 draw call per bangunan.
- Bangunan OSM yang berada di dalam pad disembunyikan (`insideShopDistrict`) agar distrik tetap bersih.

Interaksi:
- Berdiri ≤ 3,2 m dari pintu mana pun → prompt `🏪 <nama> · <fungsi> → INTERACT`; INTERACT membuka
  panel toko langsung pada tab yang sesuai (NPC tetap prioritas pertama).
- Menu **Toko & Upgrade** dan chip TP/koin di HUD membuka tab Senjata.
- Menu **TELEPORT → LAINNYA → Twini Shop District** memindahkan Twini ke pintu toko.
- Tombol **Kembali ke Game** di panel toko mengembalikan ke permainan tanpa memulai ulang.

## Verifikasi

- `npm test` → 47 test lulus (termasuk 8 test baru untuk loadout, NPC, dan start point).
- `node --test __tests__/loadout.test.mjs` untuk menjalankan test fitur ini saja.
- Visual NPC divalidasi dengan mengeksekusi `bodyGeometry()` di Node memakai `three`/`three-stdlib`
  asli: tiap warga menghasilkan satu geometry ber-index dengan atribut `position`, `normal`, `uv`,
  `color`, tinggi ±1,33–1,35 m, dan jumlah vertex berbeda per peran (2.496 vertex tubuh dasar →
  3.019–4.046 setelah kostum).
- Build APK: `cd android && gradlew.bat assembleRelease` (semua ABI) atau
  `-PreactNativeArchitectures=arm64-v8a` untuk satu ABI.
