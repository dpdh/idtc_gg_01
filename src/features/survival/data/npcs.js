// Warga/NPC di environment: karakter manusia yang bisa diajak bicara (tombol INTERACT saat dekat).
// Setiap NPC memberi petunjuk + hadiah koin/XP satu kali per akun.

export const NPCS = [
  {
    id: 'npc-raka', name: 'Pak Raka', role: 'Civil Engineer', icon: '👷', color: '#ffc94d',
    position: [4.6, 26.5], reward: { coins: 15, xp: 20 },
    greeting: 'Halo, Twini! Saya Raka, insinyur sipil kawasan Monas.',
    lines: [
      'Pelataran Monas sekarang terbuka — naik tangga di sisi mana pun, jangan khawatir, tidak ada railing lagi.',
      'Kalau mau membangun kota, kumpulkan Poin Pertumbuhan dari wabah digital lalu buka menu Wabah & Kota.',
    ],
    hint: 'Coba bicara ke Bu Sari di dekat alun-alun; dia tahu soal peta dan sensor.',
  },
  {
    id: 'npc-sari', name: 'Bu Sari', role: 'Geodesi', icon: '📐', color: '#5fd3ff',
    position: [-8.4, 14.2], reward: { coins: 18, xp: 25 },
    greeting: 'Selamat datang! Saya Sari, surveyor geodesi digital twin Jakarta.',
    lines: [
      'Tekan TELEPORT untuk langsung menuju sensor atau landmark terdekat — hemat waktu survei.',
      'Wabah digital muncul di 16 titik; peta mini menandainya dengan ikon 🦠.',
    ],
    hint: 'Tembak wabah memakai pistol laser; buka Toko untuk membeli pistol yang lebih canggih.',
  },
  {
    id: 'npc-nia', name: 'Dokter Nia', role: 'Ahli Kesehatan', icon: '🩺', color: '#ff8e9c',
    position: [-20.5, 6.8], reward: { coins: 20, xp: 20 },
    greeting: 'Hai, saya Nia dari pos kesehatan kawasan.',
    lines: [
      'Health akan pulih lebih cepat saat berada di shelter (Gateway atau Emergency).',
      'Kalau hidrasi turun, gunakan Botol Air dari inventory sebelum health ikut turun.',
    ],
    hint: 'Disiplin Ahli Kesehatan menambah kecepatan pemulihan di shelter.',
  },
  {
    id: 'npc-adi', name: 'Prajurit Adi', role: 'TNI', icon: '🎖️', color: '#c9ddf5',
    position: [3.4, -24.2], reward: { coins: 22, xp: 30 },
    greeting: 'Siap! Prajurit Adi, pengamanan zona darurat.',
    lines: [
      'Wabah Virus Kernel punya 3 lapis pelindung — pistol Nova Cannon menghancurkannya dalam satu tembakan.',
      'Di toko ada aksesori senjata: Holo Sight, Cooling Core, Expanded Cell, Accelerator, dan Overcharge.',
    ],
    hint: 'Latih tembakan di zona darurat; jangan lupa klaim reward misi tim.',
  },
];

export const npcById = (id) => NPCS.find((npc) => npc.id === id) || null;
