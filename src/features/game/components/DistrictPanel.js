import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DISTRICT_CATEGORIES,
  DISTRICT_PLOTS,
  districtBuildingsFor,
} from '../../survival/data/districtPlots';
import {
  districtPlotStatus,
  districtSummary,
  effectiveDistrictBuildCost,
  pendingDistrictIncome,
} from '../engine/district';
import { Button, C, Pill, ProgressBar, Segmented, formatNumber, ui } from './gameUi';

// Panel "Wilayah Pengembangan": membeli petak darat/laut, membangun rumah tinggal, perkantoran,
// industri, atau rekreasi, lalu mengklaim pendapatan koin + poin pertumbuhan per menit.

const styles = StyleSheet.create({
  points: { color: C.gold, fontSize: 30, fontWeight: '900', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 64 },
  statValue: { fontSize: 15, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  section: { color: C.cyan, fontSize: 10.5, fontWeight: '900', letterSpacing: 1.4, marginTop: 12, marginBottom: 6 },
  plotRow: { borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  plotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  plotName: { color: C.text, fontSize: 13, fontWeight: '800' },
  plotMeta: { color: C.muted, fontSize: 10.5, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipActive: { borderColor: C.cyan, backgroundColor: 'rgba(95,211,255,0.12)' },
  chipTitle: { color: C.text, fontSize: 11, fontWeight: '800' },
  chipCost: { color: C.muted, fontSize: 9.5, fontWeight: '700', marginTop: 1 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  locked: { opacity: 0.7 },
});

const CATEGORY_BY_ID = Object.fromEntries(DISTRICT_CATEGORIES.map((item) => [item.id, item]));

function PlotRow({ plot, status, points, coins, modifiers, picked, onPick, onBuy, onBuild }) {
  const allowed = useMemo(() => districtBuildingsFor(plot.kind), [plot.kind]);
  const built = status.building;
  const pickedBuilding = picked ? allowed.find((item) => item.id === picked) : null;
  const cost = pickedBuilding ? effectiveDistrictBuildCost(pickedBuilding, modifiers) : 0;
  const canBuild = pickedBuilding && points >= cost && (!built || built.id !== pickedBuilding.id);
  const buildLabel = built ? 'Ganti bangunan' : 'Bangun';

  return <View style={[styles.plotRow, status.locked && styles.locked, { borderColor: status.owned ? `${C.cyan}44` : C.line }]}>
    <View style={styles.plotHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.plotName}>{plot.kind === 'sea' ? '🌊' : '🗺️'} {plot.name}</Text>
        <Text style={styles.plotMeta}>{plot.section} · {plot.size.toFixed(1)} × {plot.size.toFixed(1)} m · {plot.kind === 'sea' ? 'petak laut (reklamasi)' : 'petak darat'}</Text>
      </View>
      {status.owned
        ? <Pill label={built ? 'TERBANGUN' : 'DIMILIKI'} color={built ? C.green : C.cyan} />
        : <Pill label={status.locked ? 'TERKUNCI' : `🪙 ${formatNumber(status.price)}`} color={status.locked ? C.muted : C.gold} />}
    </View>

    {built ? <Text style={[styles.plotMeta, { color: C.green, marginTop: 6 }]}>
      {built.icon} {built.name} · nilai +{built.value} · 🪙 {built.coinsPerMin}/mnt · ⭐ {built.growthPerMin} poin/mnt
    </Text> : null}

    {!status.owned ? <>
      {status.locked ? <Text style={[styles.plotMeta, { marginTop: 6 }]}>{status.reason}</Text> : null}
      {!status.locked ? <View style={styles.rowActions}>
        <View style={{ flex: 1 }}><Button
          label={`Beli petak · 🪙 ${formatNumber(status.price)}${coins < status.price ? ' (koin kurang)' : ''}`}
          kind={coins < status.price ? 'ghost' : 'gold'}
          disabled={coins < status.price}
          onPress={() => onBuy(plot.id)}
          accessibilityLabel={`Beli ${plot.name}`}
        /></View>
      </View> : null}
    </> : <>
      <View style={styles.chipsRow}>
        {allowed.map((building) => {
          const active = (picked || built?.id) === building.id;
          const price = effectiveDistrictBuildCost(building, modifiers);
          return <View key={building.id} style={[styles.chip, active && styles.chipActive]}>
            <Text onPress={() => onPick(plot.id, building.id)} style={styles.chipTitle}>{building.icon} {CATEGORY_BY_ID[building.category]?.label || building.name}</Text>
            <Text onPress={() => onPick(plot.id, building.id)} style={styles.chipCost}>⭐ {price} poin · nilai +{building.value}</Text>
          </View>;
        })}
      </View>
      {pickedBuilding ? <Text style={[styles.plotMeta, { marginTop: 6 }]}>{pickedBuilding.description}</Text> : null}
      <View style={styles.rowActions}>
        <View style={{ flex: 1 }}><Button
          label={`${buildLabel}${pickedBuilding ? ` · ${pickedBuilding.name} (⭐ ${cost})` : ' · pilih bangunan dulu'}`}
          kind={canBuild ? 'primary' : 'ghost'}
          disabled={!canBuild}
          onPress={() => onBuild(plot.id, picked)}
          accessibilityLabel={`Bangun di ${plot.name}`}
        /></View>
      </View>
      {pickedBuilding && points < cost ? <Text style={[styles.plotMeta, { color: C.red, marginTop: 4 }]}>Poin pertumbuhan kurang {cost - points}. Netralkan wabah dulu.</Text> : null}
    </>}
  </View>;
}

export default function DistrictPanel({
  district, coins = 0, growthPoints = 0, cleared = 0, modifiers = {}, notice = '',
  onBuy, onBuild, onCollect, onBackToGame,
}) {
  const [tab, setTab] = useState('land');
  const [picks, setPicks] = useState({});
  const summary = useMemo(() => districtSummary(district), [district]);
  const pending = pendingDistrictIncome(district);
  // Pendapatan berjalan real-time: segarkan angka tiap 15 detik selama panel terbuka.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((value) => value + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const plots = DISTRICT_PLOTS.filter((plot) => plot.kind === tab);
  const sections = [...new Set(plots.map((plot) => plot.section))];

  return <View>
    <Text style={ui.eyebrow}>WILAYAH PENGEMBANGAN · PETAK DARAT & LAUT</Text>
    <Text style={ui.h1}>Beli petak, bangun kawasan</Text>
    <Text style={[ui.body, { marginTop: 4, marginBottom: 10 }]}>
      Petak darat dan petak laut bisa dibeli dengan koin, lalu dibangun rumah tinggal, perkantoran,
      industri, atau rekreasi. Setiap bangunan menambah Nilai Wilayah, populasi, lapangan kerja, dan
      pendapatan koin + Poin Pertumbuhan yang bisa diklaim.
    </Text>

    <View style={[ui.card, { borderColor: `${C.green}55` }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View>
          <Text style={ui.eyebrow}>NILAI WILAYAH</Text>
          <Text style={styles.points}>{formatNumber(summary.value)} <Text style={{ fontSize: 13 }}>poin</Text></Text>
          <Text style={ui.small}>Level kawasan {summary.level} · {summary.built} bangunan dari {summary.owned} petak dimiliki</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ui.eyebrow}>KOIN PEMAIN</Text>
          <Text style={[styles.points, { color: C.gold, fontSize: 24 }]}>🪙 {formatNumber(coins)}</Text>
          <Text style={[ui.small, { color: C.cyan }]}>⭐ {formatNumber(growthPoints)} poin pertumbuhan</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
          <Text style={ui.small}>Indeks pembangunan kawasan</Text>
          <Text style={[ui.small, { color: C.green, fontWeight: '900' }]}>{summary.score}%</Text>
        </View>
        <ProgressBar ratio={summary.score / 100} color={C.green} height={8} />
      </View>
      <View style={styles.chips}>
        {[['🪙', `${summary.coinsPerMin}/mnt`, 'KOIN'], ['⭐', `${summary.growthPerMin}/mnt`, 'POIN'], ['👥', summary.population, 'POPULASI'], ['💼', summary.jobs, 'KERJA'], ['🌿', summary.eco, 'EKOSISTEM'], ['😊', summary.happiness, 'BAHAGIA']].map(([icon, value, label]) => (
          <View key={label} style={[styles.statChip, { borderColor: `${C.cyan}44` }]}>
            <Text style={[styles.statValue, { color: C.text }]}>{icon} {value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10 }}>
        <Button
          label={pending.coins || pending.growth
            ? `Klaim pendapatan · 🪙 ${formatNumber(pending.coins)} + ⭐ ${formatNumber(pending.growth)} (${Math.round(pending.minutes)} mnt)`
            : 'Belum ada pendapatan wilayah'}
          kind={pending.coins || pending.growth ? 'gold' : 'ghost'}
          disabled={!(pending.coins || pending.growth)}
          onPress={onCollect}
          accessibilityLabel="Klaim pendapatan wilayah"
        />
        {summary.coinsPerMin || summary.growthPerMin ? <Text style={[ui.small, { marginTop: 6 }]}>
          Pendapatan menumpuk otomatis, maksimal 3 jam. Total diklaim sejauh ini: 🪙 {formatNumber(district?.lifetime?.coins || 0)} · ⭐ {formatNumber(district?.lifetime?.growth || 0)}.
        </Text> : <Text style={[ui.small, { marginTop: 6 }]}>Bangun minimal satu gedung untuk mulai memperoleh pendapatan wilayah.</Text>}
      </View>
    </View>

    {notice ? <Text style={ui.success}>{notice}</Text> : null}

    <Segmented
      options={[['land', `Petak Darat · ${DISTRICT_PLOTS.filter((plot) => plot.kind === 'land').length}`], ['sea', `Petak Laut · ${DISTRICT_PLOTS.filter((plot) => plot.kind === 'sea').length}`]]}
      value={tab}
      onChange={setTab}
    />

    {sections.map((section) => <View key={section}>
      <Text style={styles.section}>{section.toUpperCase()}</Text>
      {plots.filter((plot) => plot.section === section).map((plot) => <PlotRow
        key={plot.id}
        plot={plot}
        status={districtPlotStatus(district, plot.id, { cleared, modifiers })}
        points={growthPoints}
        coins={coins}
        modifiers={modifiers}
        picked={picks[plot.id]}
        onPick={(plotId, buildingId) => setPicks((value) => ({ ...value, [plotId]: buildingId }))}
        onBuy={onBuy}
        onBuild={(plotId, buildingId) => { if (buildingId) onBuild(plotId, buildingId); }}
      />)}
    </View>)}

    <View style={[ui.card, { marginTop: 4 }]}>
      <Text style={ui.eyebrow}>TIPS</Text>
      <Text style={[ui.small, { marginTop: 4 }]}>Petak laut ada di kiri-kanan dermaga Pesisir Digital — dek mengapung di air terbuka. Jalan ke ujung dermaga untuk melihatnya dari dekat.</Text>
      <Text style={[ui.small, { marginTop: 3 }]}>Disiplin Arsitek/Urban memberi diskon harga petak dan biaya bangun.</Text>
      <Text style={[ui.small, { marginTop: 3 }]}>Petak terbuka bertahap: makin banyak petak dimiliki dan makin banyak wabah dinetralkan, makin jauh kawasan yang bisa dibeli.</Text>
      <View style={{ marginTop: 10 }}><Button label="Kembali ke Game" kind="ghost" onPress={onBackToGame} /></View>
    </View>
  </View>;
}
