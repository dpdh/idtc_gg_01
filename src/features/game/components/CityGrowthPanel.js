import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUILDING_CATALOG, GROWTH_PLOTS, effectiveBuildCost, growthSummary, nextLockedPlot, plotStatus } from '../engine/cityGrowth';
import { WABAH_SPAWNS, WABAH_TYPES } from '../../survival/data/wabah';
import { ZONES } from '../engine/worldRules';
import { Button, C, Pill, ProgressBar, formatNumber, ui } from './gameUi';

// Panel "Wabah Digital & Pertumbuhan Kota": rekap ancaman, tombol cari-tembak, dan pembangunan
// petak tanah. Semua aksi diteruskan ke layar game (onFire / onBuild) supaya state tetap satu sumber.

const zoneName = (zoneId) => ZONES.find((zone) => zone.id === zoneId)?.name || zoneId;
const BENEFIT = [['eco', 'EKOSISTEM', '#67f7a3'], ['energy', 'ENERGI', '#ffc94d'], ['data', 'DATA', '#5fd3ff'], ['health', 'KESEHATAN', '#ff8e9c']];
const benefitText = (building) => BENEFIT
  .filter(([key]) => building.benefit[key] > 0)
  .map(([key, label]) => `${label.toLowerCase()} +${building.benefit[key]}`)
  .join(' · ');

const styles = StyleSheet.create({
  eyebrow: { color: '#7cf5ff', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: C.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 4, marginBottom: 12 },
  points: { color: C.gold, fontSize: 34, fontWeight: '900', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 66 },
  statValue: { fontSize: 15, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  typeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  typeIcon: { fontSize: 20 },
  locked: { opacity: 0.75 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipTitle: { color: C.text, fontSize: 11.5, fontWeight: '800' },
  chipCost: { color: C.muted, fontSize: 9.5, fontWeight: '700', marginTop: 1 },
});

function WabahLegend() {
  const spawnCount = useMemo(() => WABAH_SPAWNS.reduce((map, spawn) => {
    map[spawn.kind] = (map[spawn.kind] || 0) + 1;
    return map;
  }, {}), []);
  return <View style={ui.card}>
    <Text style={ui.eyebrow}>JENIS WABAH YANG MENCEMARI EKOSISTEM</Text>
    <Text style={[ui.small, { marginTop: 4, marginBottom: 8 }]}>Cari di zona masing-masing, lalu tembak dengan pelontar plasma Twini (tombol FIRE). Setiap wabah hancur memberi Poin Pertumbuhan Kota.</Text>
    {Object.values(WABAH_TYPES).map((def) => <View key={def.id} style={[styles.typeRow, { borderColor: `${def.color}44` }]}>
      <Text style={styles.typeIcon}>{def.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[ui.title, { fontSize: 13, color: def.color }]}>{def.name} · {def.hp} HP · {spawnCount[def.id] || 0} titik</Text>
        <Text style={ui.small}>{def.threat}</Text>
        <Text style={[ui.small, { marginTop: 2 }]}>Zona: {def.zones.map(zoneName).join(', ')} · +{def.rewardXp} XP · +{def.rewardCoins} koin · +{def.growth} poin</Text>
      </View>
    </View>)}
  </View>;
}

function PlotRow({ plot, status, picked, points, modifiers = {}, onPick, onBuild }) {
  const built = status.building;
  const pickedBuilding = picked ? BUILDING_CATALOG.find((building) => building.id === picked) : null;
  const pickedCost = pickedBuilding ? effectiveBuildCost(pickedBuilding, modifiers) : 0;
  const affordable = !pickedBuilding || points >= pickedCost;
  return <View style={[ui.card, !status.unlocked && styles.locked]}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ui.title}>{plot.name}</Text>
        <Text style={ui.small}>{zoneName(plot.zoneId)} · bidang tanah {plot.size}×{plot.size} m</Text>
      </View>
      <Pill
        label={!status.unlocked ? 'TERKUNCI' : built ? built.name.toUpperCase() : 'SIAP DIBANGUN'}
        color={!status.unlocked ? C.muted : built ? C.green : C.gold}
      />
    </View>
    {!status.unlocked ? <Text style={[ui.small, { marginTop: 6 }]}>Netralkan {plot.unlockCleared} wabah untuk membuka petak ini.</Text> : null}
    {built ? <Text style={[ui.small, { marginTop: 6, color: built.color }]}>{built.icon} {built.name} — {benefitText(built)}</Text> : null}
    {built ? <Text style={[ui.small, { marginTop: 2 }]}>Pilih aset lain lalu tekan ganti untuk menukar bangunan di petak ini.</Text> : null}
    {status.unlocked ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
        {BUILDING_CATALOG.map((building) => {
          const active = picked === building.id;
          const cost = effectiveBuildCost(building, modifiers);
          return <TouchableOpacity key={building.id} onPress={() => onPick(building.id)} style={[styles.chip, active && { borderColor: building.color, backgroundColor: `${building.color}22` }]} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${building.name}, ${cost} poin`}>
            <Text style={[styles.chipTitle, active && { color: building.color }]}>{building.icon} {building.name}</Text>
            <Text style={styles.chipCost}>{cost} poin{cost < building.cost ? ` (−${building.cost - cost})` : ''}</Text>
          </TouchableOpacity>;
        })}
      </ScrollView>
      <Button
        label={built ? 'Ganti Bangunan' : 'Bangun di Petak Ini'}
        kind={pickedBuilding && affordable ? 'gold' : 'ghost'}
        disabled={!pickedBuilding}
        onPress={() => onBuild(plot.id, picked)}
        accessibilityLabel={`Bangun ${pickedBuilding ? pickedBuilding.name : 'aset'} di ${plot.name}`}
      />
      {pickedBuilding && !affordable ? <Text style={[ui.small, { color: C.red, marginTop: 4 }]}>Poin pertumbuhan belum cukup — terus bersihkan wabah.</Text> : null}
    </> : null}
  </View>;
}

export default function CityGrowthPanel({ growth, onBuild, onFire, onBackToGame, unlockBonus = 0, modifiers = {}, bonus = null }) {
  const [picks, setPicks] = useState({});
  const summary = useMemo(() => growthSummary(growth, unlockBonus), [growth, unlockBonus]);
  const nextPlot = useMemo(() => nextLockedPlot(growth, unlockBonus), [growth, unlockBonus]);
  return <View>
    <Text style={styles.eyebrow}>WABAH DIGITAL · PERTUMBUHAN KOTA</Text>
    <Text style={styles.title}>Bersihkan Wabah, Tumbuhkan Kota</Text>
    <Text style={styles.subtitle}>Wabah digital menyerang ekosistem Digital Twin. Tembak intinya dengan Twini, kumpulkan Poin Pertumbuhan, lalu bangun aset kota pada petak bidang tanah di kawasan ini.</Text>

    <View style={[ui.card, { borderColor: `${C.green}55` }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View>
          <Text style={ui.eyebrow}>POIN PERTUMBUHAN</Text>
          <Text style={styles.points}>{formatNumber(growth.points)} <Text style={{ fontSize: 14 }}>poin</Text></Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ui.eyebrow}>WABAH DINETRALKAN</Text>
          <Text style={[styles.points, { color: C.cyan, fontSize: 24 }]}>{formatNumber(growth.cleared)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
          <Text style={ui.small}>Indeks pertumbuhan kota · level {summary.level}</Text>
          <Text style={[ui.small, { color: C.green, fontWeight: '900' }]}>{summary.score}%</Text>
        </View>
        <ProgressBar ratio={summary.score / 100} color={C.green} height={8} />
      </View>
      <View style={styles.chips}>
        {BENEFIT.map(([key, label, color]) => <View key={key} style={[styles.statChip, { borderColor: `${color}55` }]}>
          <Text style={[styles.statValue, { color }]}>{summary[key] + ((bonus && bonus[key]) || 0)}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>)}
      </View>
      <Text style={[ui.small, { marginTop: 8 }]}>Petak terbangun {summary.plotsUsed}/{summary.plotsTotal} · petak terbuka {summary.plotsUnlocked}/{summary.plotsTotal}</Text>
      {bonus && (bonus.eco || bonus.energy || bonus.data || bonus.health) ? <Text style={[ui.small, { marginTop: 4, color: C.green }]}>Toko upgrade aktif: ekosistem +{bonus.eco} · energi +{bonus.energy} · data +{bonus.data} · kesehatan +{bonus.health}</Text> : null}
    </View>

    <View style={[ui.card, { borderColor: `${C.gold}55` }]}>
      <Text style={ui.eyebrow}>ALUR PENANGGULANGAN</Text>
      <Text style={[ui.body, { marginTop: 4 }]}>1. Tekan tombol di bawah: Twini mengunci wabah terdekat di arah hadap lalu menembakkannya.</Text>
      <Text style={[ui.body, { marginTop: 2 }]}>2. Setiap wabah hancur = Poin Pertumbuhan + XP + koin + energi.</Text>
      <Text style={[ui.body, { marginTop: 2 }]}>3. Belanjakan poin pada petak tanah untuk membangun aset kota (ekosistem, energi, data, kesehatan).</Text>
      <View style={[ui.row, { marginTop: 10, gap: 8 }]}>
        <View style={{ flex: 1 }}><Button label="🔍 Cari & Tembak Wabah" kind="primary" onPress={onFire} /></View>
        <View style={{ flex: 1 }}><Button label="Kembali ke Game" kind="ghost" onPress={onBackToGame} /></View>
      </View>
      {nextPlot
        ? <Text style={[ui.small, { marginTop: 8 }]}>Petak berikutnya terbuka setelah {nextPlot.unlockCleared} wabah: {nextPlot.name}.</Text>
        : <Text style={[ui.small, { marginTop: 8, color: C.green }]}>Semua petak sudah terbuka. Maksimalkan setiap petak!</Text>}
    </View>

    <WabahLegend />

    <Text style={[ui.eyebrow, { marginTop: 6, marginBottom: 6 }]}>PETAK TANAH & ASET BANGUNAN</Text>
    {GROWTH_PLOTS.map((plot) => <PlotRow
      key={plot.id}
      plot={plot}
      status={plotStatus(growth, plot.id, unlockBonus)}
      points={growth.points}
      modifiers={modifiers}
      picked={picks[plot.id]}
      onPick={(buildingId) => setPicks((value) => ({ ...value, [plot.id]: buildingId }))}
      onBuild={(plotId, buildingId) => { if (buildingId) onBuild(plotId, buildingId); }}
    />)}
    <Text style={[ui.small, { marginTop: 4 }]}>Wabah muncul kembali setelah beberapa detik, jadi poin pertumbuhan selalu bisa ditambah.</Text>
  </View>;
}
