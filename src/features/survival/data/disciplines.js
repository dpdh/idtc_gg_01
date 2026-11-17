// Disiplin ilmu / profesi karakter TWINI. Setiap disiplin memberi satu keuntungan yang benar-benar
// dipakai gameplay (bukan sekadar label), plus gambar & warna untuk kartu pemilihan.
//
// effects:
//   xpBonus        : pengali XP (0.2 = +20%)
//   growthFlat     : poin pertumbuhan kota tambahan per wabah
//   growthMission  : poin pertumbuhan setiap misi selesai
//   ammoBonus      : kapasitas plasma tambahan
//   fireCooldown   : pengali jeda tembak (<1 = lebih cepat)
//   buildDiscount  : diskon biaya aset kota (0.15 = −15%)
//   buildFlat      : potongan biaya aset kota (poin)
//   unlockBonus    : petak kota terbuka lebih cepat (jumlah wabah)
//   interactRadius : tambahan jangkauan interaksi/scan (meter game)
//   healBonus      : pengali penyembuhan di shelter

const ART = {
  engineer: require('../../../assets/splash/twini_engineer.jpg'),
  geodesy: require('../../../assets/splash/twini_geodesy.jpg'),
  mechanical: require('../../../assets/splash/twini_mechanical.jpg'),
  scientist: require('../../../assets/splash/twini_scientist.jpg'),
  urban: require('../../../assets/splash/twini_urban.jpg'),
};

export const DISCIPLINES = [
  {
    id: 'civil', name: 'Civil Engineer', short: 'Sipil', icon: '🏗️', color: '#ffc94d', art: ART.engineer,
    tagline: 'Struktur & infrastruktur kota',
    perk: 'Biaya aset kota −1 poin (minimal 1)',
    effects: { buildFlat: 1 },
  },
  {
    id: 'geodesy', name: 'Geodesi', short: 'Geodesi', icon: '📐', color: '#5fd3ff', art: ART.geodesy,
    tagline: 'Survei & pemetaan spasial',
    perk: 'Jangkauan scan/interaksi +1,2 m',
    effects: { interactRadius: 1.2 },
  },
  {
    id: 'urban', name: 'Urban Planning', short: 'Urban', icon: '🏙️', color: '#b898ff', art: ART.urban,
    tagline: 'Tata kota & kawasan',
    perk: 'Diskon 15% biaya aset kota',
    effects: { buildDiscount: 0.15 },
  },
  {
    id: 'data', name: 'Data Science', short: 'Data', icon: '📊', color: '#7cf5ff', art: ART.scientist,
    tagline: 'Analitik & digital twin',
    perk: '+20% XP dari setiap aksi',
    effects: { xpBonus: 0.2 },
  },
  {
    id: 'architect', name: 'Arsitek', short: 'Arsitek', icon: '🏛️', color: '#ffb066', art: ART.engineer,
    tagline: 'Desain bangunan & ruang',
    perk: 'Diskon 25% biaya aset kota',
    effects: { buildDiscount: 0.25 },
  },
  {
    id: 'planology', name: 'Planologi', short: 'Planologi', icon: '🗺️', color: '#8ef07a', art: ART.urban,
    tagline: 'Perencanaan wilayah',
    perk: 'Petak tanah terbuka 1 wabah lebih cepat',
    effects: { unlockBonus: 1 },
  },
  {
    id: 'it', name: 'IT / Software', short: 'IT', icon: '💻', color: '#9fd5ff', art: ART.scientist,
    tagline: 'Sistem & jaringan',
    perk: 'Jeda tembak plasma −30%',
    effects: { fireCooldown: 0.7 },
  },
  {
    id: 'professor', name: 'Pakar / Professor', short: 'Profesor', icon: '🎓', color: '#ffe27a', art: ART.scientist,
    tagline: 'Riset & pengajaran',
    perk: '+1 poin pertumbuhan setiap misi selesai',
    effects: { growthMission: 1 },
  },
  {
    id: 'health', name: 'Ahli Kesehatan', short: 'Kesehatan', icon: '🩺', color: '#ff8e9c', art: ART.scientist,
    tagline: 'Kesehatan masyarakat',
    perk: 'Pemulihan health di shelter +60%',
    effects: { healBonus: 0.6 },
  },
  {
    id: 'environment', name: 'Ahli Lingkungan', short: 'Lingkungan', icon: '🌿', color: '#67f7a3', art: ART.urban,
    tagline: 'Ekosistem & mitigasi',
    perk: '+1 poin pertumbuhan kota per wabah',
    effects: { growthFlat: 1 },
  },
  {
    id: 'tni', name: 'TNI', short: 'TNI', icon: '🎖️', color: '#c9ddf5', art: ART.mechanical,
    tagline: 'Pertahanan & operasi lapangan',
    perk: 'Kapasitas plasma +4 dan tembak 15% lebih cepat',
    effects: { ammoBonus: 4, fireCooldown: 0.85 },
  },
];

export const DISCIPLINE_BY_ID = Object.fromEntries(DISCIPLINES.map((item) => [item.id, item]));
export const DEFAULT_DISCIPLINE = 'civil';
export const disciplineById = (id) => DISCIPLINE_BY_ID[id] || DISCIPLINE_BY_ID[DEFAULT_DISCIPLINE];
export const disciplineEffects = (id) => disciplineById(id).effects || {};
