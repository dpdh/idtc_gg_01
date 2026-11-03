# TWINI - Platform Simulasi Digital Twin

Aplikasi mobile dan web lintas platform yang dibangun dengan React Native (Expo) untuk menjelajahi, membuat, dan mensimulasikan digital twin dari lingkungan dunia nyata. Aplikasi ini dilengkapi dengan penampil model 3D, pembuatan 3D berbasis AI, perencanaan kota interaktif, dan pengalaman survival gamifikasi.

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Memulai](#memulai)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Konfigurasi Web](#konfigurasi-web)
- [Arsitektur](#arsitektur)
- [Daftar Layar](#daftar-layar)
- [Dependensi](#dependensi)
- [Kontribusi](#kontribusi)

## Gambaran Umum

**TWINI** adalah platform simulasi digital twin yang dirancang untuk perencanaan perkotaan, manajemen infrastruktur, dan eksplorasi aset 3D. Aplikasi ini memungkinkan pengguna untuk:

- **Menjelajahi model 3D** dari perpustakaan GLB yang dikurasi
- **Membuat model 3D dengan AI** menggunakan prompt teks atau gambar (melalui API Meshy)
- **Merencanakan kota pintar** dengan visualisasi terrain berbasis grid dan penempatan aset
- **Mengalami survival gamifikasi** dalam digital twin Monas (Monumen Nasional, Jakarta)
- **Mengelola proyek digital twin** melalui dashboard simulasi

Aplikasi mendukung platform **iOS, Android, dan Web** melalui kemampuan cross-platform Expo.

## Fitur

### Dashboard Beranda
- Sapaan personal dan kartu akses cepat
- Bagian hero dengan branding digital twin
- Tautan cepat ke perpustakaan 3D, pembuatan AI, dan game TWINI
- Tata letak responsif (compact/wide)

### Kategori Objek 3D
- Jelajahi dan cari kategori objek 3D
- Filter berdasarkan nama dengan pencarian real-time
- Kartu kategori dengan jumlah model

### Perpustakaan Model GLB
- Jelajahi model 3D dalam format GLB
- Cari berdasarkan nama model
- Buka penampil 3D interaktif untuk setiap model
- Metadata model (ukuran, deskripsi)

### Penampil Model 3D
- Pratinjau model 3D interaktif menggunakan Three.js / React Three Fiber
- Kontrol orbit (geser untuk rotasi, cubit/scroll untuk zoom)
- Pemutaran otomatis animasi untuk model dengan data animasi
- Fallback loading dengan mesh wireframe

### Pembuatan 3D dengan AI (Meshy)
- Pembuatan teks ke 3D
- Pembuatan gambar ke 3D
- Polling tugas real-time dengan pelacakan progress
- Pratinjau thumbnail dan unduh GLB
- Kustomisasi prompt tekstur

### Perencana Kota Pintar
- Visualisasi terrain berbasis grid (zona kerja, area hijau, air, hazard, jalan)
- Tempatkan aset 3D pada sel yang dapat dibangun
- Kategori aset: Bangunan, Infrastruktur, Sensor, dll.
- Analisis kota real-time dengan scoring: Efisiensi spasial, Aksesibilitas, Dampak lingkungan, Keamanan
- Grade kota dan rekomendasi
- Sistem XP/leveling
- Integrasi peta dunia nyata (OpenStreetMap)

### Game TWINI Survival
- Pengalaman digital twin gamifikasi di Monas (Jakarta)
- Kumpulkan kristal energi dan aktifkan sensor IoT
- Sistem misi dengan reward XP
- Manajemen sumber daya (energi, kesehatan, baterai)
- Navigasi mini-map
- Scene dunia 3D dengan landmark
- Leaderboard dan badge

### Manajer Simulasi
- Buat dan kelola proyek digital twin
- Pelacakan status proyek (Aktif, Baru, dll.)
- Jumlah aset per proyek
- Grid proyek responsif

### Profil Pengguna
- Tampilan informasi pengguna
- Statistik perpustakaan 3D (diunduh, favorit, proyek)
- Tautan pengaturan dan navigasi
- Fungsi logout

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
