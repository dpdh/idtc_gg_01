// Game state manager: mission progress, world object state, offline save, cloud account,
// and a persistent queue of reward claims that is flushed to the backend when online.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import content from '../data/gameContent.json';
import { gameApi, GameApiError, makeKey } from '../services/gameApi';
import { cloudRegister, cloudSignIn, cloudSignOut, getCloudSession, onCloudSessionChange } from '../services/cloudAccount';
import * as engine from '../engine/missionEngine';

const SAVE_PREFIX = '@twini/game/v1/';
const MISSION_CACHE = '@twini/missions-cache/v1';
const FLUSH_INTERVAL = 30000;

export default function useTwinGame({ userKey = 'guest', onMissionComplete, onNotice, onEvent } = {}) {
  const [ready, setReady] = useState(false);
  const [missions, setMissions] = useState(content.missions);
  const [assets, setAssets] = useState(content.assets);
  const [missionState, setMissionState] = useState(engine.createMissionState);
  const [objectState, setObjectState] = useState({});
  const [pendingClaims, setPendingClaims] = useState([]);
  const [pendingDiscoveries, setPendingDiscoveries] = useState([]);
  const [localAssets, setLocalAssets] = useState([]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [online, setOnline] = useState(null);
  const [savedExtra, setSavedExtra] = useState(null);
  const [tick, setTick] = useState(0);

  const refs = useRef({});
  refs.current = { missions, missionState, objectState, pendingClaims, pendingDiscoveries, localAssets, session, profile, onMissionComplete, onNotice, onEvent };
  const extraRef = useRef(null);
  const flushing = useRef(false);

  const notice = (text) => refs.current.onNotice?.(text);
  const completedSet = useMemo(() => engine.completedCampaignIds(missionState, profile?.completedMissions || []), [missionState, profile]);

  // ---------- load ----------
  useEffect(() => {
    let alive = true;
    setReady(false);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_PREFIX + userKey);
        const saved = raw ? JSON.parse(raw) : null;
        if (!alive) return;
        setMissionState(saved?.missionState || engine.createMissionState());
        setObjectState(saved?.objectState || {});
        setPendingClaims(saved?.pendingClaims || []);
        setPendingDiscoveries(saved?.pendingDiscoveries || []);
        setLocalAssets(saved?.localAssets || []);
        setSavedExtra(saved?.extra || null);
        extraRef.current = saved?.extra || null;
        const cached = await AsyncStorage.getItem(MISSION_CACHE);
        if (cached && alive) setMissions(JSON.parse(cached));
      } catch { /* corrupt save: start fresh */ }
      const stored = await getCloudSession();
      if (alive) { setSession(stored); setReady(true); }
    })();
    return () => { alive = false; };
  }, [userKey]);

  useEffect(() => onCloudSessionChange(setSession), []);

  // Latest mission definitions & asset catalog from the server (admin edits apply without an app update).
  const refreshContent = useCallback(async () => {
    try {
      const [{ missions: serverMissions }, { assets: serverAssets }] = await Promise.all([gameApi.missions(), gameApi.assets()]);
      if (Array.isArray(serverMissions) && serverMissions.length) {
        setMissions(serverMissions);
        AsyncStorage.setItem(MISSION_CACHE, JSON.stringify(serverMissions)).catch(() => {});
      }
      if (Array.isArray(serverAssets) && serverAssets.length) setAssets(serverAssets);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);
  useEffect(() => { refreshContent(); }, [refreshContent]);

  // ---------- save (debounced) ----------
  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => {
      const payload = { missionState, objectState, pendingClaims, pendingDiscoveries, localAssets, extra: extraRef.current, savedAt: Date.now() };
      AsyncStorage.setItem(SAVE_PREFIX + userKey, JSON.stringify(payload)).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [ready, userKey, missionState, objectState, pendingClaims, pendingDiscoveries, localAssets, tick]);

  const saveExtra = useCallback((extra) => { extraRef.current = extra; setTick((t) => t + 1); }, []);

  // ---------- auto-activate & time limits ----------
  useEffect(() => {
    if (!ready) return;
    setMissionState((state) => engine.autoActivate(state, missions, completedSet));
  }, [ready, missions, completedSet]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setInterval(() => {
      setMissionState((state) => {
        const { state: next, failed } = engine.checkTimeLimits(state, refs.current.missions);
        failed.forEach((id) => notice(`Misi gagal: ${refs.current.missions.find((m) => m.id === id)?.title} (waktu habis). Coba lagi dari Mission Center.`));
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ready]);

  // ---------- cloud ----------
  const refreshProfile = useCallback(async () => {
    const current = refs.current.session;
    if (!current?.token) return null;
    try {
      const [p, w] = await Promise.all([gameApi.profile(current.token), gameApi.wallet(current.token)]);
      setProfile(p);
      setWallet({ balance: w.balance, transactions: w.transactions });
      setOnline(true);
      return p;
    } catch (error) {
      if (error.status === 401 || error.status === 403) { await cloudSignOut(); notice('Sesi akun cloud berakhir. Silakan masuk lagi.'); }
      else if (error.isNetwork) setOnline(false);
      return null;
    }
  }, []);

  const flush = useCallback(async () => {
    const current = refs.current.session;
    if (!current?.token || flushing.current) return;
    flushing.current = true;
    try {
      for (const claim of refs.current.pendingClaims.filter((c) => c.status === 'pending')) {
        try {
          const result = await gameApi.claim(current.token, claim.missionId, claim);
          setPendingClaims((list) => list.filter((c) => c.idempotencyKey !== claim.idempotencyKey));
          const title = refs.current.missions.find((m) => m.id === claim.missionId)?.title || claim.missionId;
          if (!result.replayed) notice(`+${result.tp} Twin Points tervalidasi · ${title}`);
        } catch (error) {
          if (error instanceof GameApiError && error.isNetwork) { setOnline(false); break; }
          if (error.status === 401) break;
          // 409 already claimed is a success from the player's point of view.
          const keep = error.status !== 409;
          setPendingClaims((list) => keep
            ? list.map((c) => (c.idempotencyKey === claim.idempotencyKey ? { ...c, status: 'rejected', error: error.message } : c))
            : list.filter((c) => c.idempotencyKey !== claim.idempotencyKey));
        }
      }
      for (const item of refs.current.pendingDiscoveries) {
        try {
          await gameApi.discover(current.token, item.assetId, { objectId: item.objectId });
          setPendingDiscoveries((list) => list.filter((d) => d !== item));
        } catch (error) {
          if (error.isNetwork) break;
          setPendingDiscoveries((list) => list.filter((d) => d !== item));
        }
      }
      setOnline(true);
    } finally {
      flushing.current = false;
    }
    await refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!session?.token) { setProfile(null); setWallet({ balance: 0, transactions: [] }); return undefined; }
    gameApi.checkin(session.token).then((r) => { if (!r.alreadyCheckedIn && r.tp) notice(`Login harian · streak ${r.streak} hari · +${r.tp} TP`); }).catch(() => {});
    flush();
    const timer = setInterval(flush, FLUSH_INTERVAL);
    return () => clearInterval(timer);
  }, [session?.token, flush]);

  useEffect(() => { if (session?.token && pendingClaims.some((c) => c.status === 'pending')) flush(); }, [pendingClaims.length, session?.token, flush]);

  // ---------- gameplay API ----------
  const queueClaims = (ids, state) => {
    const claims = ids.map((id) => {
      const mission = refs.current.missions.find((m) => m.id === id);
      const entry = state.entries[id];
      refs.current.onMissionComplete?.(mission);
      return { missionId: id, idempotencyKey: makeKey(), startedAt: new Date(entry.startedAt).toISOString(), completedAt: new Date(entry.completedAt).toISOString(), periodKey: entry.periodKey, status: 'pending' };
    });
    if (claims.length) setPendingClaims((list) => [...list, ...claims]);
  };

  const emit = useCallback((event) => {
    const { state, completed } = engine.applyEvent(refs.current.missionState, refs.current.missions, event);
    if (state !== refs.current.missionState) {
      refs.current.missionState = state;
      setMissionState(state);
    }
    if (completed.length) queueClaims(completed, state);
    // Co-op hook: the game screen forwards the same event to its multiplayer room.
    refs.current.onEvent?.(event);
    return completed;
  }, []);

  const startMission = useCallback((missionId) => {
    const mission = refs.current.missions.find((m) => m.id === missionId);
    if (!mission) return;
    setMissionState((state) => engine.startMission(state, mission));
    notice(`Misi dimulai: ${mission.title}`);
  }, []);

  const failMission = useCallback((missionId, reason) => {
    setMissionState((state) => engine.failMission(state, missionId, reason));
  }, []);

  const updateObject = useCallback((id, patch) => {
    setObjectState((state) => ({ ...state, [id]: { ...(state[id] || {}), ...patch } }));
  }, []);

  const discoverAsset = useCallback((assetId, objectId) => {
    if (!assetId || refs.current.localAssets.includes(assetId)) return false;
    setLocalAssets((list) => [...list, assetId]);
    setPendingDiscoveries((list) => [...list, { assetId, objectId }]);
    return true;
  }, []);

  const statusOf = useCallback((mission) => engine.missionStatus(missionState, mission, completedSet), [missionState, completedSet]);

  const activeMissions = useMemo(() => missions.filter((m) => statusOf(m).status === engine.STATUS.ACTIVE), [missions, statusOf]);
  const stormMission = activeMissions.find((m) => m.triggersStorm) || null;
  const trackedMission = activeMissions.find((m) => m.category === 'campaign') || activeMissions[0] || null;

  const ownedAssetIds = useMemo(() => new Set([...(profile?.assets || []).map((a) => a.assetId), ...localAssets]), [profile, localAssets]);

  // ---------- account & store ----------
  const login = useCallback(async (email, password) => { const s = await cloudSignIn(email, password); setSession(s); return s; }, []);
  const register = useCallback(async (email, password, fullName) => { const s = await cloudRegister(email, password, fullName); setSession(s); return s; }, []);
  const logout = useCallback(async () => { await cloudSignOut(); setSession(null); }, []);

  const redeem = useCallback(async (productId, delivery) => {
    if (!refs.current.session?.token) throw new GameApiError('Masuk ke akun cloud untuk menukar Twin Points.', { status: 401, code: 'unauthorized' });
    const result = await gameApi.redeem(refs.current.session.token, { productId, delivery, idempotencyKey: makeKey() });
    await refreshProfile();
    return result;
  }, [refreshProfile]);

  const upgradeAsset = useCallback(async (assetId) => {
    if (!refs.current.session?.token) throw new GameApiError('Masuk ke akun cloud untuk upgrade aset.', { status: 401, code: 'unauthorized' });
    const result = await gameApi.upgrade(refs.current.session.token, assetId, makeKey());
    await refreshProfile();
    return result;
  }, [refreshProfile]);

  const retryRejected = useCallback(() => {
    setPendingClaims((list) => list.filter((c) => c.status !== 'rejected'));
  }, []);

  return {
    ready, online, missions, assets, missionState, objectState, completedSet, statusOf, activeMissions, trackedMission, stormMission,
    emit, startMission, failMission, updateObject, discoverAsset, ownedAssetIds, savedExtra, saveExtra,
    session, profile, wallet, pendingClaims, refreshProfile, refreshContent, flush, login, register, logout, redeem, upgradeAsset, retryRejected,
  };
}
