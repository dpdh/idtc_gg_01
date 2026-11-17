import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { coopApi } from '../services/coopApi';
import { gameApi } from '../services/gameApi';
import { DISCIPLINE_BY_ID, disciplineById } from '../../survival/data/disciplines';
import { Button, C, Pill, ProgressBar, Segmented, formatNumber, ui } from './gameUi';

// Panel Multiplayer Co-op: buat/join ruangan dengan kode, lihat anggota & progres objektif tim,
// klaim reward bersama, dan papan peringkat (co-op + Twin Points).
const POLL_MS = 4000;

export default function CoopPanel({ twin, disciplineId, onRoomChange, onNotice }) {
  const token = twin.session?.token || null;
  const [tab, setTab] = useState('room');
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('');
  const [missionId, setMissionId] = useState('w-wabah-digital');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [boards, setBoards] = useState({ coop: [], solo: [] });
  const roomRef = useRef(null);
  roomRef.current = room?.code || null;

  const missionOptions = useMemo(() => (twin.missions || [])
    .filter((mission) => !mission.requiresTeam && ['campaign', 'weekly', 'daily', 'special'].includes(mission.category))
    .slice(0, 40), [twin.missions]);
  const missionOf = (id) => (twin.missions || []).find((mission) => mission.id === id) || null;

  const adopt = useCallback((next) => {
    setRoom(next || null);
    onRoomChange?.(next?.code || null);
  }, [onRoomChange]);

  const run = useCallback(async (fn, success) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await fn();
      if (success) { setNotice(success); onNotice?.(success); }
      return result;
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan.');
      return null;
    } finally { setBusy(false); }
  }, [onNotice]);

  // Restore any room this account is still part of, then load the leaderboards.
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      try {
        const [{ rooms }, { leaderboard }] = await Promise.all([coopApi.myRooms(token), gameApi.leaderboard('all')]);
        if (!alive) return;
        setBoards((value) => ({ ...value, solo: leaderboard || [] }));
        if (rooms?.length) adopt(rooms[0]);
      } catch { /* offline: keep the panel usable */ }
    })();
    return () => { alive = false; };
  }, [token, adopt]);

  // Poll the active room so every squad member sees the shared objective progress.
  useEffect(() => {
    if (!token || !room?.code) return undefined;
    const id = setInterval(async () => {
      try {
        const next = await coopApi.getRoom(token, roomRef.current);
        if (roomRef.current) adopt(next);
      } catch { /* transient network error */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [token, room?.code, adopt]);

  const loadBoards = useCallback(async () => {
    if (!token) return;
    const [coop, solo] = await Promise.all([
      coopApi.leaderboard(token, 20).catch(() => ({ leaderboard: [] })),
      gameApi.leaderboard('all').catch(() => ({ leaderboard: [] })),
    ]);
    setBoards({ coop: coop.leaderboard || [], solo: solo.leaderboard || [] });
  }, [token]);

  useEffect(() => { if (tab === 'board') loadBoards(); }, [tab, loadBoards]);

  const createRoom = async () => {
    const next = await run(
      () => coopApi.createRoom(token, { missionId, discipline: disciplineId, maxPlayers: 4 }),
      'Ruangan co-op dibuat — bagikan kodenya ke tim!',
    );
    if (next) adopt(next);
  };

  const joinRoom = async () => {
    if (!code.trim()) { setError('Masukkan kode ruangan.'); return; }
    const next = await run(() => coopApi.joinRoom(token, code.trim(), { discipline: disciplineId }), 'Berhasil bergabung ke ruangan tim.');
    if (next) { adopt(next); setCode(''); }
  };

  const claimReward = async () => {
    const result = await run(() => coopApi.claim(token, room.code));
    if (result) {
      adopt(result.room);
      setNotice(`Reward tim diterima: +${result.tp} TP · +${result.xp} XP`);
      twin.refreshProfile?.();
      loadBoards();
    }
  };

  const leaveRoom = async () => {
    const result = await run(() => coopApi.leave(token, room.code), 'Keluar dari ruangan tim.');
    if (result) adopt(null);
  };

  if (!token) {
    return <View>
      <Text style={styles.eyebrow}>MULTIPLAYER CO-OP</Text>
      <Text style={styles.title}>Join Bareng Tim</Text>
      <Text style={styles.subtitle}>Buat ruangan untuk satu misi, bagikan kode 6 karakter, lalu selesaikan objektif bersama. Butuh akun cloud agar progres tim tersimpan di server.</Text>
      <View style={[ui.card, { borderColor: `${C.gold}55` }]}>
        <Text style={ui.title}>Akun cloud diperlukan</Text>
        <Text style={[ui.body, { marginTop: 6 }]}>Masuk/daftar lewat menu Profil &amp; Akun. Setelah login, ruangan co-op dan papan peringkat otomatis aktif.</Text>
      </View>
    </View>;
  }

  const mission = room ? missionOf(room.missionId) : null;
  return <View>
    <Text style={styles.eyebrow}>MULTIPLAYER CO-OP</Text>
    <Text style={styles.title}>Join Bareng Tim</Text>
    <Text style={styles.subtitle}>Satu ruangan, satu misi: progres objektif semua anggota digabung di server. Disiplin Anda: {disciplineById(disciplineId).icon} {disciplineById(disciplineId).name}.</Text>
    <Segmented options={[['room', 'Ruangan'], ['board', 'Papan Peringkat']]} value={tab} onChange={setTab} />
    {error ? <Text style={ui.error}>{error}</Text> : null}
    {notice ? <Text style={ui.success}>{notice}</Text> : null}

    {tab === 'board' ? <View>
      <Text style={[ui.eyebrow, { marginVertical: 8 }]}>PAPAN PERINGKAT CO-OP (KONTRIBUSI TIM)</Text>
      {boards.coop.length ? boards.coop.map((row) => {
        const discipline = DISCIPLINE_BY_ID[row.discipline] || disciplineById('civil');
        return <View key={row.userId} style={[ui.card, ui.row, { paddingVertical: 9 }]}>
          <Text style={styles.rank}>{row.rank}</Text>
          <Text style={{ fontSize: 18 }}>{discipline.icon}</Text>
          <View style={{ flex: 1 }}><Text style={[ui.title, { fontSize: 13 }]}>{row.name}</Text><Text style={ui.small}>{discipline.short} · {row.rooms} ruangan</Text></View>
          <Text style={{ color: C.gold, fontWeight: '900' }}>{formatNumber(row.points)}</Text>
        </View>;
      }) : <Text style={ui.body}>Belum ada kontribusi tim. Buat ruangan dan selesaikan misi bersama.</Text>}
      <Text style={[ui.eyebrow, { marginVertical: 8 }]}>PERINGKAT TWIN POINTS</Text>
      {boards.solo.length ? boards.solo.map((row) => <View key={row.userId} style={[ui.card, ui.row, { paddingVertical: 9 }]}>
        <Text style={styles.rank}>{row.rank}</Text>
        <View style={{ flex: 1 }}><Text style={[ui.title, { fontSize: 13 }]}>{row.name}</Text><Text style={ui.small}>Level {row.level}</Text></View>
        <Text style={{ color: C.cyan, fontWeight: '900' }}>{formatNumber(row.points)} TP</Text>
      </View>) : <Text style={ui.body}>Peringkat muncul setelah ada poin terkumpul.</Text>}
    </View> : null}

    {tab === 'room' && room ? <View style={[ui.card, { borderColor: `${C.cyan}66` }]}>
      <Text style={ui.eyebrow}>KODE RUANGAN — BAGIKAN KE TIM</Text>
      <Text selectable style={styles.code}>{room.code}</Text>
      <Text style={ui.small}>{mission?.title || room.missionId} · {room.members.length}/{room.maxPlayers} pemain</Text>
      <View style={[ui.row, { marginTop: 6, gap: 6 }]}>
        <Pill label={room.status === 'completed' ? 'MISI TUNTAS' : room.status === 'open' ? 'MENUNGGU TIM' : 'DITUTUP'} color={room.status === 'completed' ? C.green : room.status === 'open' ? C.gold : C.red} />
        <Pill label={`Reward +${room.rewardTp} TP · +${room.rewardXp} XP`} color={C.gold} />
      </View>
      <Text style={[ui.eyebrow, { marginTop: 12 }]}>ANGGOTA TIM</Text>
      {room.members.map((member) => {
        const discipline = DISCIPLINE_BY_ID[member.discipline] || disciplineById('civil');
        return <View key={member.userId} style={[ui.row, { justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line }]}>
          <Text style={[ui.body, { color: C.text, flex: 1 }]}>{discipline.icon} {member.name} <Text style={ui.small}>· {discipline.short}</Text>{member.claimed ? ' ✓' : ''}</Text>
          <Text style={[ui.small, { color: C.cyan }]}>{formatNumber(member.contribution)} kontribusi</Text>
        </View>;
      })}
      <Text style={[ui.eyebrow, { marginTop: 12 }]}>PROGRES OBJEKTIF BERSAMA</Text>
      {room.objectives.map((objective, index) => <View key={`${objective.event}-${index}`} style={{ marginTop: 6 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={[ui.small, { color: C.text }]}>{objective.label}</Text>
          <Text style={ui.small}>{objective.progress}/{objective.count}</Text>
        </View>
        <ProgressBar ratio={objective.progress / objective.count} color={objective.progress >= objective.count ? C.green : C.cyan} />
      </View>)}
      <View style={[ui.row, { marginTop: 12, gap: 8 }]}>
        {room.canClaim ? <View style={{ flex: 1 }}><Button label={`Klaim +${room.rewardTp} TP`} kind="gold" disabled={busy} onPress={claimReward} /></View> : null}
        <View style={{ flex: 1 }}><Button label="Keluar Ruangan" kind="ghost" disabled={busy} onPress={leaveRoom} /></View>
      </View>
      {room.claimed ? <Text style={[ui.small, { marginTop: 6, color: C.green }]}>Reward ruangan ini sudah Anda klaim.</Text> : null}
    </View> : null}

    {tab === 'room' && !room ? <View>
      <View style={ui.card}>
        <Text style={ui.eyebrow}>BUAT RUANGAN BARU</Text>
        <Text style={[ui.small, { marginTop: 4 }]}>Pilih misi, lalu bagikan kode ruangan ke teman.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          {missionOptions.map((option) => {
            const active = missionId === option.id;
            return <TouchableOpacity key={option.id} onPress={() => setMissionId(option.id)} style={[styles.missionChip, active && styles.missionChipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
              <Text style={[styles.missionTitle, active && { color: C.cyan }]} numberOfLines={1}>{option.title}</Text>
              <Text style={styles.missionMeta}>{option.objectives.map((objective) => `${objective.count}× ${objective.label || objective.event}`).join(' · ')}</Text>
            </TouchableOpacity>;
          })}
        </ScrollView>
        <Button label={busy ? 'Membuat…' : 'Buat Ruangan Co-op'} disabled={busy} onPress={createRoom} />
      </View>
      <View style={ui.card}>
        <Text style={ui.eyebrow}>GABUNG DENGAN KODE</Text>
        <TextInput value={code} onChangeText={(value) => setCode(value.toUpperCase())} placeholder="Contoh: K7M2PQ" placeholderTextColor="#68809b" autoCapitalize="characters" autoCorrect={false} maxLength={6} style={[ui.input, { letterSpacing: 4, fontWeight: '900', fontSize: 18 }]} />
        <Button label={busy ? 'Menghubungkan…' : 'Gabung ke Ruangan'} kind="gold" disabled={busy || code.trim().length < 4} onPress={joinRoom} />
      </View>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: '#7cf5ff', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: C.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 4, marginBottom: 10 },
  code: { color: C.gold, fontSize: 34, fontWeight: '900', letterSpacing: 8, marginVertical: 4 },
  rank: { color: C.gold, fontSize: 13, fontWeight: '900', width: 22 },
  missionChip: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.03)', maxWidth: 200 },
  missionChipActive: { borderColor: C.cyan, backgroundColor: `${C.cyan}1a` },
  missionTitle: { color: C.text, fontSize: 12, fontWeight: '800' },
  missionMeta: { color: C.muted, fontSize: 9.5, marginTop: 2 },
});
