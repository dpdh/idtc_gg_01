import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faArrowLeft, faArrowUp, faBars, faBatteryThreeQuarters, faBolt, faBoxOpen, faChevronRight, faCloudSun, faCompass, faCrosshairs, faCube, faDroplet, faGamepad, faGear, faHandSparkles, faHeart, faInfoCircle, faKey, faKitMedical, faLocationArrow, faMagnifyingGlassPlus, faMapLocationDot, faPlay, faPlus, faMinus, faRankingStar, faSearch, faShieldHeart, faStore, faTowerBroadcast, faTrophy, faUser, faVideo, faWallet, faWifi, faWind, faXmark } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import SurvivalWorldScene, { MONAS_TOWER_HALF, RUN_SPEED, WALK_SPEED } from '../components/SurvivalWorldScene';
import OpenStreetMapEmbed from '../../maps/components/OpenStreetMapEmbed';
import glbModels from '../../library/data/glbModels';
import { useAuth } from '../../auth/data/AuthContext';
import useTwinGame from '../../game/state/useTwinGame';
import { STATUS, progressRatio, remainingSeconds } from '../../game/engine/missionEngine';
import { OBJECT_TYPES, WEATHER_LABEL, WORLD_OBJECTS, ZONES, ambientWeatherAt, lightingFor, nearestInteractable, safeZoneAt, tickSurvival, timeOfDayAt, zoneAt } from '../../game/engine/worldRules';
import MissionCenter from '../../game/components/MissionCenter';
import TwinHub from '../../game/components/TwinHub';
import { MissionCompleteBanner, QuizPanel, ScanProgress, TwinInfoPanel } from '../../game/components/InteractionPanels';

const PLAYABLE_CHARACTERS = glbModels.filter(({ id }) => ['twini-idtc', 'insan-adhi', 'insan-adhi-w01', 'dni-01', 'dni-02'].includes(id));

const LANDMARKS = [
  { id: 'monas', name: 'Monumen Nasional', short: 'MONAS', position: [0, 7.5] },
  { id: 'medan', name: 'Medan Merdeka', short: 'MEDAN MERDEKA', position: [-7.5, -7.5] },
  { id: 'gambir', name: 'Stasiun Gambir', short: 'GAMBIR', position: [7, 6] },
  { id: 'museum', name: 'Museum Nasional', short: 'MUSEUM NASIONAL', position: [-7, 3] },
  { id: 'istiqlal', name: 'Masjid Istiqlal', short: 'ISTIQLAL', position: [6, -7] },
];
const PICKUPS = [[5, -7.5], [-7.5, 7.5], [7, 0], [-7, -5], [6.25, 7.5], [-2, -7], [8, 5], [-8, 0], [3, 8], [-6, 7]];
const PICKUP_RESPAWN_MS = 180000; // Energy Cores respawn so daily/weekly hunts stay possible
const SCAN_REPEAT_MS = 60000; // a scanned/synced object can count again for repeatable missions after 1 minute
const RESPAWN_POINT = [-6, 33]; // Gateway shelter
const MAP_SCALE = 1.15; // mini-map % per world unit (covers all eight zones)
const EVENT_OBJECT_TYPES = {
  activate_sensor: ['iot_sensor'], identify_pollution: ['pollution'], repair_drainage: ['drainage'], rescue_npc: ['npc'], restore_station: ['energy_station'],
  infra_challenge: ['infra_challenge'], restore_core: ['landmark_core'], find_treasure: [],
  sync_object: Object.keys(OBJECT_TYPES).filter((type) => OBJECT_TYPES[type].action === 'sync'),
  scan_object: Object.keys(OBJECT_TYPES).filter((type) => OBJECT_TYPES[type].scan),
};
const ACTION_EVENT = { sync: 'sync_object', repair: 'repair_drainage', restore_station: 'restore_station', restore: 'restore_core' };
const formatClock = (hour) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;

const PATROL_PATTERN = [
  { label: 'kiri', dx: -1, dz: 0 },
  { label: 'tengah', dx: 0, dz: 0 },
  { label: 'kanan', dx: 1, dz: 0 },
  { label: 'tengah', dx: 0, dz: 0 },
  { label: 'kiri', dx: -1, dz: 0 },
  { label: 'tengah', dx: 0, dz: 0 },
  { label: 'kanan', dx: 1, dz: 0 },
  { label: 'tengah', dx: 0, dz: 0 },
];
const SECRET_CODE = 'jayajaya';
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

class WorldSceneBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <View style={styles.worldFallback}>
      <Text style={styles.fallbackText}>Scene 3D belum dapat dimuat.</Text>
      <TouchableOpacity onPress={() => { this.setState({ failed: false }); this.props.onRetry(); }} style={styles.retrySceneButton}><Text style={styles.retrySceneText}>Coba lagi</Text></TouchableOpacity>
    </View>;
    return this.props.children;
  }
}

function ResourceBar({ label, value, color, icon, compact = false }) {
  return <View style={[styles.resourceCard, compact && styles.resourceCardCompact]}>
    <View style={[styles.resourceHead, compact && styles.resourceHeadCompact]}><FontAwesomeIcon icon={icon} size={compact ? 10 : 11} color={color} /><Text style={[styles.resourceLabel, compact && styles.resourceLabelCompact]}>{label}</Text><Text style={[styles.resourceValue, compact && styles.resourceValueCompact]}>{Math.round(value)}%</Text></View>
    <View style={[styles.resourceTrack, compact && styles.resourceTrackCompact]}><View style={[styles.resourceFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} /></View>
  </View>;
}

const MiniMap = React.memo(function MiniMap({ playerPosition, targets = [], size = 78, label = 'MONAS ZONE' }) {
  const k = size / 78;
  const pos = ([x, z], margin = 5) => ({ left: `${Math.max(margin, Math.min(100 - margin, 50 + x * MAP_SCALE))}%`, top: `${Math.max(margin, Math.min(100 - margin, 50 + z * MAP_SCALE))}%` });
  return <View style={[styles.miniMap, { width: size, height: size }]}>
    <View style={styles.miniMapGrid} />
    {ZONES.map((zone) => <View key={zone.id} style={[styles.miniZone, pos(zone.center, 4), { borderColor: zone.color, width: zone.radius * MAP_SCALE * 2.2 * k, height: zone.radius * MAP_SCALE * 2.2 * k, marginLeft: -zone.radius * MAP_SCALE * 1.1 * k, marginTop: -zone.radius * MAP_SCALE * 1.1 * k }]} />)}
    <View style={[styles.miniMonas, { left: '50%', top: '50%' }]} />
    {targets.map((object) => <View key={object.id} style={[styles.miniPoi, pos(object.position, 6), { backgroundColor: OBJECT_TYPES[object.type].color }]} />)}
    <View style={[styles.miniPlayer, pos(playerPosition)]} />
    <Text numberOfLines={1} style={styles.miniMapLabel}>{label}</Text>
  </View>;
}, (a, b) => a.size === b.size && a.label === b.label
  && (a.targets || []).map((t) => t.id).join() === (b.targets || []).map((t) => t.id).join()
  && Math.abs(a.playerPosition[0] - b.playerPosition[0]) < 0.4 && Math.abs(a.playerPosition[1] - b.playerPosition[1]) < 0.4);

// MOBA-style round skill button — lightweight: two plain Views, no gradient/shadow, memoised so it
// only re-renders when its own look changes (the screen updates ~30x/s while Twini moves).
const SkillButton = React.memo(function SkillButton({ size, icon, glyph, label, color = '#8fdcff', onPress, active = false, primary = false, a11y, style }) {
  const iconSize = Math.round(size * 0.3);
  const dark = primary || active;
  const fg = dark ? '#1a1206' : color;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={a11y}
    style={[styles.skillOuter, { width: size, height: size, borderRadius: size / 2, borderColor: active || primary ? color : `${color}aa`, backgroundColor: primary ? (active ? '#ffd56e' : '#f5b73d') : active ? color : 'rgba(10,22,40,0.5)' }, style]}>
    {glyph ? <Text style={[styles.skillGlyph, { fontSize: iconSize * 1.25, lineHeight: iconSize * 1.4, color: fg }]}>{glyph}</Text>
      : <FontAwesomeIcon icon={icon} size={iconSize} color={fg} />}
    {label ? <Text numberOfLines={1} style={[styles.skillLabel, { fontSize: Math.max(6, size * (primary ? 0.11 : 0.13)) }, dark && styles.skillLabelDark]}>{label}</Text> : null}
  </TouchableOpacity>;
}, (a, b) => a.size === b.size && a.label === b.label && a.active === b.active && a.color === b.color && a.icon === b.icon
  && a.glyph === b.glyph && a.primary === b.primary && a.a11y === b.a11y && a.onPress === b.onPress
  && (a.style?.left ?? 0) === (b.style?.left ?? 0) && (a.style?.top ?? 0) === (b.style?.top ?? 0));

// Compact vertical status bars (HP / energy / water / net / supply) under the mini map.
const STATUS_ITEMS = [
  { key: 'hp', color: '#ff6f86', icon: faHeart },
  { key: 'nrg', color: '#ffd06f', icon: faBolt },
  { key: 'h2o', color: '#5ec8ff', icon: faDroplet },
  { key: 'net', color: '#b898ff', icon: faWifi },
  { key: 'sup', color: '#e0ad62', icon: faBoxOpen },
];
const StatusStack = React.memo(function StatusStack({ width, values }) {
  return <View style={[styles.statusStack, { width }]}>
    {STATUS_ITEMS.map(({ key, color, icon }, index) => ({ key, color, icon, value: values[index] })).map(({ key, value, color, icon }) => <View key={key} style={styles.statusRow}>
      <FontAwesomeIcon icon={icon} size={8} color={color} />
      <View style={styles.statusTrack}><View style={[styles.statusFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} /></View>
      <Text style={styles.statusValue}>{value}</Text>
    </View>)}
  </View>;
}, (a, b) => a.width === b.width && a.values.every((v, i) => v === b.values[i]));

const WORLD_HALF = 50 / MAP_SCALE; // the mini-map spans +-43.5 world units
const clampValue = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Enlarged map (tap the mini-map): zoom 1x-4x centred on Twini, labels, facing arrow; tap a spot to set a waypoint.
function WorldMap({ size, zoom, playerPosition, facing, targets = [], pickups = [], guide, onPickPoint }) {
  const half = WORLD_HALF / zoom;
  const cx = zoom > 1 ? clampValue(playerPosition[0], -WORLD_HALF + half, WORLD_HALF - half) : 0;
  const cz = zoom > 1 ? clampValue(playerPosition[1], -WORLD_HALF + half, WORLD_HALF - half) : 0;
  const k = size / (half * 2);
  const toPx = ([x, z]) => ({ left: (x - cx + half) * k, top: (z - cz + half) * k });
  const inside = ({ left, top }, pad = 0) => left >= -pad && top >= -pad && left <= size + pad && top <= size + pad;
  const facingDeg = (Math.atan2(facing.dx ?? 0, -(facing.dz ?? 1)) * 180) / Math.PI;
  const gridStep = zoom >= 3 ? 5 : 10;
  const gridLines = [];
  for (let g = Math.ceil((cx - half) / gridStep) * gridStep; g <= cx + half; g += gridStep) gridLines.push(<View key={`gx${g}`} style={[styles.bigMapGridV, { left: (g - cx + half) * k }]} />);
  for (let g = Math.ceil((cz - half) / gridStep) * gridStep; g <= cz + half; g += gridStep) gridLines.push(<View key={`gz${g}`} style={[styles.bigMapGridH, { top: (g - cz + half) * k }]} />);
  const player = toPx(playerPosition);
  const pick = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    if (locationX == null || locationY == null) return;
    onPickPoint?.([cx - half + locationX / k, cz - half + locationY / k]);
  };
  return <Pressable onPress={pick} style={[styles.bigMap, { width: size, height: size }]} accessibilityRole="imagebutton" accessibilityLabel="Peta kawasan Monas. Ketuk untuk menandai tujuan.">
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {gridLines}
      {ZONES.map((zone) => {
        const c = toPx(zone.center);
        const r = zone.radius * k;
        if (!inside(c, r)) return null;
        return <View key={zone.id} style={[styles.bigMapZone, { left: c.left - r, top: c.top - r, width: r * 2, height: r * 2, borderRadius: r, borderColor: zone.color, backgroundColor: `${zone.color}14`, justifyContent: 'flex-start', paddingTop: Math.max(4, r * 0.22) }]}>
          <Text numberOfLines={1} style={[styles.bigMapZoneLabel, { color: zone.color }]}>{zone.short}</Text>
        </View>;
      })}
      {LANDMARKS.map((landmark) => {
        const c = toPx(landmark.position);
        if (!inside(c)) return null;
        return <View key={landmark.id} style={[styles.bigMapLandmark, { left: c.left, top: c.top }]}><View style={styles.bigMapLandmarkDot} /><Text numberOfLines={1} style={styles.bigMapLandmarkText}>{landmark.short}</Text></View>;
      })}
      {pickups.map((position, index) => { const c = toPx(position); return inside(c) ? <View key={`p${index}`} style={[styles.bigMapPickup, c]} /> : null; })}
      {targets.map((object) => { const c = toPx(object.position); return inside(c) ? <View key={object.id} style={[styles.bigMapTarget, c, { borderColor: OBJECT_TYPES[object.type].color, backgroundColor: `${OBJECT_TYPES[object.type].color}66` }]} /> : null; })}
      {(() => { const c = toPx([0, 0]); return inside(c) ? <View style={[styles.bigMapMonas, c]} /> : null; })()}
      {guide ? (() => { const c = toPx(guide.position); return inside(c) ? <View style={[styles.bigMapGuide, c]} /> : null; })() : null}
      <View style={[styles.bigMapPlayer, player, { transform: [{ rotate: `${facingDeg}deg` }] }]}>
        <Text style={styles.bigMapPlayerArrow}>▲</Text>
      </View>
    </View>
  </Pressable>;
}

export default function TwiniSurvivalScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState('home');
  const [cameraZoom, setCameraZoom] = useState(1.0);
  const [cameraTilt, setCameraTilt] = useState(0);
  const [patrolMode, setPatrolMode] = useState(false);
  const [showCheat, setShowCheat] = useState(false);
  const [cheatCode, setCheatCode] = useState('');
  const cheatTimer = useRef(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState('twini-idtc');
  const [showCharacterSettings, setShowCharacterSettings] = useState(false);
  const selectedCharacter = PLAYABLE_CHARACTERS.find(({ id }) => id === selectedCharacterId) || PLAYABLE_CHARACTERS[0];
  const [playerPosition, setPlayerPosition] = useState([0, 8]); // Awal di pelataran depan Monas, area kotak luas ±138
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [stamina, setStamina] = useState(100);
  const energyRef = useRef(energy);
  const staminaRef = useRef(stamina);
  const runTimeRef = useRef(0);

  useEffect(() => {
    energyRef.current = energy;
    staminaRef.current = stamina;
  }, [energy, stamina]);
  const [battery, setBattery] = useState(100);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const [foundLandmarks, setFoundLandmarks] = useState([]);
  const [foundPickups, setFoundPickups] = useState([]);
  const [inventory, setInventory] = useState({ crystals: 0, batteries: 0, kits: 1, fragments: 0, water: 1, repairKits: 1 });
  const [hydration, setHydration] = useState(100);
  const [supply, setSupply] = useState(60);
  const [currentZone, setCurrentZone] = useState(null);
  const [interaction, setInteraction] = useState(null); // { phase: 'scan' | 'info' | 'quiz', objectId }
  const [banner, setBanner] = useState(null);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [hubSection, setHubSection] = useState('wallet');
  const [cameraSensitivity, setCameraSensitivity] = useState(1);
  const pickupTimes = useRef({});
  const survivalTick = useRef(null);
  const [message, setMessage] = useState('Selamat datang di Digital Twin Jakarta.');
  const { user } = useAuth();
  const twin = useTwinGame({ userKey: user?.id || 'guest', onMissionComplete: (mission) => mission && setBanner(mission), onNotice: (text) => setMessage(text) });
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  runningRef.current = running;
  const [moving, setMovingRaw] = useState(false);
  const [jumping, setJumping] = useState(false);
  // Extra actions: WAVE (emote + effect), FOCUS (camera behind Twini), GUIDE (waypoint arrow), ITEM (smart use).
  const [emoteSignal, setEmoteSignal] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);
  const [guide, setGuide] = useState(null);
  const guideTimer = useRef(null);
  const [showMap, setShowMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(2);
  const [nearbyLandmark, setNearbyLandmark] = useState(null);
  const [sceneAttempt, setSceneAttempt] = useState(0);
  const [showNavigationBar, setShowNavigationBar] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const startPulse = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const jumpTimer = useRef(null);
  const movementTimer = useRef(null);
  const lastMovementTick = useRef(0);
  const lastMovementMessage = useRef(0);
  const movePlayerRef = useRef(null);
  const joystickDirection = useRef({ dx: 0, dz: 0 });
  const facingDirection = useRef({ dx: 0, dz: 1 });
  // Horizontal direction the camera is looking (written every frame by the 3D scene).
  const cameraForward = useRef({ x: 0, z: -1 });
  const joystickMoveHandler = useRef(null);
  const joystickEndHandler = useRef(null);
  const keyboardMoveHandler = useRef(null);
  const pressedKeys = useRef(new Set());
  const knobPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Live locomotion state shared with the 3D scene (integrated per frame there; synced to React ~10x/s).
  const moveControl = useRef(null);
  const syncedPos = useRef(new WeakSet());
  const movingRef = useRef(false);
  const joystickResponder = useRef(null);
  if (!joystickResponder.current) {
    joystickResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_event, gesture) => joystickMoveHandler.current?.(gesture.dx, gesture.dy),
      onPanResponderRelease: () => joystickEndHandler.current?.(),
      onPanResponderTerminate: () => joystickEndHandler.current?.(),
      onShouldBlockNativeResponder: () => true,
    });
  }
  if (!moveControl.current) moveControl.current = { input: { dx: 0, dz: 0 }, auto: null, pos: [playerPosition[0], playerPosition[1]], vel: [0, 0], facing: { dx: 0, dz: 1 }, running: false, enabled: true, distance: 0, dashT: 0, dashV: [0, 0], lockFacing: false, speed: 0 };
  moveControl.current.running = running;
  moveControl.current.exhausted = energy <= 0 || stamina <= 0;
  const setMoving = (value) => { movingRef.current = value; setMovingRaw(value); };
  const survivalClock = useRef(0);
  const compact = width < 680;
  const landscape = width > height;
  // On-screen controls are anchored explicitly to the bottom of the safe area (no flex alignment),
  // so they sit in thumb reach on iOS/Android exactly like on web.
  const CONTROLS_BOTTOM = 18;
  // HUD scale from the short side of the safe area so the MOBA cluster fits 360-px phones and landscape.
  const hudK = Math.max(0.78, Math.min(1.08, landscape ? (height - insets.top - insets.bottom) / 420 : (width - insets.left - insets.right) / 400));
  const joystickSize = Math.round((landscape ? 116 : 126) * hudK);
  const joystickRadius = Math.round(joystickSize * 0.33);
  const joystickRadiusRef = useRef(joystickRadius);
  joystickRadiusRef.current = joystickRadius;
  // Skill cluster: big INTERACT in the corner, three skills on an inner arc, two small buttons on an outer arc.
  const SK_MAIN = Math.round(78 * hudK);
  const SK = Math.round(54 * hudK);
  const SK_SMALL = Math.round(40 * hudK);
  const skR = SK_MAIN / 2 + SK / 2 + 10 * hudK;
  const skR2 = skR + SK / 2 + SK_SMALL / 2 + 2 * hudK;
  const clusterW = Math.round(SK_MAIN / 2 + skR2 * Math.cos(Math.PI / 8) + SK_SMALL / 2 + 4);
  const clusterH = clusterW;
  const skillAt = (deg, r, size) => {
    const a = (deg * Math.PI) / 180;
    const cx = clusterW - SK_MAIN / 2 + Math.cos(a) * r;
    const cy = clusterH - SK_MAIN / 2 - Math.sin(a) * r;
    return { position: 'absolute', left: cx - size / 2, top: cy - size / 2 };
  };
  const QUICK_SIZE = Math.round((landscape ? 36 : 38) * hudK);
  const quickBarBottom = landscape ? CONTROLS_BOTTOM + (joystickSize - QUICK_SIZE) / 2 : CONTROLS_BOTTOM + joystickSize + 12;
  const quickBarLeft = landscape ? 14 + joystickSize + 14 : 14;
  const controlsTop = CONTROLS_BOTTOM + Math.max(landscape ? joystickSize : joystickSize + 12 + QUICK_SIZE, clusterH);
  const miniMapSize = Math.round((landscape ? 92 : 100) * hudK);
  const mapSize = Math.floor(Math.max(180, Math.min((landscape ? width - 300 : width - 56) - insets.left - insets.right, height - (landscape ? 60 : 250) - insets.top - insets.bottom, 560)));
  const cameraColumn = compact && !landscape;
  const heroFontSize = width < 360 ? 28 : compact ? 32 : 43;
  const gameComplete = false; // open-ended campaign: the session no longer ends at 10 minutes

  useEffect(() => {
    if (panel !== 'game' || gameComplete) {
      clearInterval(timer.current);
      clearInterval(movementTimer.current);
      movementTimer.current = null;
      joystickEndHandler.current?.();
      return undefined;
    }
    timer.current = setInterval(() => {
      const next = survivalClock.current + 1;
      survivalClock.current = next;
      setSurvivalSeconds(next);
      if (runningRef.current) runTimeRef.current += 1;
      // Stamina only drains while running and recovers otherwise (faster when standing still).
      else setStamina((value) => (value >= 100 ? value : Math.min(100, value + (movingRef.current ? 3 : 6))));
      if (next > 0 && next % 30 === 0) setEnergy((value) => Math.max(0, value - 3));
      if (next > 0 && next % 60 === 0) setHealth((value) => Math.max(0, value - 1));
      survivalTick.current?.();
    }, 1000);
    return () => clearInterval(timer.current);
  }, [panel, gameComplete]);
  useEffect(() => () => {
    clearTimeout(jumpTimer.current);
    clearInterval(movementTimer.current);
  }, []);
  useEffect(() => {
    if (panel !== 'game') return undefined;
    const id = setInterval(() => movementSyncRef.current?.(), 200);
    return () => clearInterval(id);
  }, [panel]);
  // Position changed outside the live controller (respawn, save restore, teleport): move the live body there.
  useEffect(() => {
    if (syncedPos.current.has(playerPosition)) return;
    const control = moveControl.current;
    control.pos[0] = playerPosition[0];
    control.pos[1] = playerPosition[1];
    control.vel[0] = 0;
    control.vel[1] = 0;
  }, [playerPosition]);
  useEffect(() => {
    if (patrolMode || !moveControl.current.auto) return;
    moveControl.current.auto = null;
    if (!(moveControl.current.input.dx || moveControl.current.input.dz)) setMoving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patrolMode]);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(startPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(startPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(250),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [startPulse]);

  useEffect(() => {
    // Jangan paksa landscape agar tidak crash iOS saat modal/pindah karakter.
    // Biarkan orientasi bebas (portrait/landscape) sehingga game tetap berjalan.
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => ScreenOrientation.unlockAsync().catch(() => {});
  }, [panel]);

  // ---------- campaign, world & survival (mission engine) ----------
  const campaignMissions = twin.missions.filter((mission) => mission.category === 'campaign');
  const completedMissions = campaignMissions.filter((mission) => twin.completedSet.has(mission.id)).length;
  const nearTarget = panel === 'game' && !interaction ? nearestInteractable(playerPosition, twin.objectState) : null;
  useEffect(() => {
    if (guide && Math.hypot(guide.position[0] - playerPosition[0], guide.position[1] - playerPosition[1]) < 1.4) {
      setGuide(null);
      setMessage(`✅ Sampai di ${guide.name}`);
    }
  }, [guide, playerPosition]);
  useEffect(() => () => clearTimeout(guideTimer.current), []);
  const weather = twin.stormMission ? 'storm' : ambientWeatherAt(survivalSeconds);
  const hour = timeOfDayAt(survivalSeconds);
  const lightingKey = Math.round(hour * 4);
  const lighting = useMemo(() => lightingFor(lightingKey / 4, weather), [lightingKey, weather]);
  const visibleObjectsNow = WORLD_OBJECTS.filter((object) => !OBJECT_TYPES[object.type].hidden || Math.hypot(object.position[0] - playerPosition[0], object.position[1] - playerPosition[1]) < 8);
  const visibleKey = visibleObjectsNow.map((object) => object.id).join(',');
  // Same array instance while the set of objects is unchanged (keeps the memoised 3D scene from re-rendering).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visibleObjects = useMemo(() => visibleObjectsNow, [visibleKey]);
  const trackedEntry = twin.trackedMission ? twin.statusOf(twin.trackedMission).entry : null;
  const trackedTargets = useMemo(() => {
    const types = new Set((twin.trackedMission?.objectives || []).flatMap((objective) => EVENT_OBJECT_TYPES[objective.event] || []));
    return WORLD_OBJECTS.filter((object) => types.has(object.type) && !OBJECT_TYPES[object.type].hidden && !(twin.objectState[object.id]?.done || twin.objectState[object.id]?.synced || twin.objectState[object.id]?.repaired || twin.objectState[object.id]?.restored)).slice(0, 14);
  }, [twin.trackedMission, twin.objectState]);
  const iotObjects = WORLD_OBJECTS.filter((object) => object.type === 'iot_sensor');
  const activeSensorCount = iotObjects.filter((object) => twin.objectState[object.id]?.done).length;

  // Restore the saved session once per account, then autosave a snapshot every 5 seconds.
  const restoredKey = useRef(null);
  const snapshot = useRef(null);
  snapshot.current = { health, energy, stamina, battery, hydration, supply, inventory, playerPosition, survivalSeconds, xp, coins, foundLandmarks, selectedCharacterId, cameraSensitivity };
  useEffect(() => {
    const key = user?.id || 'guest';
    if (!twin.ready || restoredKey.current === key) return;
    restoredKey.current = key;
    const saved = twin.savedExtra;
    if (!saved) return;
    // Twini "rested" while the app was closed: never restore into a soft-lock (0 HP / 0 energy = cannot play).
    setHealth(Math.max(40, saved.health ?? 100)); setEnergy(Math.max(30, saved.energy ?? 100)); setStamina(100); setBattery(saved.battery ?? 100);
    setHydration(Math.max(30, saved.hydration ?? 100)); setSupply(saved.supply ?? 60);
    if (saved.inventory) setInventory((value) => ({ ...value, ...saved.inventory }));
    if (Array.isArray(saved.playerPosition)) setPlayerPosition(saved.playerPosition);
    survivalClock.current = saved.survivalSeconds || 0; setSurvivalSeconds(saved.survivalSeconds || 0);
    setXp(saved.xp || 0); setCoins(saved.coins || 0); setFoundLandmarks(saved.foundLandmarks || []);
    if (saved.selectedCharacterId) setSelectedCharacterId(saved.selectedCharacterId);
    if (saved.cameraSensitivity) setCameraSensitivity(saved.cameraSensitivity);
  }, [twin.ready, twin.savedExtra, user?.id]);
  useEffect(() => {
    if (!twin.ready) return undefined;
    const interval = setInterval(() => { if (restoredKey.current) twin.saveExtra(snapshot.current); }, 5000);
    return () => clearInterval(interval);
  }, [twin.ready, twin.saveExtra]);

  // Zone entry drives exploration missions and zone effects.
  useEffect(() => {
    if (panel !== 'game') return;
    const zone = zoneAt(playerPosition);
    if ((zone?.id || null) === (currentZone?.id || null)) return;
    setCurrentZone(zone);
    if (zone) {
      twin.emit({ type: 'explore_zone', id: zone.id });
      setMessage(`Memasuki ${zone.name}${zone.interference ? ' · gangguan sinyal (simulasi)' : ''}${zone.hazard ? ' · hazard simulasi, cari shelter' : ''}`);
    }
  }, [playerPosition, panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const knockOut = () => {
    twin.activeMissions.filter((mission) => mission.triggersStorm).forEach((mission) => twin.failMission(mission.id, 'Health habis saat badai'));
    stopMovement();
    setPlayerPosition(RESPAWN_POINT);
    setHealth(40);
    setHydration((value) => Math.max(value, 50));
    setMessage('Twini kehabisan health dan dievakuasi ke Gateway Shelter. Pulihkan diri sebelum lanjut.');
  };

  // Runs once per second from the game timer (see above), using the latest state.
  survivalTick.current = () => {
    const zone = zoneAt(playerPosition);
    const safe = !!safeZoneAt(playerPosition);
    const storm = !!twin.stormMission;
    const next = tickSurvival({ health, hydration, connection: battery, supply }, { running, moving, zone, safe, storm });
    const healthDelta = next.health - health;
    setHydration(next.hydration);
    setBattery((value) => Math.max(0, Math.min(100, value + (next.connection - battery))));
    setHealth((value) => Math.max(0, Math.min(100, value + healthDelta)));
    if (storm && health + healthDelta > 0) twin.emit({ type: 'survive_storm', amount: 1 });
    if (health + healthDelta <= 0 && health > 0) knockOut();
    const nowMs = Date.now();
    const respawned = Object.entries(pickupTimes.current).filter(([, at]) => nowMs - at > PICKUP_RESPAWN_MS).map(([index]) => Number(index));
    if (respawned.length) {
      respawned.forEach((index) => { delete pickupTimes.current[index]; });
      setFoundPickups((list) => list.filter((index) => !respawned.includes(index)));
    }
  };

  const announceNearby = (position) => {
    const landmark = LANDMARKS.find((item) => Math.hypot(item.position[0] - position[0], item.position[1] - position[1]) <= 2.3);
    setNearbyLandmark(landmark || null);
    if (landmark && !foundLandmarks.includes(landmark.id)) {
      setFoundLandmarks((current) => current.includes(landmark.id) ? current : [...current, landmark.id]);
      setXp((value) => value + 60);
      setCoins((value) => value + 10);
      setInventory((value) => ({ ...value, fragments: value.fragments + 1 }));
      setMessage(`Landmark ditemukan: ${landmark.name} · +60 XP · +10 koin`);
    }
  };

  const movePlayer = (dx, dz, deltaSeconds = 1 / 30) => {
    if (energy <= 0 || stamina <= 0) {
      setMessage('Energi atau stamina habis. Gunakan item pemulihan dari inventory.');
      return false;
    }
    const magnitude = Math.min(1, Math.hypot(dx, dz));
    if (magnitude < 0.12) return true;
    const elapsed = Math.min(deltaSeconds, 0.08);
    const step = (running ? 4.6 : 2.5) * elapsed * magnitude; // tuned for the half-size Twini
    // Area kotak luas: ±138 (276 x 276 satuan) untuk berjalan bebas di sekitar Monas
    let next = [
      Math.max(-138, Math.min(138, playerPosition[0] + dx * step)),
      Math.max(-138, Math.min(138, playerPosition[1] + dz * step)),
    ];
    // The Monas tower is solid: slide along its wall instead of walking through it.
    const insideTower = ([x, z]) => Math.abs(x) < MONAS_TOWER_HALF && Math.abs(z) < MONAS_TOWER_HALF;
    if (insideTower(next)) {
      const slideX = [next[0], playerPosition[1]];
      const slideZ = [playerPosition[0], next[1]];
      next = !insideTower(slideX) ? slideX : !insideTower(slideZ) ? slideZ : playerPosition;
    }
    setPlayerPosition(next);
    setStamina((value) => Math.max(0, value - (running ? 3.6 : 1.8) * elapsed * magnitude));
    setEnergy((value) => Math.max(0, value - (running ? 2.7 : 1.35) * elapsed * magnitude));
    announceNearby(next);
    if (!LANDMARKS.some((point) => Math.hypot(point.position[0] - next[0], point.position[1] - next[1]) <= 2.3) && Date.now() - lastMovementMessage.current > 1500) {
      lastMovementMessage.current = Date.now();
      setMessage(running ? 'Berlari menyusuri taman Medan Merdeka…' : 'Menjelajah kawasan Monas…');
    }
    return true;
  };
  movePlayerRef.current = movePlayer;

  const stopMovement = () => {
    clearInterval(movementTimer.current);
    movementTimer.current = null;
    if (moveControl.current) moveControl.current.input = { dx: 0, dz: 0 };
    setMoving(false);
  };

  const togglePatrol = () => setPatrolMode((value) => !value);

  const toggleCheat = () => {
    setShowCheat((prev) => {
      if (!prev) {
        setCheatCode('');
        if (cheatTimer.current) clearTimeout(cheatTimer.current);
      }
      return !prev;
    });
  };

  const handleCheatChange = (text) => {
    setCheatCode(text);
    if (text.trim().toLowerCase().includes(SECRET_CODE)) {
      setEnergy(100);
      setStamina(100);
      setMessage('Kode rahasia aktif: Energi & Stamina penuh!');
      setCheatCode('');
      if (cheatTimer.current) clearTimeout(cheatTimer.current);
      cheatTimer.current = setTimeout(() => setShowCheat(false), 1500);
    }
  };

  const tiltCameraUp = () => setCameraTilt((v) => Math.min(1.2, v + 0.15));
  const tiltCameraDown = () => setCameraTilt((v) => Math.max(-0.6, v - 0.15));
  const resetCameraTilt = () => setCameraTilt(0);

  // Joystick → raw screen-space input (dx = right, dz = down). The 3D scene turns it into camera-relative
  // world movement every rendered frame, so the stick feels immediate and the walk stays smooth.
  const updateJoystick = (dx, dy) => {
    const radius = joystickRadiusRef.current;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    knobPosition.setValue({ x, y });
    const nx = x / radius;
    const ny = y / radius;
    const control = moveControl.current;
    if (Math.hypot(nx, ny) < 0.08) {
      control.input = { dx: 0, dz: 0 };
      if (movingRef.current && !control.auto) setMoving(false);
      return;
    }
    control.input = { dx: nx, dz: ny };
    joystickDirection.current = control.input;
    if (!movingRef.current) setMoving(true);
  };
  const resetJoystick = () => {
    moveControl.current.input = { dx: 0, dz: 0 };
    joystickDirection.current = { dx: 0, dz: 0 };
    Animated.spring(knobPosition, { toValue: { x: 0, y: 0 }, useNativeDriver: false, speed: 40, bounciness: 5 }).start();
    if (!moveControl.current.auto) setMoving(false);
  };
  // Pull the live position from the scene into React state ~10x/s (HUD, mini map, missions, stamina).
  const movementSyncRef = useRef(null);
  movementSyncRef.current = () => {
    const control = moveControl.current;
    control.running = running;
    facingDirection.current = control.facing;
    const wantsToMove = !!(control.input.dx || control.input.dz || control.auto);
    if (control.exhausted && wantsToMove && Date.now() - lastMovementMessage.current > 4000) {
      lastMovementMessage.current = Date.now();
      setMessage(energy <= 0 ? '😮‍💨 Energi habis — Twini berjalan pelan. Pakai Battery / misi untuk memulihkan.' : '😮‍💨 Twini kelelahan — berjalan pelan, stamina pulih saat tidak berlari.');
    }
    if (running && stamina <= 0) setRunning(false);
    const travelled = control.distance;
    if (travelled < 0.004) return;
    control.distance = 0;
    const next = [control.pos[0], control.pos[1]];
    syncedPos.current.add(next);
    setPlayerPosition(next);
    if (running) setStamina((value) => Math.max(0, value - travelled * (3.6 / RUN_SPEED)));
    setEnergy((value) => Math.max(0, value - travelled * (running ? 1.2 / RUN_SPEED : 0.35 / WALK_SPEED)));
    announceNearby(next);
    if (!LANDMARKS.some((point) => Math.hypot(point.position[0] - next[0], point.position[1] - next[1]) <= 2.3) && Date.now() - lastMovementMessage.current > 1500) {
      lastMovementMessage.current = Date.now();
      setMessage(running ? 'Berlari menyusuri taman Medan Merdeka…' : 'Menjelajah kawasan Monas…');
    }
  };
  joystickMoveHandler.current = updateJoystick;
  joystickEndHandler.current = resetJoystick;
  const patrolIndex = useRef(0);
  const patrolTimer = useRef(null);
  keyboardMoveHandler.current = updateJoystick;

  useEffect(() => {
    if (!patrolMode) {
      if (patrolTimer.current) {
        clearInterval(patrolTimer.current);
        patrolTimer.current = null;
      }
      return undefined;
    }

    const interval = setInterval(() => {
      if (!patrolMode) {
        if (patrolTimer.current) clearInterval(patrolTimer.current);
        patrolTimer.current = null;
        return;
      }
      const step = PATROL_PATTERN[patrolIndex.current % PATROL_PATTERN.length];
      patrolIndex.current += 1;
      const energy = energyRef.current;
      if (!energy || energy <= 0) {
        setPatrolMode(false);
        return;
      }
      if (step.dx !== 0 || step.dz !== 0) {
        moveControl.current.auto = { dx: step.dx * 0.6, dz: step.dz * 0.6 };
        setMoving(true);
      } else {
        moveControl.current.auto = null;
        if (!(moveControl.current.input.dx || moveControl.current.input.dz)) setMoving(false);
      }
    }, 1000);

    patrolTimer.current = interval;
    return () => {
      clearInterval(interval);
      patrolTimer.current = null;
    };
  }, [patrolMode]);

  useEffect(() => {
    if (Platform.OS !== 'web' || panel !== 'game' || gameComplete) {
      pressedKeys.current.clear();
      joystickEndHandler.current?.();
      return undefined;
    }

    const keyDirections = {
      arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
      arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
    };
    const applyKeys = () => {
      const keys = pressedKeys.current;
      const isDown = (direction) => [...keys].some((key) => keyDirections[key] === direction);
      const horizontal = Number(isDown('right')) - Number(isDown('left'));
      const vertical = Number(isDown('down')) - Number(isDown('up'));
      const radius = joystickRadiusRef.current;
      keyboardMoveHandler.current?.(horizontal * radius, vertical * radius);
    };
    // Don't hijack keys while the user is typing in a text field (e.g. the secret-code input).
    const isTyping = (event) => {
      const el = event.target;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const handleKeyDown = (event) => {
      if (isTyping(event)) return;
      const key = event.key.toLowerCase();
      if (!keyDirections[key]) return;
      event.preventDefault();
      if (!pressedKeys.current.has(key)) {
        pressedKeys.current.add(key);
        applyKeys();
      }
    };
    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (!keyDirections[key]) return;
      event.preventDefault();
      if (pressedKeys.current.delete(key)) applyKeys();
    };
    const handleBlur = () => {
      pressedKeys.current.clear();
      joystickEndHandler.current?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      pressedKeys.current.clear();
      joystickEndHandler.current?.();
    };
  }, [panel, gameComplete, compact, landscape]);

  const interact = () => {
    const pickupIndex = PICKUPS.findIndex(([x, z], index) => !foundPickups.includes(index) && Math.hypot(x - playerPosition[0], z - playerPosition[1]) <= 2.25);
    if (pickupIndex >= 0) {
      setFoundPickups((current) => [...current, pickupIndex]);
      pickupTimes.current[pickupIndex] = Date.now();
      setInventory((value) => ({ ...value, crystals: value.crystals + 1 }));
      setEnergy((value) => Math.min(100, value + 8));
      setBattery((value) => Math.min(100, value + 5));
      setCoins((value) => value + 15);
      setXp((value) => value + 40);
      twin.emit({ type: 'collect_core' });
      setMessage('Energy Core didapatkan · energi +8 · +40 XP');
      return;
    }
    if (nearTarget) {
      handleObject(nearTarget);
      return;
    }
    setMessage(nearbyLandmark ? `Kamu berada di ${nearbyLandmark.name}. Terus jelajahi dan interaksi dengan objek terdekat.` : 'Belum ada objek di dekatmu. Bergerak ke marker pada mini map.');
  };

  const handleObject = ({ object, type, state, cooling }) => {
    if (cooling) { setMessage(`${object.name} sedang diisi ulang · ${cooling} detik`); return; }
    switch (type.action) {
      case 'activate':
        twin.updateObject(object.id, { done: true });
        twin.emit({ type: 'activate_sensor', id: object.id });
        setBattery((value) => Math.min(100, value + 10));
        setXp((value) => value + 40);
        setMessage(`${object.name} aktif · data IoT tersambung (simulasi) · +40 XP`);
        return;
      case 'identify':
        stopMovement();
        setInteraction({ phase: 'scan', objectId: object.id });
        return;
      case 'rescue':
        twin.updateObject(object.id, { done: true });
        twin.emit({ type: 'rescue_npc', id: object.id });
        setXp((value) => value + 60);
        setMessage(`${object.name}: “${object.line}”`);
        return;
      case 'challenge':
        stopMovement();
        setInteraction({ phase: 'quiz', objectId: object.id });
        return;
      case 'drink':
        twin.updateObject(object.id, { lastUsed: Date.now() });
        setHydration(100);
        setMessage('Hidrasi terisi penuh.');
        return;
      case 'supply':
        twin.updateObject(object.id, { lastUsed: Date.now() });
        setSupply((value) => Math.min(100, value + 35));
        setInventory((value) => ({ ...value, water: value.water + 1 }));
        setMessage('Survival Supply +35 · Botol air +1');
        return;
      case 'treasure':
        twin.updateObject(object.id, { done: true });
        twin.emit({ type: 'find_treasure', id: object.id });
        setCoins((value) => value + 100);
        setMessage('Hidden Twin Treasure ditemukan! +100 koin');
        return;
      case 'restore_station':
        if (state.restored) {
          const left = state.lastCharge ? Math.ceil(60 - (Date.now() - state.lastCharge) / 1000) : 0;
          if (left > 0) { setMessage(`Energy Station mengisi ulang · ${left} detik`); return; }
          twin.updateObject(object.id, { lastCharge: Date.now() });
          setEnergy((value) => Math.min(100, value + 40));
          setMessage('Energi +40 dari Energy Station.');
          return;
        }
      // falls through: an unrestored station is scanned first
      default: {
        stopMovement();
        const recentlyScanned = state.lastScan && Date.now() - state.lastScan < SCAN_REPEAT_MS;
        setInteraction({ phase: recentlyScanned ? 'info' : 'scan', objectId: object.id });
      }
    }
  };

  const interactionObject = interaction ? WORLD_OBJECTS.find((object) => object.id === interaction.objectId) : null;
  const scanDone = useRef(null);
  scanDone.current = () => {
    if (!interactionObject) return;
    const { id } = interactionObject;
    const type = OBJECT_TYPES[interactionObject.type];
    if (type.action === 'identify') {
      twin.updateObject(id, { done: true });
      twin.emit({ type: 'identify_pollution', id });
      setXp((value) => value + 50);
      setMessage('Titik polusi teridentifikasi & dilaporkan ke Digital Twin (simulasi) · +50 XP');
      setInteraction(null);
      return;
    }
    twin.updateObject(id, { scanned: true, lastScan: Date.now() });
    twin.emit({ type: 'scan_object', id, target: interactionObject.type });
    const asset = interactionObject.assetId && twin.assets.find((item) => item.id === interactionObject.assetId);
    if (asset && twin.discoverAsset(asset.id, id)) setMessage(`Aset Digital Twin baru: ${asset.icon || ''} ${asset.name}`);
    else setMessage(`${interactionObject.name} dipindai · data Digital Twin diperbarui`);
    setInteraction({ phase: 'info', objectId: id });
  };
  const onScanDone = React.useCallback(() => scanDone.current?.(), []);

  const performObjectAction = () => {
    if (!interactionObject) return;
    const { id, name } = interactionObject;
    const type = OBJECT_TYPES[interactionObject.type];
    const state = twin.objectState[id] || {};
    if (type.action === 'sync') {
      if (state.lastSync && Date.now() - state.lastSync < SCAN_REPEAT_MS) { setMessage('Data baru saja disinkronkan. Coba lagi sebentar lagi.'); setInteraction(null); return; }
      twin.updateObject(id, { synced: true, lastSync: Date.now() });
      twin.emit({ type: 'sync_object', id });
      setBattery((value) => Math.max(0, value - 3));
      setXp((value) => value + 30);
      setMessage(`${name} tersinkron dengan Digital Twin pusat · +30 XP`);
    } else if (type.action === 'repair') {
      setSupply((value) => Math.max(0, value - type.supplyCost));
      twin.updateObject(id, { repaired: true });
      twin.emit({ type: 'repair_drainage', id });
      setXp((value) => value + 70);
      setMessage(`${name} diperbaiki · aliran air normal (simulasi) · +70 XP`);
    } else if (type.action === 'restore_station') {
      setSupply((value) => Math.max(0, value - type.supplyCost));
      twin.updateObject(id, { restored: true, lastCharge: Date.now() });
      twin.emit({ type: 'restore_station', id });
      setEnergy((value) => Math.min(100, value + 30));
      setXp((value) => value + 70);
      setMessage(`${name} kembali menyala · energi +30 · +70 XP`);
    } else if (type.action === 'restore') {
      const finalMission = twin.missions.find((mission) => mission.id === 'm12');
      const status = finalMission && twin.statusOf(finalMission).status;
      if (status !== STATUS.ACTIVE) {
        setMessage(status === STATUS.COMPLETED ? 'Central Digital Twin sudah pulih. Jakarta terselamatkan!' : 'Inti Digital Twin terkunci: selesaikan Twin Synchronization & Smart City Challenge.');
      } else {
        twin.updateObject(id, { done: true });
        twin.emit({ type: 'restore_core', id });
        setMessage('Central Digital Twin pulih! Jakarta kembali terhubung.');
      }
    }
    setInteraction(null);
  };

  const answerQuiz = (correct) => {
    if (!interactionObject) return;
    if (correct) {
      twin.updateObject(interactionObject.id, { done: true });
      twin.emit({ type: 'infra_challenge', id: interactionObject.id });
      setXp((value) => value + 80);
    } else {
      setEnergy((value) => Math.max(0, value - 5));
      twin.updateObject(interactionObject.id, { lastUsed: Date.now() });
    }
  };

  const actionHint = (() => {
    if (!interactionObject) return null;
    const event = ACTION_EVENT[OBJECT_TYPES[interactionObject.type].action];
    const mission = event && twin.activeMissions.find((item) => item.objectives.some((objective) => objective.event === event));
    return mission ? `Membantu misi: ${mission.title}` : null;
  })();

  const jump = () => {
    setJumping(true);
    setStamina((value) => Math.max(0, value - 6));
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setJumping(false), 480);
  };

  // DASH / BACK: a short velocity burst integrated by the scene (smooth, frame-synced).
  const moveBurst = (direction, distance = 1) => {
    const control = moveControl.current;
    if (stamina < 2) { setMessage('😮‍💨 Stamina belum cukup untuk DASH — tunggu sebentar.'); return; }
    const duration = direction > 0 ? 0.28 : 0.22;
    const length = direction > 0 ? 1.65 * distance : 1.2 * distance; // DASH ≈ 2.2 units, BACK ≈ 1.1 units
    const f = control.facing;
    control.dashV = [(f.dx * direction * length) / duration, (f.dz * direction * length) / duration];
    control.dashT = duration;
    control.lockFacing = direction < 0;
    setStamina((value) => Math.max(0, value - 2));
    setMoving(true);
    setTimeout(() => { if (!(control.input.dx || control.input.dz || control.auto)) setMoving(false); }, duration * 1000 + 60);
  };

  const useItem = (item) => {
    if (inventory[item] <= 0) return;
    setInventory((value) => ({ ...value, [item]: value[item] - 1 }));
    if (item === 'kits') setHealth((value) => Math.min(100, value + 35));
    if (item === 'batteries') { setBattery((value) => Math.min(100, value + 45)); setEnergy((value) => Math.min(100, value + 25)); }
    if (item === 'water') setHydration((value) => Math.min(100, value + 40));
    if (item === 'repairKits') setBattery((value) => Math.min(100, value + 50));
    setMessage({ kits: 'Health Kit digunakan · health +35', batteries: 'Battery Pack digunakan · connection +45 · energy +25', water: 'Botol air diminum · hidrasi +40', repairKits: 'Repair Kit dipakai · Digital Connection +50' }[item]);
  };

  const emote = () => {
    setEmoteSignal((value) => value + 1);
    setMessage(moving ? '👋 Berhenti sejenak agar Twini bisa menyapa!' : '👋 Twini menyapa warga Monas! ✨');
  };
  const focusCamera = () => {
    setFocusSignal((value) => value + 1);
    setMessage('🎥 Kamera kembali di belakang Twini');
  };
  const setWaypoint = (position, name, silent = false) => {
    const dx = position[0] - playerPosition[0];
    const dz = position[1] - playerPosition[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.5) return;
    facingDirection.current = { dx: dx / length, dz: dz / length };
    moveControl.current.facing = facingDirection.current;
    setGuide({ position, name });
    clearTimeout(guideTimer.current);
    guideTimer.current = setTimeout(() => setGuide(null), 15000);
    setFocusSignal((value) => value + 1);
    if (!silent) setMessage(`🧭 ${name} · ${Math.round(length)} m di depan — ikuti panah kuning`);
  };
  const guideToTarget = () => {
    const [px, pz] = playerPosition;
    let best = null;
    const consider = (position, name) => {
      const distance = Math.hypot(position[0] - px, position[1] - pz);
      if (distance > 1.6 && (!best || distance < best.distance)) best = { position, name, distance };
    };
    trackedTargets.forEach((object) => consider(object.position, object.name));
    if (!best) PICKUPS.forEach((position, index) => { if (!foundPickups.includes(index)) consider(position, 'Energy Core'); });
    if (!best) LANDMARKS.forEach((landmark) => consider(landmark.position, landmark.name));
    if (!best) { setMessage('Tidak ada tujuan baru di sekitar Twini.'); return; }
    setWaypoint(best.position, best.name);
  };
  const quickItem = () => {
    const needs = [[health < 70, 'kits'], [hydration < 60, 'water'], [battery < 60, 'repairKits'], [battery < 60 || energy < 60, 'batteries']];
    const hit = needs.find(([need, item]) => need && inventory[item] > 0);
    if (hit) { useItem(hit[1]); return; }
    const low = health < 70 || hydration < 60 || battery < 60 || energy < 60;
    setMessage(low ? 'Item yang dibutuhkan habis — kumpulkan supply dari objek & misi.' : 'Status Twini masih prima, item disimpan.');
  };

  const startGame = () => {
    setShowInstructions(true);
    setShowNavigationBar(false);
    navigation?.setBottomNavigationVisible?.(false);
    setMessage('Twini tiba di kawasan Monas. Temukan landmark dan pulihkan sensor kota!');
    setPanel('game');
  };
  const backToMenu = () => {
    if (restoredKey.current) twin.saveExtra(snapshot.current);
    setInteraction(null);
    clearInterval(timer.current);
    stopMovement();
    setShowNavigationBar(false);
    navigation?.setBottomNavigationVisible?.(true);
    setPanel('home');
  };
  const MenuButton = ({ icon, title, detail, onPress, accent = '#83bdff' }) => <TouchableOpacity onPress={onPress} style={styles.menuCard} accessibilityRole="button">
    <View style={[styles.menuIcon, { backgroundColor: `${accent}20` }]}><FontAwesomeIcon icon={icon} size={15} color={accent} /></View>
    <View style={styles.menuCardCopy}><Text style={styles.menuCardTitle}>{title}</Text><Text style={styles.menuCardDetail}>{detail}</Text></View>
    <FontAwesomeIcon icon={faChevronRight} size={12} color="#71839c" />
  </TouchableOpacity>;

  const hudActions = useRef({});
  hudActions.current = {
    emote, focus: focusCamera, guide: guideToTarget, item: quickItem, jump, interact, patrol: togglePatrol,
    back: () => moveBurst(-1, 0.9), dash: () => moveBurst(1, 1.35), run: () => setRunning((value) => !value),
  };
  const press = useMemo(() => Object.fromEntries(['emote', 'focus', 'guide', 'item', 'jump', 'interact', 'patrol', 'back', 'dash', 'run']
    .map((key) => [key, () => hudActions.current[key]()])), []);

  const mapHeader = <View style={styles.mapModalHeader}>
    <View style={{ flexShrink: 1 }}>
      <Text style={styles.mapModalTitle}>PETA KAWASAN MONAS</Text>
      <Text numberOfLines={2} style={styles.mapModalSubtitle}>📍 {nearbyLandmark?.name || currentZone?.name || 'Jakarta · Monas'} · X {playerPosition[0].toFixed(0)} · Z {playerPosition[1].toFixed(0)}</Text>
    </View>
    <TouchableOpacity onPress={() => setShowMap(false)} style={styles.characterModalClose} accessibilityRole="button" accessibilityLabel="Tutup peta"><FontAwesomeIcon icon={faXmark} size={15} color="#eaf4ff" /></TouchableOpacity>
  </View>;

  if (panel === 'game') return <View style={[styles.gameScreen, Platform.OS === 'web' && styles.gameScreenWeb]}>
    <StatusBar hidden />
    <View style={[styles.worldFrame, styles.worldFrameGame, Platform.OS === 'web' && styles.worldFrameGameWeb]}>
      <WorldSceneBoundary key={sceneAttempt} onRetry={() => setSceneAttempt((attempt) => attempt + 1)}><React.Suspense fallback={<View style={styles.worldFallback}><Text style={styles.fallbackText}>Menyiapkan Monas Digital Twin…</Text></View>}>
        <SurvivalWorldScene playerPosition={playerPosition} movementDirection={facingDirection.current} moving={moving} running={running} jumping={jumping} foundPickups={foundPickups} character={selectedCharacter} cameraZoom={cameraZoom} cameraTilt={cameraTilt} cameraForwardRef={cameraForward} worldObjects={visibleObjects} objectState={twin.objectState} highlightId={nearTarget?.object.id} zones={ZONES} lighting={lighting} cameraSensitivity={cameraSensitivity} emoteSignal={emoteSignal} focusSignal={focusSignal} guide={guide} controlRef={moveControl} />
      </React.Suspense></WorldSceneBoundary>
      {weather === 'storm' ? <View pointerEvents="none" style={styles.stormOverlay}><Text style={[styles.stormText, { marginTop: insets.top }]}>⛈ BADAI SIMULASI · {safeZoneAt(playerPosition) ? 'AMAN DI SHELTER' : 'CARI SHELTER (EMERGENCY ZONE / GATEWAY)'}</Text></View> : null}
      <View pointerEvents="box-none" style={[styles.hudLayer, { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }]}>
      {/* ── Top-left: mini map + hero status ── */}
      <View pointerEvents="box-none" style={styles.mlTopLeft}>
        <TouchableOpacity onPress={() => { stopMovement(); setShowMap(true); }} style={styles.mlMapFrame} accessibilityRole="button" accessibilityLabel="Buka peta besar">
          <MiniMap size={miniMapSize} playerPosition={playerPosition} targets={trackedTargets} label={nearbyLandmark?.short || currentZone?.short || 'MONAS ZONE'} />
          <View pointerEvents="none" style={styles.miniMapZoomBadge}><FontAwesomeIcon icon={faMagnifyingGlassPlus} size={10} color="#071321" /></View>
        </TouchableOpacity>
        <StatusStack width={miniMapSize + 6} values={[health, energy, hydration, battery, supply].map(Math.round)} />
        <TouchableOpacity onPress={toggleCheat} style={styles.mlKey} accessibilityRole="button" accessibilityLabel={showCheat ? 'Tutup kolom kode rahasia' : 'Buka kolom kode rahasia'}><FontAwesomeIcon icon={faKey} size={11} color="#ffd06f" /></TouchableOpacity>
      </View>
      {/* ── Top-center: score bar, active mission, toast ── */}
      <View pointerEvents="box-none" style={[styles.mlTopCenter, { left: miniMapSize + 22, right: landscape ? 280 : 56 }]}>
        <View style={styles.mlScoreBar}>
          <View style={styles.mlScoreSide}><FontAwesomeIcon icon={faCloudSun} size={10} color={weather === 'storm' ? '#ff7f91' : '#ffda8b'} /><Text numberOfLines={1} style={styles.mlScoreSmall}>{WEATHER_LABEL[weather]}</Text></View>
          <View style={styles.mlScoreCenter}><Text style={styles.mlScoreTime}>{formatClock(hour)}</Text></View>
          <TouchableOpacity onPress={() => { stopMovement(); setShowMissionsModal(true); }} style={styles.mlScoreSide} accessibilityRole="button" accessibilityLabel="Buka misi">
            <FontAwesomeIcon icon={faTrophy} size={10} color="#ffd37b" /><Text style={styles.mlScoreTrophy}>{completedMissions}/{campaignMissions.length}</Text>
          </TouchableOpacity>
        </View>
        {twin.trackedMission ? <TouchableOpacity onPress={() => { stopMovement(); setShowMissionsModal(true); }} style={styles.mlMission} accessibilityRole="button" accessibilityLabel={`Misi aktif ${twin.trackedMission.title}`}>
          <Text numberOfLines={1} style={styles.missionChipTitle}>🎯 {twin.trackedMission.title}{remainingSeconds(twin.trackedMission, trackedEntry) != null ? ` · ${formatTime(remainingSeconds(twin.trackedMission, trackedEntry))}` : ''}</Text>
          <View style={styles.missionChipTrack}><View style={[styles.missionChipFill, { width: `${progressRatio(twin.trackedMission, trackedEntry) * 100}%` }]} /></View>
        </TouchableOpacity> : null}
        <View style={styles.tpChip}><Text numberOfLines={1} style={styles.tpChipText}>{twin.session ? `${twin.wallet.balance.toLocaleString('id-ID')} TP` : 'TP · offline'} · Lv {twin.profile?.level || 1} · {xp} XP</Text></View>
        {message ? <View pointerEvents="none" style={styles.mlToast}><Text numberOfLines={2} style={styles.mlToastText}>{message}</Text></View> : null}
      </View>
      {/* ── Top-right: system buttons + camera controls ── */}
      <View pointerEvents="box-none" style={styles.mlTopRight}>
        <View style={[styles.mlSysRow, !landscape && styles.mlCameraColumn]}>
          <TouchableOpacity onPress={() => { stopMovement(); setShowCharacterSettings(true); }} style={styles.mlSysButton} accessibilityRole="button" accessibilityLabel="Pengaturan karakter"><FontAwesomeIcon icon={faGear} size={13} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const nextVisible = !showNavigationBar;
              setShowNavigationBar(nextVisible);
              navigation?.setBottomNavigationVisible?.(nextVisible);
            }}
            style={styles.mlSysButton}
            accessibilityRole="button"
            accessibilityLabel={showNavigationBar ? 'Sembunyikan navigasi' : 'Tampilkan navigasi'}
          ><FontAwesomeIcon icon={faBars} size={13} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity onPress={backToMenu} style={[styles.mlSysButton, styles.mlExit]} accessibilityRole="button" accessibilityLabel="Keluar dari game"><FontAwesomeIcon icon={faXmark} size={14} color="#ffe7eb" /></TouchableOpacity>
        </View>
        <View style={[styles.mlCamera, !landscape && styles.mlCameraColumn]}>
          <TouchableOpacity onPress={() => setCameraZoom((value) => Math.max(0.5, value - 0.2))} style={styles.mlCamButton} accessibilityRole="button" accessibilityLabel="Zoom keluar kamera"><FontAwesomeIcon icon={faMinus} size={12} color="#eaf4ff" /></TouchableOpacity>
          <Text style={styles.mlCamText}>{Math.round(cameraZoom * 100)}%</Text>
          <TouchableOpacity onPress={() => setCameraZoom((value) => Math.min(5, value + 0.2))} style={styles.mlCamButton} accessibilityRole="button" accessibilityLabel="Zoom masuk kamera"><FontAwesomeIcon icon={faPlus} size={12} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity onPress={tiltCameraDown} style={styles.mlCamButton} accessibilityRole="button" accessibilityLabel="Tilt kamera ke bawah"><FontAwesomeIcon icon={faArrowDown} size={11} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity onPress={tiltCameraUp} style={styles.mlCamButton} accessibilityRole="button" accessibilityLabel="Tilt kamera ke atas"><FontAwesomeIcon icon={faArrowUp} size={11} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity onPress={resetCameraTilt} style={styles.mlCamButton} accessibilityRole="button" accessibilityLabel="Reset tilt kamera"><Text style={styles.cameraTiltGlyph}>{cameraTilt !== 0 ? '↻' : '○'}</Text></TouchableOpacity>
        </View>
      </View>
      {showCheat && (
        <View style={styles.cheatColumn}>
          <TouchableOpacity onPress={toggleCheat} style={styles.cheatClose} accessibilityRole="button" accessibilityLabel="Tutup kolom cheat"><FontAwesomeIcon icon={faXmark} size={14} color="#ffd06f" /></TouchableOpacity>
          <Text style={styles.cheatLabel}>KODE RAHASIA</Text>
          <TextInput style={styles.cheatInput} value={cheatCode} onChangeText={handleCheatChange} placeholder="Masukkan kode" placeholderTextColor="rgba(255,208,111,0.6)" autoCapitalize="none" autoCorrect={false} autoComplete="off" spellCheck={false} autoFocus maxLength={20} />
        </View>
      )}
      <View pointerEvents="none" style={styles.mlCaption}><Text style={styles.worldCaptionText}>© OSM</Text></View>
      {nearTarget ? <View pointerEvents="none" style={[styles.interactPrompt, { bottom: controlsTop + 8 }]}><Text numberOfLines={1} style={styles.interactPromptText}>
        {nearTarget.cooling ? `⏳ ${nearTarget.object.name} · ${nearTarget.cooling}s` : `◉ ${nearTarget.type.scan && !(nearTarget.state.lastScan && Date.now() - nearTarget.state.lastScan < SCAN_REPEAT_MS) ? 'SCAN' : nearTarget.type.actionLabel} · ${nearTarget.object.name}`} → INTERACT
      </Text></View> : null}
      {/* ── Bottom-left: virtual joystick ── */}
      <View
          {...joystickResponder.current.panHandlers}
          hitSlop={{ top: 28, bottom: 24, left: 24, right: 40 }}
          style={[styles.mlJoystick, { width: joystickSize, height: joystickSize, borderRadius: joystickSize / 2, bottom: CONTROLS_BOTTOM }]}
          accessibilityRole="adjustable"
          accessibilityLabel="Joystick arah gerak Twini"
          accessibilityHint="Geser untuk menggerakkan Twini secara halus."
        >
          <View pointerEvents="none" style={[styles.mlJoystickRing, { width: joystickSize * 0.72, height: joystickSize * 0.72, borderRadius: joystickSize * 0.36 }]} />
          <Text style={[styles.joystickDirection, styles.joystickUp]}>▲</Text>
          <Text style={[styles.joystickDirection, styles.joystickDown]}>▼</Text>
          <Text style={[styles.joystickDirection, styles.joystickLeft]}>◀</Text>
          <Text style={[styles.joystickDirection, styles.joystickRight]}>▶</Text>
          <Animated.View pointerEvents="none" style={[styles.mlKnob, { width: joystickSize * 0.42, height: joystickSize * 0.42, borderRadius: joystickSize * 0.21, transform: knobPosition.getTranslateTransform() }]}>
            <FontAwesomeIcon icon={faCompass} size={Math.round(joystickSize * 0.14)} color="#f2fbff" />
          </Animated.View>
        </View>
        {/* ── Quick actions (emote / camera / guide / item) ── */}
        <View style={[styles.quickBar, { bottom: quickBarBottom, left: quickBarLeft }]}>
          {[
            { key: 'wave', label: 'WAVE', icon: faHandSparkles, color: '#ff9be8', onPress: press.emote, a11y: 'Twini melambai dengan efek' },
            { key: 'focus', label: 'FOCUS', icon: faVideo, color: '#9fe3ff', onPress: press.focus, a11y: 'Kamera ke belakang Twini' },
            { key: 'guide', label: 'GUIDE', icon: faLocationArrow, color: '#ffd36e', onPress: press.guide, a11y: 'Tunjukkan arah ke tujuan terdekat', active: !!guide },
            { key: 'item', label: 'ITEM', icon: faKitMedical, color: '#7dffb5', onPress: press.item, a11y: 'Pakai item yang paling dibutuhkan' },
          ].map((action) => <SkillButton key={action.key} size={QUICK_SIZE} icon={action.icon} label={action.label} color={action.color} onPress={action.onPress} active={action.active} a11y={action.a11y} />)}
        </View>
        {/* ── Bottom-right: MOBA skill cluster ── */}
        <View pointerEvents="box-none" style={[styles.mlCluster, { width: clusterW, height: clusterH, bottom: CONTROLS_BOTTOM }]}>
          <SkillButton size={SK_SMALL} icon={faArrowDown} label="BACK" color="#c9ddf5" onPress={press.back} a11y="Mundur" style={skillAt(157.5, skR2, SK_SMALL)} />
          <SkillButton size={SK_SMALL} icon={faPlay} label="PATROL" color="#8fe0ff" onPress={press.patrol} active={patrolMode} a11y={patrolMode ? 'Matikan patroli lurus kiri-tengah-kanan' : 'Aktifkan patroli lurus kiri-tengah-kanan'} style={skillAt(112.5, skR2, SK_SMALL)} />
          <SkillButton size={SK} glyph="↟" label="JUMP" color="#d9b8ff" onPress={press.jump} a11y="Lompat" style={skillAt(180, skR, SK)} />
          <SkillButton size={SK} icon={faBolt} label="DASH" color="#ffd36e" onPress={press.dash} a11y="Dash ke arah hadap" style={skillAt(135, skR, SK)} />
          <SkillButton size={SK} icon={faWind} label={`RUN ${Math.round(stamina)}%`} color="#7fe7ff" onPress={press.run} active={running} a11y={running ? 'Matikan lari' : 'Aktifkan lari'} style={skillAt(90, skR, SK)} />
          <SkillButton size={SK_MAIN} primary icon={faTowerBroadcast} label="INTERACT" color="#ffc54d" onPress={press.interact} a11y="Interaksi" active={!!nearTarget} style={skillAt(0, 0, SK_MAIN)} />
        </View>
      </View>
    </View>
    <Modal visible={showMap} transparent animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setShowMap(false)}>
      <View style={[styles.mapModalBackdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.mapModalCard, landscape && styles.mapModalCardLandscape]}>
          {landscape ? null : mapHeader}
          <WorldMap size={mapSize} zoom={mapZoom} playerPosition={playerPosition} facing={facingDirection.current} targets={trackedTargets} pickups={PICKUPS.filter((_, index) => !foundPickups.includes(index))} guide={guide} onPickPoint={(point) => setWaypoint(point, 'Titik tujuan')} />
          <View style={landscape ? styles.mapModalSide : styles.mapModalBottom}>
            {landscape ? mapHeader : null}
            <View style={styles.mapZoomRow}>
              <TouchableOpacity onPress={() => setMapZoom((z) => Math.max(1, z / 2))} style={styles.cameraZoomButton} accessibilityRole="button" accessibilityLabel="Perkecil peta"><FontAwesomeIcon icon={faMinus} size={14} color="#eaf4ff" /></TouchableOpacity>
              {[1, 2, 4].map((z) => <TouchableOpacity key={z} onPress={() => setMapZoom(z)} style={[styles.mapZoomChip, mapZoom === z && styles.mapZoomChipActive]} accessibilityRole="button" accessibilityState={{ selected: mapZoom === z }}><Text style={[styles.mapZoomText, mapZoom === z && styles.mapZoomTextActive]}>{z}×</Text></TouchableOpacity>)}
              <TouchableOpacity onPress={() => setMapZoom((z) => Math.min(4, z * 2))} style={styles.cameraZoomButton} accessibilityRole="button" accessibilityLabel="Perbesar peta"><FontAwesomeIcon icon={faPlus} size={14} color="#eaf4ff" /></TouchableOpacity>
            </View>
            <Text style={styles.mapLegend}>▲ Twini  ● Energy Core  ◉ target misi  ◆ landmark{'\n'}Ketuk peta untuk menandai tujuan (panah kuning).</Text>
            {guide ? <TouchableOpacity onPress={() => setGuide(null)} style={styles.mapClearGuide} accessibilityRole="button"><FontAwesomeIcon icon={faCrosshairs} size={11} color="#ffd36e" /><Text style={styles.mapClearGuideText}>Hapus tujuan · {guide.name}</Text></TouchableOpacity> : null}
          </View>
        </View>
      </View>
    </Modal>
    <Modal visible={showCharacterSettings} transparent animationType="fade" onRequestClose={() => setShowCharacterSettings(false)}>
      <View style={styles.characterModalBackdrop}>
        <View style={styles.characterModalCard}>
          <View style={styles.characterModalHeader}><View><Text style={styles.characterModalTitle}>Pengaturan Karakter</Text><Text style={styles.characterModalSubtitle}>Pilih model GLB untuk permainan</Text></View><TouchableOpacity onPress={() => setShowCharacterSettings(false)} style={styles.characterModalClose} accessibilityRole="button" accessibilityLabel="Tutup pengaturan"><FontAwesomeIcon icon={faXmark} size={15} color="#eaf4ff" /></TouchableOpacity></View>
          {PLAYABLE_CHARACTERS.map((character) => {
            const selected = selectedCharacterId === character.id;
            return <TouchableOpacity key={character.id} onPress={() => { setSelectedCharacterId(character.id); setMessage(`Karakter berganti ke ${character.name}.`); setShowCharacterSettings(false); }} style={[styles.characterModalOption, selected && styles.characterModalOptionSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
              <View><Text style={[styles.characterModalOptionTitle, selected && styles.characterModalOptionTitleSelected]}>{character.name}</Text><Text style={styles.characterModalOptionDetail}>Model 3D GLB</Text></View><Text style={styles.characterModalOptionMark}>{selected ? '✓' : '›'}</Text>
            </TouchableOpacity>;
          })}
          <Text style={[styles.characterModalSubtitle, { marginTop: 12 }]}>Sensitivitas putar kamera</Text>
          <View style={styles.sensitivityRow}>{[0.5, 0.75, 1, 1.5, 2].map((value) => <TouchableOpacity key={value} onPress={() => setCameraSensitivity(value)} style={[styles.sensitivityOption, cameraSensitivity === value && styles.sensitivityOptionActive]} accessibilityRole="button" accessibilityState={{ selected: cameraSensitivity === value }}><Text style={[styles.sensitivityText, cameraSensitivity === value && styles.sensitivityTextActive]}>{value}×</Text></TouchableOpacity>)}</View>
        </View>
      </View>
    </Modal>
    {interaction?.phase === 'scan' && interactionObject ? <ScanProgress name={interactionObject.name} onDone={onScanDone} /> : null}
    {interaction?.phase === 'info' && interactionObject ? <TwinInfoPanel object={interactionObject} type={OBJECT_TYPES[interactionObject.type]} state={twin.objectState[interactionObject.id] || {}} connection={battery} supply={supply} actionHint={actionHint} onAction={performObjectAction} onClose={() => setInteraction(null)} /> : null}
    {interaction?.phase === 'quiz' && interactionObject ? <QuizPanel object={interactionObject} onAnswer={answerQuiz} onClose={() => setInteraction(null)} /> : null}
    {banner ? <MissionCompleteBanner key={banner.id} mission={banner} onDone={() => setBanner(null)} /> : null}
    <Modal visible={showMissionsModal} transparent animationType="slide" onRequestClose={() => setShowMissionsModal(false)}>
      <View style={styles.missionsModalBackdrop}>
        <View style={styles.missionsModalCard}>
          <TouchableOpacity onPress={() => setShowMissionsModal(false)} style={styles.missionsModalClose} accessibilityRole="button" accessibilityLabel="Tutup misi"><FontAwesomeIcon icon={faXmark} size={15} color="#eaf4ff" /></TouchableOpacity>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }}><MissionCenter twin={twin} inGame /></ScrollView>
        </View>
      </View>
    </Modal>
    {showInstructions && <View pointerEvents="box-none" style={[styles.instructionOverlay, { bottom: 14 + insets.bottom, left: 12 + insets.left }]}>
      <View style={styles.instructionCard}>
        <View style={styles.instructionHeader}><Text style={styles.instructionTitle}>PANDUAN BERMAIN</Text><TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.instructionClose} accessibilityRole="button" accessibilityLabel="Tutup panduan"><FontAwesomeIcon icon={faXmark} size={12} color="#70e0ae" /></TouchableOpacity></View>
        <Text style={styles.instructionBody}>{[
          '• Joystick / WASD mengikuti arah kamera: W/▲ maju ke arah pandang kamera, S mundur, A kiri, D kanan',
          '• Geser layar untuk memutar kamera; arah "depan" ikut berubah',
          '• Tekan RUN untuk berlari (energi & stamina turun)',
          '• WAVE menyapa, FOCUS kamera ke belakang Twini, GUIDE panah ke tujuan, ITEM pakai item yang dibutuhkan',
          '• Ketuk mini map untuk peta besar (zoom 1×–4×, ketuk peta = tandai tujuan)',
          '• Tekan JUMP untuk melompat',
          '• Tekan PATROL untuk gerak otomatis kiri→tengah→kanan',
          '• Dekati objek bercincin biru lalu tekan INTERACT untuk SCAN / aksi Digital Twin',
          '• Jaga HP, Energi, Hidrasi (H2O), Digital Connection (NET) dan Supply (SUP)',
          '• Ketuk 🏆 untuk Mission Center · semua hazard hanya simulasi game',
        ].join('\n')}</Text>
      </View>
    </View>}
  </View>;

  if (panel === 'missions') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <MissionCenter twin={twin} />
  </ResponsiveContent></ScrollView>;

  if (panel === 'hub') return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <TwinHub twin={twin} section={hubSection} onSection={setHubSection} navigation={navigation} stats={{ survivalSeconds }} />
  </ResponsiveContent></ScrollView>;

  if (panel === 'inventory') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>TWNI FIELD KIT</Text><Text style={styles.pageTitle}>Inventory</Text><Text style={styles.pageSubtitle}>Resource yang ditemukan selama eksplorasi Jakarta.</Text>
    <View style={styles.inventoryCard}><Text style={styles.inventoryEmoji}>🎒</Text><View style={styles.inventoryCopy}><Text style={styles.inventoryTitle}>Status survival</Text><Text style={styles.inventoryDescription}>HP {Math.round(health)}% · Energi {Math.round(energy)}% · Hidrasi {Math.round(hydration)}% · Connection {Math.round(battery)}% · Supply {Math.round(supply)}%</Text><Text style={styles.inventoryCount}>Aset Digital Twin: {twin.ownedAssetIds.size}/{twin.assets.length} · lihat Twin Hub → Aset</Text></View></View>
    {[['crystals', 'Energy Crystal', 'Kristal data untuk memulihkan digital battery.', '💎'], ['batteries', 'Battery Pack', 'Mengisi ulang battery dan energy Twini.', '🔋'], ['kits', 'Health Kit', 'Memulihkan health saat menghadapi kondisi ekstrem.', '🩹'], ['fragments', 'Data Fragment', 'Potongan data landmark dan infrastruktur kota.', '🔷'], ['water', 'Botol Air', 'Memulihkan hidrasi +40.', '💧'], ['repairKits', 'Repair Kit', 'Memperbaiki perangkat digital: Digital Connection +50.', '🛠️']].map(([id, title, detail, emoji]) => <View key={id} style={styles.inventoryCard}><Text style={styles.inventoryEmoji}>{emoji}</Text><View style={styles.inventoryCopy}><Text style={styles.inventoryTitle}>{title}</Text><Text style={styles.inventoryDescription}>{detail}</Text><Text style={styles.inventoryCount}>Dimiliki: {inventory[id] || 0}</Text></View>{['kits', 'batteries', 'water', 'repairKits'].includes(id) && <TouchableOpacity onPress={() => useItem(id)} disabled={inventory[id] <= 0} style={[styles.useButton, inventory[id] <= 0 && styles.useDisabled]}><Text style={styles.useButtonText}>Gunakan</Text></TouchableOpacity>}</View>)}
  </ResponsiveContent></ScrollView>;

  if (panel === 'dashboard') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>IDTC · SIMULATED TELEMETRY</Text><Text style={styles.pageTitle}>Digital Twin Dashboard</Text><Text style={styles.pageSubtitle}>Data berikut disimulasikan untuk prototipe edukasi, bukan sensor live.</Text>
    <View style={styles.telemetryGrid}>{[[faCloudSun, 'Suhu', '34°C', 'Kondisi panas', '#ffbf72'], [faDroplet, 'Kelembapan', '72%', 'Sensor taman', '#81ceff'], [faWind, 'Kualitas udara', 'AQI 84', 'Sedang', '#8de0b5'], [faTowerBroadcast, 'Kecepatan angin', '11 km/j', 'Diperbarui sekarang', '#c6a7ff']].map(([icon, title, value, note, color]) => <View key={title} style={styles.telemetryCard}><FontAwesomeIcon icon={icon} size={17} color={color} /><Text style={styles.telemetryTitle}>{title}</Text><Text style={styles.telemetryValue}>{value}</Text><Text style={styles.telemetryNote}>{note} · SIMULASI</Text></View>)}</View>
    <View style={styles.sensorDashCard}><Text style={styles.menuSectionTitle}>Perangkat IoT di sekitar</Text>{iotObjects.map((object) => <View key={object.id} style={styles.sensorDashRow}><View style={[styles.sensorStatusDot, twin.objectState[object.id]?.done && styles.sensorActiveDot]} /><Text style={styles.sensorDashName}>{object.name}</Text><Text style={styles.sensorDashValue}>{twin.objectState[object.id]?.done ? 'ONLINE' : 'STANDBY'}</Text></View>)}</View>
    <View style={styles.mapSectionHeader}><View><Text style={styles.menuSectionTitle}>Open Maps · OpenStreetMap</Text><Text style={styles.panelHint}>Peta Jakarta tersemat langsung di TWINI.</Text></View><TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/#map=14/-6.208/106.816').catch(() => {})} style={styles.mapOpenButton}><Text style={styles.mapOpenText}>Buka penuh</Text></TouchableOpacity></View>
    <View style={styles.embeddedMap}><OpenStreetMapEmbed /></View>
  </ResponsiveContent></ScrollView>;

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <ResponsiveContent>
      <View style={[styles.homeHeader, compact && styles.homeHeaderCompact]}>
        <View style={styles.brandPill}><Image source={require('../../../assets/twini-logo.png')} style={styles.brandLogo} resizeMode="contain" /><Text style={styles.brandText}>TWINI <Text style={styles.brandSub}>· IDTC</Text></Text></View>
        <View style={styles.locationBadge}><View style={styles.liveDot} /><Text style={styles.locationBadgeText}>JAKARTA · MONAS</Text></View>
      </View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>DIGITAL TWIN SURVIVAL · PHASE 01</Text>
          <Text style={[styles.heroTitle, { fontSize: heroFontSize, lineHeight: Math.round(heroFontSize * 1.12) }]} numberOfLines={3}>
            {'Explore.\nSurvive.\nLearn.'}
          </Text>
          <Text style={styles.heroDescription}>TWINI: Monas Survival Adventure. Explore. Survive. Learn. Build the Future.</Text>
        </View>
        <View style={styles.characterPicker}>
          <View style={styles.characterPreview}><Image source={require('../../../assets/twini-logo.png')} style={styles.characterLogo} resizeMode="contain" /><View style={styles.characterOrb}><FontAwesomeIcon icon={faGamepad} size={16} color="#bde3ff" /></View></View>
          <Text style={styles.characterCaption}>{selectedCharacter.name}</Text>
          <Text style={styles.characterPickerLabel}>PILIH KARAKTER GLB</Text>
          <View style={styles.characterOptions}>{PLAYABLE_CHARACTERS.map((character) => <TouchableOpacity key={character.id} onPress={() => setSelectedCharacterId(character.id)} style={[styles.characterOption, selectedCharacterId === character.id && styles.characterOptionSelected]} accessibilityRole="button" accessibilityState={{ selected: selectedCharacterId === character.id }} accessibilityLabel={`Pilih karakter ${character.name}`}><Text numberOfLines={1} style={[styles.characterOptionText, selectedCharacterId === character.id && styles.characterOptionTextSelected]}>{character.name}</Text></TouchableOpacity>)}</View>
        </View>
        <View style={styles.startButtonCenter}>
          <View style={styles.startButtonWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.startButtonPulse, {
                opacity: startPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0] }),
                transform: [{ scale: startPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
              }]}
            />
            <TouchableOpacity onPress={startGame} style={styles.startButton} accessibilityRole="button">
              <FontAwesomeIcon icon={faPlay} size={13} color="#071321" /><Text style={styles.startButtonText}>Mulai Eksplorasi</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroFooter}><Text style={styles.heroFooterText}>EXPLORE</Text><Text style={styles.heroFooterDot}>·</Text><Text style={styles.heroFooterText}>SURVIVE</Text><Text style={styles.heroFooterDot}>·</Text><Text style={styles.heroFooterText}>CONNECT</Text><Text style={styles.heroFooterDot}>·</Text><Text style={styles.heroFooterText}>TRANSFORM</Text></View>
      </View>

      <View style={styles.playerPanel}>
        <View style={styles.playerPanelHead}><View><Text style={styles.menuSectionTitle}>Twini Status</Text><Text style={styles.panelHint}>Digital Guardian · Level 01</Text></View><View style={styles.xpBadge}><FontAwesomeIcon icon={faBolt} size={11} color="#ffcf77" /><Text style={styles.xpBadgeText}>{twin.session ? `${twin.wallet.balance.toLocaleString('id-ID')} TP · Lv ${twin.profile?.level || 1}` : `${xp} XP · ${coins} koin`}</Text></View></View>
        <View style={styles.homeResources}><ResourceBar label="HEALTH" value={health} color="#ff7f91" icon={faHeart} /><ResourceBar label="ENERGY" value={energy} color="#ffd06f" icon={faBolt} /><ResourceBar label="HYDRATION" value={hydration} color="#5ec8ff" icon={faDroplet} /><ResourceBar label="CONNECTION" value={battery} color="#b898ff" icon={faWifi} /><ResourceBar label="SUPPLY" value={supply} color="#d9a35a" icon={faBoxOpen} /></View>
        <View style={styles.playerSummary}><Text style={styles.summaryText}><FontAwesomeIcon icon={faMapLocationDot} size={10} color="#88c0ff" />  {foundLandmarks.length}/5 landmark</Text><Text style={styles.summaryText}><FontAwesomeIcon icon={faTowerBroadcast} size={10} color="#7be0c0" />  {activeSensorCount}/{iotObjects.length} sensor</Text><Text style={styles.summaryText}><FontAwesomeIcon icon={faTrophy} size={10} color="#ffd37b" />  {completedMissions}/{campaignMissions.length} misi</Text></View>
      </View>

      <View style={styles.menuSectionHead}><Text style={styles.menuSectionTitle}>Twin City Hub</Text><Text style={styles.panelHint}>Pilih aktivitas</Text></View>
      <View style={styles.menuGrid}>
        <MenuButton icon={faGamepad} title="Mission Center" detail={`${completedMissions} dari ${campaignMissions.length} misi campaign · harian, mingguan & event`} onPress={() => setPanel('missions')} accent="#ffd178" />
        <MenuButton icon={faWallet} title="Twin Points Wallet" detail={twin.session ? `${twin.wallet.balance.toLocaleString('id-ID')} TP · riwayat transaksi` : 'Masuk akun cloud untuk validasi poin'} onPress={() => { setHubSection('wallet'); setPanel('hub'); }} accent="#f2c45f" />
        <MenuButton icon={faStore} title="Rewards Store" detail="Voucher data, internet & merchandise Twini" onPress={() => { setHubSection('store'); setPanel('hub'); }} accent="#ff9fd0" />
        <MenuButton icon={faRankingStar} title="Leaderboard" detail="Peringkat mingguan & sepanjang masa" onPress={() => { setHubSection('leaderboard'); setPanel('hub'); }} accent="#9fd5ff" />
        <MenuButton icon={faCube} title="Digital Twin Assets" detail={`${twin.ownedAssetIds.size}/${twin.assets.length} aset · preview & upgrade`} onPress={() => { setHubSection('assets'); setPanel('hub'); }} accent="#b898ff" />
        <MenuButton icon={faUser} title="Profil & Akun" detail={twin.session ? `${twin.session.user.fullName} · badge & statistik` : 'Mode offline · hubungkan akun'} onPress={() => { setHubSection(twin.session ? 'profile' : 'account'); setPanel('hub'); }} accent="#7be0c0" />
        <MenuButton icon={faBatteryThreeQuarters} title="Inventory" detail={`${inventory.crystals} crystal · ${inventory.kits} health kit`} onPress={() => setPanel('inventory')} accent="#7fcfff" />
        <MenuButton icon={faTowerBroadcast} title="Digital Twin" detail="Cuaca, kualitas udara, dan sensor" onPress={() => setPanel('dashboard')} accent="#72e0bd" />
        <MenuButton icon={faMapLocationDot} title="Bangun Kota" detail="Buka mode city builder 3D" onPress={() => navigation.navigate('CityBuilder')} accent="#c7a5ff" />
        <MenuButton icon={faCompass} title="OpenStreetMap" detail="Lihat peta Jakarta di dalam aplikasi" onPress={() => setPanel('dashboard')} accent="#85c9ff" />
      </View>

      <View style={styles.miniMissionCard}>
        <View style={styles.miniMissionIcon}><FontAwesomeIcon icon={faTrophy} size={14} color="#ffd178" /></View>
        <View style={styles.miniMissionCopy}><Text style={styles.miniMissionEyebrow}>MISI BERIKUTNYA</Text><Text style={styles.miniMissionTitle}>{twin.trackedMission?.title || (completedMissions === campaignMissions.length ? 'Semua misi campaign selesai!' : 'Buka Mission Center')}</Text><Text style={styles.miniMissionDetail}>{twin.trackedMission?.description || 'Jakarta Digital Twin telah pulih.'}</Text></View>
        <TouchableOpacity onPress={() => setPanel('missions')}><FontAwesomeIcon icon={faChevronRight} size={13} color="#90a4bc" /></TouchableOpacity>
      </View>
      <Text style={styles.poweredBy}>Powered by Indonesia Digital Twin Community</Text>
    </ResponsiveContent>
  </ScrollView>;
}

const styles = StyleSheet.create({
  missionHud: { position: 'absolute', left: 12, top: 132, gap: 5, zIndex: 6 },
  missionChip: { backgroundColor: 'rgba(8,16,30,0.82)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,196,95,0.45)', paddingHorizontal: 10, paddingVertical: 6 },
  missionChipTitle: { color: '#ffe2a0', fontSize: 11, fontWeight: '900' },
  missionChipTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 4, overflow: 'hidden' },
  missionChipFill: { height: '100%', backgroundColor: '#f2c45f' },
  tpChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(8,16,30,0.75)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(95,211,255,0.35)' },
  tpChipText: { color: '#bfe9ff', fontSize: 10.5, fontWeight: '800' },
  stormOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,28,48,0.28)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 96, zIndex: 3 },
  stormText: { color: '#ffd1d8', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, backgroundColor: 'rgba(80,16,30,0.75)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  interactPrompt: { position: 'absolute', alignSelf: 'center', bottom: 168, backgroundColor: 'rgba(8,16,30,0.88)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(95,211,255,0.6)', paddingHorizontal: 12, paddingVertical: 7, maxWidth: '86%', zIndex: 8 },
  interactPromptText: { color: '#d8f3ff', fontSize: 12, fontWeight: '800' },
  missionsModalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,14,0.7)', justifyContent: 'flex-end' },
  missionsModalCard: { maxHeight: '88%', backgroundColor: '#080f1c', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: 'rgba(120,170,230,0.2)', width: '100%', maxWidth: 720, alignSelf: 'center' },
  missionsModalClose: { alignSelf: 'flex-end', margin: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  miniZone: { position: 'absolute', borderWidth: 1, borderRadius: 999, opacity: 0.55 },
  sensitivityRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  sensitivityOption: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(120,170,230,0.18)' },
  sensitivityOptionActive: { borderColor: '#5fd3ff', backgroundColor: 'rgba(95,211,255,0.15)' },
  sensitivityText: { color: '#a9bdd6', fontWeight: '800', fontSize: 12 },
  sensitivityTextActive: { color: '#5fd3ff' },
  screen: { flex: 1, backgroundColor: '#080f1c' },
  content: { flexGrow: 1, paddingTop: 20, paddingBottom: 35 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 17 },
  homeHeaderCompact: { alignItems: 'flex-start' },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 32, height: 32 },
  brandText: { color: '#f0f6ff', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  brandSub: { color: '#8dabc9', fontSize: 10, fontWeight: '700' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(62,203,155,0.1)', borderWidth: 1, borderColor: 'rgba(95,219,177,0.18)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5de0ad' },
  locationBadgeText: { color: '#a5dcca', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  hero: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', minHeight: 330, overflow: 'hidden', padding: 24, borderRadius: 27, backgroundColor: '#101d31', borderWidth: 1, borderColor: 'rgba(147,198,255,0.2)' },
  heroCompact: { padding: 19, minHeight: 390 },
  heroGlow: { position: 'absolute', right: -70, top: -100, width: 290, height: 290, borderRadius: 145, backgroundColor: 'rgba(46,132,235,0.16)' },
  heroCopy: { flex: 1, minWidth: 240, justifyContent: 'center', zIndex: 1 },
  heroEyebrow: { color: '#89c3ff', fontSize: 8, fontWeight: '900', letterSpacing: 1.25 },
  heroTitle: { maxWidth: '100%', flexShrink: 1, color: '#f3f7ff', fontWeight: '900', letterSpacing: -1.3, marginTop: 13 },
  heroDescription: { maxWidth: 330, color: '#a0b2c9', fontSize: 11, lineHeight: 17, marginTop: 12 },
  startButtonCenter: { width: '100%', alignItems: 'center', marginTop: 8 },
  startButtonWrap: { position: 'relative' },
  startButtonPulse: { ...StyleSheet.absoluteFill, borderRadius: 16, borderWidth: 2, borderColor: '#ffc45f' },
  startButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderRadius: 15, backgroundColor: '#9dcbff', borderWidth: 1, borderColor: '#d5eaff' },
  startButtonText: { color: '#071321', fontSize: 10, fontWeight: '900' },
  characterPicker: { width: '100%', minHeight: 205, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginLeft: 10 },
  characterPreview: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  characterLogo: { width: 118, height: 118, opacity: 0.93 },
  characterOrb: { position: 'absolute', right: 16, top: 22, width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(91,157,239,0.2)', borderWidth: 1, borderColor: 'rgba(163,215,255,0.28)' },
  characterCaption: { color: '#e8f4ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  characterPickerLabel: { color: '#86a6c5', fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 7 },
  characterOptions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 6, maxWidth: 350 },
  characterOption: { borderWidth: 1, borderColor: '#42556d', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#101d2b' },
  characterOptionSelected: { borderColor: '#72c7ff', backgroundColor: '#1e4560' },
  characterOptionText: { color: '#a8bdd2', fontSize: 8, fontWeight: '700' },
  characterOptionTextSelected: { color: '#eaf7ff' },
  heroFooter: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(217,236,255,0.1)' },
  heroFooterText: { color: '#8da6c3', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroFooterDot: { color: '#4f83b8', fontSize: 12 },
  playerPanel: { marginTop: 15, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,241,255,0.11)' },
  playerPanelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 13 },
  menuSectionTitle: { color: '#edf5ff', fontSize: 13, fontWeight: '800' },
  panelHint: { color: '#7f92aa', fontSize: 9, marginTop: 4 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11, backgroundColor: 'rgba(255,202,99,0.1)' },
  xpBadgeText: { color: '#ffd37b', fontSize: 9, fontWeight: '800' },
  homeResources: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  resourceCard: { flex: 1, minWidth: 120, padding: 9, borderRadius: 12, backgroundColor: 'rgba(4,10,18,0.48)' },
  resourceCardCompact: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(4,10,18,0.74)' },
  resourceHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resourceHeadCompact: { gap: 4 },
  resourceLabel: { flex: 1, color: '#8496ad', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  resourceLabelCompact: { fontSize: 6, letterSpacing: 0.3 },
  resourceValue: { color: '#d7e6f7', fontSize: 8, fontWeight: '800' },
  resourceValueCompact: { fontSize: 7 },
  resourceTrack: { height: 4, overflow: 'hidden', borderRadius: 4, backgroundColor: '#26354a', marginTop: 7 },
  resourceTrackCompact: { height: 3, marginTop: 4 },
  resourceFill: { height: '100%', borderRadius: 4 },
  playerSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 13 },
  summaryText: { color: '#96a8bd', fontSize: 8 },
  menuSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 10 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  menuCard: { flexGrow: 1, flexBasis: '47%', minWidth: 220, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(225,240,255,0.1)' },
  menuIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  menuCardCopy: { flex: 1 },
  menuCardTitle: { color: '#eaf2fd', fontSize: 10, fontWeight: '800' },
  menuCardDetail: { color: '#8294ab', fontSize: 8, lineHeight: 12, marginTop: 4 },
  miniMissionCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, padding: 13, borderRadius: 16, backgroundColor: 'rgba(245,190,93,0.07)', borderWidth: 1, borderColor: 'rgba(245,190,93,0.14)' },
  miniMissionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(255,204,115,0.12)' },
  miniMissionCopy: { flex: 1 },
  miniMissionEyebrow: { color: '#c5a66f', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  miniMissionTitle: { color: '#f2e6d1', fontSize: 10, fontWeight: '800', marginTop: 4 },
  miniMissionDetail: { color: '#9f9789', fontSize: 8, lineHeight: 12, marginTop: 3 },
  poweredBy: { color: '#52657d', fontSize: 8, textAlign: 'center', marginTop: 20 },
  pageEyebrow: { color: '#84bcf5', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 24 },
  pageTitle: { color: '#eff6ff', fontSize: 27, fontWeight: '900', marginTop: 7 },
  pageSubtitle: { color: '#8da0b8', fontSize: 10, lineHeight: 16, marginTop: 6, marginBottom: 18 },
  backButtonLight: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' },
  missionCard: { marginBottom: 10, padding: 14, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,241,255,0.1)' },
  missionCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionNumber: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(106,165,235,0.15)' },
  missionNumberDone: { backgroundColor: 'rgba(62,208,151,0.18)' },
  missionNumberText: { color: '#a7d1ff', fontSize: 9, fontWeight: '900' },
  missionCardCopy: { flex: 1 },
  missionTitle: { color: '#eef5ff', fontSize: 10, fontWeight: '800' },
  missionDescription: { color: '#8b9cb2', fontSize: 8, lineHeight: 13, marginTop: 4 },
  missionState: { color: '#8194ad', fontSize: 7, fontWeight: '900' },
  missionStateDone: { color: '#6fe0b4' },
  missionProgressTrack: { height: 4, overflow: 'hidden', borderRadius: 4, backgroundColor: '#29364a', marginTop: 12 },
  missionProgressFill: { height: '100%', backgroundColor: '#78baff' },
  missionFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginTop: 7 },
  missionProgressText: { color: '#9cb2cc', fontSize: 8 },
  rewardText: { color: '#c3a972', fontSize: 7 },
  inventoryCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9, padding: 13, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,241,255,0.1)' },
  inventoryEmoji: { fontSize: 24 },
  inventoryCopy: { flex: 1 },
  inventoryTitle: { color: '#eaf3ff', fontSize: 10, fontWeight: '800' },
  inventoryDescription: { color: '#8598b0', fontSize: 8, lineHeight: 12, marginTop: 4 },
  inventoryCount: { color: '#9fc9f2', fontSize: 8, marginTop: 6 },
  useButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: '#9dcbff' },
  useDisabled: { opacity: 0.4 },
  useButtonText: { color: '#071321', fontSize: 8, fontWeight: '900' },
  telemetryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  telemetryCard: { flexGrow: 1, flexBasis: '46%', minWidth: 145, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,241,255,0.1)' },
  telemetryTitle: { color: '#99abc0', fontSize: 8, marginTop: 9 },
  telemetryValue: { color: '#eef6ff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  telemetryNote: { color: '#7d91a8', fontSize: 7, marginTop: 5 },
  sensorDashCard: { padding: 15, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', marginTop: 13 },
  sensorDashRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(226,241,255,0.07)' },
  sensorStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8a99aa' },
  sensorActiveDot: { backgroundColor: '#62e0a9' },
  sensorDashName: { flex: 1, color: '#d7e3f1', fontSize: 9 },
  sensorDashValue: { color: '#8da5c0', fontSize: 7, fontWeight: '900' },
  mapSectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 17, marginBottom: 9 },
  mapOpenButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(100,162,224,0.16)' },
  mapOpenText: { color: '#badafa', fontSize: 8, fontWeight: '800' },
  embeddedMap: { height: 280, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(155,199,238,0.24)', backgroundColor: '#e5ede5' },
  gameScreen: { flex: 1, width: '100%', height: '100%', minWidth: 0, minHeight: 0, position: 'relative', backgroundColor: '#080f1c' },
  gameScreenWeb: { overflow: 'hidden' },
  gameTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { color: '#c9d9ec', fontSize: 8, fontWeight: '700' },
  gameLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameLocationText: { color: '#a8c7e8', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  missionShortcut: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,206,111,0.1)' },
  missionShortcutText: { color: '#ffda91', fontSize: 8, fontWeight: '900' },
  gameStats: { position: 'absolute', zIndex: 3, top: 55, left: 10, flexDirection: 'row', gap: 5 },
  worldFrame: { position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 19, backgroundColor: '#8db5c1', borderWidth: 1, borderColor: 'rgba(159,210,255,0.28)' },
  worldFrameLandscape: { flex: 1, minHeight: 190 },
  // Absolutely filled so the game view (and the HUD anchored to its bottom) never depends on flex height resolution.
  worldFrameGame: { ...StyleSheet.absoluteFill, width: undefined, borderRadius: 0, borderWidth: 0 },
  worldFrameGameWeb: { overflow: 'hidden' },
  worldFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17334a' },
  fallbackText: { color: '#d6e8f7', fontSize: 11 },
  retrySceneButton: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11, backgroundColor: '#9dcbff' },
  retrySceneText: { color: '#071321', fontSize: 9, fontWeight: '900' },
  mapOverlay: { position: 'absolute', top: 64, right: 10 },
  miniMap: { width: 78, height: 78, overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(8,20,35,0.78)', borderWidth: 1, borderColor: 'rgba(203,233,255,0.48)' },
  miniMapGrid: { ...StyleSheet.absoluteFill, opacity: 0.4, borderWidth: 1, borderColor: '#7391ac' },
  miniMapRing: { position: 'absolute', left: 14, top: 14, width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(153,201,245,0.35)' },
  miniMonas: { position: 'absolute', width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: 4, backgroundColor: '#ffcf77' },
  miniPoi: { position: 'absolute', width: 4, height: 4, borderRadius: 2, marginLeft: -2, marginTop: -2, backgroundColor: '#79d9bd' },
  miniPlayer: { position: 'absolute', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: 5, backgroundColor: '#81c4ff', borderWidth: 1, borderColor: '#fff' },
  miniMapLabel: { position: 'absolute', bottom: 3, width: '100%', color: '#ffe3a3', fontSize: 7, fontWeight: '900', textAlign: 'center', letterSpacing: 0.4 },
  survivalTimer: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(8,20,35,0.8)' },
  survivalTimerText: { color: '#e1efff', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  worldCaption: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(8,20,35,0.74)' },
  worldCaptionText: { color: '#d5e6f4', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  gameHudTop: { position: 'absolute', zIndex: 4, top: 8, left: 9, right: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gameStatusPill: { flexShrink: 1, maxWidth: '78%', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderRadius: 11, backgroundColor: 'rgba(7,17,30,0.78)', borderWidth: 1, borderColor: 'rgba(211,233,255,0.17)' },
  hudDivider: { width: 1, height: 13, backgroundColor: 'rgba(220,238,255,0.24)' },
  gameHudActions: { marginLeft: 'auto', flexDirection: 'row', gap: 7 },
  hudIconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(15,32,53,0.82)', borderWidth: 1, borderColor: 'rgba(210,233,255,0.34)' },
  exitGameButton: { backgroundColor: 'rgba(110,42,58,0.82)', borderColor: 'rgba(255,190,201,0.45)' },
  characterModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(3,9,17,0.72)' },
  characterModalCard: { width: '100%', maxWidth: 380, padding: 16, borderRadius: 18, backgroundColor: '#101e30', borderWidth: 1, borderColor: 'rgba(159,210,255,0.38)' },
  characterModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  characterModalTitle: { color: '#f0f7ff', fontSize: 15, fontWeight: '900' },
  characterModalSubtitle: { color: '#91a9c2', fontSize: 10, marginTop: 4 },
  characterModalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  characterModalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(163,191,220,0.16)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.035)' },
  characterModalOptionSelected: { borderColor: '#72c7ff', backgroundColor: 'rgba(69,148,211,0.2)' },
  characterModalOptionTitle: { color: '#c7d7e7', fontSize: 12, fontWeight: '800' },
  characterModalOptionTitleSelected: { color: '#f1f9ff' },
  characterModalOptionDetail: { color: '#7892ac', fontSize: 9, marginTop: 3 },
  characterModalOptionMark: { color: '#85ceff', fontSize: 18, fontWeight: '900' },
  hudLayer: { position: 'absolute', zIndex: 5 },
  quickBar: { position: 'absolute', left: 14, flexDirection: 'row', gap: 7, zIndex: 7 },
  quickButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,18,32,0.55)', borderWidth: 1, borderColor: 'rgba(190,224,255,0.55)' },
  quickButtonActive: { backgroundColor: 'rgba(255,211,110,0.28)', borderColor: '#ffd36e' },
  quickLabel: { color: '#d4e6fa', fontSize: 6, fontWeight: '900', marginTop: 2, letterSpacing: 0.3 },
  miniMapZoomBadge: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9fe3ff', borderWidth: 1, borderColor: '#ffffff' },
  mapModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(3,9,17,0.8)' },
  mapModalCard: { padding: 14, borderRadius: 20, backgroundColor: '#0d1a2b', borderWidth: 1, borderColor: 'rgba(159,210,255,0.38)', alignItems: 'center', gap: 10 },
  mapModalCardLandscape: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  mapModalSide: { width: 230, gap: 10 },
  mapModalBottom: { alignSelf: 'stretch', gap: 10 },
  mapModalHeader: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mapModalTitle: { color: '#f0f7ff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  mapModalSubtitle: { color: '#9fc4e6', fontSize: 10, marginTop: 3 },
  bigMap: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#10283a', borderWidth: 1, borderColor: 'rgba(203,233,255,0.45)' },
  bigMapGridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(140,190,230,0.14)' },
  bigMapGridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(140,190,230,0.14)' },
  bigMapZone: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bigMapZoneLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  bigMapLandmark: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: -4, marginTop: -4 },
  bigMapLandmarkDot: { width: 8, height: 8, backgroundColor: '#f0f1ed', transform: [{ rotate: '45deg' }] },
  bigMapLandmarkText: { color: '#e9f1f8', fontSize: 7, fontWeight: '800' },
  bigMapPickup: { position: 'absolute', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3, backgroundColor: '#6de7ff' },
  bigMapTarget: { position: 'absolute', width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, borderRadius: 6, borderWidth: 2 },
  bigMapMonas: { position: 'absolute', width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: 6, backgroundColor: '#ffcf77', borderWidth: 2, borderColor: '#fff3cf' },
  bigMapGuide: { position: 'absolute', width: 20, height: 20, marginLeft: -10, marginTop: -10, borderRadius: 10, borderWidth: 3, borderColor: '#ffd36e' },
  bigMapPlayer: { position: 'absolute', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f8be8', borderWidth: 2, borderColor: '#ffffff' },
  bigMapPlayerArrow: { color: '#ffffff', fontSize: 10, lineHeight: 12, marginTop: -2 },
  mapZoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapZoomChip: { minWidth: 38, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(159,210,255,0.35)' },
  mapZoomChipActive: { backgroundColor: '#9fe3ff', borderColor: '#9fe3ff' },
  mapZoomText: { color: '#cfe3f7', fontSize: 12, fontWeight: '900' },
  mapZoomTextActive: { color: '#071321' },
  mapLegend: { color: '#8fa8c2', fontSize: 9.5, lineHeight: 14, textAlign: 'center' },
  mapClearGuide: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,211,110,0.12)' },
  mapClearGuideText: { color: '#ffe2a0', fontSize: 10, fontWeight: '800' },
  worldCaptionCompact: { position: 'absolute', right: 10, bottom: 8, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(8,20,35,0.74)' },
  joystickDock: { position: 'absolute', left: 14, zIndex: 7 },
  actionDock: { position: 'absolute', right: 14, zIndex: 7 },
  joystickBase: { width: 142, height: 142, position: 'relative', alignItems: 'center', justifyContent: 'center', borderRadius: 71, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(204,231,255,0.42)' },
  joystickBaseCompact: { width: 118, height: 118, borderRadius: 59 },
  joystickBaseLandscape: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'transparent', borderColor: 'rgba(180,219,255,0.48)' },
  joystickDirection: { position: 'absolute', color: 'rgba(205,229,255,0.7)', fontSize: 10, fontWeight: '900' },
  joystickUp: { top: 8 },
  joystickDown: { bottom: 8 },
  joystickLeft: { left: 9 },
  joystickRight: { right: 9 },
  joystickKnob: { position: 'absolute', width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#438bd3', borderWidth: 2, borderColor: '#c3e4ff', shadowColor: '#9bd2ff', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 7 },
  joystickKnobCompact: { width: 46, height: 46, borderRadius: 23 },
  joystickKnobLandscape: { width: 42, height: 42, borderRadius: 21 },
  actionButtons: { width: 146, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', gap: 8 },
  actionButtonsCompact: { width: 108, gap: 5 },
  actionButtonsLandscape: { width: 290, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionCircle: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(190,224,255,0.62)' },
  actionCircleCompact: { width: 47, height: 47, borderRadius: 24 },
  actionCircleLandscape: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'transparent', borderColor: 'rgba(223,240,255,0.72)' },
  actionCircleActive: { backgroundColor: 'rgba(145,198,255,0.22)' },
  interactCircle: { backgroundColor: 'rgba(157,203,255,0.16)', borderColor: '#c6e2ff' },
  actionLabel: { color: '#bad1e9', fontSize: 6, fontWeight: '900', marginTop: 4 },
  actionLabelActive: { color: '#071321' },
  jumpGlyph: { color: '#e3c3ff', fontSize: 21, fontWeight: '900', lineHeight: 23 },
  toast: { position: 'absolute', bottom: 6, alignSelf: 'center', maxWidth: '62%', minHeight: 22, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(8,16,30,0.62)' },
  toastText: { color: '#a6bad1', fontSize: 8, textAlign: 'center' },
  cameraZoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  // Phones in portrait: the camera buttons don't fit the top bar, so they stack under the minimap.
  cameraZoomColumn: { position: 'absolute', right: 0, top: 148, flexDirection: 'column', gap: 6, marginTop: 0 },
  cameraZoomButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15,32,53,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(210,233,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTiltButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(15,32,53,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(210,233,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  cameraTiltGlyph: { color: '#eaf4ff', fontSize: 14, fontWeight: '800' },
  cheatColumn: {
    position: 'absolute',
    top: 8,
    left: 9,
    right: 12,
    maxWidth: 340,
    backgroundColor: 'rgba(3,9,17,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,208,111,0.35)',
    borderRadius: 12,
    padding: 14,
    zIndex: 100,
  },
  cheatClose: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,208,111,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheatLabel: { color: '#ffd06f', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  cheatInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,208,111,0.3)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  cheatToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,208,111,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,208,111,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // MOBA-style HUD
  mlTopLeft: { position: 'absolute', top: 8, left: 10, zIndex: 6, gap: 6 },
  mlMapFrame: { padding: 2, borderRadius: 15, backgroundColor: 'rgba(8,18,34,0.55)', borderWidth: 1, borderColor: 'rgba(255,205,110,0.7)' },
  statusStack: { gap: 3, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(6,14,28,0.72)', borderWidth: 1, borderColor: 'rgba(143,220,255,0.28)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 10 },
  statusTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  statusFill: { height: '100%', borderRadius: 3 },
  statusValue: { width: 18, color: '#e3efff', fontSize: 7.5, fontWeight: '900', textAlign: 'right' },
  mlKey: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,208,111,0.18)', borderWidth: 1, borderColor: 'rgba(255,208,111,0.5)' },
  mlTopCenter: { position: 'absolute', top: 8, alignItems: 'center', gap: 5, zIndex: 6 },
  mlScoreBar: { flexDirection: 'row', alignItems: 'center', minHeight: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,205,110,0.6)', paddingHorizontal: 4, backgroundColor: 'rgba(10,22,42,0.78)', maxWidth: '100%' },
  mlScoreSide: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, flexShrink: 1 },
  mlScoreCenter: { paddingHorizontal: 10, paddingVertical: 3, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  mlScoreTime: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  mlScoreSmall: { color: '#cfe2f7', fontSize: 8, fontWeight: '800', flexShrink: 1 },
  mlScoreTrophy: { color: '#ffda91', fontSize: 11, fontWeight: '900' },
  mlMission: { alignSelf: 'stretch', backgroundColor: 'rgba(8,16,30,0.8)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,196,95,0.45)', paddingHorizontal: 10, paddingVertical: 6 },
  mlToast: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(8,16,30,0.66)', borderWidth: 1, borderColor: 'rgba(143,220,255,0.25)' },
  mlToastText: { color: '#d5e7fa', fontSize: 9.5, fontWeight: '700', textAlign: 'center' },
  mlTopRight: { position: 'absolute', top: 8, right: 10, alignItems: 'flex-end', gap: 8, zIndex: 6 },
  mlSysRow: { flexDirection: 'row', gap: 6 },
  mlSysButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,28,50,0.82)', borderWidth: 1, borderColor: 'rgba(143,220,255,0.4)' },
  mlExit: { backgroundColor: 'rgba(120,36,56,0.86)', borderColor: 'rgba(255,170,190,0.6)' },
  mlCamera: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mlCameraColumn: { flexDirection: 'column' },
  mlCamButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,22,40,0.66)', borderWidth: 1, borderColor: 'rgba(143,220,255,0.38)' },
  mlCamText: { color: '#d7e5f7', fontSize: 10, fontWeight: '900' },
  mlCaption: { position: 'absolute', bottom: 2, alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(8,20,35,0.5)' },
  mlJoystick: { position: 'absolute', left: 16, zIndex: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,20,40,0.22)', borderWidth: 1.5, borderColor: 'rgba(143,220,255,0.4)' },
  mlJoystickRing: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(143,220,255,0.18)' },
  mlKnob: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3f8fe0', borderWidth: 2, borderColor: 'rgba(225,245,255,0.9)' },
  mlKnobInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mlCluster: { position: 'absolute', right: 16, zIndex: 7 },
  mlClusterHalo: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(143,220,255,0.16)', backgroundColor: 'rgba(8,20,40,0.12)' },
  skillOuter: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skillOuterActive: { shadowOpacity: 0.95, shadowRadius: 14 },
  skillInner: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  skillShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.12)' },
  skillGlyph: { fontWeight: '900' },
  skillLabel: { color: '#e6f2ff', fontWeight: '900', marginTop: 2, letterSpacing: 0.3 },
  skillLabelDark: { color: '#1a1206' },
  instructionOverlay: { position: 'absolute', bottom: 14, left: 12, right: 12, maxWidth: 400, zIndex: 95 },
  instructionCard: {
    backgroundColor: 'rgba(3,9,17,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(112,224,174,0.35)',
    borderRadius: 14,
    padding: 14,
  },
  instructionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  instructionTitle: { color: '#70e0ae', fontSize: 14, fontWeight: '900' },
  instructionBody: { color: '#d7e5f7', fontSize: 10, lineHeight: 15, marginBottom: 10 },
  instructionClose: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(112,224,174,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(112,224,174,0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  instructionCloseText: { color: '#70e0ae', fontSize: 10, fontWeight: '800' },
});
