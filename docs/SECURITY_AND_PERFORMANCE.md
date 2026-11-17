# Keamanan & Performa APK — TWINI

Dokumen ini merangkum hardening yang diterapkan pada build Android (APK/AAB) TWINI beserta cara
memverifikasi dan menghasilkan build rilis yang aman dan ringan.

---

## 1. Ringkasan perubahan

| Area | Sebelum | Sesudah |
| --- | --- | --- |
| Kredensial demo | Email + password admin di-hardcode di `AuthContext.js` (ikut ter-bundle ke APK) | Hanya di-seed pada build `__DEV__` dari `EXPO_PUBLIC_SEED_ADMIN_*`; rilis tidak punya akun bawaan |
| Sesi login lokal | ID sesi di `AsyncStorage` (plaintext) | Disimpan di `expo-secure-store` (Keystore/Keychain), migrasi otomatis dari AsyncStorage |
| Permission Android | Mengikuti default library (termasuk storage/biometric) | Dibatasi ke `INTERNET` + `VIBRATE`; permission lain di-`tools:node="remove"` |
| Backup data aplikasi | `allowBackup` default | `allowBackup=false` (tidak bisa ditarik lewat `adb backup`) |
| Trafik jaringan | Cleartext diizinkan oleh beberapa modul | `usesCleartextTraffic=false` + `network_security_config` (HTTPS, hanya CA sistem) |
| Bundle JavaScript | Seluruh three.js + barrel `@react-three/drei/native` dievaluasi saat start | Code splitting `React.lazy` untuk layar 3D + deep import drei |
| Codec gambar | Fresco animated-GIF ikut ditautkan | Dimatikan (tidak ada aset GIF) |
| R8 / shrinking | — | `minifyEnabled` + `shrinkResources` + `crunchPngs` aktif di rilis |
| Backup & transfer data | `allowBackup=false` saja | `allowBackup=false` + `dataExtractionRules` (Android 12+: cloud backup & device-to-device transfer diblokir) + `fullBackupContent` (Android 11 ke bawah) |
| Log rilis | Semua level log ikut ke bytecode | `Log.v/d/i` dibuang R8; `Log.w/e` dipertahankan; nama file sumber disamarkan (`SourceFile`) agar `mapping.txt` tetap bisa membuka stack trace |
| Frame 3D saat background | Canvas tetap menggambar walau aplikasi tidak terlihat | `useAppActive()` → `frameloop="never"` saat app di background (hemat GPU, baterai, dan panas) |
| Resolusi render native | Survival 1,25×; hero Home 1,75×; MSAA selalu aktif | Survival 1,0× (low-end) / 1,25× (flagship) + MSAA dimatikan di native; hero Home 1,0× / 1,5×; `stencil: false` di semua canvas |
| Memori build | Gradle 2 GB, Kotlin daemon default | Gradle 6 GB + Kotlin daemon 3 GB (R8/shrink tidak kehabisan heap, build lebih cepat) |
| Skema tanda tangan | Hanya v2 | v2 + **v3** aktif (v1 dimatikan karena minSdk 24, v4 dimatikan agar tidak ada file `.idsig`) |

---

## 2. Keamanan

### 2.1 Tidak ada rahasia di dalam bundle

`EXPO_PUBLIC_*` **selalu** di-inline ke bundle JavaScript, sehingga nilainya dapat dibaca siapa pun
yang men-decompile APK. Karena itu:

- Tidak ada password/API key yang ditulis langsung di source.
- Kunci Meshy hanya hidup di server (`MESHY_API_KEY` dibaca `server/server.js`), aplikasi memanggil
  proxy `/api/meshy/*`.
- Akun demo hanya dibuat saat `__DEV__ === true` dan hanya jika `.env.local` mengisi
  `EXPO_PUBLIC_SEED_ADMIN_EMAIL` / `EXPO_PUBLIC_SEED_ADMIN_PASSWORD`.
- Token sesi cloud (Bearer) disimpan lewat `expo-secure-store`
  (`src/features/game/services/tokenStore.native.js`).

### 2.2 Penyimpanan lokal

- Password lokal disimpan di `expo-secure-store` (AES-GCM dengan kunci dari Android Keystore).
  Di web dipakai PBKDF2-SHA256 310.000 iterasi + salt (`credentialStore.web.js`).
- Sesi login (ID profil) sekarang juga di `expo-secure-store` (`sessionStore.native.js`).
  Nilai lama di `AsyncStorage` dimigrasikan sekali lalu dihapus.
- `allowBackup=false` mencegah data aplikasi ikut ke Google Drive / `adb backup`.

### 2.3 Manifest & jaringan

- Hanya `INTERNET` dan `VIBRATE` yang diminta. Permission dari library (storage, kamera, mikrofon,
  biometric, overlay) dihapus dengan `tools:node="remove"`.
- `android:usesCleartextTraffic="false"` + `network_security_config.xml` yang hanya memercayai CA
  sistem, sehingga trafik tidak bisa di-downgrade ke HTTP dan sertifikat user tidak otomatis dipercaya.
- `expo-updates` dimatikan (`ENABLED=false`) — APK tidak menarik/menjalankan JS dari luar toko.
- Halaman admin server mengirim CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

### 2.4 Sisi server (ringkas)

`server/game.js` sudah memakai `scrypt(N=16384, r=8, p=1)` untuk password, token sesi acak 32 byte
yang disimpan sebagai hash SHA-256, rate limit per IP/akun, dan perbandingan dummy-hash agar waktu
respons tidak membocorkan keberadaan email.

### 2.5 Checklist sebelum rilis

1. Pastikan `android/keystore.properties` + `*.jks` **tidak pernah** masuk git
   (`.gitignore` sudah mengecualikannya). Jika pernah ter-commit/terkirim, buat keystore baru.
2. Set `EXPO_PUBLIC_API_URL` dan `EXPO_PUBLIC_TWINI_API_URL` ke domain **HTTPS** produksi.
3. Pastikan `.env.local` tidak berisi akun seed saat membangun APK rilis.
4. Jalankan `npm test` (`missionEngine` + API server) sebelum menaikkan `versionCode`.
5. Increment `expo.version`, `expo.android.versionCode`, dan nilai yang sama di
   `android/app/build.gradle`.

---

## 3. Performa

### 3.1 Waktu mulai (cold start)

- **Code splitting**: `AppNavigator` memuat `TwiniSurvivalScreen`, `MapsScreen`, dan `ThreeDViewer`
  melalui `React.lazy`, dan `HomeDashboard` memuat `TwiniHeroBackground` dengan cara yang sama.
  Splash → onboarding → login tidak lagi mem-parse three.js/react-three-fiber.
- **Deep import drei**: `ThreeDRenderer.native.js` hanya mengambil `OrbitControls`, `useAnimations`,
  dan `Gltf` dari `@react-three/drei/core/*` (bukan barrel `@react-three/drei/native` yang
  meng-`require` ~100 komponen sekaligus). Metro tidak melakukan tree-shaking, jadi ini memotong
  ukuran bundle Hermes secara signifikan.

  Hasil pengukuran `expo export:embed --platform android` pada proyek ini:

  | Metrik | Barrel import (lama) | Deep import (baru) |
  | --- | --- | --- |
  | Ukuran bundle JS | 9,74 MB | **6,15 MB** (−37%) |
  | Jumlah modul | 1655 | **1211** (−444) |
  | Waktu bundling | 114 s | **32 s** |

  Modul berat seperti `troika-three-text`, `camera-controls`, `meshline`, `hls.js`, dan
  `three-mesh-bvh` kini tidak lagi ikut ke dalam APK.
- **Hermes** aktif (`hermesEnabled=true`), bytecode lebih cepat di-parse dibanding JSC.

### 3.2 Ukuran dan memori

- Rilis memakai R8 (`android.enableMinifyInReleaseBuilds=true`), `shrinkResources`, dan `crunchPngs`.
- `expo.useLegacyPackaging=false` → native library tidak diekstrak saat instalasi (startup lebih
  cepat, data aplikasi lebih kecil).
- `splits.abi` menghasilkan satu APK per arsitektur (`arm64-v8a`, `armeabi-v7a`) sehingga perangkat
  hanya menyimpan library yang dibutuhkan. Gunakan AAB untuk Play Store (split otomatis).
- `expo.gif.enabled=false` menghapus decoder GIF dari APK.

### 3.3 Render 3D

- Setiap `Canvas` hanya menggambar saat aplikasi di foreground (`src/shared/hooks/useAppActive.js`
  → `frameloop="always" | "never"`). Tanpa ini surface GL tetap aktif di background: GPU terus
  menggambar 60 fps, perangkat panas, dan baterai terkuras tanpa ada yang terlihat.
- Resolusi render adaptif: survival `[1, 1.25]` di flagship dan `[1, 1]` saat `PixelRatio ≤ 2`
  (perangkat menengah/bawah); hero Home `[1, 1.5]` / `[1, 1]`; viewer `[1, 1.5]`; web 1,15–1,5×.
- MSAA (`antialias`) dimatikan di Android untuk scene survival (fill-rate GPU paling mahal di sana)
  dan tetap aktif di web serta di viewer model tunggal.
- `stencil: false` pada semua canvas menghemat satu buffer GPU per konteks.
- `shadows` hanya aktif di web; di Android dimatikan agar hemat GPU.
- HUD game memakai `React.memo` + ikon FontAwesome yang sudah di-memo
  (`src/shared/components/Icon.js`) supaya tidak rebuild SVG tiap frame.
- `powerPreference: 'high-performance'` tetap dipakai agar driver memilih GPU utama.

### 3.4 Build lebih cepat

- `org.gradle.parallel=true` dan `org.gradle.caching=true` di `android/gradle.properties`.
- Build rilis per arsitektur: `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.

---

## 4. Cara membangun APK rilis

```bash
# dari root proyek
cd android

# APK terpisah per ABI (output di android/app/build/outputs/apk/release/)
./gradlew assembleRelease

# AAB untuk Play Store (output di android/app/build/outputs/bundle/release/)
./gradlew bundleRelease
```

Windows (cmd/PowerShell):

```bat
cd android
gradlew.bat assembleRelease
```

Pastikan `android/keystore.properties` berisi:

```properties
storeFile=app/twini-upload-key.jks
storePassword=********
keyAlias=twini-upload
keyPassword=********
```

## 5. Verifikasi hasil build

```bash
# Periksa permission yang benar-benar masuk ke APK
"%ANDROID_HOME%/build-tools/<versi>/aapt2.exe" dump permissions android/app/build/outputs/apk/release/app-arm64-v8a-release.apk

# Pastikan APK ditandatangani (bukan debug key) dan skema v2/v3 ada
"%ANDROID_HOME%/build-tools/<versi>/apksigner.bat" verify --print-certs android/app/build/outputs/apk/release/app-arm64-v8a-release.apk

# Cek manifest hasil merge (allowBackup, usesCleartextTraffic, networkSecurityConfig)
"%ANDROID_HOME%/build-tools/<versi>/aapt2.exe" dump xmltree --file AndroidManifest.xml android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

Yang harus terlihat: `uses-permission` hanya INTERNET & VIBRATE, `allowBackup=false`,
`dataExtractionRules="@xml/data_extraction_rules"`, `fullBackupContent="@xml/backup_rules"`,
`usesCleartextTraffic=false`, `networkSecurityConfig` mengarah ke `@xml/network_security_config`,
dan sertifikat penandatangan adalah kunci `twini-upload` (bukan `androiddebugkey`).

### 5.1 Hasil verifikasi build 1.0.16 (versionCode 17)

| Pemeriksaan | Hasil |
| --- | --- |
| `aapt2 dump badging` | `versionCode='17' versionName='1.0.16'`, minSdk 24, targetSdk 36 |
| Permission final | `INTERNET`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, + 2 permission signature-level (AndroidX/Play) |
| Permission sensitif | Tidak ada storage, kamera, mikrofon, biometric, overlay |
| `apksigner verify --print-certs` | V2 Signer `CN=TWINI IDTC, OU=Release, O=TWINI` (bukan `androiddebugkey`) |
| Manifest aplikasi | `allowBackup=false`, `usesCleartextTraffic=false`, `extractNativeLibs=false`, `networkSecurityConfig` terpasang |
| Ukuran APK arm64-v8a | 41,0 MB → **40,0 MB** |
| Ukuran APK armeabi-v7a | 34,8 MB → **33,9 MB** |
| Bundle JS (Hermes) | 1211 modul (sebelumnya 1655) |


### 5.2 Hasil verifikasi build 1.0.19 (versionCode 20)

| Pemeriksaan | Hasil |
| --- | --- |
| `aapt2 dump badging` | `versionCode='20' versionName='1.0.19'`, minSdk 24, targetSdk 36 |
| Permission final | `INTERNET`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, + 2 permission signature-level (AndroidX / Play Install Referrer) |
| Permission sensitif | Tidak ada storage, kamera, mikrofon, biometric, overlay |
| `apksigner verify --verbose` | v2 **dan v3** `true` (v1 & v4 sengaja `false`); signer `CN=TWINI IDTC, OU=Release, O=TWINI` (bukan `androiddebugkey`), RSA 2048 |
| Manifest aplikasi | `allowBackup=false`, `dataExtractionRules=@xml/data_extraction_rules`, `fullBackupContent=@xml/backup_rules`, `usesCleartextTraffic=false`, `networkSecurityConfig` terpasang |
| Pindai rahasia di bundle | `MESHY_API_KEY`, `EXPO_PUBLIC_SEED_ADMIN_PASSWORD`, `storePassword` → **0 kemunculan** |
| Bundle JS (Hermes) | 1.230 modul, 7.557.552 B |
| Ukuran APK arm64-v8a | 40.145.098 B (1.0.18) → **40.037.768 B (38,18 MiB)** |
| Ukuran APK armeabi-v7a | **33.925.542 B (32,35 MiB)** |
| Waktu build | 4m 51s (R8 penuh, cache kosong) → 1m 11s untuk rebuild inkremental |

Artefak: `android/app/build/outputs/apk/release/app-{arm64-v8a,armeabi-v7a}-release.apk`
(mapping R8 untuk deobfuscation ada di `android/app/build/outputs/mapping/release/mapping.txt`).


## 6. Catatan operasional

- `expo prebuild --clean` akan menimpa folder `android/`. Konfigurasi keamanan yang penting sudah
  ditulis juga di `app.json` (`allowBackup`, `permissions`, `blockedPermissions`) agar tetap
  diterapkan setelah prebuild; `network_security_config.xml`, `data_extraction_rules.xml`,
  `backup_rules.xml`, serta atribut `dataExtractionRules`/`fullBackupContent` di
  `android/app/src/main/AndroidManifest.xml` perlu dipastikan ulang setelah prebuild.
- Password keystore yang pernah dibagikan lewat chat/commit harus dianggap bocor: buat keystore baru
  dan naikkan `versionCode`.

