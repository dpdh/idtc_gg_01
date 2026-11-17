# Wilayah Pengembangan & Atribut Karakter

Dokumen ini menjelaskan dua sistem baru di mode eksplorasi TWINI:

1. **Petak wilayah** di darat dan di laut yang bisa dibeli, lalu dibangun rumah tinggal,
   perkantoran, industri, atau area rekreasi.
2. **Atribut karakter per disiplin**: topi, pakaian, sepatu, dan aksesori/lencana yang dipakai Twini.

## 1. Petak darat & petak laut

Data: [`src/features/survival/data/districtPlots.js`](../src/features/survival/data/districtPlots.js)
Engine murni: [`src/features/game/engine/district.js`](../src/features/game/engine/district.js)
Render 3D: [`src/features/survival/components/DistrictLayer.js`](../src/features/survival/components/DistrictLayer.js)
UI: [`src/features/game/components/DistrictPanel.js`](../src/features/game/components/DistrictPanel.js)

Ada **18 petak**: 12 di darat (3 kawasan × 4 petak) dan 6 di laut (2 marina × 3 petak).

| Kawasan | Petak | Posisi (x, z) | Harga koin | Syarat |
| --- | --- | --- | --- | --- |
| Kawasan Selatan | A1–A4 | (−17…1,6 , −40) | 80–130 | 0–3 petak dimiliki, 0–1 wabah |
| Kawasan Utara | B1–B4 | (−14…4,6 , 41) | 95–140 | 2–6 petak dimiliki, 2–3 wabah |
| Kawasan Timur | C1–C3 | (25 / 31 / 37 , −26,5) | 120–150 | 4–8 petak dimiliki, 4–5 wabah |
| Kawasan Timur | C4 | (34 , −32,5) | 170 | 10 petak dimiliki, 6 wabah |
| Marina Barat | W1–W3 | (−6,6 , −58 / −67 / −76) | 180–225 | 6–10 petak dimiliki, 6–8 wabah |
| Marina Timur | E1–E3 | (6,6 , −58 / −67 / −76) | 190–240 | 6–12 petak dimiliki, 6–8 wabah |

Catatan tata letak:

- Petak darat diverifikasi lewat pemindaian peta Monas: tidak menimpa jalan OSM, bangunan OSM,
  objek misi, sebaran wabah, petak pertumbuhan kota lama, distrik toko, NPC, maupun pelataran Monas.
  `__tests__/district.test.mjs` memeriksa ulang jarak, jari-jari pulau, dan jarak antar-petak.
- Petak laut berada di air terbuka (r ≥ 57, mengikuti `BOAT_MIN_R` di `Ocean.js`) mengapit dermaga
  (z −51…−81). Di darat Twini bisa wade sampai r 55,5 sehingga petak bisa dijangkau dari titian
  dermaga; perahu juga bisa berlabuh di dekatnya.
- Petak laut hanya dirender di environment **Pesisir Digital** (satu-satunya environment dengan laut).

## 2. Bangunan

Setiap petak dibangun satu bangunan sesuai jenis petaknya. Biaya memakai **Poin Pertumbuhan Kota**
(diskon/potongan disiplin Arsitek/Urban berlaku, sama seperti aset kota).

| Bangunan | Kategori | Petak | Biaya | Nilai | Koin/mnt | Poin/mnt | Populasi | Kerja | Ekosistem | Bahagia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rumah Tinggal | residential | darat | 3 | 6 | 3 | 1 | 6 | 0 | 0 | +1 |
| Perkantoran | office | darat | 5 | 11 | 6 | 2 | 2 | 14 | −1 | 0 |
| Industri Ringan | industry | darat | 6 | 13 | 8 | 2 | 1 | 10 | −2 | −1 |
| Rekreasi Kota | recreation | darat | 4 | 9 | 4 | 2 | 1 | 4 | +2 | +3 |
| Rumah Apung | residential | laut | 5 | 10 | 5 | 2 | 8 | 1 | +1 | +1 |
| Menara Marina | office | laut | 7 | 16 | 9 | 3 | 2 | 18 | 0 | 0 |
| Pelabuhan Kargo | industry | laut | 8 | 18 | 12 | 3 | 1 | 16 | −3 | −1 |
| Resort Bahari | recreation | laut | 6 | 14 | 8 | 3 | 1 | 8 | +1 | +3 |

- **Nilai Wilayah** = total `value` semua bangunan; indeks pembangunan (%) = nilai / (18 petak × 18),
  dengan level kawasan 1–5.
- **Pendapatan wilayah** menumpuk per menit sejak klaim terakhir dan dibatasi **3 jam**
  (`MAX_COLLECT_MINUTES = 180`), lalu diklaim sekaligus lewat tombol *Klaim pendapatan*:
  koin masuk ke saldo permainan, poin masuk ke Poin Pertumbuhan Kota.
- Bangunan baru bisa menggantikan bangunan lama di petak yang sama (biaya penuh).

## 3. Atribut karakter per disiplin & profil per karakter

Data: [`src/features/survival/data/disciplineCosmetics.js`](../src/features/survival/data/disciplineCosmetics.js)
Proporsi: [`src/features/survival/data/characterFits.js`](../src/features/survival/data/characterFits.js)
Engine: [`src/features/game/engine/cosmetics.js`](../src/features/game/engine/cosmetics.js)
Render: [`src/features/survival/components/CharacterCosmetics.js`](../src/features/survival/components/CharacterCosmetics.js)
UI: [`src/features/game/components/CosmeticsPanel.js`](../src/features/game/components/CosmeticsPanel.js)

Setiap dari 11 disiplin punya 4 slot + 2 item premium (total 66 item, di-generate dari tabel gaya):

| Disiplin | Topi | Pakaian | Sepatu | Aksesori |
| --- | --- | --- | --- | --- |
| Civil Engineer | Helm Proyek | Rompi Kerja | Sepatu Safety | Lencana Disiplin |
| Geodesi | Topi Lapangan | Jaket Lapangan | Sepatu Lari | Kartu Identitas |
| Urban Planning | Topi Arsitek | Blazer Dinas | Sepatu Formal | Lencana Disiplin |
| Data Science | Visor Digital | Jaket Lapangan | Sepatu Lari | Kartu Identitas |
| Arsitek | Baret Dinas | Blazer Dinas | Sepatu Formal | Syal Dinas |
| Planologi | Topi Jerami | Rompi Kerja | Sepatu Safety | Selempang Dinas |
| IT / Software | Hood Teknisi | Jaket Lapangan | Sepatu Lari | Lencana Disiplin |
| Professor | Topi Toga | Jas Laboratorium | Sepatu Formal | Medali Penghargaan |
| Ahli Kesehatan | Topi Perawat | Jas Laboratorium | Sepatu Lari | Kartu Identitas |
| Ahli Lingkungan | Topi Jerami | Celemek Hijau | Sepatu Safety | Selempang Dinas |
| TNI | Helm Taktis | Seragam Lapangan | Sepatu Safety | Medali Penghargaan |

- 4 item dasar **langsung dimiliki** saat disiplin dipakai; 2 item **emas** (topi & lencana,
  🪙 180 / 250) dibeli di panel dan langsung terpasang.
- Item hanya bisa dipakai oleh disiplin pemiliknya. Saat disiplin diganti, set baru otomatis dipakai
  semua karakter dan item emas yang sudah dibeli untuk disiplin itu tetap tersimpan.

### 3.1 Profil aksesori tiap karakter Twini

Ada **5 karakter** yang bisa dimainkan (Twini Engineer `twini-idtc`, `insan-adhi`, `insan-adhi-w01`,
`dni-01`, `dni-02`). Setiap karakter punya profil sendiri:

```
cosmetics = {
  disciplineId,
  owned: [id item…],                       // kepemilikan item (lintas karakter)
  profiles: {
    [characterId]: {
      equipped: { hat, clothing, shoes, accessory },  // item yang dipilih per slot
      enabled:  { hat, clothing, shoes, accessory },  // ON/OFF: dipakai atau disembunyikan
    },
  },
}
```

- **Toggle ON/OFF per slot**: mematikan topi/pakaian/sepatu/aksesori hanya menyembunyikannya dari
  badan karakter; pilihan item tetap tersimpan sehingga bisa dinyalakan kembali kapan saja.
- **Pilih karakter** langsung di panel (kartu thumbnail), menyusun set berbeda untuk tiap model.
- **Salin profil ke semua karakter** untuk menyamakan tampilan kelima karakter sekaligus.
- Item dasar tetap dimiliki semua karakter; item emas yang dibeli dipakai karakter yang dipilih saat
  membeli (bisa dipasang ke karakter lain lewat tombol *Pakai*).
- Save lama (yang hanya punya `equipped` di root) dimigrasikan otomatis menjadi profil semua karakter.

### 3.2 Proporsi & detail model aksesori

`characterFits.js` menyimpan rasio tubuh per karakter — `headTop`, `headR`, `neckY`, `chestY`,
`waistY`, `torsoW`, `torsoD`, `footGap`, `footLen` — plus varian **chibi** untuk avatar fallback
(kepala besar, badan pendek). `resolveFit()` memadukan rasio itu dengan ukuran kotak model GLB
(lebar/tebal/tinggi) sehingga pakaian tidak sempit atau melebar pada model yang proporsinya berbeda.

Detail geometri per atribut:

- **Topi**: helm proyek (kubah + brim lebar + tulang atas + 6 ventilasi + lampu depan + tali dagu),
  topi lapangan (kubah + kancing + brim + band + gesper), baret (kubah pipih + rim + badge berring +
  tangkai), visor (band + pelat visor transparan + LED), topi toga (papan + band + tassel bersimpul),
  topi perawat (pelat + piping + palang), topi jerami (brim lebar + 3 cincin anyaman + pita + bows),
  helm taktis (kubah + brim + rel samping + mount depan + lampu + tali dagu + counterweight),
  hood (kerang + rim + drawstring + ujung tali), fedora (crown + pinch + brim + band + bulu).
- **Pakaian**: rompi high-vis (3 pita reflektif + zipper + 2 kantong + strap bahu + buckle), jaket
  (kerah + zipper + manset + kantong + patch bahu), jas lab (panjang + lapel + 4 kancing + ikat
  pinggang + 2 kantong), blazer (lapel + 3 kancing + pocket square + flap), celemek (bib + strap +
  ikat pinggang + kantong + patch), seragam (kerah + 2 kantong dada + ikat pinggang + epaulette +
  tanda pangkat).
- **Sepatu**: boot (sol + hak + toe cap + shaft + 3 tali + eyelet + plat kaki), sneaker (sol + upper
  + toe + tali + aksen samping), formal (upper ramping + sol + hak + toe shine + gesper), sandal
  (sol + 2 strap + gesper).
- **Aksesori**: lencana (pelat + pelat aksen + ring + bintang + 2 paku), selempang (pita diagonal +
  simpul + 2 ujung + rumbai), kartu identitas (lanyard + kartu + foto + chip + klip), syal (lingkar
  leher + simpul + ujung + rumbai), medali (pita bergaris + disc + ring + bintang).

## 4. Penyimpanan

`district` dan `cosmetics` ikut tersimpan di `saveExtra` (AsyncStorage) bersama state permainan lain,
dan dipulihkan dengan `normalizeDistrictState()` / `normalizeCosmetics(raw, disciplineId, characterIds)`:

- petak/bangunan yang tidak dikenal atau salah jenis dibuang;
- item kosmetik disiplin lain atau slot salah diganti item dasar;
- profil per karakter dipulihkan; `equipped`/`enabled` dari save lama dimigrasikan ke semua karakter;
- nilai negatif/NaN dinormalkan tanpa mengubah saldo pemain.

## 5. Verifikasi

- `npm test` → **61 test lulus** (47 sebelumnya + 14 baru di `__tests__/district.test.mjs`).
- Test mencakup: beli petak, kunci bertahap, bangun & validasi jenis petak, ringkasan nilai,
  pendapatan + batas 3 jam, baseline bangunan pertama, normalisasi, tata letak aman, katalog bangunan,
  profil aksesori per karakter, toggle ON/OFF, ganti disiplin, migrasi save lama.
- `npm run test:district` untuk menjalankan test fitur ini saja.
- Pemeriksaan statis `src/**.js` (AST Babel): 99 file, 0 identifier tak terdefinisi.
- Semua file baru/berubah lolos kompilasi `babel-preset-expo` (termasuk `TwiniSurvivalScreen` 171 kB
  hasil transpile dan `CharacterCosmetics` 33 kB).
