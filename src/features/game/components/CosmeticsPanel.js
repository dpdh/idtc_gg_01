import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COSMETIC_SLOTS, SLOT_META } from '../../survival/data/disciplineCosmetics';
import { disciplineById } from '../../survival/data/disciplines';
import { cosmeticsSummary, profileFor } from '../engine/cosmetics';
import { Button, C, Pill, ProgressBar, formatNumber, ui } from './gameUi';

// Panel "Profil Karakter & Atribut": setiap karakter Twini (Twini Engineer, Insan Adhi, Insan Adhi W01,
// DNI-01, DNI-02) punya profil aksesori sendiri — item apa yang dipakai dan slot mana yang aktif.
// Toggle ON/OFF menyembunyikan aksesori tanpa menghapus pilihannya.

const styles = StyleSheet.create({
  charRow: { paddingVertical: 4, paddingRight: 4 },
  charCard: { width: 96, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(255,255,255,0.03)', padding: 6, marginRight: 8, alignItems: 'center' },
  charCardOn: { borderColor: C.cyan, backgroundColor: 'rgba(95,211,255,0.14)' },
  charArt: { width: 82, height: 82, borderRadius: 10, backgroundColor: '#091528' },
  charName: { color: C.text, fontSize: 9.5, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  charMeta: { color: C.muted, fontSize: 8.5, marginTop: 2, textAlign: 'center' },
  slotCard: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotTitle: { color: C.text, fontSize: 13, fontWeight: '900' },
  slotHint: { color: C.muted, fontSize: 10.5, marginTop: 2 },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  item: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 8, minWidth: 130, backgroundColor: 'rgba(255,255,255,0.03)' },
  itemOn: { borderColor: C.cyan, backgroundColor: 'rgba(95,211,255,0.12)' },
  itemGold: { borderColor: `${C.gold}88` },
  itemName: { color: C.text, fontSize: 11.5, fontWeight: '800' },
  itemMeta: { color: C.muted, fontSize: 9.5, marginTop: 2, marginBottom: 6 },
  itemActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  swatch: { width: 10, height: 10, borderRadius: 3, marginRight: 5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  slotOff: { opacity: 0.55 },
});

export default function CosmeticsPanel({
  cosmetics, coins = 0, characters = [], characterId, notice = '',
  onSelectCharacter, onBuy, onEquip, onUnequip, onToggleSlot, onApplyAll, onBackToGame,
}) {
  const activeCharacter = characterId || characters[0]?.id;
  const summary = useMemo(() => cosmeticsSummary(cosmetics, activeCharacter), [cosmetics, activeCharacter]);
  const discipline = disciplineById(cosmetics?.disciplineId);
  const profile = summary.profile;
  const bySlot = useMemo(() => COSMETIC_SLOTS.map((slot) => [slot, summary.items.filter((item) => item.slot === slot)]), [summary.items]);

  return <View>
    <Text style={ui.eyebrow}>PROFIL KARAKTER · ATRIBUT & LENCANA</Text>
    <Text style={ui.h1}>{discipline.icon} {discipline.name}</Text>
    <Text style={[ui.body, { marginTop: 4, marginBottom: 10 }]}>
      Pilih karakter Twini, lalu atur topi, pakaian, sepatu, dan aksesori/lencananya. Setiap karakter punya
      profil sendiri, dan tiap slot bisa dimatikan bila tidak ingin dipakai.
    </Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.charRow} contentContainerStyle={{ paddingRight: 4 }}>
      {characters.map((character) => {
        const active = character.id === activeCharacter;
        const p = profileFor(cosmetics, character.id);
        const onCount = COSMETIC_SLOTS.filter((slot) => p.enabled?.[slot] && p.equipped?.[slot]).length;
        return <View key={character.id} style={[styles.charCard, active && styles.charCardOn]}>
          <Image source={character.art} style={styles.charArt} resizeMode="cover" />
          <Text numberOfLines={1} style={styles.charName}>{character.name}</Text>
          <Text style={styles.charMeta}>{onCount}/4 atribut aktif</Text>
          <View style={{ marginTop: 6, width: '100%' }}>
            <Button
              label={active ? 'TERPILIH' : 'Pilih'}
              kind={active ? 'primary' : 'ghost'}
              small
              onPress={() => onSelectCharacter(character.id)}
              accessibilityLabel={`Profil atribut ${character.name}`}
            />
          </View>
        </View>;
      })}
    </ScrollView>

    <View style={[ui.card, { borderColor: `${C.cyan}55`, marginTop: 10 }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1 }}>
          <Text style={ui.eyebrow}>PROFIL AKTIF</Text>
          <Text style={[ui.title, { fontSize: 17 }]}>{characters.find((c) => c.id === activeCharacter)?.name || activeCharacter}</Text>
          <Text style={ui.small}>Atribut aktif {summary.active}/4 · terpasang {summary.equipped}/4 · dimiliki {summary.owned}/{summary.total}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ui.eyebrow}>KOIN</Text>
          <Text style={[ui.title, { fontSize: 22, color: C.gold }]}>🪙 {formatNumber(coins)}</Text>
          <Pill label={discipline.short.toUpperCase()} color={discipline.color} />
        </View>
      </View>
      <View style={{ marginTop: 10 }}><ProgressBar ratio={summary.total ? summary.owned / summary.total : 0} color={C.cyan} height={8} /></View>
      <Text style={[ui.small, { marginTop: 8 }]}>Profil tersimpan: {summary.charactersConfigured} karakter.</Text>
    </View>

    {notice ? <Text style={ui.success}>{notice}</Text> : null}

    {bySlot.map(([slot, items]) => {
      const enabled = profile.enabled?.[slot] !== false;
      return <View key={slot} style={[styles.slotCard, !enabled && styles.slotOff]}>
        <View style={styles.slotHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotTitle}>{SLOT_META[slot].icon} {SLOT_META[slot].label}</Text>
            <Text style={styles.slotHint}>{items.filter((item) => item.owned).length}/{items.length} dimiliki · {enabled ? 'dipakai' : 'disembunyikan'}</Text>
          </View>
          <Button
            label={enabled ? 'PAKAI' : 'OFF'}
            kind={enabled ? 'primary' : 'ghost'}
            small
            onPress={() => onToggleSlot(slot)}
            accessibilityLabel={`${enabled ? 'Matikan' : 'Aktifkan'} ${SLOT_META[slot].label} untuk karakter ini`}
          />
        </View>
        <View style={styles.items}>
          {items.map((item) => {
            const equipped = profile.equipped?.[slot] === item.id;
            const affordable = coins >= item.price;
            return <View key={item.id} style={[styles.item, equipped && enabled && styles.itemOn, item.premium && styles.itemGold]}>
              <View style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemMeta}>
                {item.premium ? `Premium · 🪙 ${formatNumber(item.price)}` : 'Bawaan disiplin'}
                {equipped ? (enabled ? ' · DIPAKAI' : ' · OFF') : ''}
              </Text>
              <View style={styles.itemActions}>
                {!item.owned ? <Button
                  label={affordable ? `Beli 🪙 ${formatNumber(item.price)}` : 'Koin kurang'}
                  kind={affordable ? 'gold' : 'ghost'}
                  small
                  disabled={!affordable}
                  onPress={() => onBuy(item.id)}
                  accessibilityLabel={`Beli ${item.name}`}
                /> : null}
                {item.owned && !equipped ? <Button label="Pakai" kind="primary" small onPress={() => onEquip(item.id)} accessibilityLabel={`Pakai ${item.name}`} /> : null}
                {equipped ? <Button label="Lepas" kind="ghost" small onPress={() => onUnequip(slot)} accessibilityLabel={`Lepas ${item.name}`} /> : null}
                {equipped && enabled ? <Pill label="AKTIF" color={C.green} /> : null}
              </View>
            </View>;
          })}
        </View>
      </View>;
    })}

    <View style={ui.card}>
      <Text style={ui.eyebrow}>TERAPKAN KE SEMUA KARAKTER</Text>
      <Text style={[ui.small, { marginTop: 4 }]}>Salin kombinasi atribut karakter aktif ke karakter Twini lainnya.</Text>
      <View style={{ marginTop: 8 }}><Button label="Salin profil ke semua karakter" kind="gold" onPress={onApplyAll} accessibilityLabel="Terapkan profil ke semua karakter" /></View>
      <Text style={[ui.small, { marginTop: 8 }]}>Ganti disiplin di pengaturan karakter untuk membuka set atribut disiplin lain. Item emas yang sudah dibeli tetap tersimpan per disiplin.</Text>
      <View style={{ marginTop: 10 }}><Button label="Kembali ke Game" kind="ghost" onPress={onBackToGame} /></View>
    </View>
  </View>;
}
