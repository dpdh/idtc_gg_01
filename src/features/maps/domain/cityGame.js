export const CITY_GRID_COLUMNS = 20;
export const CITY_GRID_ROWS = 20;
export const CITY_CELL_AREA_M2 = 100;
export const CITY_GRID_CELLS = CITY_GRID_COLUMNS * CITY_GRID_ROWS;
export const CITY_GRID_AREA_M2 = CITY_GRID_CELLS * CITY_CELL_AREA_M2;

export const CITY_LEVELS = [
  { id: 'village', name: 'Kampung Hijau', shortName: 'Level 01', cells: CITY_GRID_CELLS, columns: CITY_GRID_COLUMNS, rows: CITY_GRID_ROWS, focus: 'Hunian lokal dan ruang hijau' },
  { id: 'growing', name: 'Kota Tumbuh', shortName: 'Level 02', cells: CITY_GRID_CELLS, columns: CITY_GRID_COLUMNS, rows: CITY_GRID_ROWS, focus: 'Apartemen, kantor, dan transit' },
  { id: 'metro', name: 'Metropolitan', shortName: 'Level 03', cells: CITY_GRID_CELLS, columns: CITY_GRID_COLUMNS, rows: CITY_GRID_ROWS, focus: 'Kawasan padat dan mobilitas' },
];

const sensorGroups = [
  ['Kamera & keamanan', 'CCTV AI', 'Kamera PTZ', 'Kamera termal', 'Panic button', 'Access control', 'People counter', 'Plate reader', 'Intrusion sensor', 'Smart siren', 'Emergency phone'],
  ['Air, banjir & drainase', 'Water level', 'Rain gauge', 'Flow meter', 'Drain monitor', 'Flood siren', 'Water quality', 'Pump monitor', 'Leak detector', 'Tide gauge', 'River gauge'],
  ['Kebakaran & pemadam', 'Smoke detector', 'Heat detector', 'Flame sensor', 'Fire alarm', 'Hydrant monitor', 'Sprinkler control', 'Fire door sensor', 'Gas detector', 'Fire truck beacon', 'Evacuation alert'],
  ['Kualitas udara', 'PM2.5 sensor', 'PM10 sensor', 'CO2 sensor', 'CO sensor', 'NO2 sensor', 'Ozone sensor', 'Air quality station', 'Dust monitor', 'AQI display', 'Emission sensor'],
  ['Suhu & cuaca', 'Weather station', 'Temperature sensor', 'Humidity sensor', 'Wind sensor', 'UV sensor', 'Heat stress monitor', 'Solar radiation', 'Pressure sensor', 'Microclimate node', 'Lightning detector'],
  ['Air bersih & distribusi', 'Water pressure', 'Smart water meter', 'Chlorine sensor', 'pH sensor', 'Turbidity sensor', 'Reservoir level', 'Pipe flow sensor', 'Water leak sensor', 'Valve controller', 'Water quality hub'],
  ['Energi & penerangan', 'Smart meter', 'Solar inverter', 'Streetlight controller', 'Grid monitor', 'Battery monitor', 'Power quality', 'Energy gateway', 'Smart pole', 'EV charger monitor', 'Transformer sensor'],
  ['Struktur & infrastruktur', 'Bridge strain', 'Vibration sensor', 'Crack monitor', 'Tilt sensor', 'Building health node', 'Road surface sensor', 'Tunnel monitor', 'Elevator monitor', 'Structural gateway', 'Settlement sensor'],
  ['Lalu lintas & kebisingan', 'Traffic counter', 'Noise monitor', 'Speed radar', 'Smart signal', 'Parking sensor', 'Transit tracker', 'Bike counter', 'Congestion camera', 'Vehicle classifier', 'Crosswalk sensor'],
  ['Lingkungan & ruang publik', 'Smart bin', 'Fill level sensor', 'Soil moisture', 'Tree health sensor', 'Park occupancy', 'Waterfront monitor', 'Recycling station', 'Public toilet monitor', 'Wildlife camera', 'Environmental hub'],
];

export const ASSET_CATEGORIES = [
  { id: 'residential', label: 'Hunian', icon: '🏠', items: [['Rumah tunggal', 'low'], ['Rumah deret', 'low'], ['Townhouse', 'mid'], ['Apartemen 5 lantai', 'mid'], ['Apartemen 18 lantai', 'high'], ['Hunian campuran', 'mid']] },
  { id: 'offices', label: 'Perkantoran', icon: '🏢', items: [['Kantor lingkungan', 'low'], ['Kantor 12 lantai', 'mid'], ['Office tower 40 lantai', 'high'], ['Menara kantor pusat', 'high'], ['Co-working hub', 'mid']] },
  { id: 'transport', label: 'Transportasi', icon: '🚉', items: [['Halte bus', 'low'], ['Terminal BRT', 'mid'], ['Stasiun LRT', 'mid'], ['Stasiun MRT', 'high'], ['Halte trem', 'low'], ['Hub antarmoda', 'high']] },
  { id: 'spots', label: 'Spot kota', icon: '📍', items: [['Alun-alun kota', 'low'], ['Pasar publik', 'mid'], ['Ruang acara', 'mid'], ['Dek pandang', 'mid'], ['Waterfront', 'low'], ['Titik kumpul', 'low']] },
  { id: 'utilities', label: 'Utilitas', icon: '⚡', items: [['Solar field', 'low'], ['Water plant', 'mid'], ['Substation', 'mid'], ['Sensor hub', 'low']] },
  { id: 'sensors', label: 'Sensor & IoT', icon: '📡', items: sensorGroups.flatMap((group, groupIndex) => group.slice(1).map((name, itemIndex) => ({ name, height: 'low', sensorGroup: group[0], sensorGroupIndex: groupIndex, sensorIndex: itemIndex }))) },
  { id: 'green', label: 'Ruang hijau', icon: '🌳', items: [['City park', 'low'], ['Pocket garden', 'low'], ['Water plaza', 'low'], ['Playground', 'low']] },
  { id: 'community', label: 'Fasilitas publik', icon: '🏥', items: [['Learning center', 'mid'], ['Health clinic', 'mid'], ['Local market', 'low'], ['Sports arena', 'high']] },
  { id: 'bim', label: 'Aset BIM', icon: '🧱', items: [['Column grid', 'mid'], ['Beam frame', 'mid'], ['Pipe network', 'low'], ['Cable route', 'low']] },
].map((category) => ({
  ...category,
  items: category.items.map((item, index) => typeof item === 'string'
    ? { id: `${category.id}-${index}`, name: item, categoryId: category.id, height: 'low' }
    : Array.isArray(item)
      ? { id: `${category.id}-${index}`, name: item[0], categoryId: category.id, height: item[1] }
      : { ...item, id: `${category.id}-${index}`, categoryId: category.id }),
}));

export function createTerrain(level) {
  return Array.from({ length: level.cells }, (_, index) => {
    const row = Math.floor(index / level.columns);
    const column = index % level.columns;
    if (index % 19 === 0) return 'hazard';
    if (index % 13 === 0) return 'water';
    if (row === Math.floor(level.rows / 2) || column === Math.floor(level.columns / 2)) return 'road';
    if (index % 7 === 0) return 'green';
    if (index % 5 === 0) return 'spot';
    return 'work';
  });
}

export const TERRAIN_LABELS = { work: 'Zona aman', green: 'Ruang hijau', spot: 'Ruang publik', road: 'Jalan', water: 'Air', hazard: 'Zona risiko' };
export const isBuildable = (terrain) => ['work', 'green', 'spot'].includes(terrain);
export const safeCellCount = (terrain) => terrain.filter(isBuildable).length;

export function analyzeCity(level, terrain, placements) {
  const entries = Object.entries(placements).map(([index, asset]) => ({ index: Number(index), asset }));
  const count = entries.length;
  const legal = Math.max(1, safeCellCount(terrain));
  const functions = new Set(entries.map(({ asset }) => asset.categoryId).filter((id) => ['residential', 'offices', 'community', 'transport', 'green'].includes(id)));
  const spatial = Math.round(Math.min(100, ((functions.size / 5) * 100) * 0.8 + Math.min(100, (count / legal) * 150) * 0.2));
  const roads = terrain.map((cell, index) => cell === 'road' ? index : -1).filter((index) => index >= 0);
  const nearRoad = entries.filter(({ index }) => roads.some((road) => Math.abs(Math.floor(index / level.columns) - Math.floor(road / level.columns)) + Math.abs((index % level.columns) - (road % level.columns)) <= 2)).length;
  const transitCount = entries.filter(({ asset }) => asset.categoryId === 'transport').length;
  const accessibility = Math.round((count ? (nearRoad / count) * 100 : 0) * 0.65 + Math.min(100, transitCount * 30) * 0.35);
  const greenCells = terrain.filter((cell) => cell === 'green').length + entries.filter(({ asset }) => asset.categoryId === 'green').length;
  const greenRatio = greenCells / level.cells;
  const tallBuildings = entries.filter(({ asset }) => asset.height === 'high').length;
  const hasRenewable = entries.some(({ asset }) => asset.name.toLowerCase().includes('solar'));
  const environment = Math.round(Math.max(0, Math.min(100, Math.min(100, (greenRatio / 0.2) * 100) - Math.max(0, tallBuildings - (hasRenewable ? 1 : 0)) * 6)));
  const hazards = terrain.map((cell, index) => cell === 'hazard' ? index : -1).filter((index) => index >= 0);
  const exposed = entries.filter(({ index }) => hazards.some((hazard) => Math.abs(Math.floor(index / level.columns) - Math.floor(hazard / level.columns)) + Math.abs((index % level.columns) - (hazard % level.columns)) <= 1)).length;
  const shelters = entries.filter(({ asset }) => asset.name.toLowerCase().includes('titik kumpul')).length;
  const safety = Math.round(Math.max(0, Math.min(100, 100 - exposed * 25 + shelters * 8)));
  const overall = Math.round(spatial * 0.3 + accessibility * 0.25 + environment * 0.25 + safety * 0.2);
  const grade = overall >= 85 ? 'Unggul' : overall >= 70 ? 'Baik' : overall >= 50 ? 'Berkembang' : 'Perlu dikembangkan';
  const recommendations = [];
  if (functions.size < 5) recommendations.push('Lengkapi fungsi utama kota: hunian, kantor, fasilitas publik, transit, dan ruang hijau.');
  if (transitCount === 0 || accessibility < 55) recommendations.push('Tambahkan transportasi publik agar warga mudah mengakses kawasan.');
  if (environment < 60) recommendations.push('Perkuat ruang hijau dan energi terbarukan untuk menyeimbangkan pembangunan.');
  if (exposed > 0 || shelters === 0) recommendations.push('Jauhkan aset dari zona risiko dan tambahkan titik kumpul warga.');
  return {
    overall, grade, count,
    metrics: [
      { id: 'spatial', label: 'Tata ruang', score: spatial, detail: `${functions.size}/5 fungsi utama · ${count} aset` },
      { id: 'accessibility', label: 'Aksesibilitas', score: accessibility, detail: `${nearRoad}/${count} aset dekat jalan · ${transitCount} transit` },
      { id: 'environment', label: 'Lingkungan', score: environment, detail: `${greenCells} petak hijau · ${tallBuildings} gedung tinggi` },
      { id: 'safety', label: 'Keselamatan', score: safety, detail: `${exposed} aset dekat risiko · ${shelters} titik kumpul` },
    ],
    recommendations: recommendations.length ? recommendations : ['Rancangan kota cukup seimbang. Libatkan warga untuk memvalidasi kebutuhan lokal.'],
  };
}

export function makeRandomPlacements(level, terrain, requestedCount = 8) {
  const available = terrain.map((cell, index) => isBuildable(cell) ? index : -1).filter((index) => index >= 0);
  for (let index = available.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }
  const choices = ASSET_CATEGORIES.filter((category) => category.id !== 'sensors' && category.id !== 'bim');
  return Object.fromEntries(available.slice(0, Math.min(requestedCount, available.length)).map((cell, index) => {
    const category = choices[Math.floor(Math.random() * choices.length)];
    const asset = category.items[Math.floor(Math.random() * category.items.length)];
    return [cell, asset];
  }));
}
