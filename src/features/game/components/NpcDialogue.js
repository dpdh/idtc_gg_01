import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, C, Pill } from './gameUi';

// Dialog warga: sapaan + beberapa baris percakapan, petunjuk gameplay, dan hadiah sekali klaim.
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emoji: { fontSize: 22 },
  name: { color: C.text, fontSize: 17, fontWeight: '900' },
  role: { color: C.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
  bubble: { backgroundColor: 'rgba(95,211,255,0.08)', borderWidth: 1, borderColor: 'rgba(95,211,255,0.35)', borderRadius: 14, padding: 12, marginBottom: 10 },
  line: { color: C.text, fontSize: 13.5, lineHeight: 20 },
  hint: { borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 9, marginBottom: 10 },
  hintText: { color: '#ffe2a0', fontSize: 11.5, lineHeight: 17, fontWeight: '700' },
  reward: { color: C.green, fontSize: 11.5, fontWeight: '800', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});

export default function NpcDialogue({ npc, lineIndex = 0, claimed, onNext, onClose }) {
  if (!npc) return null;
  const lines = [npc.greeting, ...(npc.lines || [])];
  const index = Math.min(Math.max(lineIndex, 0), lines.length - 1);
  const done = index >= lines.length - 1;
  return <View>
    <View style={styles.head}>
      <View style={[styles.avatar, { borderColor: `${npc.color}aa`, backgroundColor: `${npc.color}22` }]}><Text style={styles.emoji}>{npc.icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{npc.name}</Text>
        <Text style={styles.role}>{npc.role} · warga kawasan</Text>
      </View>
      <Pill label={`${index + 1}/${lines.length}`} color={npc.color} />
    </View>
    <View style={styles.bubble}><Text style={styles.line}>{lines[index]}</Text></View>
    {done ? <View style={styles.hint}><Text style={styles.hintText}>💡 {npc.hint}</Text></View> : null}
    <Text style={styles.reward}>{claimed ? '🎁 Hadiah percakapan sudah diklaim untuk warga ini.' : `🎁 Hadiah: +${npc.reward.coins} koin · +${npc.reward.xp} XP`}</Text>
    <View style={styles.actions}>
      {done
        ? <Button label="Selesai" kind="primary" onPress={onClose} accessibilityLabel={`Selesai bicara dengan ${npc.name}`} />
        : <Button label="Lanjut" kind="gold" onPress={onNext} accessibilityLabel="Lanjut ke kalimat berikutnya" />}
      {done ? null : <Button label="Akhiri" kind="ghost" onPress={onClose} accessibilityLabel={`Akhiri percakapan dengan ${npc.name}`} />}
    </View>
  </View>;
}
