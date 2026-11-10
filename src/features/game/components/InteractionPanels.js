import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, C, Pill, formatNumber, ui } from './gameUi';

const SOURCE = {
  public: { label: 'DATA PUBLIK', color: C.green, note: 'Data referensi publik (bukan sensor live).' },
  live: { label: 'DATA SENSOR AKTUAL', color: C.cyan, note: 'Diambil dari sensor nyata.' },
  simulated: { label: 'DATA SIMULASI', color: C.gold, note: 'Nilai disimulasikan untuk permainan, bukan kondisi nyata.' },
};

// Deterministic pseudo telemetry so the same object shows stable "simulated" readings.
function simulatedReadings(object, now) {
  const seed = [...object.id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const wave = (k) => Math.sin(now / 60000 + seed * k);
  return [
    ['Suhu perangkat', `${(31 + wave(1) * 3).toFixed(1)}°C`],
    ['Uptime', `${(97 + wave(2) * 2.5).toFixed(1)}%`],
    ['Latensi data', `${Math.round(80 + wave(3) * 40)} ms`],
  ];
}

export function ScanProgress({ name, onDone, durationMs = 1400 }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(({ finished }) => finished && onDone());
    return () => loop.stop();
  }, [durationMs, onDone, progress, pulse]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
  return <View pointerEvents="none" style={s.scanWrap}>
    <View style={s.scanCard}>
      <View style={s.radar}><Animated.View style={[s.radarRing, { transform: [{ scale }], opacity }]} /><Text style={{ fontSize: 22 }}>📡</Text></View>
      <Text style={ui.eyebrow}>MEMINDAI DIGITAL TWIN</Text>
      <Text style={[ui.title, { marginVertical: 4 }]} numberOfLines={1}>{name}</Text>
      <View style={[ui.track, { height: 6, width: '100%' }]}><Animated.View style={[ui.fill, { width, backgroundColor: C.cyan }]} /></View>
      <Text style={[ui.small, { marginTop: 6 }]}>Mengambil BIM · GIS · IoT · metadata…</Text>
    </View>
  </View>;
}

export function TwinInfoPanel({ object, type, state, connection, supply, onAction, onClose, actionHint }) {
  const twin = object.twin || {};
  const source = SOURCE[twin.source] || SOURCE.simulated;
  const [now] = useState(Date.now());
  const status = state.done || state.synced ? 'ONLINE · TERSINKRON' : state.repaired ? 'DIPERBAIKI' : 'PERLU PERHATIAN';
  const rows = [['BIM', twin.bim], ['GIS', twin.gis], ['IoT', twin.iot], ['Riwayat', twin.history], ['Koordinat game', `x ${object.position[0]}, z ${object.position[1]}`]].filter(([, v]) => v);
  const cost = type.supplyCost || 0;
  const syncBlocked = type.action === 'sync' && connection < 20;
  const supplyBlocked = cost > 0 && supply < cost;
  const alreadyDone = (type.action === 'repair' && state.repaired) || (type.action === 'restore_station' && state.restored);
  return <View style={s.panelWrap} pointerEvents="box-none">
    <View style={s.panel}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.eyebrow}>{type.label.toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup panel"><Text style={{ color: C.muted, fontSize: 18, fontWeight: '900' }}>✕</Text></TouchableOpacity>
      </View>
      <Text style={[ui.title, { fontSize: 17, marginTop: 2 }]}>{object.name}</Text>
      <View style={[ui.row, { marginTop: 6, flexWrap: 'wrap' }]}><Pill label={source.label} color={source.color} /><Pill label={status} color={state.synced || state.repaired || state.restored ? C.green : C.red} /></View>
      <ScrollView style={{ maxHeight: 170, marginTop: 8 }}>
        {rows.map(([k, v]) => <View key={k} style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>)}
        {simulatedReadings(object, now).map(([k, v]) => <View key={k} style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v} <Text style={{ color: C.gold, fontSize: 9 }}>SIM</Text></Text></View>)}
        <Text style={[ui.small, { marginTop: 6 }]}>{source.note}</Text>
      </ScrollView>
      {actionHint ? <Text style={[ui.small, { color: C.gold, marginTop: 6 }]}>🎯 {actionHint}</Text> : null}
      <View style={{ marginTop: 10 }}>
        {alreadyDone ? <Text style={[ui.body, { color: C.green }]}>✓ Objek ini sudah pulih.{type.action === 'restore_station' ? ' Tekan INTERACT lagi untuk mengisi energi.' : ''}</Text>
          : <Button label={syncBlocked ? 'Digital Connection < 20%' : supplyBlocked ? `Butuh ${cost} Supply` : type.actionLabel} kind="gold" disabled={syncBlocked || supplyBlocked} onPress={onAction} />}
      </View>
    </View>
  </View>;
}

export function QuizPanel({ object, onAnswer, onClose }) {
  const [picked, setPicked] = useState(null);
  const quiz = object.quiz;
  const correct = picked != null && picked === quiz.answer;
  return <View style={s.panelWrap} pointerEvents="box-none">
    <View style={s.panel}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.eyebrow}>SMART CITY CHALLENGE</Text><TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup"><Text style={{ color: C.muted, fontSize: 18, fontWeight: '900' }}>✕</Text></TouchableOpacity></View>
      <Text style={[ui.title, { marginTop: 4 }]}>{object.name}</Text>
      <Text style={[ui.body, { color: C.text, marginVertical: 8 }]}>{quiz.q}</Text>
      {quiz.options.map((option, index) => {
        const chosen = picked === index;
        const color = picked == null ? C.line : index === quiz.answer && chosen ? C.green : chosen ? C.red : C.line;
        return <TouchableOpacity key={option} disabled={picked != null} onPress={() => { setPicked(index); onAnswer(index === quiz.answer); }} style={[s.option, { borderColor: color }]} accessibilityRole="button">
          <Text style={{ color: C.text, fontSize: 13 }}>{String.fromCharCode(65 + index)}. {option}</Text>
        </TouchableOpacity>;
      })}
      {picked != null ? <Text style={[correct ? ui.success : ui.error]}>{correct ? 'Benar! Tantangan infrastruktur selesai.' : 'Belum tepat. Energi −5. Coba lagi nanti.'}</Text> : null}
      {picked != null ? <Button label="Tutup" kind="ghost" small onPress={onClose} /> : null}
    </View>
  </View>;
}

export function MissionCompleteBanner({ mission, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [anim, onDone]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return <View pointerEvents="none" style={s.bannerWrap}>
    <Animated.View style={[s.banner, { opacity: anim, transform: [{ scale }] }]}>
      <Text style={{ fontSize: 30 }}>🏆</Text>
      <Text style={[ui.eyebrow, { color: C.gold }]}>MISI SELESAI</Text>
      <Text style={[ui.title, { fontSize: 18, textAlign: 'center' }]}>{mission.title}</Text>
      <Text style={{ color: C.gold, fontWeight: '900', marginTop: 4 }}>+{formatNumber(Math.round(mission.rewardTp * (mission.multiplier || 1)))} TP · +{formatNumber(mission.rewardXp)} XP</Text>
      <Text style={[ui.small, { marginTop: 2 }]}>Reward divalidasi server</Text>
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({
  scanWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  scanCard: { width: 280, backgroundColor: 'rgba(8,16,30,0.94)', borderRadius: 18, borderWidth: 1, borderColor: `${C.cyan}66`, padding: 18, alignItems: 'center' },
  radar: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  radarRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: C.cyan },
  panelWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 40 },
  panel: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(8,16,30,0.96)', borderRadius: 18, borderWidth: 1, borderColor: `${C.cyan}55`, padding: 16 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 10 },
  k: { color: C.muted, fontSize: 12 },
  v: { color: C.text, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  option: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  bannerWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  banner: { backgroundColor: 'rgba(10,18,34,0.95)', borderRadius: 20, borderWidth: 1.5, borderColor: C.gold, paddingVertical: 18, paddingHorizontal: 26, alignItems: 'center', maxWidth: 320 },
});
