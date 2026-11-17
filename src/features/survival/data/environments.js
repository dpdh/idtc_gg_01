// Playable environments. Every environment keeps the SAME mission scenario: identical object, zone,
// Energy Core and landmark coordinates (so missions, rewards and server validation stay unchanged);
// only the scenery, colours and display names differ.
export const ENVIRONMENTS = [
  {
    id: 'monas',
    name: 'Kawasan Monas',
    subtitle: 'Jakarta Pusat · Medan Merdeka',
    emoji: '🗼',
    accent: '#ffc54d',
    sky: null, // keep the day/night sky as is
    ground: '#4a9a70',
    zones: {},
    landmarks: {},
  },
  {
    id: 'smartcity',
    name: 'Smart City Nusantara',
    subtitle: 'Distrik kota pintar futuristik',
    emoji: '🏙️',
    accent: '#5fd3ff',
    sky: '#5d7fb8',
    ground: '#2f3a4f',
    zones: {
      gateway: ['Gerbang Kota Pintar', 'GERBANG'], merdeka: ['Alun-Alun Data', 'ALUN-ALUN'], monument: ['Menara Twin Hub', 'TWIN HUB'],
      park: ['Taman Vertikal', 'TAMAN'], smart: ['Distrik IoT', 'DISTRIK IOT'], water: ['Pusat Air Cerdas', 'AIR CERDAS'],
      energy: ['Grid Energi Surya', 'GRID ENERGI'], emergency: ['Pusat Tanggap Darurat', 'DARURAT'],
    },
    landmarks: {
      monas: ['Menara Twin Hub', 'TWIN HUB'], medan: ['Alun-Alun Data', 'ALUN-ALUN'], gambir: ['Stasiun MRT Pintar', 'MRT PINTAR'],
      museum: ['Museum Inovasi', 'MUSEUM INOVASI'], istiqlal: ['Pusat Kendali Kota', 'KENDALI KOTA'],
    },
  },
  {
    id: 'coastal',
    name: 'Pesisir Digital',
    subtitle: 'Pantai, dermaga & mercusuar pintar',
    emoji: '🏝️',
    accent: '#3fd2c7',
    sky: '#7fd0f0',
    ground: '#e4d4a4',
    zones: {
      gateway: ['Gerbang Pantai', 'GERBANG'], merdeka: ['Promenade Pasir', 'PROMENADE'], monument: ['Mercusuar Digital', 'MERCUSUAR'],
      park: ['Hutan Mangrove', 'MANGROVE'], smart: ['Dermaga Pintar', 'DERMAGA'], water: ['Stasiun Pasang Surut', 'PASANG SURUT'],
      energy: ['Ladang Angin Pantai', 'TURBIN ANGIN'], emergency: ['Pos SAR Pantai', 'POS SAR'],
    },
    landmarks: {
      monas: ['Mercusuar Digital', 'MERCUSUAR'], medan: ['Promenade Pasir', 'PROMENADE'], gambir: ['Stasiun Pantai', 'STASIUN'],
      museum: ['Museum Bahari', 'MUSEUM BAHARI'], istiqlal: ['Menara Pengawas', 'PENGAWAS'],
    },
  },
  {
    id: 'highland',
    name: 'Dataran Tinggi Hijau',
    subtitle: 'Perbukitan, hutan pinus & danau',
    emoji: '🏔️',
    accent: '#7dffb5',
    sky: '#9fc9e6',
    ground: '#5f9b52',
    zones: {
      gateway: ['Gerbang Lembah', 'GERBANG'], merdeka: ['Padang Rumput', 'PADANG'], monument: ['Observatorium Bukit', 'OBSERVATORIUM'],
      park: ['Hutan Pinus', 'HUTAN PINUS'], smart: ['Kebun Sensor', 'KEBUN SENSOR'], water: ['Danau Biru', 'DANAU'],
      energy: ['Mikrohidro', 'MIKROHIDRO'], emergency: ['Pos Ranger', 'POS RANGER'],
    },
    landmarks: {
      monas: ['Observatorium Bukit', 'OBSERVATORIUM'], medan: ['Padang Rumput', 'PADANG'], gambir: ['Stasiun Kereta Gunung', 'KERETA GUNUNG'],
      museum: ['Museum Alam', 'MUSEUM ALAM'], istiqlal: ['Menara Api', 'MENARA API'],
    },
  },
];

export const DEFAULT_ENVIRONMENT = 'monas';
export const environmentById = (id) => ENVIRONMENTS.find((env) => env.id === id) || ENVIRONMENTS[0];

// Display names for zones / landmarks in the chosen environment (ids stay the same for missions).
export function localizeZone(envId, zone) {
  if (!zone) return zone;
  const hit = environmentById(envId).zones[zone.id];
  return hit ? { ...zone, name: hit[0], short: hit[1] } : zone;
}
// Mission objects keep their ids; only the centre-landmark object is renamed per environment.
export function localizeObject(envId, object) {
  if (!object || object.id !== 'obj-monas') return object;
  const hit = environmentById(envId).landmarks.monas;
  return hit ? { ...object, name: hit[0] } : object;
}
export function localizeTarget(envId, target) {
  return target ? { ...target, object: localizeObject(envId, target.object) } : target;
}
export function localizeLandmark(envId, landmark) {
  if (!landmark) return landmark;
  const hit = environmentById(envId).landmarks[landmark.id];
  return hit ? { ...landmark, name: hit[0], short: hit[1] } : landmark;
}
