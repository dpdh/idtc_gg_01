import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import glbModels from '../../library/data/glbModels';
import { gameApi, getBaseUrl, setBaseUrl } from '../services/gameApi';
import { Button, C, Pill, ProgressBar, RARITY_COLOR, RARITY_LABEL, REDEMPTION_LABEL, Segmented, formatNumber, ui } from './gameUi';

const date = (s) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const TX_LABEL = { earn: 'Diperoleh', spend: 'Dibelanjakan', refund: 'Dikembalikan', expire: 'Kedaluwarsa', adjust: 'Penyesuaian admin' };
const SOURCE_LABEL = { 'mission:campaign': 'Misi campaign', 'mission:daily': 'Misi harian', 'mission:weekly': 'Misi mingguan', 'mission:special': 'Event spesial', daily_checkin: 'Login harian', redemption: 'Penukaran hadiah', redemption_cancel: 'Pembatalan penukaran', asset_upgrade: 'Upgrade aset', expiry: 'Masa berlaku habis', admin: 'Admin' };

function NeedAccount({ onOpen }) {
  return <View style={ui.card}><Text style={ui.title}>Masuk ke akun cloud</Text><Text style={[ui.body, { marginVertical: 6 }]}>Twin Points dihitung dan divalidasi oleh server. Masuk atau daftar untuk melihat saldo dan menukar hadiah.</Text><Button label="Buka Akun Cloud" onPress={onOpen} /></View>;
}

function WalletSection({ twin, goAccount }) {
  if (!twin.session) return <NeedAccount onOpen={goAccount} />;
  const pending = twin.pendingClaims.filter((c) => c.status === 'pending').length;
  return <View>
    <View style={[ui.card, { borderColor: `${C.gold}55` }]}>
      <Text style={ui.eyebrow}>TWIN POINTS WALLET</Text>
      <Text style={{ color: C.gold, fontSize: 34, fontWeight: '900', marginTop: 4 }}>{formatNumber(twin.wallet.balance)} <Text style={{ fontSize: 16 }}>TP</Text></Text>
      <Text style={ui.small}>Total diperoleh: {formatNumber(twin.profile?.lifetimeEarned)} TP · Poin berlaku 365 hari (FIFO)</Text>
      {pending ? <Text style={[ui.small, { color: C.gold, marginTop: 4 }]}>⏳ {pending} klaim misi menunggu validasi server</Text> : null}
      <View style={{ marginTop: 10 }}><Button label="Muat ulang" kind="ghost" small onPress={twin.refreshProfile} /></View>
    </View>
    <Text style={[ui.eyebrow, { marginVertical: 8 }]}>RIWAYAT TRANSAKSI</Text>
    {twin.wallet.transactions.map((t) => <View key={t.id} style={[ui.card, ui.row, { justifyContent: 'space-between', paddingVertical: 10 }]}>
      <View style={{ flex: 1 }}><Text style={[ui.title, { fontSize: 13 }]}>{SOURCE_LABEL[t.source] || t.source}{t.ref ? ` · ${t.ref}` : ''}</Text><Text style={ui.small}>{TX_LABEL[t.type]} · {date(t.createdAt)}</Text></View>
      <Text style={{ color: t.amount > 0 ? C.green : C.red, fontWeight: '900' }}>{t.amount > 0 ? '+' : ''}{formatNumber(t.amount)}</Text>
    </View>)}
    {!twin.wallet.transactions.length ? <Text style={ui.body}>Belum ada transaksi. Selesaikan misi untuk mendapatkan Twin Points.</Text> : null}
  </View>;
}

function StoreSection({ twin, goAccount }) {
  const [products, setProducts] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [delivery, setDelivery] = useState({ name: '', phone: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setProducts((await gameApi.products()).products);
      if (twin.session?.token) setRedemptions((await gameApi.redemptions(twin.session.token)).redemptions);
    } catch (e) { setError(e.message); }
  }, [twin.session?.token]);
  useEffect(() => { load(); }, [load]);

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const r = await twin.redeem(selected.id, selected.kind === 'merch' ? delivery : undefined);
      setResult(r); setSelected(null); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return <View>
    <Text style={[ui.body, { marginBottom: 8 }]}>Saldo: <Text style={{ color: C.gold, fontWeight: '900' }}>{formatNumber(twin.wallet.balance)} TP</Text>. Setiap penukaran diproses dan dipotong oleh server.</Text>
    {error && !selected ? <Text style={ui.error}>{error}</Text> : null}
    {result ? <View style={[ui.card, { borderColor: `${C.green}66` }]}>
      <Text style={ui.title}>Penukaran berhasil · {result.reference}</Text>
      <Text style={ui.body}>Status: {REDEMPTION_LABEL[result.status]}</Text>
      {result.voucherCode ? <Text selectable style={{ color: C.gold, fontSize: 20, fontWeight: '900', marginTop: 6 }}>{result.voucherCode}</Text> : null}
      {result.status === 'PENDING' ? <Text style={ui.small}>Penukaran sedang direview admin sebelum diproses.</Text> : null}
      <View style={{ marginTop: 8 }}><Button label="Tutup" kind="ghost" small onPress={() => setResult(null)} /></View>
    </View> : null}
    {!products ? <ActivityIndicator color={C.cyan} /> : ['digital', 'merch'].map((cat) => <View key={cat}>
      <Text style={[ui.eyebrow, { marginVertical: 8 }]}>{cat === 'digital' ? 'HADIAH DIGITAL' : 'MERCHANDISE FISIK'}</Text>
      {products.filter((p) => p.category === cat).map((p) => {
        const owned = redemptions.filter((r) => r.productId === p.id && r.status !== 'CANCELLED').length;
        const canAfford = twin.wallet.balance >= p.priceTp;
        const available = p.availability === 'available' && owned < p.redemptionLimit;
        return <View key={p.id} style={[ui.card, ui.row]}>
          <Text style={{ fontSize: 28 }}>{p.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[ui.title, { fontSize: 14 }]}>{p.name}</Text>
            <Text style={ui.small}>{p.description} · Stok {formatNumber(p.stock)} · Limit {owned}/{p.redemptionLimit}</Text>
            <Text style={{ color: C.gold, fontWeight: '900', marginTop: 2 }}>{formatNumber(p.priceTp)} TP</Text>
          </View>
          <Button small label={p.availability === 'out_of_stock' ? 'Habis' : owned >= p.redemptionLimit ? 'Limit' : twin.session && !canAfford ? 'TP kurang' : 'Tukar'} disabled={!available || (twin.session && !canAfford)}
            onPress={() => (twin.session ? (setSelected(p), setError(null)) : goAccount())} />
        </View>;
      })}
    </View>)}
    {twin.session ? <>
      <Text style={[ui.eyebrow, { marginVertical: 8 }]}>RIWAYAT PENUKARAN</Text>
      {redemptions.map((r) => <View key={r.id} style={ui.card}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.title, { fontSize: 13, flex: 1 }]}>{r.productIcon} {r.productName}</Text><Pill label={REDEMPTION_LABEL[r.status]} color={r.status === 'CANCELLED' ? C.red : ['DELIVERED', 'REDEEMED'].includes(r.status) ? C.green : C.gold} /></View>
        <Text style={ui.small}>{r.reference} · {formatNumber(r.priceTp)} TP · {date(r.createdAt)}</Text>
        {r.voucherCode ? <Text selectable style={{ color: C.gold, fontWeight: '900', marginTop: 4 }}>Kode: {r.voucherCode}</Text> : null}
      </View>)}
      {!redemptions.length ? <Text style={ui.body}>Belum ada penukaran.</Text> : null}
    </> : null}
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,6,14,0.78)', justifyContent: 'center', padding: 16 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={[ui.card, { maxWidth: 440, width: '100%', alignSelf: 'center' }]}>
            <Text style={ui.eyebrow}>KONFIRMASI PENUKARAN</Text>
            <Text style={[ui.title, { marginTop: 4 }]}>{selected?.icon} {selected?.name}</Text>
            <Text style={ui.body}>Harga {formatNumber(selected?.priceTp)} TP · saldo setelah tukar {formatNumber(twin.wallet.balance - (selected?.priceTp || 0))} TP</Text>
            <Text style={[ui.small, { marginTop: 4 }]}>{selected?.deliveryInfo}</Text>
            {selected?.kind === 'merch' ? <View style={{ marginTop: 10 }}>
              <Text style={ui.label}>Nama penerima</Text><TextInput style={ui.input} value={delivery.name} onChangeText={(name) => setDelivery((d) => ({ ...d, name }))} autoComplete="name" />
              <Text style={ui.label}>Nomor telepon</Text><TextInput style={ui.input} value={delivery.phone} onChangeText={(phone) => setDelivery((d) => ({ ...d, phone }))} keyboardType="phone-pad" autoComplete="tel" />
              <Text style={ui.label}>Alamat lengkap</Text><TextInput style={[ui.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline value={delivery.address} onChangeText={(address) => setDelivery((d) => ({ ...d, address }))} autoComplete="street-address" />
            </View> : null}
            {error ? <Text style={ui.error}>{error}</Text> : null}
            <View style={[ui.row, { marginTop: 10 }]}>
              <View style={{ flex: 1 }}><Button label="Batal" kind="ghost" onPress={() => setSelected(null)} /></View>
              <View style={{ flex: 1 }}><Button label={busy ? 'Memproses…' : 'Konfirmasi'} kind="gold" disabled={busy} onPress={confirm} /></View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

function LeaderboardSection({ twin }) {
  const [period, setPeriod] = useState('weekly');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { setRows(null); gameApi.leaderboard(period).then((r) => setRows(r.leaderboard)).catch((e) => { setError(e.message); setRows([]); }); }, [period]);
  return <View>
    <Segmented options={[['weekly', 'Mingguan'], ['all', 'Sepanjang masa']]} value={period} onChange={setPeriod} />
    {error ? <Text style={ui.error}>{error}</Text> : null}
    {!rows ? <ActivityIndicator color={C.cyan} /> : rows.map((r) => {
      const me = r.userId === twin.session?.user?.id;
      return <View key={r.userId} style={[ui.card, ui.row, me && { borderColor: `${C.cyan}88` }]}>
        <Text style={{ color: r.rank <= 3 ? C.gold : C.muted, fontWeight: '900', width: 34, fontSize: 16 }}>{['🥇', '🥈', '🥉'][r.rank - 1] || `#${r.rank}`}</Text>
        <View style={{ flex: 1 }}><Text style={ui.title}>{r.name}{me ? ' (kamu)' : ''}</Text><Text style={ui.small}>Level {r.level}</Text></View>
        <Text style={{ color: C.gold, fontWeight: '900' }}>{formatNumber(r.points)} TP</Text>
      </View>;
    })}
    {rows && !rows.length && !error ? <Text style={ui.body}>Belum ada pemain di periode ini.</Text> : null}
  </View>;
}

function AssetsSection({ twin, navigation, goAccount }) {
  const [category, setCategory] = useState('Semua');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const categories = ['Semua', ...new Set(twin.assets.map((a) => a.category))];
  const levels = Object.fromEntries((twin.profile?.assets || []).map((a) => [a.assetId, a.level]));
  const list = twin.assets.filter((a) => category === 'Semua' || a.category === category);
  const owned = twin.assets.filter((a) => twin.ownedAssetIds.has(a.id)).length;

  const preview = async (asset) => {
    const bundled = asset.modelRef && glbModels.find((m) => m.id === asset.modelRef);
    if (bundled) return navigation?.navigate('Viewer', { model: bundled });
    if (asset.modelUrl) {
      const base = await getBaseUrl();
      return navigation?.navigate('Viewer', { model: { id: asset.id, name: asset.name, description: asset.description, uri: `${base || ''}${asset.modelUrl}` } });
    }
    setMessage(`${asset.name} belum memiliki model 3D. Admin dapat mengunggah GLB di dashboard.`);
  };
  const upgrade = async (asset) => {
    if (!twin.session) return goAccount();
    setBusy(asset.id); setMessage(null);
    try { const r = await twin.upgradeAsset(asset.id); setMessage(`${asset.name} naik ke level ${r.level} (−${formatNumber(r.cost)} TP)`); }
    catch (e) { setMessage(e.message); } finally { setBusy(null); }
  };

  return <View>
    <Text style={ui.body}>Koleksi: <Text style={{ color: C.cyan, fontWeight: '900' }}>{owned}/{twin.assets.length}</Text> aset Digital Twin. Temukan aset dengan memindai objek di dunia atau menyelesaikan misi.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
      {categories.map((c) => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[ui.pill, { marginRight: 6, paddingVertical: 5, paddingHorizontal: 10, borderColor: category === c ? C.cyan : C.line }]}><Text style={[ui.pillText, { color: category === c ? C.cyan : C.muted }]}>{c}</Text></TouchableOpacity>)}
    </ScrollView>
    {message ? <Text style={ui.success}>{message}</Text> : null}
    {list.map((a) => {
      const has = twin.ownedAssetIds.has(a.id);
      const level = levels[a.id] || (has ? 1 : 0);
      const color = RARITY_COLOR[a.rarity];
      const hint = a.discovery?.mission ? `Hadiah misi ${a.discovery.mission}` : a.discovery?.objects ? `Pindai ${a.discovery.objects.length} objek terkait di dunia` : '';
      return <View key={a.id} style={[ui.card, { borderColor: has ? `${color}66` : C.line, opacity: has ? 1 : 0.7 }]}>
        <View style={ui.row}>
          <Text style={{ fontSize: 30 }}>{has ? a.icon : '❔'}</Text>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { flexWrap: 'wrap' }]}><Text style={[ui.title, { fontSize: 14 }]}>{a.name}</Text><Pill label={RARITY_LABEL[a.rarity]} color={color} /></View>
            <Text style={ui.small}>{a.category} · {has ? `Level ${level}/${a.maxLevel}` : `Belum ditemukan · ${hint}`}</Text>
          </View>
        </View>
        <Text style={[ui.body, { marginTop: 6 }]}>{a.description}</Text>
        <Text style={[ui.small, { marginTop: 4 }]}>Properti: {Object.entries(a.properties || {}).map(([k, v]) => `${k} +${v * Math.max(1, level)}`).join(' · ') || '–'}{a.placement?.footprint ? ` · Penempatan ${a.placement.footprint.join('×')}` : ''}</Text>
        {has ? <View style={[ui.row, { marginTop: 8 }]}>
          <Button small kind="ghost" label="Pratinjau 3D" onPress={() => preview(a)} />
          {twin.session && level >= 1 && level < a.maxLevel ? <Button small kind="gold" disabled={busy === a.id} label={`Upgrade · ${formatNumber(a.upgradeCostTp * level)} TP`} onPress={() => upgrade(a)} /> : null}
          {level >= a.maxLevel ? <Pill label="LEVEL MAKS" color={C.green} /> : null}
        </View> : null}
      </View>;
    })}
  </View>;
}

function ProfileSection({ twin, stats, goAccount }) {
  const p = twin.profile;
  const campaign = twin.missions.filter((m) => m.category === 'campaign');
  const done = campaign.filter((m) => twin.completedSet.has(m.id)).length;
  return <View>
    {!twin.session ? <NeedAccount onOpen={goAccount} /> : <View style={ui.card}>
      <Text style={ui.eyebrow}>PLAYER PROFILE</Text>
      <Text style={[ui.h1, { fontSize: 22 }]}>{twin.session.user.fullName}</Text>
      <Text style={ui.small}>{twin.session.user.email}</Text>
      <View style={[ui.row, { marginTop: 10, justifyContent: 'space-between' }]}><Text style={ui.title}>Level {p?.level || 1}</Text><Text style={ui.small}>{formatNumber(p?.xp)} / {formatNumber(p?.xpForNext || 100)} XP</Text></View>
      <View style={{ marginTop: 6 }}><ProgressBar ratio={p ? (p.xp - p.xpForLevel) / Math.max(1, p.xpForNext - p.xpForLevel) : 0} color={C.purple} height={8} /></View>
      <View style={[ui.row, { marginTop: 12, justifyContent: 'space-around' }]}>
        {[['Twin Points', formatNumber(twin.wallet.balance), C.gold], ['Login streak', `${p?.streak || 0} 🔥`, C.red], ['Koleksi', `${twin.ownedAssetIds.size}/${twin.assets.length}`, C.cyan]].map(([l, v, c]) => <View key={l} style={{ alignItems: 'center' }}><Text style={{ color: c, fontWeight: '900', fontSize: 18 }}>{v}</Text><Text style={ui.small}>{l}</Text></View>)}
      </View>
    </View>}
    <View style={ui.card}>
      <Text style={ui.eyebrow}>ACHIEVEMENT BADGES</Text>
      <View style={[ui.row, { flexWrap: 'wrap', marginTop: 8 }]}>{(p?.badges || []).map((b) => <View key={b.id} style={[ui.pill, { borderColor: `${C.gold}66`, paddingVertical: 6 }]}><Text style={{ color: C.gold, fontWeight: '800' }}>{b.icon} {b.name}</Text></View>)}</View>
      {!(p?.badges || []).length ? <Text style={ui.body}>Selesaikan satu chapter campaign untuk badge pertama.</Text> : null}
    </View>
    <View style={ui.card}>
      <Text style={ui.eyebrow}>SURVIVAL STATISTICS</Text>
      {[['Campaign selesai', `${done}/${campaign.length}`], ['Waktu bertahan sesi ini', `${Math.floor((stats?.survivalSeconds || 0) / 60)} menit`], ['Objek dipindai', Object.values(twin.objectState).filter((o) => o.scanned).length], ['Objek tersinkron', Object.values(twin.objectState).filter((o) => o.synced).length], ['Misi berjalan', twin.activeMissions.length]].map(([l, v]) => <View key={l} style={[ui.row, { justifyContent: 'space-between', marginTop: 6 }]}><Text style={ui.body}>{l}</Text><Text style={[ui.title, { fontSize: 13 }]}>{v}</Text></View>)}
    </View>
    {p?.claims?.length ? <View style={ui.card}>
      <Text style={ui.eyebrow}>MISSION HISTORY</Text>
      {p.claims.slice(0, 15).map((c) => <View key={`${c.missionId}-${c.period}`} style={[ui.row, { justifyContent: 'space-between', marginTop: 6 }]}><Text style={ui.body}>{twin.missions.find((m) => m.id === c.missionId)?.title || c.missionId}</Text><Text style={ui.small}>+{c.tp} TP · {date(c.at)}</Text></View>)}
    </View> : null}
    <View style={ui.card}><Text style={ui.eyebrow}>FRIENDS & TEAMS</Text><Text style={[ui.body, { marginTop: 4 }]}>Mode kooperatif tim 3–5 pemain dan daftar teman hadir di Phase 2 (butuh layanan real-time).</Text></View>
  </View>;
}

function AccountSection({ twin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { getBaseUrl().then((u) => setUrl(u || '')); }, []);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === 'login') await twin.login(form.email, form.password);
      else await twin.register(form.email, form.password, form.fullName);
      setMsg({ ok: true, text: 'Terhubung. Klaim misi yang tertunda sedang dikirim ke server.' });
      twin.refreshContent();
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };
  const saveUrl = async () => {
    try { await setBaseUrl(url); setMsg({ ok: true, text: 'URL server disimpan.' }); twin.refreshContent(); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const rejected = twin.pendingClaims.filter((c) => c.status === 'rejected');

  return <View>
    <View style={ui.card}>
      <Text style={ui.eyebrow}>STATUS SERVER</Text>
      <Text style={[ui.title, { marginTop: 4, color: twin.online ? C.green : twin.online === false ? C.red : C.muted }]}>{twin.online ? '● Online' : twin.online === false ? '● Offline: progres disimpan lokal' : '● Memeriksa…'}</Text>
      {Platform.OS !== 'web' ? <>
        <Text style={[ui.label, { marginTop: 10 }]}>URL server game (HTTPS)</Text>
        <TextInput style={ui.input} value={url} onChangeText={setUrl} placeholder="https://twini.example.org" placeholderTextColor="#5d7088" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Button label="Simpan URL" kind="ghost" small onPress={saveUrl} />
      </> : null}
    </View>
    {twin.session ? <View style={ui.card}>
      <Text style={ui.eyebrow}>AKUN CLOUD</Text>
      <Text style={[ui.title, { marginTop: 4 }]}>{twin.session.user.fullName}</Text>
      <Text style={ui.small}>{twin.session.user.email}</Text>
      <Text style={[ui.small, { marginTop: 6 }]}>Klaim tertunda: {twin.pendingClaims.filter((c) => c.status === 'pending').length}</Text>
      <View style={[ui.row, { marginTop: 10 }]}><Button small kind="ghost" label="Sinkronkan sekarang" onPress={twin.flush} /><Button small kind="danger" label="Keluar" onPress={twin.logout} /></View>
    </View> : <View style={ui.card}>
      <Segmented options={[['login', 'Masuk'], ['register', 'Daftar']]} value={mode} onChange={setMode} />
      {mode === 'register' ? <><Text style={ui.label}>Nama lengkap</Text><TextInput style={ui.input} value={form.fullName} onChangeText={(fullName) => setForm((f) => ({ ...f, fullName }))} autoComplete="name" /></> : null}
      <Text style={ui.label}>Email</Text><TextInput style={ui.input} value={form.email} onChangeText={(email) => setForm((f) => ({ ...f, email }))} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Text style={ui.label}>Password (min. 8 karakter)</Text><TextInput style={ui.input} value={form.password} onChangeText={(password) => setForm((f) => ({ ...f, password }))} secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'} />
      <Button label={busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'} disabled={busy} onPress={submit} />
      <Text style={[ui.small, { marginTop: 8 }]}>Saat kamu login di aplikasi TWINI, akun cloud dengan email & password yang sama dibuat/dihubungkan otomatis.</Text>
    </View>}
    {msg ? <Text style={msg.ok ? ui.success : ui.error}>{msg.text}</Text> : null}
    {rejected.length ? <View style={ui.card}>
      <Text style={ui.eyebrow}>KLAIM DITOLAK SERVER</Text>
      {rejected.map((c) => <Text key={c.idempotencyKey} style={[ui.small, { marginTop: 4 }]}>{c.missionId}: {c.error}</Text>)}
      <View style={{ marginTop: 8 }}><Button small kind="ghost" label="Hapus dari daftar" onPress={twin.retryRejected} /></View>
    </View> : null}
  </View>;
}

export const HUB_SECTIONS = [['wallet', 'Wallet'], ['store', 'Rewards'], ['leaderboard', 'Leaderboard'], ['assets', 'Aset'], ['profile', 'Profil'], ['account', 'Akun']];

export default function TwinHub({ twin, section, onSection, navigation, stats }) {
  const goAccount = () => onSection('account');
  const props = { twin, goAccount, navigation, stats };
  return <View>
    <Text style={ui.eyebrow}>TWIN HUB · {twin.session ? `${formatNumber(twin.wallet.balance)} TP` : 'MODE OFFLINE'}</Text>
    <Text style={ui.h1}>{HUB_SECTIONS.find(([id]) => id === section)?.[1]}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
      {HUB_SECTIONS.map(([id, label]) => <TouchableOpacity key={id} onPress={() => onSection(id)} style={[ui.pill, { marginRight: 6, paddingVertical: 6, paddingHorizontal: 12, borderColor: section === id ? C.cyan : C.line, backgroundColor: section === id ? `${C.cyan}18` : 'transparent' }]} accessibilityRole="tab" accessibilityState={{ selected: section === id }}>
        <Text style={[ui.pillText, { fontSize: 11.5, color: section === id ? C.cyan : C.muted }]}>{label}</Text>
      </TouchableOpacity>)}
    </ScrollView>
    {section === 'wallet' ? <WalletSection {...props} /> : null}
    {section === 'store' ? <StoreSection {...props} /> : null}
    {section === 'leaderboard' ? <LeaderboardSection {...props} /> : null}
    {section === 'assets' ? <AssetsSection {...props} /> : null}
    {section === 'profile' ? <ProfileSection {...props} /> : null}
    {section === 'account' ? <AccountSection {...props} /> : null}
  </View>;
}
