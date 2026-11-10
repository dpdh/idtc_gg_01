# TWINI: Monas Survival Adventure (Phase 1)

> Explore. Survive. Learn. Build the Future.

Dokumentasi teknis untuk tim pengembang TWINI (IDTC). Dokumen ini menjelaskan apa yang sudah dibangun di Phase 1, cara menjalankannya, dan apa yang masih tersisa untuk Phase 2.

## 1. Penilaian arsitektur awal

| Area | Kondisi sebelum Phase 1 |
|---|---|
| App | Expo SDK 58 + React Native 0.88 (Android, iOS, web), navigasi buatan sendiri di `AppNavigator.js` |
| 3D | React Three Fiber + drei, model GLB di `src/assets/glb/mobile`, scene Monas di `SurvivalWorldScene.js` |
| Game | Seluruh state di `TwiniSurvivalScreen.js`: 7 misi hardcode, 3 sensor, 10 kristal, sesi berhenti di 10 menit |
| Auth | Hanya lokal (AsyncStorage + PBKDF2/SecureStore), tanpa backend |
| Server | `server/server.js`: Node `http` untuk file statis web + proxy Meshy |
| Kontrol | Joystick + WASD relatif kamera, OrbitControls kamera orang ketiga |

Keputusan: stack yang ada dipakai ulang (sesuai prinsip "reuse current stack"). Backend ditambahkan ke server Node yang sama, memakai SQLite bawaan Node 24 (`node:sqlite`), tanpa dependensi baru. Migrasi ke Laravel/PostgreSQL/PostGIS dicatat sebagai opsi Phase 2.

## 2. Arsitektur Phase 1

```
App (Expo: Android / iOS / Web)
 ├─ survival/screens/TwiniSurvivalScreen   HUD, input, interaksi, panel menu
 ├─ survival/components/SurvivalWorldScene R3F scene: zona, objek Digital Twin, cuaca, siang/malam
 └─ game/
     ├─ data/gameContent.json      zona, objek, misi, aset, produk, konfigurasi (sumber seed server)
     ├─ engine/missionEngine.js    mesin misi murni (LOCKED/AVAILABLE/ACTIVE/COMPLETED/FAILED)
     ├─ engine/worldRules.js       zona, proximity, survival tick, cuaca, pencahayaan
     ├─ state/useTwinGame.js       save offline, antrean klaim, sinkronisasi cloud
     ├─ services/gameApi.js        HTTP client (timeout, error terstruktur)
     ├─ services/cloudAccount.js   penautan login lokal ↔ akun cloud
     └─ components/                MissionCenter, TwinHub, InteractionPanels
            │  HTTPS / JSON (Bearer token)
            ▼
server/server.js  (static web + /api + /admin + /storage)
 ├─ api.js     router + RBAC + rate limit
 ├─ game.js    layanan: user, player, misi, ledger poin, aset, store, redemption, admin
 ├─ db.js      SQLite + migrasi berversi
 └─ admin/index.html  dashboard admin
```

Prinsip keamanan poin:

- Client tidak pernah mengirim jumlah poin. Client hanya mengklaim ID misi atau ID objek.
- Server menghitung reward dari definisi misi × multiplier misi × multiplier global.
- Saldo selalu dihitung dari ledger `point_transactions`. Tidak ada kolom saldo yang bisa diubah langsung.
- Setiap transaksi memakai `idempotency_key` UNIQUE, dan klaim misi dibatasi `UNIQUE(user_id, mission_id, period_key)`. Replay mengembalikan hasil yang sama tanpa menambah poin.
- Validasi klaim:
  - misi published dan berada dalam jadwal;
  - prasyarat sudah diklaim di server;
  - durasi ≥ `minDurationSec`;
  - tidak melewati batas waktu misi;
  - timestamp tidak di masa depan;
  - rate limit klaim per jam.

  Pelanggaran dicatat di `fraud_flags`, dan pencatatan ini tetap tersimpan meskipun transaksinya di-rollback.
- Pemain dengan jumlah fraud flag terbuka ≥ ambang konfigurasi: penukaran hadiahnya berstatus `PENDING` dan menunggu review admin.

## 3. Status modul

| Modul | Status Phase 1 |
|---|---|
| 1. Dunia 3D | ✅ 8 zona (cincin zona + efek), 50 objek interaktif, siang/malam (1 menit = 1 jam game), cuaca dinamis (cerah/berawan/hujan + badai misi), NPC, harta tersembunyi. Model GLB tetap jadi format runtime. |
| 2. Survival | ✅ 5 indikator: Health, Energy, Hydration, Digital Connection, Survival Supply. Gangguan sinyal (Smart Infra), hazard (Emergency), shelter aman, stasiun air, supply crate, item (Health Kit, Battery, Botol Air, Repair Kit), evakuasi saat HP 0. Stamina tetap dipakai untuk lari dan lompat. |
| 3. Campaign | ✅ 4 chapter × 3 misi, semua field yang diminta, 5 status, batas waktu dan gagal, banner penyelesaian. **Mission Builder** di admin: buat/ubah/publish/arsip tanpa ubah kode, client mengambil misi terbaru dari `/api/content/missions`. |
| 4. Harian/Mingguan/Event | ✅ Periode harian/mingguan (WIB), jadwal event (`startsAt`/`endsAt`), multiplier. ⏳ *Team Digital Twin Challenge* ditampilkan terkunci (butuh multiplayer, Phase 2). |
| 5. Aset Digital Twin | ✅ 16 aset, 12 kategori, 4 rarity, library + filter, penemuan via scan/misi (divalidasi server), pratinjau 3D (viewer yang sudah ada), upgrade berbayar TP, upload GLB oleh admin. ⏳ Crafting & penempatan ke kota, konversi FBX/OBJ/IFC/LAS/3D Tiles (saat ini GLB ditolak jika bukan glTF 2.0 biner). |
| 6. Interaksi Digital Twin | ✅ Deteksi proximity, prompt SCAN, animasi scan, panel info (BIM/GIS/IoT/riwayat/koordinat), label sumber **DATA PUBLIK / DATA SIMULASI / DATA SENSOR AKTUAL**, aksi (sinkron/perbaiki/pulihkan), status objek tersimpan, event misi. |
| 7. Twin Points | ✅ Wallet, riwayat, aturan earning, redemption, kedaluwarsa FIFO (default 365 hari), fraud detection, validasi server, login harian + streak. |
| 8. Rewards Store | ✅ 3 hadiah digital + 8 merchandise, alur redeem 8 langkah, 7 status, voucher dari pool (generate/import/validasi oleh admin), pembatalan = refund otomatis. |
| 9. Profil & Gamifikasi | ✅ Level/XP, TP, badge chapter dan streak, riwayat misi, koleksi, statistik survival, leaderboard mingguan & sepanjang masa, pilihan karakter (sudah ada). ⏳ Teman & tim kooperatif. |
| 10. Smart City Builder | ⏳ City builder lama tetap tersedia (menu "Bangun Kota"). Penempatan aset koleksi + statistik kota: Phase 2. |
| 11. Admin | ✅ 14 menu: Overview, World & Map*, Assets, Missions, Characters & NPC*, Rewards, Vouchers, Redemptions, Players, Twin Points & Fraud, Leaderboard, Events, Config, Audit Log. RBAC role `admin`. (*hanya baca di Phase 1) |
| 12. UI/UX | ✅ HUD baru, chip misi + TP, mini-map zona dan target misi, sensitivitas kamera (0.5×–2×), kontrol relatif kamera dipertahankan. ⏳ Bottom nav 7 tab: fitur Missions/Inventory/Rewards/Leaderboard/Profile saat ini diakses dari menu TWINI agar navigasi lama tidak rusak. |
| 13. Arsitektur | ✅ Layanan modular di `server/game.js`. ⏳ WebSocket/MQTT, PostGIS, object storage. |

## 4. Skema database (migrasi `server/db.js`, v1)

| Tabel | Isi |
|---|---|
| `users` | akun, hash scrypt, `role` (player/admin), `status` (active/banned) |
| `sessions` | token di-hash SHA-256, kedaluwarsa 30 hari |
| `players` | XP, streak, check-in terakhir |
| `missions` | definisi misi (objektif JSON, reward, prasyarat, jadwal, status) |
| `mission_claims` | klaim per periode, `UNIQUE(user, mission, period)` |
| `point_transactions` | ledger: earn/spend/refund/expire/adjust, `idempotency_key` UNIQUE |
| `fraud_flags` | pelanggaran validasi |
| `assets`, `player_assets` | katalog aset & koleksi pemain (level) |
| `products`, `vouchers`, `redemptions` | store, pool kode voucher, penukaran + riwayat status |
| `config`, `audit_log`, `schema_migrations` | konfigurasi game, jejak aksi admin, versi migrasi |

Lokasi DB default `server/data/twini.db` (bisa diganti dengan env `TWINI_DB`). Model unggahan disimpan di `server/storage/assets/`. Kedua folder ada di `.gitignore`.

## 5. Endpoint API

Publik: `GET /api/content/world`, `/api/content/missions`, `/api/content/assets`, `/api/store/products`, `/api/leaderboard?period=weekly|all`

Auth: `POST /api/auth/register`, `POST /api/auth/login` (rate limit), `POST /api/auth/logout`, `GET /api/auth/me`

Pemain (Bearer token):

- `GET /api/player/profile`
- `POST /api/player/checkin`
- `GET /api/wallet`
- `POST /api/missions/:id/claim` `{ idempotencyKey, startedAt, completedAt }`
- `POST /api/assets/:id/discover` `{ objectId }`
- `POST /api/assets/:id/upgrade` `{ idempotencyKey }`
- `POST /api/store/redeem` `{ productId, idempotencyKey, delivery? }`
- `GET /api/store/redemptions`

Admin (role `admin`):

- `GET /api/admin/overview`
- `GET|PUT|DELETE /api/admin/missions/:id`
- `GET|PUT /api/admin/assets/:id`
- `POST /api/admin/assets/:id/model` (body GLB, maks 25 MB)
- `GET|PUT /api/admin/products/:id`
- `GET /api/admin/vouchers`, `POST /api/admin/vouchers/generate`, `GET /api/admin/vouchers/validate?code=`
- `GET /api/admin/redemptions`, `POST /api/admin/redemptions/:id/status`
- `GET /api/admin/players`, `PATCH /api/admin/players/:id`, `POST /api/admin/players/:id/points`
- `GET /api/admin/transactions`, `POST /api/admin/fraud/:id/resolve`
- `GET /api/admin/leaderboard`
- `GET|PUT /api/admin/config`
- `GET /api/admin/audit`

## 6. Menjalankan

```bash
npm run build:web                 # atau: node node_modules/expo/bin/cli export --platform web
TWINI_ADMIN_EMAIL=admin@contoh.org TWINI_ADMIN_PASSWORD='<password kuat>' node server/server.js
# App:   http://localhost:8000
# Admin: http://localhost:8000/admin
```

- `TWINI_ADMIN_*` membuat atau mempromosikan akun admin saat server start, dan selalu menyetel ulang password ke nilai env.
- APK/IPA membutuhkan URL server **HTTPS**. Isi saat build (`EXPO_PUBLIC_TWINI_API_URL=https://…`) atau oleh pemain di *Twin Hub → Akun*. Cleartext HTTP diblokir di build rilis Android.
- Login di aplikasi otomatis menautkan akun cloud dengan email dan password yang sama. Jika server tidak terjangkau, game tetap berjalan offline dan klaim dikirim belakangan.

## 7. Pengujian

`npm test` menjalankan 18 tes (semuanya lulus pada 9 Nov 2026):

- `__tests__/missionEngine.test.mjs` (7): rantai unlock, objektif unik, filter target, batas waktu/gagal/retry, reset harian WIB, misi terjadwal/tim terkunci, integritas konten (setiap misi campaign bisa diselesaikan dengan objek yang ada, tidak ada objek di dalam tugu).
- `server/tests/api.test.js` (11): register/login, RBAC 401/403, klaim terkunci/terlalu cepat/sukses/duplikat/replay, fraud flag tetap tercatat setelah rollback, periode harian, misi tim/event di luar jadwal, penemuan aset, redeem (saldo kurang, voucher, idempotensi, batal + refund, void kode), alur status merchandise, kedaluwarsa FIFO, upload non-GLB ditolak, Mission Builder, pemain dibekukan kehilangan akses.

Uji manual end-to-end di Chrome (headless, WebGL SwiftShader) terhadap build web:

- gerak WASD relatif kamera dan deteksi zona;
- HUD 5 indikator, chip misi, mini-map;
- prompt SCAN → animasi → panel info → penemuan aset → progres misi harian;
- daftar akun cloud dari UI → bonus login 20 TP;
- menyelesaikan *First Arrival* lewat gameplay → klaim tervalidasi server (saldo 120 TP, level 2, tampil di leaderboard);
- store, aset, leaderboard, dan dashboard admin.

Belum diuji:

- di perangkat Android/iOS fisik (performa GPU/memori, sentuhan joystick);
- build iOS (memerlukan macOS/Xcode);
- reconnect setelah jaringan putus di perangkat nyata (logika antrean klaim sudah ada, tapi baru diuji lewat web).

## 8. Roadmap Phase 2

1. Multiplayer: tim 3–5 pemain, teman, misi tim (WebSocket), event real-time.
2. Integrasi IoT nyata (MQTT) dengan label **DATA SENSOR AKTUAL**, data BIM/GIS dari sumber resmi.
3. Smart City Builder berbasis koleksi aset: penempatan, koneksi infrastruktur, statistik kota, crafting.
4. Pipeline konversi aset (FBX/OBJ/IFC/LAS-LAZ/3D Tiles → GLB teroptimasi, Draco/meshopt), object storage.
5. Editor World & Map / NPC di admin (saat ini hanya baca dari `gameContent.json`).
6. Bottom nav 7 tab, migrasi opsional ke PostgreSQL + PostGIS jika skala menuntut, cluster multi-instance (rate limit pindah ke Redis).
7. Hapus akun demo lokal yang password-nya tertulis di `AuthContext.js` (akun ini sengaja tidak pernah ditautkan ke cloud).
