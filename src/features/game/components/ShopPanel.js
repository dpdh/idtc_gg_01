import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BUILDING_UPGRADES, GROWTH_PACKS, VEHICLE_UPGRADES, WEAPON_ACCESSORIES, WEAPONS,
} from '../../survival/data/weapons';
import { shotIntervalMs } from '../../survival/engine/loadout';
import { Button, C, Pill, Segmented, formatNumber, ui } from './gameUi';

// Toko & Upgrade: beli/pakai pistol laser, aksesori senjata, upgrade aset kota, dan upgrade kendaraan.
// Semua transaksi memakai koin permainan; handler diteruskan dari layar supaya state tetap satu sumber.

const styles = StyleSheet.create({
  coins: { color: C.gold, fontSize: 30, fontWeight: '900' },
  item: { borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: { fontSize: 22, width: 28, textAlign: 'center' },
  stats: { color: C.muted, fontSize: 10.5, fontWeight: '700', marginTop: 3 },
  action: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { marginTop: 6 },
});

const tierLabel = (tier) => ['', 'STANDAR', 'LANJUT', 'ELITE', 'PROTOTIPE', 'LEGENDA'][tier] || 'STANDAR';

function WeaponRow({ weapon, loadout, coins, onBuy, onEquip }) {
  const owned = loadout.weapons.includes(weapon.id);
  const equipped = loadout.equippedWeapon === weapon.id;
  return <View style={[styles.item, { borderColor: equipped ? `${weapon.color}aa` : C.line }]}>
    <View style={styles.itemHead}>
      <Text style={styles.icon}>{weapon.icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ui.title, { color: equipped ? weapon.color : C.text }]}>{weapon.name}</Text>
        <Text style={styles.stats}>T{tierLabel(weapon.tier)} · DMG {weapon.damage} · TEMPO {shotIntervalMs(weapon)}ms · SEL {weapon.ammo} · SPEED {weapon.speed}</Text>
      </View>
      {equipped ? <Pill label="DIPAKAI" color={weapon.color} /> : owned ? <Pill label="DIMILIKI" color={C.green} /> : <Pill label={`${formatNumber(weapon.cost)} koin`} color={C.gold} />}
    </View>
    <Text style={[ui.small, { marginTop: 5 }]}>{weapon.description}</Text>
    {equipped ? null : <View style={styles.action}>
      {owned
        ? <Button small label="Pakai Senjata Ini" kind="primary" onPress={() => onEquip(weapon.id)} accessibilityLabel={`Pakai ${weapon.name}`} />
        : <Button small label={`Beli · ${formatNumber(weapon.cost)} koin`} kind="gold" disabled={coins < weapon.cost} onPress={() => onBuy(weapon.id)} accessibilityLabel={`Beli ${weapon.name}`} />}
    </View>}
  </View>;
}

function AccessoryRow({ item, loadout, coins, onBuy, onToggle }) {
  const owned = loadout.ownedAccessories.includes(item.id);
  const active = loadout.accessories.includes(item.id);
  return <View style={[styles.item, { borderColor: active ? `${C.cyan}88` : C.line }]}>
    <View style={styles.itemHead}>
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ui.title}>{item.name}</Text>
        <Text style={ui.small}>{item.description}</Text>
      </View>
      {active ? <Pill label="TERPASANG" color={C.cyan} /> : owned ? <Pill label="DIMILIKI" color={C.green} /> : <Pill label={`${formatNumber(item.cost)} koin`} color={C.gold} />}
    </View>
    <View style={styles.action}>
      {!owned ? <Button small label={`Beli & Pasang · ${formatNumber(item.cost)}`} kind="primary" disabled={coins < item.cost} onPress={() => onBuy(item.id)} accessibilityLabel={`Beli ${item.name}`} />
        : active ? <Button small label="Lepas Aksesori" kind="ghost" onPress={() => onToggle(item.id)} accessibilityLabel={`Lepas ${item.name}`} />
          : <Button small label="Pasang Kembali" kind="primary" onPress={() => onToggle(item.id)} accessibilityLabel={`Pasang ${item.name}`} />}
    </View>
  </View>;
}

function UpgradeRow({ item, owned, coins, onBuy, accent, effect }) {
  return <View style={[styles.item, { borderColor: owned ? `${accent}88` : C.line }]}>
    <View style={styles.itemHead}>
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ui.title}>{item.name}</Text>
        <Text style={ui.small}>{item.description}</Text>
      </View>
      {owned ? <Pill label="AKTIF" color={accent} /> : <Pill label={`${formatNumber(item.cost)} koin`} color={C.gold} />}
    </View>
    {effect ? <Text style={[styles.stats, { color: accent }]}>{effect}</Text> : null}
    {owned ? null : <View style={styles.action}>
      <Button small label={`Upgrade · ${formatNumber(item.cost)} koin`} kind="primary" disabled={coins < item.cost} onPress={() => onBuy(item.id)} accessibilityLabel={`Beli upgrade ${item.name}`} />
    </View>}
  </View>;
}

export default function ShopPanel({
  initialTab = 'weapons', loadout, coins, weapon, buildingBonus, vehicleStats,
  onBuyWeapon, onEquipWeapon, onBuyAccessory, onToggleAccessory, onBuyBuilding, onBuyVehicle, onBuyGrowth, onBackToGame, notice,
}) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  return <View>
    <Text style={ui.eyebrow}>TOKO & UPGRADE TWINI</Text>
    <Text style={ui.h1}>Perlengkapan Lapangan</Text>
    <Text style={[ui.small, { marginTop: 2, color: '#ffd178', fontWeight: '800' }]}>📍 Twini Shop District · utara Monas — masuk lewat pintu bangunan atau chip HUD</Text>
    <Text style={[ui.body, { marginTop: 4 }]}>Koin didapat dari wabah digital, misi, dan percakapan dengan warga. Semua pembelian langsung tersimpan.</Text>
    <View style={[ui.card, { marginTop: 12 }]}>
      <View style={ui.row}>
        <View style={{ flex: 1 }}>
          <Text style={ui.eyebrow}>SALDO KOIN</Text>
          <Text style={styles.coins}>🪙 {formatNumber(coins)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          <Text style={ui.eyebrow}>SENJATA AKTIF</Text>
          <Text style={[ui.title, { color: weapon.color }]}>{weapon.name}</Text>
          <Text style={ui.small}>DMG {weapon.damage} · TEMPO {shotIntervalMs(weapon)}ms · SEL {weapon.ammo}</Text>
        </View>
      </View>
      {notice ? <Text style={[styles.notice, ui.success]}>{notice}</Text> : null}
    </View>
    <Segmented
      options={[['weapons', 'Senjata'], ['accessories', 'Aksesori'], ['buildings', 'Aset Kota'], ['vehicles', 'Kendaraan']]}
      value={tab}
      onChange={setTab}
    />
    {tab === 'weapons' ? <>
      <Text style={ui.eyebrow}>PISTOL LASER</Text>
      <Text style={[ui.small, { marginVertical: 6 }]}>Semakin tinggi tier, semakin besar damage dan kecepatan proyektil. Senjata baru otomatis dipakai.</Text>
      {WEAPONS.map((item) => <WeaponRow key={item.id} weapon={item} loadout={loadout} coins={coins} onBuy={onBuyWeapon} onEquip={onEquipWeapon} />)}
    </> : null}
    {tab === 'accessories' ? <>
      <Text style={ui.eyebrow}>AKSESORI SENJATA</Text>
      <Text style={[ui.small, { marginVertical: 6 }]}>Aksesori berlaku untuk semua pistol yang dimiliki. Bisa dilepas dan dipasang kembali tanpa biaya.</Text>
      {WEAPON_ACCESSORIES.map((item) => <AccessoryRow key={item.id} item={item} loadout={loadout} coins={coins} onBuy={onBuyAccessory} onToggle={onToggleAccessory} />)}
    </> : null}
    {tab === 'buildings' ? <>
      <Text style={ui.eyebrow}>UPGRADE ASET KOTA</Text>
      <Text style={[ui.small, { marginVertical: 6 }]}>Manfaat tambahan berlaku untuk setiap bangunan yang sudah berdiri di petak kota.</Text>
      <View style={[ui.card, { borderColor: `${C.green}55` }]}>
        <Text style={ui.eyebrow}>BELI POIN PERTUMBUHAN</Text>
        <Text style={[ui.small, { marginTop: 3, marginBottom: 8 }]}>Tukar koin menjadi Poin Pertumbuhan Kota, lalu bangun aset di panel Wabah & Pertumbuhan Kota.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GROWTH_PACKS.map((pack) => <Button
            key={pack.id}
            small
            label={`${pack.icon} +${pack.points} poin · ${formatNumber(pack.cost)}`}
            kind={coins >= pack.cost ? 'gold' : 'ghost'}
            disabled={coins < pack.cost}
            onPress={() => onBuyGrowth(pack.points, pack.cost)}
            accessibilityLabel={`Beli ${pack.points} poin pertumbuhan seharga ${pack.cost} koin`}
          />)}
        </View>
      </View>
      {BUILDING_UPGRADES.map((item) => <UpgradeRow key={item.id} item={item} owned={loadout.buildingUpgrades.includes(item.id)} coins={coins} onBuy={onBuyBuilding} accent={C.green} effect={`Bonus aktif — ekosistem +${buildingBonus.eco} · energi +${buildingBonus.energy} · data +${buildingBonus.data} · kesehatan +${buildingBonus.health}`} />)}
    </> : null}
    {tab === 'vehicles' ? <>
      <Text style={ui.eyebrow}>UPGRADE KENDARAAN</Text>
      <Text style={[ui.small, { marginVertical: 6 }]}>Berlaku untuk mobil, motor, dan perahu yang dipakai Twini.</Text>
      {VEHICLE_UPGRADES.map((item) => <UpgradeRow key={item.id} item={item} owned={loadout.vehicleUpgrades.includes(item.id)} coins={coins} onBuy={onBuyVehicle} accent={C.gold} effect={`Kecepatan ×${vehicleStats.speed} · cengkeraman ×${vehicleStats.grip}${vehicleStats.armor ? ` · armor +${vehicleStats.armor}` : ''}`} />)}
    </> : null}
    <View style={{ marginTop: 10 }}>
      <Button label="Kembali ke Game" kind="ghost" onPress={onBackToGame} accessibilityLabel="Kembali ke permainan tanpa memulai ulang" />
    </View>
  </View>;
}
