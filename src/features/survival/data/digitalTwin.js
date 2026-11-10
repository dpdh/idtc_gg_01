// Digital twin data for the Monas area: panorama hotspots, simulation defaults and a telemetry model.
// All positions are in game units at environment scale 1 (Monas tower at the origin, 30 units tall).

export const SCALE_LIMITS = { min: 0.5, max: 2, step: 0.1 };

export const DEFAULT_TWIN_SETTINGS = {
  characterScale: 1,
  envScale: 1,
  crowdCount: 30,
  weather: 'clear', // clear | cloudy | rain
  timeOfDay: 9, // hours, 0–24
  autoTime: true,
  showHotspots: true,
};

export const WEATHER_OPTIONS = [
  { id: 'clear', label: 'Cerah' },
  { id: 'cloudy', label: 'Berawan' },
  { id: 'rain', label: 'Hujan' },
];

export const CROWD_OPTIONS = [0, 15, 30, 45, 60];

/**
 * Panorama hotspots ("titik panorama").
 * mode 'around': the camera orbits `target` at `radius`/`height`.
 * mode 'from'  : the camera stands at `eye` and turns 360° (a true panorama), pitched by `pitch`.
 * `marker` is where the glowing hotspot stands on the ground (x, z).
 */
export const PANORAMA_SPOTS = [
  {
    id: 'puncak',
    name: 'Puncak Monas',
    short: 'PUNCAK',
    marker: [3.2, 9.6],
    mode: 'from',
    eye: [0, 25.5, 0],
    pitch: -0.32,
    description: 'Pelataran puncak setinggi 115 m. Dari sini terlihat seluruh Medan Merdeka hingga gedung-gedung Jakarta Pusat.',
    facts: ['Tinggi tugu 132 m', 'Lidah api 14,5 m', 'Dilapisi emas 50 kg'],
  },
  {
    id: 'tugu',
    name: 'Orbit Tugu Monas',
    short: 'TUGU',
    marker: [-3.2, 9.6],
    mode: 'around',
    target: [0, 14, 0],
    radius: 34,
    height: 10,
    description: 'Putaran 360° mengelilingi tugu: bentuk lingga-yoni melambangkan semangat perjuangan bangsa Indonesia.',
    facts: ['Dibangun 1961–1975', 'Dibuka untuk umum 1975', 'Arsitek F. Silaban & R.M. Soedarsono'],
  },
  {
    id: 'cawan',
    name: 'Pelataran Cawan',
    short: 'CAWAN',
    marker: [8.4, 8.4],
    mode: 'around',
    target: [0, 4, 0],
    radius: 15,
    height: 5,
    description: 'Pelataran cawan berukuran 45 × 45 m di ketinggian 17 m, tempat pengunjung menikmati angin dan pemandangan taman.',
    facts: ['Ketinggian 17 m', 'Luas 45 × 45 m', 'Akses lift & tangga'],
  },
  {
    id: 'museum',
    name: 'Gerbang Museum Sejarah',
    short: 'MUSEUM',
    marker: [0, -12],
    mode: 'around',
    target: [0, 1.6, -3],
    radius: 9,
    height: 3.2,
    description: 'Pintu masuk menuju Museum Sejarah Nasional di dasar tugu dengan 51 diorama perjalanan bangsa.',
    facts: ['51 diorama', 'Ruang Kemerdekaan', 'Teks Proklamasi asli'],
  },
  {
    id: 'taman',
    name: 'Taman Medan Merdeka',
    short: 'TAMAN',
    marker: [0, 19],
    mode: 'from',
    eye: [0, 3.4, 19],
    pitch: -0.12,
    description: 'Taman berpola hias di sisi selatan. Ruang hijau publik yang menjadi paru-paru kota Jakarta.',
    facts: ['Area hijau ±80 ha', 'Jalur pejalan kaki', 'Rusa tutul di taman'],
  },
  {
    id: 'sudut',
    name: 'Sudut Timur Laut',
    short: 'SUDUT',
    marker: [15, -15],
    mode: 'around',
    target: [15, 0.6, -15],
    radius: 10,
    height: 6,
    description: 'Sudut taman dengan pagar dan pepohonan rimbun, titik pandang diagonal ke arah tugu.',
    facts: ['Pagar taman', 'Lampu taman pintar', 'Titik kumpul pengunjung'],
  },
];

export const scalePoint2 = ([x, z], s) => [x * s, z * s];
export const scalePoint3 = ([x, y, z], s) => [x * s, y * s, z * s];

/** Panorama spot with every distance converted to the current environment scale. */
export function scaleSpot(spot, s) {
  return {
    ...spot,
    marker: scalePoint2(spot.marker, s),
    eye: spot.eye ? scalePoint3(spot.eye, s) : undefined,
    target: spot.target ? scalePoint3(spot.target, s) : undefined,
    radius: spot.radius ? spot.radius * s : undefined,
    height: spot.height ? spot.height * s : undefined,
  };
}

export const formatClock = (hour) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const isNight = (hour) => hour < 6 || hour >= 18;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gauss = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

/** Relative visitor activity (0–1) over the day: morning & late-afternoon peaks, quiet at night. */
export function visitorFactor(hour) {
  return clamp(0.08 + 0.55 * gauss(hour, 9.5, 2.2) + 0.75 * gauss(hour, 16.5, 2.4), 0, 1);
}

export const INITIAL_TELEMETRY = {
  temperature: 29, humidity: 70, pm25: 32, visitors: 0, energyKw: 120, floodCm: 0, status: 'NORMAL',
};

/**
 * One simulation step. Produces smooth, plausible values from time of day, weather and crowd.
 * dtHours: simulated hours elapsed since the previous step.
 */
export function stepTelemetry(prev, { hour, weather, crowdCount, dtHours }) {
  const noise = () => (Math.random() - 0.5);
  const rain = weather === 'rain';
  const cloudy = weather === 'cloudy';
  // Temperature: coolest ~05:00 (26°C), warmest ~14:00 (33°C); clouds/rain cool it down.
  const tempTarget = 29.5 + 3.5 * Math.sin(((hour - 8) / 24) * Math.PI * 2) - (cloudy ? 1.5 : 0) - (rain ? 3.5 : 0);
  const humidityTarget = clamp(72 - (tempTarget - 29) * 3 + (rain ? 20 : cloudy ? 6 : 0), 45, 98);
  // PM2.5: traffic peaks 07–09 and 17–19, rain washes the air.
  const traffic = gauss(hour, 8, 1.3) + gauss(hour, 18, 1.4);
  const crowdShare = crowdCount / 60;
  const pmTarget = clamp(22 + 38 * traffic + 10 * crowdShare - (rain ? 18 : 0), 5, 160);
  const visitorsTarget = Math.round(visitorFactor(hour) * (400 + crowdShare * 2600) * (rain ? 0.35 : 1));
  // Energy: base load + lighting at night + crowd-related services.
  const energyTarget = 80 + (isNight(hour) ? 260 : 40) + crowdShare * 90;
  // Puddles rise in the rain and drain (~4 cm/h) otherwise.
  const floodCm = clamp(prev.floodCm + (rain ? 9 : -4) * dtHours, 0, 40);

  const ease = (current, target, rate = 0.25) => current + (target - current) * rate;
  const next = {
    temperature: +(ease(prev.temperature, tempTarget) + noise() * 0.1).toFixed(1),
    humidity: Math.round(ease(prev.humidity, humidityTarget) + noise()),
    pm25: Math.round(ease(prev.pm25, pmTarget) + noise() * 2),
    visitors: Math.max(0, Math.round(ease(prev.visitors, visitorsTarget, 0.3) + noise() * 6)),
    energyKw: Math.round(ease(prev.energyKw, energyTarget) + noise() * 3),
    floodCm: +floodCm.toFixed(1),
  };
  next.status = next.pm25 > 75 || next.floodCm > 15 ? 'BAHAYA' : next.pm25 > 55 || next.floodCm > 6 ? 'WASPADA' : 'NORMAL';
  return next;
}

/** Which telemetry each field sensor unlocks (index matches SENSORS in the game screen). */
export const SENSOR_FEEDS = [
  { name: 'Flood & Drainage', fields: ['floodCm', 'humidity'] },
  { name: 'Air Quality Monitor', fields: ['pm25', 'temperature'] },
  { name: 'Smart Energy Pole', fields: ['energyKw', 'visitors'] },
];
