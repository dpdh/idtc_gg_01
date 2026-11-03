import React, { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChartLine, faCircleExclamation, faEraser, faLeaf, faMapLocationDot, faRandom, faTowerBroadcast } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import CityScene from '../components/CityScene';
import OpenStreetMapEmbed from '../components/OpenStreetMapEmbed';
import { ASSET_CATEGORIES, CITY_CELL_AREA_M2, CITY_GRID_AREA_M2, CITY_LEVELS, analyzeCity, createTerrain, isBuildable, makeRandomPlacements, safeCellCount } from '../domain/cityGame';

const terrainStyle = {
  work: { color: '#314e56', symbol: '·' }, green: { color: '#216449', symbol: '✳' }, spot: { color: '#66533c', symbol: '◇' },
  road: { color: '#303744', symbol: '═' }, water: { color: '#1e557b', symbol: '≈' }, hazard: { color: '#733a43', symbol: '!' },
};
const metricColors = { spatial: '#8bbaff', accessibility: '#d0a7ff', environment: '#64ddb0', safety: '#ffc27d' };
const categoryFor = (id) => ASSET_CATEGORIES.find((category) => category.id === id);

export default function MapsScreen() {
  const { width } = useWindowDimensions();
  const [activeLevelId, setActiveLevelId] = useState(CITY_LEVELS[0].id);
  const [placementsByLevel, setPlacementsByLevel] = useState({});
  const [categoryId, setCategoryId] = useState(ASSET_CATEGORIES[0].id);
  const [selectedAsset, setSelectedAsset] = useState(ASSET_CATEGORIES[0].items[0]);
  const [sensorQuery, setSensorQuery] = useState('');
  const [message, setMessage] = useState('');
  const [xp, setXp] = useState(0);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const level = CITY_LEVELS.find((item) => item.id === activeLevelId) || CITY_LEVELS[0];
  const terrain = useMemo(() => createTerrain(level), [level]);
  const placements = placementsByLevel[activeLevelId] || {};
  const category = categoryFor(categoryId);
  const sensorItems = category?.id === 'sensors' ? category.items.filter((item) => `${item.name} ${item.sensorGroup}`.toLowerCase().includes(sensorQuery.toLowerCase())) : category?.items || [];
  const analysis = useMemo(() => analyzeCity(level, terrain, placements), [level, terrain, placements]);
  const compact = width < 620;
  const occupied = Object.keys(placements).length;
  const activeSensors = Object.values(placements).filter((asset) => asset.categoryId === 'sensors');
  const setLevel = (nextLevel) => {
    setActiveLevelId(nextLevel.id);
    setAnalysisOpen(false);
    setMessage(`${nextLevel.name} dipilih. Rancangan level ini tersimpan selama sesi.`);
  };
  const setCategory = (nextCategory) => {
    setCategoryId(nextCategory.id);
    setSelectedAsset(nextCategory.items[0]);
    setSensorQuery('');
    setMessage('');
  };
  const placeAsset = (index) => {
    const cellTerrain = terrain[index];
    if (!isBuildable(cellTerrain)) {
      setMessage(`${cellTerrain === 'hazard' ? 'Zona risiko' : cellTerrain === 'water' ? 'Area air' : 'Jalan'} tidak dapat dibangun.`);
      return;
    }
    if (placements[index]) {
      setMessage('Petak sudah terisi. Pilih petak aman lain atau bersihkan peta.');
      return;
    }
    setPlacementsByLevel((current) => ({ ...current, [activeLevelId]: { ...(current[activeLevelId] || {}), [index]: selectedAsset } }));
    setXp((current) => current + 60);
    setMessage(`${selectedAsset.name} berhasil ditempatkan · XP +60`);
  };
  const randomize = () => {
    const next = makeRandomPlacements(level, terrain, Math.min(8, safeCellCount(terrain)));
    setPlacementsByLevel((current) => ({ ...current, [activeLevelId]: next }));
    setAnalysisOpen(false);
    setMessage('Tata letak acak dibuat. Pilih petak aman untuk menyesuaikannya.');
  };
  const clearMap = () => {
    setPlacementsByLevel((current) => ({ ...current, [activeLevelId]: {} }));
    setAnalysisOpen(false);
    setMessage(`${level.name} sudah dibersihkan.`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <ResponsiveContent>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>TWINI TWIN CITY · DIGITAL TWIN</Text>
          <Text style={styles.title}>Bangun Kota</Text>
          <Text style={styles.subtitle}>Rancang kota untuk warganya. Seimbangkan hunian, akses, lingkungan, dan keselamatan.</Text>
        </View>

        <View style={styles.levelSection}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>Pilih level kota</Text><Text style={styles.sectionHint}>Setiap level menyimpan rancangan sendiri.</Text></View>
            <View style={styles.xpPill}><Text style={styles.xpLabel}>XP</Text><Text style={styles.xpValue}>{xp}</Text></View>
          </View>
          <View style={styles.levelRow}>
            {CITY_LEVELS.map((item) => <TouchableOpacity key={item.id} onPress={() => setLevel(item)} style={[styles.levelCard, activeLevelId === item.id && styles.levelCardActive]} accessibilityRole="button">
              <Text style={[styles.levelNumber, activeLevelId === item.id && styles.textActive]}>{item.shortName}</Text>
              <Text numberOfLines={1} style={styles.levelName}>{item.name}</Text>
              <Text style={styles.levelMeta}>{item.cells} petak · 4 ha</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={styles.focusText}>Fokus: {level.focus}</Text>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Pilih aset kota</Text><Text style={styles.sectionHint}>Pilih kategori lalu sentuh petak aman untuk membangun.</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {ASSET_CATEGORIES.map((item) => <TouchableOpacity key={item.id} onPress={() => setCategory(item)} style={[styles.categoryChip, categoryId === item.id && styles.categoryChipActive]} accessibilityRole="button">
            <Text style={styles.categoryIcon}>{item.icon}</Text><Text style={[styles.categoryName, categoryId === item.id && styles.categoryNameActive]}>{item.label}</Text>
            <Text style={styles.categoryCount}>{item.items.length}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        <View style={styles.assetPicker}>
          {categoryId === 'sensors' && <View style={styles.searchWrap}>
            <FontAwesomeIcon icon={faTowerBroadcast} size={13} color="#94aac4" />
            <TextInput value={sensorQuery} onChangeText={setSensorQuery} placeholder="Cari sensor: banjir, udara, CCTV..." placeholderTextColor="#7486a0" style={styles.searchInput} />
            <Text style={styles.sensorCount}>{sensorItems.length}/100</Text>
          </View>}
          {categoryId === 'sensors' && <Text style={styles.sensorGroupHint}>10 kelompok sensor · 100 perangkat IoT tersedia</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetRow}>
            {sensorItems.map((item) => <TouchableOpacity key={item.id} onPress={() => { setSelectedAsset(item); setMessage(`Dipilih: ${item.name}`); }} style={[styles.assetChip, selectedAsset.id === item.id && styles.assetChipActive]} accessibilityRole="button">
              <Text style={styles.assetName}>{item.name}</Text><Text style={styles.assetMeta}>{category?.label}{item.height === 'high' ? ' · tinggi' : ''}</Text>
            </TouchableOpacity>)}
            {sensorItems.length === 0 && <Text style={styles.noResults}>Sensor tidak ditemukan.</Text>}
          </ScrollView>
          <Text style={styles.selectedLine}>Dipilih: <Text style={styles.selectedValue}>{selectedAsset.name}</Text></Text>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Peta level · 20 × 20</Text><Text style={styles.sectionHint}>400 petak · {CITY_CELL_AREA_M2} m²/petak · {CITY_GRID_AREA_M2.toLocaleString('id-ID')} m² total · {occupied} aset</Text></View>
          <View style={styles.mapTools}>
            <TouchableOpacity onPress={randomize} style={styles.toolButton} accessibilityRole="button"><FontAwesomeIcon icon={faRandom} size={12} color="#cde2ff" /><Text style={styles.toolText}>Acak</Text></TouchableOpacity>
            <TouchableOpacity onPress={clearMap} style={styles.toolButton} accessibilityRole="button"><FontAwesomeIcon icon={faEraser} size={12} color="#ffc1c1" /><Text style={styles.toolText}>Bersihkan</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.legend}>
          {Object.entries(terrainStyle).map(([key, value]) => <View key={key} style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: value.color }]} /><Text style={styles.legendText}>{key === 'work' ? 'Aman' : key === 'spot' ? 'Publik' : key === 'hazard' ? 'Risiko' : key === 'green' ? 'Hijau' : key === 'water' ? 'Air' : 'Jalan'}</Text></View>)}
        </View>
        <View style={styles.gridCard}>
          <View style={[styles.grid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
            {terrain.map((type, index) => {
              const asset = placements[index];
              const visual = terrainStyle[type];
              const assetCategory = asset && categoryFor(asset.categoryId);
              return <TouchableOpacity key={`${activeLevelId}-${index}`} onPress={() => placeAsset(index)} accessibilityRole="button" accessibilityLabel={`${TERRAIN_LABELS[type]} petak ${index + 1}, ${CITY_CELL_AREA_M2} meter persegi${asset ? `, ${asset.name}` : ''}`} style={{ width: `${100 / level.columns}%`, padding: 1 }}>
                <View style={[styles.gridTile, { backgroundColor: asset ? 'rgba(126,178,255,0.23)' : visual.color, borderColor: asset ? '#a3d4ff' : type === 'hazard' ? '#d4777d' : 'rgba(255,255,255,0.09)' }]}>
                  <Text style={[styles.tileSymbol, asset && styles.placedSymbol]}>{asset ? assetCategory?.icon || '🏙️' : visual.symbol}</Text>
                </View>
              </TouchableOpacity>;
            })}
          </View>
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.sceneHeader}>
          <View><Text style={styles.sectionTitle}>Kota 3D</Text><Text style={styles.sectionHint}>Seret untuk memutar · scroll/pinch untuk zoom · double click untuk reset</Text></View>
          <View style={styles.sceneBadge}><Text style={styles.sceneBadgeText}>3D</Text></View>
        </View>
        <View style={[styles.sceneFrame, compact && styles.sceneFrameCompact]}>
          {Platform.OS === 'web' ? <CityScene level={level} terrain={terrain} placements={placements} /> : <View style={styles.nativeSceneFallback}>
            <Text style={styles.nativeSceneTitle}>Tampilan 3D tersedia pada web</Text>
            <Text style={styles.nativeSceneCopy}>Gunakan peta petak di atas untuk menyusun kota pada perangkat ini.</Text>
          </View>}
        </View>

        <View style={styles.osmHeading}>
          <View><Text style={styles.sectionTitle}>Open Maps</Text><Text style={styles.sectionHint}>Jelajahi peta OpenStreetMap langsung di dalam TWINI.</Text></View>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/#map=14/-6.208/106.816').catch(() => {})} style={styles.openMapsButton} accessibilityRole="link">
            <FontAwesomeIcon icon={faMapLocationDot} size={13} color="#cfe5ff" /><Text style={styles.openMapsText}>Buka penuh</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.osmFrame}>
          <OpenStreetMapEmbed />
        </View>
        <Text style={styles.osmAttribution}>© OpenStreetMap contributors</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setAnalysisOpen((open) => !open)} style={styles.analyzeButton} accessibilityRole="button">
            <FontAwesomeIcon icon={faChartLine} size={15} color="#061421" /><Text style={styles.analyzeText}>{analysisOpen ? 'Tutup analisis' : 'Analisis masterplan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/').catch(() => {})} style={styles.openMapsButton} accessibilityRole="link">
            <FontAwesomeIcon icon={faMapLocationDot} size={14} color="#cfe5ff" /><Text style={styles.openMapsText}>Open Maps</Text>
          </TouchableOpacity>
        </View>

        {analysisOpen && <View style={styles.analysisCard}>
          <View style={styles.analysisTop}><View><Text style={styles.eyebrow}>CITY PLAN SCORE</Text><Text style={styles.analysisTitle}>Skor masterplan</Text></View><View style={styles.scorePill}><Text style={styles.scoreNumber}>{analysis.overall}</Text><Text style={styles.scoreOutOf}>/100</Text></View></View>
          <View style={styles.gradeRow}><Text style={styles.gradeLabel}>Grade</Text><Text style={styles.gradeValue}>{analysis.grade}</Text></View>
          {analysis.metrics.map((metric) => <View key={metric.id} style={styles.metricRow}>
            <View style={styles.metricTop}><Text style={styles.metricLabel}>{metric.label}</Text><Text style={[styles.metricScore, { color: metricColors[metric.id] }]}>{metric.score}</Text></View>
            <View style={styles.metricTrack}><View style={[styles.metricFill, { width: `${metric.score}%`, backgroundColor: metricColors[metric.id] }]} /></View>
            <Text style={styles.metricDetail}>{metric.detail}</Text>
          </View>)}
          <View style={styles.recommendations}>
            <Text style={styles.recommendationTitle}><FontAwesomeIcon icon={faCircleExclamation} size={12} color="#ffcf85" />  Rekomendasi</Text>
            {analysis.recommendations.map((recommendation) => <Text key={recommendation} style={styles.recommendationText}>• {recommendation}</Text>)}
          </View>
        </View>}

        {(categoryId === 'sensors' || activeSensors.length > 0) && <View style={styles.monitorCard}>
          <View style={styles.monitorHeader}><FontAwesomeIcon icon={faTowerBroadcast} size={15} color="#77dbc2" /><Text style={styles.monitorTitle}>Pemantauan IoT</Text><Text style={styles.monitorCount}>{activeSensors.length} aktif</Text></View>
          {activeSensors.length ? activeSensors.map((sensor, index) => <View key={`${sensor.id}-${index}`} style={styles.sensorRow}><View style={styles.sensorDot} /><View style={{ flex: 1 }}><Text style={styles.sensorName}>{sensor.name}</Text><Text style={styles.sensorGroup}>{sensor.sensorGroup}</Text></View><Text style={styles.sensorStatus}>SIMULASI</Text></View>) : <Text style={styles.monitorEmpty}>Tempatkan sensor pada petak aman untuk melihat status simulasinya.</Text>}
        </View>}

        <View style={styles.mindfulnessCard}>
          <FontAwesomeIcon icon={faLeaf} size={15} color="#78d7a5" />
          <Text style={styles.mindfulnessText}>Kota yang baik bukan kota dengan gedung tertinggi, tetapi kota yang membuat setiap orang merasa aman, dihargai, dan memiliki tempat.</Text>
        </View>
      </ResponsiveContent>
    </ScrollView>
  );
}

const TERRAIN_LABELS = { work: 'Zona aman', green: 'Ruang hijau', spot: 'Ruang publik', road: 'Jalan', water: 'Area air', hazard: 'Zona risiko' };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  scrollContent: { flexGrow: 1, paddingTop: 24, paddingBottom: 38 },
  heading: { marginBottom: 22 },
  eyebrow: { color: '#82bfff', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#f3f7ff', fontSize: 29, fontWeight: '800' },
  subtitle: { color: '#8292aa', fontSize: 12, lineHeight: 19, marginTop: 7, maxWidth: 680 },
  levelSection: { marginBottom: 24 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sectionTitle: { color: '#edf4ff', fontSize: 15, fontWeight: '700' },
  sectionHint: { color: '#8192aa', fontSize: 10, lineHeight: 15, marginTop: 4 },
  xpPill: { minWidth: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, backgroundColor: 'rgba(255,205,113,0.11)', borderWidth: 1, borderColor: 'rgba(255,205,113,0.2)' },
  xpLabel: { color: '#bfa970', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  xpValue: { color: '#ffda8e', fontSize: 13, fontWeight: '800' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  levelCard: { flex: 1, minWidth: 135, padding: 13, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.12)' },
  levelCardActive: { backgroundColor: 'rgba(69,145,235,0.16)', borderColor: 'rgba(132,190,255,0.56)' },
  levelNumber: { color: '#8198b5', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  textActive: { color: '#91c3ff' },
  levelName: { color: '#eef4ff', fontSize: 12, fontWeight: '700', marginTop: 6 },
  levelMeta: { color: '#8192aa', fontSize: 10, marginTop: 4 },
  focusText: { color: '#94a7c0', fontSize: 10, marginTop: 10 },
  categoryRow: { gap: 8, paddingBottom: 12 },
  categoryChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.11)' },
  categoryChipActive: { backgroundColor: 'rgba(74,145,231,0.19)', borderColor: 'rgba(126,188,255,0.48)' },
  categoryIcon: { fontSize: 14 },
  categoryName: { color: '#a6b6cb', fontSize: 10, fontWeight: '600' },
  categoryNameActive: { color: '#e1efff' },
  categoryCount: { color: '#7c91ad', fontSize: 9, marginLeft: 2 },
  assetPicker: { padding: 13, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.1)', marginBottom: 22 },
  searchWrap: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(5,12,23,0.58)', marginBottom: 8 },
  searchInput: { flex: 1, minWidth: 0, color: '#eaf2ff', fontSize: 11, paddingVertical: 8 },
  sensorCount: { color: '#8297b3', fontSize: 9, fontWeight: '700' },
  sensorGroupHint: { color: '#7f94ae', fontSize: 9, marginBottom: 8 },
  assetRow: { gap: 8, paddingVertical: 2 },
  assetChip: { minWidth: 125, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(11,23,39,0.75)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.1)' },
  assetChipActive: { borderColor: '#78b9ff', backgroundColor: 'rgba(69,143,225,0.18)' },
  assetName: { color: '#dce8f9', fontSize: 10, fontWeight: '700' },
  assetMeta: { color: '#8093ad', fontSize: 8, marginTop: 4 },
  noResults: { color: '#8c9db5', fontSize: 11, padding: 10 },
  selectedLine: { color: '#8294ac', fontSize: 9, marginTop: 10 },
  selectedValue: { color: '#bfddff', fontWeight: '700' },
  mapTools: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  toolButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.07)' },
  toolText: { color: '#cbdcf1', fontSize: 9, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 9 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 9, height: 9, borderRadius: 3 },
  legendText: { color: '#899bb3', fontSize: 9 },
  gridCard: { padding: 9, borderRadius: 18, backgroundColor: 'rgba(4,10,18,0.72)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.1)' },
  grid: { width: '100%' },
  gridTile: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1 },
  tileSymbol: { color: 'rgba(235,246,255,0.65)', fontSize: 15, fontWeight: '700' },
  placedSymbol: { fontSize: 16 },
  message: { color: '#9dcaff', fontSize: 10, marginTop: 9, minHeight: 15 },
  sceneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sceneBadge: { width: 31, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(89,156,239,0.15)' },
  sceneBadgeText: { color: '#9bc8ff', fontSize: 10, fontWeight: '800' },
  sceneFrame: { width: '100%', height: 350, overflow: 'hidden', borderRadius: 20, backgroundColor: '#0b1421', borderWidth: 1, borderColor: 'rgba(153,202,255,0.16)' },
  sceneFrameCompact: { height: 280 },
  osmHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 23, marginBottom: 10 },
  osmFrame: { width: '100%', height: 330, overflow: 'hidden', borderRadius: 19, borderWidth: 1, borderColor: 'rgba(153,202,255,0.18)', backgroundColor: '#e7eee7' },
  osmAttribution: { color: '#75869c', fontSize: 9, textAlign: 'right', marginTop: 5 },
  nativeSceneFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b1421' },
  nativeSceneTitle: { color: '#e8f2ff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  nativeSceneCopy: { color: '#879bb7', fontSize: 11, textAlign: 'center', marginTop: 7 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  analyzeButton: { minHeight: 46, flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: '#9dcbff' },
  analyzeText: { color: '#071321', fontSize: 11, fontWeight: '800' },
  openMapsButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(210,233,255,0.18)' },
  openMapsText: { color: '#cfe5ff', fontSize: 10, fontWeight: '700' },
  analysisCard: { marginTop: 14, padding: 17, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.13)' },
  analysisTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  analysisTitle: { color: '#eef4ff', fontSize: 16, fontWeight: '800', marginTop: 3 },
  scorePill: { minWidth: 68, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(103,178,255,0.14)' },
  scoreNumber: { color: '#a8d1ff', fontSize: 20, fontWeight: '800' },
  scoreOutOf: { color: '#849bb7', fontSize: 9 },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: '#233047', marginBottom: 8 },
  gradeLabel: { color: '#8294ad', fontSize: 10 },
  gradeValue: { color: '#d7eaff', fontSize: 10, fontWeight: '800' },
  metricRow: { marginTop: 9 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { color: '#dce7f6', fontSize: 10, fontWeight: '700' },
  metricScore: { fontSize: 10, fontWeight: '800' },
  metricTrack: { height: 5, overflow: 'hidden', borderRadius: 4, backgroundColor: '#263349', marginTop: 6 },
  metricFill: { height: '100%', borderRadius: 4 },
  metricDetail: { color: '#7f91a8', fontSize: 8, marginTop: 5 },
  recommendations: { marginTop: 15, padding: 12, borderRadius: 13, backgroundColor: 'rgba(255,200,120,0.07)' },
  recommendationTitle: { color: '#ffd28e', fontSize: 10, fontWeight: '800', marginBottom: 7 },
  recommendationText: { color: '#b8c4d3', fontSize: 9, lineHeight: 15, marginTop: 3 },
  monitorCard: { marginTop: 14, padding: 15, borderRadius: 18, backgroundColor: 'rgba(64,190,157,0.07)', borderWidth: 1, borderColor: 'rgba(102,221,188,0.16)' },
  monitorHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  monitorTitle: { color: '#dff9f2', fontSize: 12, fontWeight: '700', flex: 1 },
  monitorCount: { color: '#80dbc4', fontSize: 9, fontWeight: '700' },
  sensorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderTopWidth: 1, borderTopColor: 'rgba(176,238,224,0.09)' },
  sensorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60e0b3' },
  sensorName: { color: '#dcebe8', fontSize: 10, fontWeight: '600' },
  sensorGroup: { color: '#7faaa1', fontSize: 8, marginTop: 3 },
  sensorStatus: { color: '#7fd4be', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  monitorEmpty: { color: '#8cada7', fontSize: 9, lineHeight: 14 },
  mindfulnessCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: 15, borderRadius: 17, backgroundColor: 'rgba(91,179,123,0.08)', borderWidth: 1, borderColor: 'rgba(133,220,164,0.13)' },
  mindfulnessText: { flex: 1, color: '#a9c8b4', fontSize: 10, fontStyle: 'italic', lineHeight: 16 },
});
