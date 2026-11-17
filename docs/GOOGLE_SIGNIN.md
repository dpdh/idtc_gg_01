# Mengaktifkan "Masuk dengan Google" (Gmail)

Kode aplikasi dan server sudah siap. Login Google baru aktif setelah Client ID OAuth dari Google Cloud diisi di server.

## 1. Buat OAuth Client ID di Google Cloud Console
Buka **APIs & Services → Credentials → Create credentials → OAuth client ID**, lalu buat tiga client:

| Jenis | Isian |
|---|---|
| **Web application** | Authorized JavaScript origins: alamat web TWINI (mis. `https://twini.example.com`) |
| **Android** | Package name: `com.twini.app` · SHA-1: `1D:66:35:40:B6:07:51:9D:A6:C3:58:B2:65:3B:24:EE:2B:A0:9D:9A` (keystore rilis TWINI) |
| **iOS** | Bundle ID: `com.twini.app` |

Atur juga **OAuth consent screen** (nama aplikasi, email dukungan, domain).

## 2. Isi Client ID di server
Jalankan server dengan environment variable berikut:

```
TWINI_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
TWINI_GOOGLE_ANDROID_CLIENT_ID=yyyyy.apps.googleusercontent.com
TWINI_GOOGLE_IOS_CLIENT_ID=zzzzz.apps.googleusercontent.com
```

Aplikasi mengambil Client ID dari `GET /api/auth/config`, jadi **APK tidak perlu di-build ulang**.

## Cara kerja
1. Aplikasi membuka halaman login Google dan menerima **ID token**.
2. Server memverifikasi token ke Google dengan beberapa syarat:
   - *audience* harus salah satu Client ID di atas.
   - Penerbit harus Google.
   - Token belum kedaluwarsa.
   - Email sudah terverifikasi.
3. Akun baru dibuat (metode `google`), atau akun email yang sama ditautkan (`password+google`).
4. User Google bisa membuat password sendiri lewat `POST /api/auth/password`.
5. Admin melihat metode login setiap user di **Admin → User Management**.
