# TWINI - Platform Simulasi Digital Twin

**TWINI** adalah aplikasi mobile dan web lintas platform yang dibangun dengan React Native (Expo) untuk menjelajahi, membuat, dan mensimulasikan digital twin dari lingkungan dunia nyata. Aplikasi ini dilengkapi dengan penampil model 3D, pembuatan 3D berbasis AI melalui Meshy, perencanaan kota pintar berbasis grid, dan pengalaman survival gamifikasi di digital twin Monas (Monumen Nasional, Jakarta).

Aplikasi mendukung platform **iOS, Android, dan Web** melalui kemampuan cross-platform Expo.

---

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi & Memulai](#instalasi--memulai)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Navigasi & Daftar Layar](#navigasi--daftar-layar)
- [Fitur 3D & Model GLB](#fitur-3d--model-glb)
- [Pembuatan 3D dengan AI (Meshy)](#pembuatan-3d-dengan-ai-meshy)
- [Smart City Planner](#smart-city-planner)
- [TWINI Survival Game](#twini-survival-game)
- [Autentikasi & Manajemen Pengguna](#autentikasi--manajemen-pengguna)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)
- [Acknowledgments](#acknowledgments)

---

## Gambaran Umum

TWINI adalah platform simulasi digital twin yang dirancang untuk perencanaan perkotaan, manajemen infrastruktur, dan eksplorasi aset 3D. Dengan TWINI, pengguna dapat:

- **Menjelajahi model 3D** dari perpustakaan GLB yang dikurasi dengan fitur pencarian dan kategori
- **Membuat model 3D dengan AI** menggunakan prompt teks atau gambar melalui integrasi API Meshy
- **Merencanakan kota pintar** dengan visualisasi terrain berbasis grid dan penempatan aset 3D interaktif
- **Mengalami survival gamifikasi** dalam digital twin Monas (Monumen Nasional, Jakarta) dengan misi, XP, dan leaderboard
- **Mengelola proyek digital twin** melalui dashboard simulasi dengan pelacakan status dan aset
- **Mengelola profil pengguna** dengan statistik perpustakaan 3D dan pengaturan akun

---

## Fitur Utama

### 1. Dashboard Beranda (Home Dashboard)
- Sapaan personal dan kartu akses cepat
- Bagian hero dengan branding digital twin TWINI
- Tautan cepat ke perpustakaan 3D, pembuatan AI, dan game TWINI Survival
- Tata letak responsif (compact/wide) menggunakan `useWindowDimensions`
- Bottom tab navigation dengan ikon emoji (Home, Explore, TWINI, Simulasi, Profile)

### 2. Kategori Objek 3D (3D Categories)
- Jelajahi dan cari kategori objek 3D
- Filter berdasarkan nama dengan pencarian real-time
- Kartu kategori dengan jumlah model dalam setiap kategori

### 3. Perpustakaan Model GLB (3D Library)
- Jelajahi model 3D dalam format GLB
- Cari berdasarkan nama model
- Buka penampil 3D interaktif untuk setiap model
- Menampilkan metadata model (ukuran, deskripsi)
- Integrasi dengan ThreeDViewer untuk pratinjau interaktif

### 4. Penampil Model 3D (3D Viewer)
- Pratinjau model 3D interaktif menggunakan Three.js / React Three Fiber
- Kontrol orbit (geser untuk rotasi, cubit/scroll untuk zoom)
- Pemutaran otomatis animasi untuk model dengan data animasi
- Fallback loading dengan mesh wireframe saat model sedang dimuat
- Dukungan format file GLB/glTF

### 5. Pembuatan 3D dengan AI (Meshy Generator)
- Pembuatan model 3D dari prompt teks (text-to-3D)
- Pembuatan model 3D dari gambar (image-to-3D)
- Polling tugas real-time dengan pelacakan progress generation
- Pratinjau thumbnail dan unduh file GLB hasil generate
- Kustomisasi prompt tekstur untuk model 3D

### 6. Perencana Kota Pintar (Smart City Planner / Maps)
- Visualisasi terrain berbasis grid dengan zona: kerja, area hijau, air, hazard, jalan
- Tempatkan aset 3D pada sel yang dapat dibangun
- Kategori aset: Bangunan, Infrastruktur, Sensor, dll.
- Analisis kota real-time dengan scoring: Efisiensi spasial, Aksesibilitas, Dampak lingkungan, Keamanan
- Grade kota dan rekomendasi perbaikan
- Sistem XP dan leveling untuk perkotaan
- Integrasi peta dunia nyata melalui OpenStreetMap

### 7. Game TWINI Survival
- Pengalaman digital twin gamifikasi di Monas (Jakarta)
- Kumpulkan kristal energi dan aktifkan sensor IoT
- Sistem misi dengan reward XP
- Manajemen sumber daya: energi, kesehatan, baterai
- Navigasi mini-map untuk orientasi pemain
- Scene dunia 3D dengan landmark Monas
- Leaderboard dan badge pencapaian

### 8. Manajer Simulasi (Simulation)
- Buat dan kelola proyek digital twin
- Pelacakan status proyek (Aktif, Baru, dll.)
- Jumlah aset per proyek
- Grid proyek responsif untuk manajemen proyek

### 9. Profil Pengguna (User Profile)
- Tampilan informasi pengguna lengkap
- Statistik perpustakaan 3D (diunduh, favorit, proyek)
- Tautan pengaturan dan navigasi
- Fungsi logout dan pengelolaan akun

### 10. Autentikasi (Login & Register)
- Registrasi akun baru dengan validasi email dan password (min. 8 karakter)
- Login dengan email dan password
- Penyimpanan kredensial aman menggunakan Expo SecureStore + AsyncStorage
- Update profil dan ganti password
- Hapus akun (delete account)
- Persistensi sesi login melalui AsyncStorage
### Autentikasi
- Layar login dengan email/password
- Placeholder login sosial (Google, Apple)
- Form registrasi dengan persetujuan syarat
- Alur onboarding dengan ilustrasi

## Tech Stack

### Inti
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| React Native | 0.88.1 | Framework UI lintas platform |
| Expo | ~58.0.22 | Platform & tooling pengembangan |
| React | 19.3.0 | Library komponen |

### Navigasi
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| @react-navigation/native | 6.1.18 | Container navigasi |
| @react-navigation/stack | 6.4.1 | Stack navigator (kompatibel web) |
| @react-navigation/bottom-tabs | 6.5.20 | Bottom tab navigator |
| @react-navigation/native-stack | 6.11.0 | Native stack navigator |

### 3D & Grafis
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| Three.js | 0.165.0 | Engine rendering 3D |
| @react-three/fiber | 9.8.2 | React renderer untuk Three.js |
| @react-three/drei | 10.7.9 | Helper & komponen Three.js |
| expo-gl | ~58.0.4 | Konteks WebGL untuk Expo |

### UI & Styling
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| expo-linear-gradient | ~58.0.3 | Latar belakang gradien |
| @fortawesome/react-native-fontawesome | 1.0.0 | Integrasi ikon FontAwesome |
| @fortawesome/free-solid-svg-icons | 7.3.1 | Set ikon |
| react-native-svg | 15.16.0 | Rendering SVG |
| react-native-safe-area-context | ~5.10.1 | Penanganan safe area |

### Penyimpanan & State
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| @react-native-async-storage/async-storage | 2.2.0 | Penyimpanan key-value lokal |
| expo-secure-store | ~58.0.2 | Penyimpanan kredensial aman |
| react-redux | 9.3.1 | Manajemen state (Redux) |

### Lainnya
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| expo-asset | ~58.0.19 | Manajemen aset |
| expo-splash-screen | ~58.0.12 | Kontrol splash screen |
| expo-screen-orientation | ~58.0.3 | Kunci orientasi layar |
| react-dom | 19.3.0 | Rendering web |
| react-native-web | ^0.21.4 | React Native untuk web |

## Memulai

## Konfigurasi Web

### Konfigurasi Babel
babel.config.js menggunakan babel-preset-expo yang menangani transformasi JSX dan Flow secara otomatis:
```javascript
module.exports = {
  presets: ['babel-preset-expo'],
};
```

### Konfigurasi Metro
metro.config.js menambahkan ekstensi glb sebagai aset untuk file model 3D:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');
module.exports = config;
```

### Navigasi pada Web
Aplikasi menggunakan sistem navigasi berbasis state alih-alih stack/tab navigator React Navigation untuk kompatibilitas web. Ini menghindari error "invalid component" yang terjadi dengan createNativeStackNavigator pada web.

### Kompatibilitas Animasi
Semua pemanggilan API Animated menggunakan useNativeDriver: false untuk memastikan kompatibilitas dengan platform web, karena useNativeDriver: true tidak didukung pada web.

## Arsitektur

### Navigasi Berbasis State
Aplikasi menggunakan sistem navigasi kustom di AppNavigator.js:
```javascript
const [screen, setScreen] = useState(SCREENS.MAIN);
const [tab, setTab] = useState('Home');
const navigate = (name, params) => {
  switch (name) {
    case 'Login': setScreen(SCREENS.LOGIN); break;
    case 'Library': setScreen(SCREENS.LIBRARY); break;
    default: setTab(name);
  }
};
```
Setiap layar menerima prop navigation dengan fungsi { navigate, goBack }.

### Pola Komponen
Layar mengikuti pola yang konsisten:
```javascript
export default function NamaLayar({ navigation, route }) {
  // Gunakan navigation.navigate('NamaLayar') untuk navigasi
  // Gunakan navigation.goBack() untuk kembali
  return (/* JSX */);
}
```

### Error Boundary
AppErrorBoundary membungkus seluruh aplikasi dan menampilkan layar diagnostik dengan stack trace error jika ada komponen yang gagal dirender.

## Daftar Layar

| Layar | File | Deskripsi |
|-------|------|-----------|
| Splash | src/features/splash/screens/SplashScreen.js | Splash dengan animasi logo |
| Onboarding | src/features/onboarding/screens/OnboardingScreen.js | Carousel onboarding 4 slide |
| Login | src/features/auth/screens/LoginScreen.js | Login email/password + sosial |
| Register | src/features/auth/screens/RegisterScreen.js | Form registrasi |
| Home Dashboard | src/features/home/screens/HomeDashboard.js | Dashboard utama dengan tautan cepat |
| Kategori 3D | src/features/categories/screens/ThreeDCategories.js | Penjelajah kategori |
| Perpustakaan 3D | src/features/library/screens/ThreeDLibrary.js | Penjelajah model GLB |
| Penampil 3D | src/features/viewer/screens/ThreeDViewer.js | Pratinjau 3D interaktif |
| Meshy Generator | src/features/meshy/screens/MeshyGeneratorScreen.js | Pembuatan 3D dengan AI |
| Maps/City Builder | src/features/maps/screens/MapsScreen.js | Perencana kota pintar |
| Simulasi | src/features/simulation/screens/SimulationScreen.js | Manajer proyek |
| Profil | src/features/profile/screens/UserProfile.js | Profil pengguna & pengaturan |
| TWINI Survival | src/features/survival/screens/TwiniSurvivalScreen.js | Game survival gamifikasi |

## Dependensi

### Dependensi Runtime Utama
- React 19.3.0 - Framework UI
- React Native 0.88.1 - Komponen lintas platform
- Expo 58.0.22 - Platform pengembangan
- Three.js 0.165.0 - Rendering 3D
- @react-three/fiber 9.8.2 - React renderer Three.js
- @react-three/drei 10.7.9 - Helper Three.js

### Pengembangan
- Node.js >= 18.x
- npm >= 9.x

## Kontribusi

1. Buat branch fitur dari main
2. Lakukan perubahan
3. Uji di platform web dan mobile
4. Kirim pull request

### Konvensi Kode
- Gunakan komponen fungsional dengan hooks
- Ikuti struktur folder yang ada (berbasis fitur)
- Gunakan StyleSheet.create() untuk styling
- Gunakan useWindowDimensions untuk tata letak responsif
- Selalu gunakan useNativeDriver: false untuk kompatibilitas web

## Lisensi

ISC License

## Ucapan Terima Kasih

- Dibangun dengan Expo (https://expo.dev)
- Rendering 3D didukung oleh Three.js (https://threejs.org) dan React Three Fiber (https://docs.pmnd.rs/react-three-fiber)
- Ikon dari FontAwesome (https://fontawesome.com)
- Peta oleh OpenStreetMap (https://www.openstreetmap.org)

### Prasyarat
- Node.js >= 18.x
- npm >= 9.x
- Expo CLI (diinstall secara global atau via npx)

### Instalasi
```bash
git clone <repository-url>
cd g_dt_01
npm install
npm install @fortawesome/fontawesome-svg-core --legacy-peer-deps
```

## Menjalankan Aplikasi

### Web (Browser)
```bash
npm run web
```
Aplikasi akan tersedia di http://localhost:8081

### Mobile (Expo Go)
```bash
npm start
```

### Production Web Build
```bash
npm run build:web
```

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Expo CLI (installed globally or via npx)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd g_dt_01

# Install dependencies
npm install

# Install missing peer dependencies (if needed)
npm install @fortawesome/fontawesome-svg-core --legacy-peer-deps
```

## Running the App

### Web (Browser)
```bash
npm run web
# or
npx expo start --web
```
The app will be available at http://localhost:8081

### Mobile (Expo Go)
```bash
npm start
# Scan the QR code with Expo Go app
```

### Production Web Build
```bash
npm run build:web
# Output: dist/ directory
```

## Web-Specific Configuration

### Babel Configuration
The babel.config.js uses babel-preset-expo which handles JSX and Flow transformation automatically:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
};
```

### Metro Configuration
The metro.config.js adds glb as an asset extension for 3D model files:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');
module.exports = config;
```

### Navigation on Web
The app uses a state-based navigation system instead of React Navigation's stack/tab navigators for web compatibility. This avoids "invalid component" errors that occurred with createNativeStackNavigator on web.

### Animation Compatibility
All Animated API calls use useNativeDriver: false to ensure compatibility with the web platform, as useNativeDriver: true is not supported on web.

## Architecture

### State-Based Navigation
The app uses a custom navigation system in AppNavigator.js:

```javascript
// Screen state
const [screen, setScreen] = useState(SCREENS.MAIN);
const [tab, setTab] = useState('Home');

// Navigation function
const navigate = (name, params) => {
  switch (name) {
    case 'Login': setScreen(SCREENS.LOGIN); break;
    case 'Library': setScreen(SCREENS.LIBRARY); break;
    // ... other routes
    default: setTab(name); // Tab switching
  }
};
```

Each screen receives a navigation prop with { navigate, goBack } functions.

### Component Pattern
Screens follow a consistent pattern:

```javascript
export default function ScreenName({ navigation, route }) {
  // Use navigation.navigate('ScreenName') for navigation
  // Use navigation.goBack() to return
  return (/* JSX */);
}
```

### Error Boundary
AppErrorBoundary wraps the entire app and displays a diagnostic screen with the error stack trace if any component fails to render.

## Screen Overview

| Screen | File | Description |
|--------|------|-------------|
| Splash | src/features/splash/screens/SplashScreen.js | Animated splash with logo |
| Onboarding | src/features/onboarding/screens/OnboardingScreen.js | 4-slide onboarding carousel |
| Login | src/features/auth/screens/LoginScreen.js | Email/password + social login |
| Register | src/features/auth/screens/RegisterScreen.js | Registration form |
| Home Dashboard | src/features/home/screens/HomeDashboard.js | Main dashboard with quick links |
| 3D Categories | src/features/categories/screens/ThreeDCategories.js | Category browser |
| 3D Library | src/features/library/screens/ThreeDLibrary.js | GLB model browser |
| 3D Viewer | src/features/viewer/screens/ThreeDViewer.js | Interactive 3D preview |
| Meshy Generator | src/features/meshy/screens/MeshyGeneratorScreen.js | AI 3D generation |
| Maps/City Builder | src/features/maps/screens/MapsScreen.js | Smart city planner |
| Simulation | src/features/simulation/screens/SimulationScreen.js | Project manager |
| Profile | src/features/profile/screens/UserProfile.js | User profile & settings |
| TWINI Survival | src/features/survival/screens/TwiniSurvivalScreen.js | Gamified survival game |

## Dependencies

### Key Runtime Dependencies
- React 19.3.0 - UI framework
- React Native 0.88.1 - Cross-platform components
- Expo 58.0.22 - Development platform
- Three.js 0.165.0 - 3D rendering
- @react-three/fiber 9.8.2 - React Three.js renderer
- @react-three/drei 10.7.9 - Three.js helpers

### Development
- Node.js >= 18.x
- npm >= 9.x

## Contributing

1. Create a feature branch from main
2. Make your changes
3. Test on both web and mobile platforms
4. Submit a pull request

### Code Conventions
- Use functional components with hooks
- Follow the existing folder structure (feature-based)
- Use StyleSheet.create() for styles
- Use useWindowDimensions for responsive layouts
- Always use useNativeDriver: false for web compatibility

## License

ISC License

## Acknowledgments

- Built with Expo (https://expo.dev)
- 3D rendering powered by Three.js (https://threejs.org) and React Three Fiber (https://docs.pmnd.rs/react-three-fiber)
- Icons from FontAwesome (https://fontawesome.com)
- Maps by OpenStreetMap (https://www.openstreetmap.org)# idtc_gg_01
# idtc_gg_01
# idtc_gg_01
# GAME-IDTC

---

## Tech Stack

### Frontend / Runtime

| Teknologi | Versi | Keterangan |
|-----------|-------|------------|
| React | ^19.3.0 | UI framework |
| React Native | 0.88.1 | Cross-platform mobile components |
| Expo | ^58.0.22 | Development platform & build tools |
| React Native Web | ^0.21.4 | Web platform support |
| Three.js | ^0.165.0 | 3D rendering engine |
| @react-three/fiber | ^9.8.2 | React renderer untuk Three.js |
| @react-three/drei | ^10.7.9 | Helper dan utilitas Three.js |
| React Navigation (Native, Stack, Bottom Tabs) | ^6.x | Navigasi antar layar |
| React Redux | ^9.3.1 | State management |
| AsyncStorage | 2.2.0 | Penyimpanan lokal data |
| Expo SecureStore | ~58.0.2 | Penyimpanan kredensial aman |
| Expo Asset | ~58.0.19 | Manajemen aset statis |
| Expo GL | ~58.0.4 | OpenGL support |
| Expo Linear Gradient | ~58.0.3 | Gradien warna |
| Expo Screen Orientation | ~58.0.3 | Pengaturan orientasi layar |
| Expo Splash Screen | ~58.0.12 | Layar splash kustom |
| FontAwesome (free solid) | ^7.3.1 | Icon library |
| react-native-svg | 15.16.0 | Rendering SVG |
| react-native-safe-area-context | ~5.10.1 | Safe area handling |

### Development Tools

| Alat | Keterangan |
|------|------------|
| Node.js | >= 18.x |
| npm | >= 9.x |
| Expo CLI | Build dan development server |
| Xcode | Untuk build iOS (macOS only) |
| Android Studio | Untuk build Android |

---

## Struktur Proyek

```
g_dt_01/
├── App.js                          # Entry point utama aplikasi
├── app.json                        # Konfigurasi Expo
├── babel.config.js                 # Konfigurasi Babel
├── metro.config.js                 # Konfigurasi Metro bundler
├── package.json                    # Dependensi dan skrip proyek
├── README.md                       # Dokumentasi proyek
├── server/
│   └── server.js                   # Server backend (opsional)
├── src/
│   ├── index.web.js                # Entry point untuk web
│   ├── theme.js                    # Tema warna dan styling global
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ResponsiveContent.js
│   │   │   └── LiquidTabBar.js
│   │   └── theme/
│   │       └── index.js
│   ├── application/
│   │   ├── navigation/
│   │   │   └── AppNavigator.js     # Navigasi utama aplikasi
│   │   └── components/
│   │       └── AppErrorBoundary.js # Error boundary global
│   └── features/
│       ├── splash/                 # Layar splash dan onboarding
│       ├── auth/                   # Autentikasi (login, register, profil)
│       ├── home/                   # Dashboard beranda
│       ├── categories/             # Kategori objek 3D
│       ├── library/                # Perpustakaan model GLB
│       ├── viewer/                 # Penampil model 3D
│       ├── mehy/                   # Pembuatan 3D AI (Meshy)
│       ├── maps/                   # Smart city planner
│       ├── simulation/             # Manajer simulasi proyek
│       ├── profile/                # Profil pengguna
│       └── survival/               # Game TWINI Survival
├── android/                        # Proyek Android native
├── ios/                            # Proyek iOS native
├── dist/                           # Build output untuk web
└── presentation/                   # Presentasi dan dokumentasi proyek
```

---

## Persyaratan Sistem

### Untuk Development
- **Node.js** versi 18.x atau lebih tinggi
- **npm** versi 9.x atau lebih tinggi
- **Expo CLI** (`npx expo` atau install globally via `npm install -g expo-cli`)
- **Git** untuk version control

### Untuk Build Mobile
- **iOS**: macOS dengan Xcode terbaru (untuk simulator iOS)
- **Android**: Android Studio dengan Android SDK (untuk emulator Android)
- **Web**: Browser modern (Chrome, Firefox, Safari, Edge)

---

## Instalasi & Memulai

### 1. Clone Repository

```bash
git clone https://github.com/idtc-id/GAME-IDTC.git
cd GAME-IDTC
```

### 2. Install Dependensi

```bash
npm install
```

### 3. Jalankan Development Server

Untuk memulai Expo development server:

```bash
npx expo start
```

Atau menggunakan skrip yang tersedia di `package.json`:

```bash
npm start
```

---

## Menjalankan Aplikasi

### Melalui Expo Go (Mobile)
1. Install aplikasi **Expo Go** dari App Store (iOS) atau Google Play Store (Android)
2. Jalankan `npx expo start` di terminal
3. Scan QR code yang muncul di terminal menggunakan kamera aplikasi Expo Go

### Untuk iOS Simulator
```bash
npx expo start --ios
```
Atau:
```bash
npx expo ios
```

### Untuk Android Emulator
```bash
npx expo start --android
```
Atau:
```bash
npx expo android
```

### Untuk Web
```bash
npx expo start --web
```
Atau build untuk produksi:
```bash
npm run build:web
```
Build akan dihasilkan di folder `dist/`.

### Untuk Server (opsional)
```bash
npm run serve
```

---

## Konfigurasi Environment

File konfigurasi utama berada di `app.json`:

```json
{
  "expo": {
    "name": "TWINI",
    "slug": "twini",
    "version": "1.0.3",
    "orientation": "default",
    "icon": "./src/assets/imageTwini/gg_icon-IDTC-app.png",
    "ios": {
      "bundleIdentifier": "com.twini.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.twini.app",
      "adaptiveIcon": {
        "foregroundImage": "./src/assets/imageTwini/gg_icon-IDTC.png",
        "backgroundColor": "#0873bd"
      }
    },
    "web": {
      "bundler": "metro",
      "favicon": "./src/assets/twini-logo.png"
    },
    "plugins": [
      ["expo-splash-screen", {
        "image": "./src/assets/twini-logo.png",
        "resizeMode": "contain",
        "backgroundColor": "#090f1b"
      }],
      "expo-secure-store"
    ]
  }
}
```

### Konfigurasi Plugin Expo
- **expo-splash-screen**: Konfigurasi layar splash dengan logo TWINI dan background warna `#090f1b`
- **expo-secure-store**: Untuk penyimpanan kredensial aman (token, password)

---

## Arsitektur Aplikasi

### State-Based Navigation
Aplikasi menggunakan sistem navigasi custom dalam `AppNavigator.js` yang mengelola state layar dan tab:

```javascript
// Screen state
const [screen, setScreen] = useState(SCREENS.MAIN);
const [tab, setTab] = useState('Home');

// Navigasi function
const navigate = (name, params) => {
  switch (name) {
    case 'Login': setScreen(SCREENS.LOGIN); break;
    case 'Library': setScreen(SCREENS.LIBRARY); break;
    // ... rute lainnya
    default: setTab(name); // Tab switching
  }
};
```

Setiap layar menerima prop `navigation` dengan fungsi `{ navigate, goBack }`.

### Component Pattern
Layar mengikuti pola konsisten:

```javascript
export default function ScreenName({ navigation, route }) {
  // Gunakan navigation.navigate('ScreenName') untuk navigasi
  // Gunakan navigation.goBack() untuk kembali
  return (
    /* JSX */
  );
}
```

### Error Boundary
`AppErrorBoundary` melindungi seluruh aplikasi dan menampilkan layar diagnostik dengan stack trace error jika komponen gagal render.

### Autentikasi
`AuthProvider` mengelola sesi pengguna menggunakan:
- **AsyncStorage** untuk menyimpan data pengguna dan sesi
- **Expo SecureStore** untuk menyimpan kredensial (password) secara aman
- State management melalui React Context API

---

## Navigasi & Daftar Layar

| Layar | File | Deskripsi |
|-------|------|-----------|
| Splash | `src/features/splash/screens/SplashScreen.js` | Layar splash animasi dengan logo |
| Onboarding | `src/features/onboarding/screens/OnboardingScreen.js` | Carousel 4 slide pengenalan aplikasi |
| Login | `src/features/auth/screens/LoginScreen.js` | Login email/password |
| Register | `src/features/auth/screens/RegisterScreen.js` | Registrasi akun baru |
| Home Dashboard | `src/features/home/screens/HomeDashboard.js` | Dashboard utama dengan quick links |
| 3D Categories | `src/features/categories/screens/ThreeDCategories.js` | Browser kategori objek 3D |
| 3D Library | `src/features/library/screens/ThreeDLibrary.js` | Browser model GLB |
| 3D Viewer | `src/features/viewer/screens/ThreeDViewer.js` | Pratinjau 3D interaktif |
| Meshy Generator | `src/features/meshy/screens/MeshyGeneratorScreen.js` | AI 3D generation |
| Maps / City Builder | `src/features/maps/screens/MapsScreen.js` | Smart city planner |
| Simulation | `src/features/simulation/screens/SimulationScreen.js` | Manajer proyek simulasi |
| Profile | `src/features/profile/screens/UserProfile.js` | Profil & pengaturan pengguna |
| TWINI Survival | `src/features/survival/screens/TwiniSurvivalScreen.js` | Game survival gamifikasi |

### Bottom Tab Navigation
Tab navigasi utama tersedia di layar utama:

| Tab | Label | Ikon | Layar |
|-----|-------|------|-------|
| Home | Home | 🏠 | HomeDashboard |
| Explore | Explore | 🔍 | ThreeDCategories |
| Maps | TWINI | 🗺️ | TwiniSurvivalScreen |
| Simulation | Simulasi | 🎮 | SimulationScreen |
| Profile | Profile | 👤 | UserProfile |

---

## Fitur 3D & Model GLB

TWINI mendukung rendering model 3D dalam format **GLB/glTF** menggunakan:

- **Three.js** sebagai engine rendering 3D
- **@react-three/fiber** sebagai bridge React ke Three.js
- **@react-three/drei** untuk komponen helper (OrbitControls, dll.)

### Kontrol Penampil 3D
- **Geser** (drag) untuk memutar model
- **Cubit / Scroll** untuk zoom in/out
- Animasi otomatis untuk model yang memiliki data animasi
- Fallback wireframe mesh saat model sedang dalam proses pemuatan

### Sumber Model
Model 3D tersimpan di `src/assets/` dan `dist/assets/src/assets/glb/` dengan format `.glb`.

---

## Pembuatan 3D dengan AI (Meshy)

Fitur Meshy Generator memungkinkan pembuatan model 3D menggunakan kecerdasan buatan melalui API Meshy:

1. **Text-to-3D**: Masukkan prompt teks untuk menghasilkan model 3D
2. **Image-to-3D**: Unggah gambar referensi untuk menghasilkan model 3D
3. **Real-time Polling**: Melacak status generation dengan progress bar
4. **Thumbnail Preview**: Pratinjau hasil sebelum download
5. **Download GLB**: Unduh hasil generate dalam format GLB
6. **Texture Customization**: Kustomisasi prompt tekstur untuk model

---

## Smart City Planner

Fitur perencanaan kota pintar memungkinkan pengguna merancang kota digital:

### Terrain Grid
Visualisasi berbasis grid dengan zona:
- **Zona kerja** (commercial/industrial)
- **Area hijau** (green space)
- **Air** (water body)
- **Hazard** (zona berbahaya)
- **Jalan** (road infrastructure)

### Aset 3D
Pengguna dapat menempatkan aset 3D pada sel grid yang dapat dibangun dengan kategori:
- Bangunan
- Infrastruktur
- Sensor IoT
- dll.

### Analisis Kota
Sistem scoring real-time untuk menilai kualitas perencanaan kota:
- Efisiensi spasial
- Aksesibilitas
- Dampak lingkungan
- Keamanan

Hasil analisis memberikan grade kota dan rekomendasi perbaikan, dilengkai sistem XP dan leveling.

### Integrasi Peta
Integrasi dengan **OpenStreetMap** untuk visualisasi peta dunia nyata.

---

## TWINI Survival Game

Game digital twin gamifikasi yang berlatar di **Monas (Monumen Nasional, Jakarta)**:

### Gameplay
- **Kumpulkan kristal energi** yang tersebar di seluruh area
- **Aktifkan sensor IoT** untuk mendapatkan poin bonus
- **Sistem misi** dengan reward XP untuk setiap pencapaian
- **Manajemen sumber daya**: energi, kesehatan, dan baterai karakter
- **Navigasi mini-map** untuk orientasi posisi pemain di dunia game
- **Scene dunia 3D** dengan landmark Monas sebagai titik pusat

### Progresi
- Leaderboard untuk kompetisi antar pemain
- Sistem badge pencapaian
- Leveling berdasarkan XP yang terkumpul

---

## Autentikasi & Manajemen Pengguna

### Fitur Autentikasi
- Registrasi dengan validasi email format dan password minimal 8 karakter
- Login dengan email dan password yang terdaftar
- Penyimpanan kredensial aman menggunakan Expo SecureStore
- Sesi login persist via AsyncStorage

### Manajemen Akun
- Update profil (nama, email, organisasi, industri, negara)
- Ganti password dengan verifikasi password lama
- Hapus akun secara permanen
- Logout dari semua sesi

### Alur Autentikasi
```
Splash → Onboarding → Login/Register → Home Dashboard (dengan Bottom Tab)
```

---

## Kontribusi

Kontribusi sangat diterima! Berikut adalah panduan untuk berkontribusi:

1. **Fork** repository ini
2. Buat branch fitur dari `main`: `git checkout -b fitur/nama-fitur`
3. Lakukan perubahan yang diperlukan
4. Uji pada platform web dan mobile (iOS/Android)
5. Commit perubahan: `git commit -m "feat: deskripsi fitur"`
6. Push ke branch: `git push origin fitur/nama-fitur`
7. Buat **Pull Request** ke branch `main`

### Konvensi Kode
- Gunakan functional components dengan React hooks
- Ikuti struktur folder yang ada (feature-based)
- Gunakan `StyleSheet.create()` untuk styling
- Gunakan `useWindowDimensions` untuk layout responsif
- Selalu gunakan `useNativeDriver: false` untuk kompatibilitas web
- Tulis komentar dalam bahasa Indonesia atau Inggris

---

## Lisensi

Distributed under the ISC License. Lihat file `LICENSE` untuk informasi lebih lanjut.

---

## Acknowledgments

- [Expo](https://expo.dev) - Platform development React Native
- [Three.js](https://threejs.org) - 3D rendering engine
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer untuk Three.js
- [React Three Drei](https://github.com/pmndrs/drei) - Helper dan utilitas Three.js
- [FontAwesome](https://fontawesome.com) - Icon library
- [OpenStreetMap](https://www.openstreetmap.org) - Data peta dunia nyata
- [Meshy](https://meshy.ai) - AI 3D generation API
- [React Navigation](https://reactnavigation.org) - Navigasi layar React Native
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) - Penyimpanan kredensial aman

---

**TWINI** - Platform Simulasi Digital Twin untuk Perencanaan Perkotaan dan Eksplorasi 3D  
Dibangun dengan ❤️ menggunakan React Native dan Expo
