import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, STATUS, needsManualStart, progressRatio, remainingSeconds } from '../engine/missionEngine';
import { ZONES } from '../engine/worldRules';
import { Button, C, Pill, ProgressBar, STATUS_COLOR, STATUS_LABEL, Segmented, formatNumber, ui } from './gameUi';

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const zoneName = (id) => ZONES.find((z) => z.id === id)?.name;

function MissionCard({ mission, info, claim, onStart, inGame }) {
  const { status, reason, entry } = info;
  const color = STATUS_COLOR[status];
  const left = remainingSeconds(mission, entry);
  const ratio = status === STATUS.COMPLETED ? 1 : progressRatio(mission, entry);
  const multiplier = mission.multiplier && mission.multiplier !== 1 ? ` ×${mission.multiplier}` : '';
  return <View style={[ui.card, status === STATUS.LOCKED && { opacity: 0.6 }, status === STATUS.ACTIVE && { borderColor: `${C.gold}55` }]}>
    <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.small}>{mission.id.toUpperCase()} · {CATEGORY_LABEL[mission.category]}{mission.chapter ? ` · Bab ${mission.chapter}` : ''} · {DIFFICULTY_LABEL[mission.difficulty] || mission.difficulty}</Text>
        <Text style={[ui.title, { marginTop: 2 }]}>{mission.title}</Text>
      </View>
      <Pill label={STATUS_LABEL[status]} color={color} />
    </View>
    <Text style={[ui.body, { marginTop: 6 }]}>{mission.description}</Text>
    {mission.objectives.map((objective, index) => {
      const value = status === STATUS.COMPLETED ? objective.count : Math.min(objective.count, entry?.progress?.[index] || 0);
      return <View key={index} style={{ marginTop: 8 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.small}>{objective.label || objective.event}</Text>
          <Text style={[ui.small, { color: C.text, fontWeight: '800' }]}>{objective.time ? `${fmtTime(value)} / ${fmtTime(objective.count)}` : `${value} / ${objective.count}`}</Text>
        </View>
      </View>;
    })}
    <View style={{ marginTop: 6 }}><ProgressBar ratio={ratio} color={color} /></View>
    <View style={[ui.row, { justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap' }]}>
      <Text style={[ui.small, { color: C.gold, fontWeight: '800' }]}>🏆 {formatNumber(mission.rewardTp)} TP{multiplier} · {formatNumber(mission.rewardXp)} XP</Text>
      <Text style={ui.small}>
        {mission.startZone ? `📍 ${zoneName(mission.startZone) || mission.startZone}` : ''}
        {mission.timeLimitSec ? `  ⏱ ${left != null ? `sisa ${fmtTime(left)}` : `${Math.round(mission.timeLimitSec / 60)} menit`}` : ''}
      </Text>
    </View>
    {status === STATUS.LOCKED && reason ? <Text style={[ui.small, { marginTop: 6 }]}>🔒 {reason}</Text> : null}
    {status === STATUS.FAILED ? <Text style={[ui.small, { marginTop: 6, color: C.red }]}>✖ {entry?.failReason || 'Misi gagal'}</Text> : null}
    {status === STATUS.COMPLETED && claim ? <Text style={[ui.small, { marginTop: 6, color: claim.status === 'rejected' ? C.red : C.gold }]}>
      {claim.status === 'rejected' ? `Reward ditolak server: ${claim.error}` : '⏳ Menunggu validasi reward di server…'}
    </Text> : null}
    {status === STATUS.COMPLETED && !claim && mission.category === 'campaign' ? <Text style={[ui.small, { marginTop: 6, color: C.green }]}>✓ Reward tervalidasi</Text> : null}
    {(status === STATUS.AVAILABLE && needsManualStart(mission)) || status === STATUS.FAILED ? <View style={{ marginTop: 10 }}>
      <Button label={status === STATUS.FAILED ? 'Coba lagi' : mission.triggersStorm ? 'Mulai (badai dimulai)' : 'Mulai misi'} kind="gold" small onPress={() => onStart(mission.id)} />
      {!inGame ? <Text style={[ui.small, { marginTop: 4 }]}>Timer berjalan setelah kamu menekan Mulai.</Text> : null}
    </View> : null}
  </View>;
}

export default function MissionCenter({ twin, inGame = false }) {
  const [tab, setTab] = useState('campaign');
  const [, setNow] = useState(0);
  useEffect(() => { const t = setInterval(() => setNow((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const list = twin.missions.filter((m) => m.category === tab).sort((a, b) => (a.chapter || 0) - (b.chapter || 0) || a.sort - b.sort);
  const campaign = twin.missions.filter((m) => m.category === 'campaign');
  const done = campaign.filter((m) => twin.statusOf(m).status === STATUS.COMPLETED).length;
  const claimFor = (id) => twin.pendingClaims.find((c) => c.missionId === id);
  let lastChapter = null;

  return <View>
    <Text style={ui.eyebrow}>TWINI: MONAS SURVIVAL ADVENTURE · {done}/{campaign.length} CAMPAIGN</Text>
    <Text style={ui.h1}>Mission Center</Text>
    <Text style={[ui.body, { marginTop: 4 }]}>Explore. Survive. Learn. Build the Future. Misi aktif berjalan otomatis; misi berwaktu dimulai saat kamu menekan Mulai.</Text>
    {!twin.session ? <Text style={[ui.success, { color: C.gold, backgroundColor: '#2b2410' }]}>Kamu bermain tanpa akun cloud. Progres tersimpan di perangkat dan Twin Points akan divalidasi setelah kamu masuk di Twin Hub → Akun.</Text> : null}
    <Segmented options={[['campaign', 'Campaign'], ['daily', 'Harian'], ['weekly', 'Mingguan'], ['special', 'Event']]} value={tab} onChange={setTab} />
    {list.map((mission) => {
      const header = tab === 'campaign' && mission.chapter !== lastChapter ? (lastChapter = mission.chapter, <Text key={`h${mission.chapter}`} style={[ui.eyebrow, { marginTop: 8, marginBottom: 6, color: C.gold }]}>CHAPTER {mission.chapter} · {String(mission.chapterTitle || '').toUpperCase()}</Text>) : null;
      return <React.Fragment key={mission.id}>{header}<MissionCard mission={mission} info={twin.statusOf(mission)} claim={claimFor(mission.id)} onStart={twin.startMission} inGame={inGame} /></React.Fragment>;
    })}
    {!list.length ? <Text style={ui.body}>Belum ada misi di kategori ini.</Text> : null}
  </View>;
}
