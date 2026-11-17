# Multiplayer Co-op, Disiplin Karakter, Kendaraan & Monas

Ringkasan fitur yang ditambahkan pada fase ini.

---

## 1. Multiplayer co-op (join bareng)

Backend: `server/coop.js` + migrasi DB v3 (`coop_rooms`, `coop_members`).
Client: `src/features/game/services/coopApi.js`, `src/features/game/components/CoopPanel.js`.

Alur:
1. Menu TWINI → **Multiplayer Co-op** (butuh akun cloud).
2. Pilih misi → **Buat Ruangan Co-op** → dapat **kode 6 karakter** (mis. `K7M2PQ`).
3. Teman memasukkan kode → **Gabung ke Ruangan** (maks. 6 pemain).
4. Setiap aksi gameplay (`scan_object`, `collect_core`, `purge_wabah`, `build_city_asset`, …) otomatis
   dilaporkan ke server dan digabungkan ke objektif tim (event yang sama dengan mesin misi).
5. Saat semua objektif terpenuhi, setiap anggota menekan **Klaim** → TP/XP masuk sekali (idempoten,
   `point_transactions` + `players.xp`).

Endpoint:

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/api/coop/rooms` | buat ruangan (`missionId`, `discipline`, `maxPlayers`) |
| POST | `/api/coop/rooms/:code/join` | gabung |
| GET | `/api/coop/rooms/:code` | status ruangan (polling 4 dtk di client) |
| POST | `/api/coop/rooms/:code/progress` | lapor progres event (`event`, `amount`, `target`) |
| POST | `/api/coop/rooms/:code/claim` | klaim reward tim |
| POST | `/api/coop/rooms/:code/leave` | keluar |
| GET | `/api/coop/rooms/mine` | ruangan aktif milik saya |
| GET | `/api/coop/leaderboard` | papan peringkat kontribusi tim |

Ruangan kedaluwarsa otomatis: `open` > 6 jam, `completed` > 1 jam.

## 2. Papan peringkat

- **Co-op**: total kontribusi anggota + jumlah ruangan (tab "Papan Peringkat" di panel co-op).
- **Twin Points**: peringkat TP/level dari server (`/api/leaderboard`).

## 3. Disiplin karakter (11 profesi)

`src/features/survival/data/disciplines.js` — dipilih di menu TWINI (di bawah kartu karakter) dan
disimpan per akun. Efeknya benar-benar dipakai gameplay:

| Disiplin | Efek |
| --- | --- |
| Civil Engineer | biaya aset kota −1 poin (min 1) |
| Geodesi | jangkauan interaksi/scan +1,2 m |
| Urban Planning | diskon 15% biaya aset kota |
| Data Science | +20% XP |
| Arsitek | diskon 25% biaya aset kota |
| Planologi | petak kota terbuka 1 wabah lebih cepat |
| IT / Software | jeda tembak −30% |
| Pakar / Professor | +1 poin pertumbuhan setiap misi selesai |
| Ahli Kesehatan | pemulihan health di shelter +60% |
| Ahli Lingkungan | +1 poin pertumbuhan per wabah |
| TNI | kapasitas plasma +4, tembak 15% lebih cepat |

## 4. Kendaraan lebih detail (sparepart lengkap)

Semua bagian baru **di-merge** ke geometri lama sehingga jumlah draw call tidak bertambah
(`src/features/survival/components/Vehicles.js`):

- **Mobil**: roof rack + crossbar + cargo box, mudflap, side skirt vent, jok belakang, wiper,
  tow hook, parcel shelf, konsol tengah, antena, speaker, door handle, kaliper rem, plat nomor
  depan/belakang, lampu kabut, strip lampu rem, light bar.
- **Motor**: panniers samping, top box, rear rack, chain guard, plat nomor, mirip spion, crash bar,
  cakram rem, foot peg, exhaust tip + heat shield.
- **Kapal**: cleat, grab rail, rod holder, lampu sorot haluan, antena, klakson, plat mesin tempel,
  fuel filler.

## 5. Monas & pelataran

`src/features/survival/components/MonasTower.js` + `SurvivalWorldScene.js`:

- **Pelataran bisa dipijak** (tanpa railing): plinth/pelataran lebar 13,4×13,4 (half 6,7) pada
  ketinggian 0,95, dengan **tangga lebar di 4 sisi** (bisa dinaiki). Tabrakan hanya pada badan tugu
  (half 3,2) sehingga pelataran benar-benar terbuka; mobil/motor tetap dilarang naik (radius 6,6).
  `monasRaisedHeight()` dipakai `groundAt()` sehingga Twini benar-benar berdiri di pelataran.
- Detail baru: 12 panel relief, 4 pintu/glass, tiang bendera + bendera, 4 lampu sorot, 16 bollard,
  trim tepi pelataran, dan cincin cahaya yang sudah ada.
