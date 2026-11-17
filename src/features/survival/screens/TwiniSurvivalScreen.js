import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '../../../shared/components/Icon';
import { faArrowDown, faArrowLeft, faArrowRightFromBracket, faArrowUp, faBars, faBullseye, faCar, faMotorcycle, faMusic, faShip, faVolumeXmark, faWandMagicSparkles, faBatteryThreeQuarters, faBolt, faBoxOpen, faChevronRight, faCloudSun, faCompass, faCrosshairs, faCube, faDroplet, faGamepad, faGear, faHandSparkles, faHeart, faInfoCircle, faKey, faKitMedical, faLocationArrow, faMagnifyingGlassPlus, faMapLocationDot, faPlay, faPlus, faMinus, faRankingStar, faSearch, faShieldHeart, faShirt, faStore, faTowerBroadcast, faTrophy, faUser, faVideo, faWallet, faWifi, faWind, faXmark } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import { LinearGradient } from 'expo-linear-gradient';
import TwiniMenuBackdrop, { CyclingTwini, MenuOverlayFx, useHappyMusic } from '../components/TwiniMenuBackdrop';
import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, environmentById, localizeLandmark, localizeObject, localizeTarget, localizeZone } from '../data/environments';
import SurvivalWorldScene, { MONAS_TOWER_HALF, RUN_SPEED, WALK_SPEED } from '../components/SurvivalWorldScene';
import { VEHICLE_TYPES, seatOf, spawnVehicles, vehicleLocalToWorld } from '../components/Vehicles';
import { PIER, WADE_R } from '../components/Ocean';
import OpenStreetMapEmbed from '../../maps/components/OpenStreetMapEmbed';
import glbModels from '../../library/data/glbModels';
import { useAuth } from '../../auth/data/AuthContext';
import useTwinGame from '../../game/state/useTwinGame';
import { STATUS, progressRatio, remainingSeconds } from '../../game/engine/missionEngine';
import { OBJECT_TYPES, WEATHER_LABEL, WORLD_OBJECTS, ZONES, ambientWeatherAt, lightingFor, nearestInteractable, safeZoneAt, tickSurvival, timeOfDayAt, zoneAt } from '../../game/engine/worldRules';
import MissionCenter from '../../game/components/MissionCenter';
import TwinHub from '../../game/components/TwinHub';
import CityGrowthPanel from '../../game/components/CityGrowthPanel';
import DistrictPanel from '../../game/components/DistrictPanel';
import CosmeticsPanel from '../../game/components/CosmeticsPanel';
import CoopPanel from '../../game/components/CoopPanel';
import { coopApi } from '../../game/services/coopApi';
import { addGrowthPoints, buildOnPlot, createGrowthState, normalizeGrowthState, recordWabahDown } from '../../game/engine/cityGrowth';
import { buildOnDistrictPlot, buyPlot, collectDistrictIncome, createDistrictState, districtSummary, normalizeDistrictState } from '../../game/engine/district';
import { applyProfileToAll, buyCosmetic, cosmeticsForDisciplineChange, cosmeticsSummary, defaultCosmetics, equipCosmetic, normalizeCosmetics, profileFor, toggleCosmeticSlot, unequipCosmeticSlot } from '../../game/engine/cosmetics';
import { DISTRICT_PLOTS } from '../data/districtPlots';
import { SLOT_META } from '../data/disciplineCosmetics';
import { DISCIPLINES, DEFAULT_DISCIPLINE, disciplineById, disciplineEffects } from '../data/disciplines';
import { WABAH_SPAWNS, wabahType } from '../data/wabah';
import { NPCS, npcById } from '../data/npcs';
import { startPointFor } from '../data/startPoints';
import { SHOP_DISTRICT, nearestShopBuilding } from '../data/shopDistrict';
import ShopPanel from '../../game/components/ShopPanel';
import NpcDialogue from '../../game/components/NpcDialogue';
import {
  buildingUpgradeBonus as buildingBonusFor, buyAccessory, buyBuildingUpgrade, buyVehicleUpgrade, buyWeapon,
  createLoadout, equipWeapon, normalizeLoadout, shotIntervalMs, toggleAccessory,
  vehicleStats as vehicleStatsFor, weaponStats as weaponStatsFor,
} from '../engine/loadout';
import { MissionCompleteBanner, QuizPanel, ScanProgress, TwinInfoPanel } from '../../game/components/InteractionPanels';

const PLAYABLE_CHARACTERS = glbModels.filter(({ id }) => ['twini-idtc', 'insan-adhi', 'insan-adhi-w01', 'dni-01', 'dni-02'].includes(id));

// Thumbnail art per playable character (reuses the bundled role renders, so no extra asset weight).
// Shown instead of the old "3D GLB" text labels in the TWINI menu and the character settings sheet.
const CHARACTER_ART = {
  'twini-idtc': require('../../../assets/splash/twini_engineer.jpg'),
  'insan-adhi': require('../../../assets/splash/twini_scientist.jpg'),
  'insan-adhi-w01': require('../../../assets/splash/twini_geodesy.jpg'),
  'dni-01': require('../../../assets/splash/twini_mechanical.jpg'),
  'dni-02': require('../../../assets/splash/twini_urban.jpg'),
};
const characterArt = (id) => CHARACTER_ART[id] || CHARACTER_ART['twini-idtc'];
// Profil aksesori dibuat untuk setiap karakter yang bisa dimainkan.
const CHARACTER_IDS = PLAYABLE_CHARACTERS.map((character) => character.id);
const CHARACTER_PROFILES = PLAYABLE_CHARACTERS.map((character) => ({ id: character.id, name: character.name, art: characterArt(character.id) }));

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
const MAX_AMMO = 10;
const TELEPORT_COST = 4;
const VEHICLE_ICON = { car: faCar, motor: faMotorcycle, boat: faShip };
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

const MiniMap = React.memo(function MiniMap({ playerPosition, targets = [], vehicles = [], wabah = [], size = 78, label = 'MONAS ZONE' }) {
  const k = size / 78;
  const pos = ([x, z], margin = 5) => ({ left: `${Math.max(margin, Math.min(100 - margin, 50 + x * MAP_SCALE))}%`, top: `${Math.max(margin, Math.min(100 - margin, 50 + z * MAP_SCALE))}%` });
  return <View style={[styles.miniMap, { width: size, height: size }]}>
    <View style={styles.miniMapGrid} />
    {ZONES.map((zone) => <View key={zone.id} style={[styles.miniZone, pos(zone.center, 4), { borderColor: zone.color, width: zone.radius * MAP_SCALE * 2.2 * k, height: zone.radius * MAP_SCALE * 2.2 * k, marginLeft: -zone.radius * MAP_SCALE * 1.1 * k, marginTop: -zone.radius * MAP_SCALE * 1.1 * k }]} />)}
    <View style={[styles.miniMonas, { left: '50%', top: '50%' }]} />
    {targets.map((object) => <View key={object.id} style={[styles.miniPoi, pos(object.position, 6), { backgroundColor: OBJECT_TYPES[object.type].color }]} />)}
    {vehicles.map((v, i) => <View key={`v${i}`} style={[styles.miniVehicle, pos(v, 6)]} />)}
    {wabah.map((spawn) => <View key={spawn.id} style={[styles.miniWabah, pos(spawn.position, 6), { backgroundColor: wabahType(spawn.kind).color }]} />)}
    <View style={[styles.miniPlayer, pos(playerPosition)]} />
    <Text numberOfLines={1} style={styles.miniMapLabel}>{label}</Text>
  </View>;
}, (a, b) => a.size === b.size && a.label === b.label && (a.vehicles || []).join() === (b.vehicles || []).join()
  && (a.wabah || []).map((w) => w.id).join() === (b.wabah || []).map((w) => w.id).join()
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

function LiveSpeedometer({ controlRef, boost, bottom }) {
  const [kmh, setKmh] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setKmh(Math.round(Math.abs(controlRef.current?.vehicle?.speed || 0) * 5)), 150);
    return () => clearInterval(id);
  }, [controlRef]);
  const v = controlRef.current?.vehicle;
  if (!v) return null;
  return <View pointerEvents="none" style={[styles.speedo, { bottom }]}>
    <FontAwesomeIcon icon={VEHICLE_ICON[v.type]} size={13} color="#7fe7ff" />
    <Text style={styles.speedoValue}>{kmh}</Text>
    <Text style={styles.speedoUnit}>km/j{boost ? ' · TURBO' : ''}</Text>
  </View>;
}

// Mini map fed straight from the live movement controller: it refreshes on its own (4x/s) without
// re-rendering the whole game screen.
function LiveMiniMap({ controlRef, fallback, ...rest }) {
  const [pos, setPos] = useState(fallback);
  const [vehicles, setVehicles] = useState([]);
  useEffect(() => {
    const id = setInterval(() => {
      const c = controlRef.current;
      const p = c?.pos;
      if (p) setPos((prev) => (Math.hypot(prev[0] - p[0], prev[1] - p[1]) > 0.3 ? [p[0], p[1]] : prev));
      // Free vehicles show as green squares.
      const list = (c?.vehicles || []).filter((v) => v !== c.vehicle).map((v) => [Math.round(v.pos[0]), Math.round(v.pos[1])]);
      setVehicles((prev) => (prev.join() === list.join() ? prev : list));
    }, 250);
    return () => clearInterval(id);
  }, [controlRef]);
  return <MiniMap playerPosition={pos} vehicles={vehicles} {...rest} />;
}

// Environment picker: same missions, different world. Used on the TWINI menu and in the in-game settings.
function EnvironmentPicker({ value, onChange, compact = false }) {
  return <View style={styles.envGrid}>
    {ENVIRONMENTS.map((env) => {
      const selected = env.id === value;
      return <TouchableOpacity key={env.id} onPress={() => onChange(env.id)} activeOpacity={0.8} style={[styles.envCard, compact && styles.envCardCompact, selected && { borderColor: env.accent, backgroundColor: `${env.accent}22` }]} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Pilih environment ${env.name}`}>
        <Text style={styles.envEmoji}>{env.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.envName, selected && { color: env.accent }]}>{env.name}</Text>
          {!compact ? <Text numberOfLines={1} style={styles.envSubtitle}>{env.subtitle}</Text> : null}
        </View>
        {selected ? <Text style={[styles.envCheck, { color: env.accent }]}>✓</Text> : null}
      </TouchableOpacity>;
    })}
  </View>;
}

const WORLD_HALF = 50 / MAP_SCALE; // the mini-map spans +-43.5 world units
const clampValue = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Enlarged map (tap the mini-map): zoom 1x-4x centred on Twini, labels, facing arrow; tap a spot to set a waypoint.
function WorldMap({ size, zoom, playerPosition, facing, targets = [], pickups = [], vehicles = [], wabah = [], guide, onPickPoint, envId = DEFAULT_ENVIRONMENT }) {
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
          <Text numberOfLines={1} style={[styles.bigMapZoneLabel, { color: zone.color }]}>{localizeZone(envId, zone).short}</Text>
        </View>;
      })}
      {LANDMARKS.map((landmark) => {
        const c = toPx(landmark.position);
        if (!inside(c)) return null;
        return <View key={landmark.id} style={[styles.bigMapLandmark, { left: c.left, top: c.top }]}><View style={styles.bigMapLandmarkDot} /><Text numberOfLines={1} style={styles.bigMapLandmarkText}>{localizeLandmark(envId, landmark).short}</Text></View>;
      })}
      {pickups.map((position, index) => { const c = toPx(position); return inside(c) ? <View key={`p${index}`} style={[styles.bigMapPickup, c]} /> : null; })}
      {vehicles.map((v) => { const c = toPx(v.pos); return inside(c) ? <Text key={v.id} style={[styles.bigMapVehicle, c]}>{VEHICLE_TYPES[v.type].emoji}</Text> : null; })}
      {wabah.map((spawn) => { const c = toPx(spawn.position); return inside(c) ? <Text key={spawn.id} style={[styles.bigMapWabah, c]}>{wabahType(spawn.kind).icon}</Text> : null; })}
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
  const [environmentId, setEnvironmentId] = useState(DEFAULT_ENVIRONMENT);
  const environment = environmentById(environmentId);
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
  // Disiplin ilmu karakter + ruangan co-op aktif. Declared before useTwinGame because the game hook
  // receives their refs/callbacks, and because it feeds the perk values into every reward.
  const [growth, setGrowth] = useState(createGrowthState);
  const [district, setDistrict] = useState(createDistrictState);
  const [cosmetics, setCosmetics] = useState(() => defaultCosmetics(DEFAULT_DISCIPLINE, CHARACTER_IDS));
  const [districtNotice, setDistrictNotice] = useState('');
  const [cosmeticsNotice, setCosmeticsNotice] = useState('');
  const [disciplineId, setDisciplineId] = useState(DEFAULT_DISCIPLINE);
  // Loadout (senjata/aksesori/upgrade) + dialog warga. `loadout` disimpan di saveExtra.
  const [loadout, setLoadout] = useState(createLoadout);
  const [shopNotice, setShopNotice] = useState('');
  const [shopTab, setShopTab] = useState('weapons');
  const [npcTalk, setNpcTalk] = useState(null); // { id, line, claimed }
  const talkedNpcs = useRef([]);
  const weapon = useMemo(() => weaponStatsFor(loadout), [loadout]);
  const cityBonus = useMemo(() => buildingBonusFor(loadout), [loadout]);
  const vehiclePerf = useMemo(() => vehicleStatsFor(loadout), [loadout]);
  const [coopCode, setCoopCode] = useState(null);
  const [coopRoom, setCoopRoom] = useState(null);
  const perks = useMemo(() => disciplineEffects(disciplineId), [disciplineId]);
  const ammoCap = weapon.ammo + (perks.ammoBonus || 0);
  const interactRadius = 2.6 + (perks.interactRadius || 0);
  const coopRef = useRef({ code: null, token: null });
  const coopLastReport = useRef({});
  const perksRef = useRef(perks);
  perksRef.current = perks;
  const { user } = useAuth();
  // Event gameplay diteruskan ke ruangan co-op (jika ada); server menggabungkan progres tim.
  const reportCoop = useCallback((event) => {
    const { code, token } = coopRef.current;
    if (!code || !token || !event?.type) return;
    const key = `${event.type}:${event.target || ''}`;
    const nowMs = Date.now();
    if (coopLastReport.current[key] && nowMs - coopLastReport.current[key] < 600) return;
    coopLastReport.current[key] = nowMs;
    coopApi.reportProgress(token, code, { event: event.type, amount: event.amount || 1, target: event.target })
      .then((room) => { if (room) setCoopRoom(room); })
      .catch(() => {});
  }, []);
  const twin = useTwinGame({
    userKey: user?.id || 'guest',
    onMissionComplete: (mission) => {
      if (!mission) return;
      setBanner(mission);
      const extra = perksRef.current.growthMission || 0;
      if (extra) setGrowth((state) => addGrowthPoints(state, extra));
    },
    onNotice: (text) => setMessage(text),
    onEvent: reportCoop,
  });
  coopRef.current = { code: coopCode, token: twin.session?.token || null };
  // XP dengan bonus disiplin (Data Science +20%, dsb).
  const gainXp = useCallback((amount) => {
    const value = Math.max(0, Math.round(Number(amount || 0) * (1 + (perksRef.current.xpBonus || 0))));
    if (value) setXp((current) => current + value);
  }, []);
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
  // Vehicles, launcher and teleport.
  const [riding, setRiding] = useState(null); // { id, type, name } while driving
  const [nearVehicle, setNearVehicle] = useState(null);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [dronesDown, setDronesDown] = useState(0);
  const [showTeleport, setShowTeleport] = useState(false);
  const lastShot = useRef(0);
  const lastTeleport = useRef(0);
  // Wabah panel → fire is queued until the 3D scene of the game panel is mounted.
  const wabahFireAt = useRef(0);
  // Happy background tune: full volume in the menus, quiet under the game.
  const [musicOn, setMusicOn] = useState(true);
  const musicAvailable = useHappyMusic(musicOn, panel === 'game' ? 0.25 : 0.6);
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
  if (!moveControl.current) moveControl.current = { input: { dx: 0, dz: 0 }, auto: null, pos: [playerPosition[0], playerPosition[1]], vel: [0, 0], facing: { dx: 0, dz: 1 }, running: false, enabled: true, distance: 0, dashT: 0, dashV: [0, 0], lockFacing: false, speed: 0, vehicle: null, vehicles: [], seat: null, fireSeq: 0, teleport: null, onCombat: null };
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
      setAmmo((value) => (value >= ammoCap ? value : value + 1));
      if (runningRef.current) runTimeRef.current += 1;
      // Stamina only drains while running and recovers otherwise (faster when standing still).
      else setStamina((value) => (value >= 100 ? value : Math.min(100, value + (movingRef.current ? 3 : 6))));
      if (next > 0 && next % 30 === 0) setEnergy((value) => Math.max(0, value - 3));
      if (next > 0 && next % 60 === 0) setHealth((value) => Math.max(0, value - 1));
      survivalTick.current?.();
    }, 1000);
    return () => clearInterval(timer.current);
  }, [panel, gameComplete, ammoCap]);
  // Senjata baru punya kapasitas sel berbeda: jangan biarkan ammo melebihi kapasitas.
  useEffect(() => { setAmmo((value) => Math.min(value, ammoCap)); }, [ammoCap]);
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
    if (control.vehicle) { control.vehicle.speed = 0; control.vehicle.vel = [0, 0]; control.vehicle = null; control.seat = null; setRiding(null); }
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
  const nearTarget = panel === 'game' && !interaction ? localizeTarget(environmentId, nearestInteractable(playerPosition, twin.objectState, Date.now(), interactRadius)) : null;
  // Warga terdekat (radius 2.8 m). INTERACT memprioritaskan percakapan sebelum objek misi.
  const nearNpc = useMemo(() => {
    if (panel !== 'game' || interaction || npcTalk) return null;
    let best = null;
    NPCS.forEach((npc) => {
      const distance = Math.hypot(npc.position[0] - playerPosition[0], npc.position[1] - playerPosition[1]);
      if (distance <= 2.8 && (!best || distance < best.distance)) best = { npc, distance };
    });
    return best ? best.npc : null;
  }, [panel, interaction, npcTalk, playerPosition]);
  // Pintu bangunan distrik toko terdekat (radius 3,2 m) → INTERACT membuka tab toko yang sesuai.
  const nearShop = useMemo(() => {
    if (panel !== 'game' || interaction || npcTalk) return null;
    const hit = nearestShopBuilding(playerPosition[0], playerPosition[1]);
    return hit ? hit.building : null;
  }, [panel, interaction, npcTalk, playerPosition]);
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
  snapshot.current = { health, energy, stamina, battery, hydration, supply, inventory, playerPosition, survivalSeconds, xp, coins, foundLandmarks, selectedCharacterId, cameraSensitivity, environmentId, dronesDown, growth, disciplineId, coopCode, loadout, talkedNpcs: talkedNpcs.current, district, cosmetics };
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
    if (saved.environmentId && environmentById(saved.environmentId).id === saved.environmentId) setEnvironmentId(saved.environmentId);
    if (saved.cameraSensitivity) setCameraSensitivity(saved.cameraSensitivity);
    if (saved.growth) setGrowth(normalizeGrowthState(saved.growth));
    if (saved.district) setDistrict(normalizeDistrictState(saved.district));
    if (saved.cosmetics) setCosmetics(normalizeCosmetics(saved.cosmetics, saved.disciplineId || DEFAULT_DISCIPLINE, CHARACTER_IDS));
    if (saved.disciplineId && DISCIPLINES.some((item) => item.id === saved.disciplineId)) setDisciplineId(saved.disciplineId);
    if (saved.coopCode) setCoopCode(saved.coopCode);
    if (saved.loadout) setLoadout(normalizeLoadout(saved.loadout));
    if (Array.isArray(saved.talkedNpcs)) talkedNpcs.current = saved.talkedNpcs.filter((id) => npcById(id));
    if (Number.isFinite(saved.dronesDown)) setDronesDown(saved.dronesDown);
  }, [twin.ready, twin.savedExtra, user?.id]);
  useEffect(() => {
    if (!twin.ready) return undefined;
    const interval = setInterval(() => { if (restoredKey.current) twin.saveExtra(snapshot.current); }, 5000);
    return () => clearInterval(interval);
  }, [twin.ready, twin.saveExtra]);

  // Disiplin baru = set atribut baru; item emas yang sudah dibeli untuk disiplin itu tetap tersimpan.
  useEffect(() => {
    setCosmetics((previous) => (previous.disciplineId === disciplineId ? previous : cosmeticsForDisciplineChange(previous, disciplineId, CHARACTER_IDS)));
  }, [disciplineId]);

  // Zone entry drives exploration missions and zone effects.
  useEffect(() => {
    if (panel !== 'game') return;
    const zone = zoneAt(playerPosition);
    if ((zone?.id || null) === (currentZone?.id || null)) return;
    setCurrentZone(localizeZone(environmentId, zone));
    if (zone) {
      twin.emit({ type: 'explore_zone', id: zone.id });
      setMessage(`Memasuki ${localizeZone(environmentId, zone).name}${zone.interference ? ' · gangguan sinyal (simulasi)' : ''}${zone.hazard ? ' · hazard simulasi, cari shelter' : ''}`);
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
    const next = tickSurvival({ health, hydration, connection: battery, supply }, { running, moving, zone, safe, storm, healBonus: perks.healBonus || 0 });
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
    const landmark = localizeLandmark(environmentId, LANDMARKS.find((item) => Math.hypot(item.position[0] - position[0], item.position[1] - position[1]) <= 2.3));
    setNearbyLandmark(landmark || null);
    if (landmark && !foundLandmarks.includes(landmark.id)) {
      setFoundLandmarks((current) => current.includes(landmark.id) ? current : [...current, landmark.id]);
      gainXp(60);
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
      setMessage(running ? `Berlari menjelajah ${environment.name}…` : `Menjelajah ${environment.name}…`);
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
  const tiltCameraDown = () => setCameraTilt((v) => Math.max(-1.8, v - 0.2)); // down to a low, foot-level view
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
  const lastPush = useRef({ key: '', pos: [0, 0], t: 0 });
  movementSyncRef.current = () => {
    const control = moveControl.current;
    control.running = running;
    facingDirection.current = control.facing;
    const wantsToMove = !!(control.input.dx || control.input.dz || control.auto);
    if (control.exhausted && wantsToMove && Date.now() - lastMovementMessage.current > 4000) {
      lastMovementMessage.current = Date.now();
      setMessage(energy <= 0 ? '😮‍💨 Energi habis — Twini berjalan pelan. Pakai Battery / misi untuk memulihkan.' : '😮‍💨 Twini kelelahan — berjalan pelan, stamina pulih saat tidak berlari.');
    }
    if (running && stamina <= 0 && !control.vehicle) setRunning(false);
    // Vehicle proximity (contextual NAIK button) and ride state (environment switch drops the vehicle).
    if (riding && !control.vehicle) setRiding(null);
    if (!control.vehicle) {
      const hit = findNearVehicle();
      const id = hit ? hit.id : null;
      if ((nearVehicle?.id || null) !== id) setNearVehicle(hit ? { id: hit.id, type: hit.type, name: hit.name } : null);
    } else if (nearVehicle) setNearVehicle(null);
    const travelled = control.distance;
    if (travelled < 0.004) return;
    // Re-rendering the whole game screen is expensive on phones, so the live position is only pushed into
    // React state when the gameplay-relevant situation changes (nearest object, zone, landmark, Energy Core),
    // after a longer walk, or at most every 1.5 s. Everything that must follow Twini every frame (avatar,
    // camera, shadow, guide arrows, mini map) reads the live controller directly.
    const here = control.pos;
    const near = nearestInteractable(here, twin.objectState, Date.now(), interactRadius);
    const zone = zoneAt(here);
    const landmark = LANDMARKS.find((item) => Math.hypot(item.position[0] - here[0], item.position[1] - here[1]) <= 2.3);
    const core = PICKUPS.findIndex(([x, z], index) => !foundPickups.includes(index) && Math.hypot(x - here[0], z - here[1]) <= 2.25);
    const key = `${near?.object.id || ''}|${near?.cooling ? 1 : 0}|${zone?.id || ''}|${landmark?.id || ''}|${core}`;
    const last = lastPush.current;
    const farWalk = Math.hypot(here[0] - last.pos[0], here[1] - last.pos[1]) > 2.5;
    if (key === last.key && !farWalk && Date.now() - last.t < 1500) return;
    control.distance = 0;
    const next = [here[0], here[1]];
    lastPush.current = { key, pos: next, t: Date.now() };
    syncedPos.current.add(next);
    setPlayerPosition(next);
    if (!control.vehicle) {
      if (running) setStamina((value) => Math.max(0, value - travelled * (3.6 / RUN_SPEED)));
      setEnergy((value) => Math.max(0, value - travelled * (running ? 1.2 / RUN_SPEED : 0.35 / WALK_SPEED)));
    }
    announceNearby(next);
    if (!LANDMARKS.some((point) => Math.hypot(point.position[0] - next[0], point.position[1] - next[1]) <= 2.3) && Date.now() - lastMovementMessage.current > 1500) {
      lastMovementMessage.current = Date.now();
      setMessage(control.vehicle ? `${VEHICLE_TYPES[control.vehicle.type].emoji} Berkendara di ${environment.name}…` : running ? `Berlari menjelajah ${environment.name}…` : `Menjelajah ${environment.name}…`);
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
    const actionKeys = { f: 'fire', e: 'ride', t: 'teleport', ' ': 'jump' };
    const handleKeyDown = (event) => {
      if (isTyping(event)) return;
      const key = event.key.toLowerCase();
      if (actionKeys[key] && !event.repeat) { event.preventDefault(); hudActions.current[actionKeys[key]]?.(); return; }
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

  // ---------- warga (NPC) ----------
  const talkToNpc = (npc) => {
    if (!npc) return;
    stopMovement();
    const first = !talkedNpcs.current.includes(npc.id);
    if (first) {
      talkedNpcs.current = [...talkedNpcs.current, npc.id];
      setCoins((value) => value + npc.reward.coins);
      gainXp(npc.reward.xp);
      twin.emit({ type: 'talk_npc', id: npc.id });
      setMessage(`💬 ${npc.name}: “${npc.greeting}” · +${npc.reward.coins} koin · +${npc.reward.xp} XP`);
    } else {
      setMessage(`💬 ${npc.name}: “${npc.greeting}”`);
    }
    setNpcTalk({ id: npc.id, line: 0, claimed: !first });
  };
  const nextNpcLine = () => setNpcTalk((state) => {
    if (!state) return state;
    const npc = npcById(state.id);
    const total = 1 + (npc?.lines?.length || 0);
    return { ...state, line: Math.min(state.line + 1, total - 1) };
  });

  // ---------- toko & upgrade ----------
  const openShop = (tab = 'weapons') => {
    stopMovement();
    setShopTab(tab);
    setShopNotice('');
    setPanel('shop');
  };
  const buyWeaponItem = (id) => {
    const result = buyWeapon(loadout, coins, id);
    if (!result.ok) { setShopNotice(result.error); return; }
    setLoadout(result.loadout);
    setCoins(result.coins);
    setShopNotice(`✅ ${result.loadout.equippedWeapon.toUpperCase()} dibeli & langsung dipakai (−${result.cost} koin).`);
  };
  const equipWeaponItem = (id) => {
    const result = equipWeapon(loadout, id);
    if (!result.ok) { setShopNotice(result.error); return; }
    setLoadout(result.loadout);
    setShopNotice(`✅ Senjata diganti ke ${weaponStatsFor(result.loadout).name}.`);
  };
  const buyAccessoryItem = (id) => {
    const result = buyAccessory(loadout, coins, id);
    if (!result.ok) { setShopNotice(result.error); return; }
    setLoadout(result.loadout);
    setCoins(result.coins);
    setShopNotice(`✅ Aksesori dipasang (−${result.cost} koin).`);
  };
  const toggleAccessoryItem = (id) => {
    const wasActive = loadout.accessories.includes(id);
    setLoadout((current) => toggleAccessory(current, id));
    setShopNotice(wasActive ? 'Aksesori dilepas — tetap dimiliki, bisa dipasang lagi gratis.' : 'Aksesori dipasang kembali.');
  };
  const buyBuildingItem = (id) => {
    const result = buyBuildingUpgrade(loadout, coins, id);
    if (!result.ok) { setShopNotice(result.error); return; }
    setLoadout(result.loadout);
    setCoins(result.coins);
    setShopNotice(`✅ Upgrade aset kota aktif (−${result.cost} koin).`);
  };
  const buyVehicleItem = (id) => {
    const result = buyVehicleUpgrade(loadout, coins, id);
    if (!result.ok) { setShopNotice(result.error); return; }
    setLoadout(result.loadout);
    setCoins(result.coins);
    setShopNotice(`✅ Upgrade kendaraan aktif (−${result.cost} koin).`);
  };
  // Beli aset kota secara langsung: tukar koin menjadi Poin Pertumbuhan Kota.
  const buyGrowthPack = (points, cost) => {
    if (coins < cost) { setShopNotice(`Koin kurang ${cost - coins}.`); return; }
    setCoins((value) => value - cost);
    setGrowth((state) => addGrowthPoints(state, points));
    setShopNotice(`✅ +${points} Poin Pertumbuhan Kota (−${cost} koin). Buka Wabah & Pertumbuhan Kota untuk membangun.`);
  };

  const interact = () => {
    if (nearNpc) { talkToNpc(nearNpc); return; }
    if (nearShop) { openShop(nearShop.panel); return; }
    const here = [moveControl.current.pos[0], moveControl.current.pos[1]];
    const pickupIndex = PICKUPS.findIndex(([x, z], index) => !foundPickups.includes(index) && Math.hypot(x - here[0], z - here[1]) <= 2.25);
    if (pickupIndex >= 0) {
      setFoundPickups((current) => [...current, pickupIndex]);
      pickupTimes.current[pickupIndex] = Date.now();
      setInventory((value) => ({ ...value, crystals: value.crystals + 1 }));
      setEnergy((value) => Math.min(100, value + 8));
      setBattery((value) => Math.min(100, value + 5));
      setCoins((value) => value + 15);
      gainXp(40);
      twin.emit({ type: 'collect_core' });
      setMessage('Energy Core didapatkan · energi +8 · +40 XP');
      return;
    }
    const target = interaction ? null : localizeTarget(environmentId, nearestInteractable(here, twin.objectState, Date.now(), interactRadius));
    if (target) {
      handleObject(target);
      return;
    }
    // INTERACT also boards a vehicle standing next to Twini.
    const parked = moveControl.current.vehicle ? null : findNearVehicle();
    if (parked) { board(parked); return; }
    setMessage(nearbyLandmark ? `Kamu berada di ${nearbyLandmark.name}. Terus jelajahi dan interaksi dengan objek terdekat.` : 'Belum ada objek di dekatmu. Bergerak ke marker pada mini map.');
  };

  const handleObject = ({ object, type, state, cooling }) => {
    if (cooling) { setMessage(`${object.name} sedang diisi ulang · ${cooling} detik`); return; }
    switch (type.action) {
      case 'activate':
        twin.updateObject(object.id, { done: true });
        twin.emit({ type: 'activate_sensor', id: object.id });
        setBattery((value) => Math.min(100, value + 10));
        gainXp(40);
        setMessage(`${object.name} aktif · data IoT tersambung (simulasi) · +40 XP`);
        return;
      case 'identify':
        stopMovement();
        setInteraction({ phase: 'scan', objectId: object.id });
        return;
      case 'rescue':
        twin.updateObject(object.id, { done: true });
        twin.emit({ type: 'rescue_npc', id: object.id });
        gainXp(60);
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

  const interactionObject = interaction ? localizeObject(environmentId, WORLD_OBJECTS.find((object) => object.id === interaction.objectId)) : null;
  const scanDone = useRef(null);
  scanDone.current = () => {
    if (!interactionObject) return;
    const { id } = interactionObject;
    const type = OBJECT_TYPES[interactionObject.type];
    if (type.action === 'identify') {
      twin.updateObject(id, { done: true });
      twin.emit({ type: 'identify_pollution', id });
      gainXp(50);
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
      gainXp(30);
      setMessage(`${name} tersinkron dengan Digital Twin pusat · +30 XP`);
    } else if (type.action === 'repair') {
      setSupply((value) => Math.max(0, value - type.supplyCost));
      twin.updateObject(id, { repaired: true });
      twin.emit({ type: 'repair_drainage', id });
      gainXp(70);
      setMessage(`${name} diperbaiki · aliran air normal (simulasi) · +70 XP`);
    } else if (type.action === 'restore_station') {
      setSupply((value) => Math.max(0, value - type.supplyCost));
      twin.updateObject(id, { restored: true, lastCharge: Date.now() });
      twin.emit({ type: 'restore_station', id });
      setEnergy((value) => Math.min(100, value + 30));
      gainXp(70);
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
      gainXp(80);
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
    if (moveControl.current.vehicle) { setMessage('Turun dulu dari kendaraan untuk melompat (tombol TURUN / E).'); return; }
    setJumping(true);
    setStamina((value) => Math.max(0, value - 6));
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setJumping(false), 480);
  };

  // DASH / BACK: a short velocity burst integrated by the scene (smooth, frame-synced).
  const moveBurst = (direction, distance = 1) => {
    const control = moveControl.current;
    if (control.vehicle) { setMessage('🚀 Saat berkendara gunakan RUN sebagai TURBO.'); return; }
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
    if (!best) LANDMARKS.forEach((landmark) => consider(landmark.position, localizeLandmark(environmentId, landmark).name));
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

  // ---------- vehicles ----------
  const isWalkable = (x, z) => {
    const world = moveControl.current.world;
    return !(Math.abs(x) < MONAS_TOWER_HALF && Math.abs(z) < MONAS_TOWER_HALF) && (!world || world.walkable(x, z));
  };
  function findNearVehicle() {
    const c = moveControl.current;
    let best = null;
    let bestD = Infinity;
    (c.vehicles || []).forEach((v) => {
      const d = Math.hypot(v.pos[0] - c.pos[0], v.pos[1] - c.pos[1]);
      if (d < VEHICLE_TYPES[v.type].reach + 0.6 && d < bestD) { best = v; bestD = d; }
    });
    return best;
  }
  const board = (v) => {
    const c = moveControl.current;
    c.vehicle = v;
    c.seat = seatOf(v);
    c.dashT = 0;
    setPatrolMode(false);
    setRiding({ id: v.id, type: v.type, name: v.name });
    setNearVehicle(null);
    const T = VEHICLE_TYPES[v.type];
    setMessage(`${T.emoji} Naik ${T.label} · ▲ gas · ▼ rem/mundur · ◀▶ belok · RUN = turbo · FIRE tetap bisa`);
  };
  const exitVehicle = () => {
    const c = moveControl.current;
    const v = c.vehicle;
    if (!v) return;
    if (Math.abs(v.speed) > 3.5) { setMessage('Pelankan kendaraan dulu sebelum turun.'); return; }
    const T = VEHICLE_TYPES[v.type];
    let spot = null;
    for (const local of [[-T.exit, 0, 0], [T.exit, 0, 0], [0, 0, -2.8], [0, 0, 2.8]]) {
      const [x, , z] = vehicleLocalToWorld(v, local);
      if (isWalkable(x, z)) { spot = [x, z]; break; }
    }
    if (!spot && v.type === 'boat') {
      // Moor at the nearest pier plank or beach within reach.
      const px = Math.max(PIER.x0 + 0.4, Math.min(PIER.x1 - 0.4, v.pos[0]));
      const pz = Math.max(PIER.z0 + 0.4, Math.min(PIER.z1 - 0.4, v.pos[1]));
      const r = Math.hypot(v.pos[0], v.pos[1]) || 1;
      if (Math.hypot(px - v.pos[0], pz - v.pos[1]) < 4.2) spot = [px, pz];
      else if (r < WADE_R + 6) spot = [(v.pos[0] / r) * (WADE_R - 0.8), (v.pos[1] / r) * (WADE_R - 0.8)];
    }
    if (!spot) { setMessage('🚤 Merapat ke pantai atau dermaga dulu untuk turun.'); return; }
    v.speed *= 0.2;
    c.vehicle = null;
    c.seat = null;
    c.pos[0] = spot[0]; c.pos[1] = spot[1];
    c.vel[0] = 0; c.vel[1] = 0;
    c.facing = { dx: Math.sin(v.yaw), dz: Math.cos(v.yaw) };
    const next = [spot[0], spot[1]];
    syncedPos.current.add(next);
    setPlayerPosition(next);
    setRiding(null);
    setMessage(`Turun dari ${T.label}.`);
  };
  const toggleRide = () => {
    if (moveControl.current.vehicle) { exitVehicle(); return; }
    const v = findNearVehicle();
    if (v) { board(v); return; }
    // Nothing in reach: point the yellow guide arrows at the closest vehicle.
    const c = moveControl.current;
    let best = null;
    (c.vehicles || []).forEach((item) => { const d = Math.hypot(item.pos[0] - c.pos[0], item.pos[1] - c.pos[1]); if (!best || d < best.d) best = { item, d }; });
    if (!best) { setMessage('Belum ada kendaraan di environment ini.'); return; }
    setWaypoint([best.item.pos[0], best.item.pos[1]], best.item.name, true);
    setMessage(`${VEHICLE_TYPES[best.item.type].emoji} ${best.item.name} · ${Math.round(best.d)} m — ikuti panah kuning, lalu tekan NAIK (atau TELE untuk langsung naik)`);
  };

  // ---------- launcher ----------
  const fire = () => {
    const now = Date.now();
    const cooldownMs = shotIntervalMs(weapon, perks.fireCooldown || 1);
    if (now - lastShot.current < cooldownMs) return;
    if (ammo <= 0) { setMessage(`🔋 Sel ${weapon.name} habis — terisi otomatis +1 tiap detik.`); return; }
    lastShot.current = now;
    moveControl.current.fireSeq = (moveControl.current.fireSeq || 0) + 1;
    setAmmo((value) => Math.max(0, value - 1));
  };
  moveControl.current.onCombat = (event) => {
    if (event.type !== 'hit') return;
    setDronesDown((value) => value + 1);
    gainXp(30);
    setCoins((value) => value + 8);
    setMessage(`🎯 Drone polusi${event.sea ? ' laut' : ''} dihancurkan! +30 XP · +8 koin`);
  };

  // ---------- wabah digital & pertumbuhan kota ----------
  // Setiap wabah yang hancur memberi XP, koin, energi, dan Poin Pertumbuhan Kota untuk membangun aset.
  moveControl.current.onWabah = (event) => {
    const def = wabahType(event?.kind);
    if (!def) return;
    if (event.type === 'hit') {
      setMessage(`💥 ${def.name} terkena tembakan! ${def.hp} HP — tembak lagi untuk menetralkan.`);
      return;
    }
    gainXp(def.rewardXp);
    setCoins((value) => value + def.rewardCoins);
    setEnergy((value) => Math.min(100, value + def.rewardEnergy));
    setGrowth((state) => recordWabahDown(state, event.kind, def.growth + (perks.growthFlat || 0)));
    twin.emit({ type: 'purge_wabah', id: event.id, target: event.kind });
    setMessage(`✅ ${def.name} dinetralkan! +${def.rewardXp} XP · +${def.rewardCoins} koin · +${def.rewardEnergy} energi · +${def.growth} Poin Pertumbuhan Kota`);
  };

  // "Cari & Tembak Wabah": putar Twini ke wabah terdekat; jarak jauh memakai waypoint kuning.
  const aimAndFireWabah = () => {
    const c = moveControl.current;
    const targets = (c?.wabah || []).filter((entry) => entry.alive);
    if (!c || !targets.length) {
      setMessage('Wabah sedang tidak aktif. Jelajahi zona untuk menemukannya.');
      setPanel('game');
      return;
    }
    let best = null;
    targets.forEach((entry) => {
      const distance = Math.hypot(entry.pos.x - c.pos[0], entry.pos.z - c.pos[1]);
      if (!best || distance < best.distance) best = { entry, distance };
    });
    const def = wabahType(best.entry.kind);
    const dx = best.entry.pos.x - c.pos[0];
    const dz = best.entry.pos.z - c.pos[1];
    const length = Math.hypot(dx, dz) || 1;
    c.facing = { dx: dx / length, dz: dz / length };
    if (best.distance > 26) {
      setPanel('game');
      setWaypoint([best.entry.pos.x, best.entry.pos.z], `${def.name} (wabah)`);
      setMessage(`🔍 ${def.name} terdeteksi ${Math.round(best.distance)} m dari sini — ikuti panah kuning, lalu tekan FIRE.`);
      return;
    }
    if (panel === 'game') {
      setTimeout(() => fire(), 160);
    } else {
      wabahFireAt.current = Date.now();
      setPanel('game');
    }
    setMessage(`🎯 Mengunci ${def.name} · ${Math.round(best.distance)} m — plasma diluncurkan!`);
  };

  // Membangun aset kota pada petak bidang tanah (dipanggil dari CityGrowthPanel).
  const buildCityAsset = (plotId, buildingId) => {
    const result = buildOnPlot(growth, plotId, buildingId, Date.now(), perks);
    if (!result.ok) { setMessage(result.error); return; }
    setGrowth(result.state);
    twin.emit({ type: 'build_city_asset', id: plotId, target: buildingId });
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, growth: result.state });
    setMessage(`🏗️ ${result.building.name} dibangun di ${result.plot.name} (−${result.cost} poin)! Indeks pertumbuhan kota meningkat.`);
  };

  // ── Wilayah pengembangan: beli petak darat/laut, bangun kawasan, klaim pendapatan ─────────────
  const buyDistrictPlot = (plotId) => {
    const result = buyPlot(district, coins, plotId, Date.now(), { cleared: growth.cleared, modifiers: perks });
    if (!result.ok) { setDistrictNotice(result.error); return; }
    setDistrict(result.state);
    setCoins(result.coins);
    setDistrictNotice(`✅ ${result.plot.name} dibeli (−${result.price} koin). Pilih bangunan untuk mulai membangun.`);
    setMessage(`🗺️ ${result.plot.name} kini milikmu (−${result.price} koin).`);
    twin.emit({ type: 'buy_plot', id: plotId });
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, district: result.state, coins: result.coins });
  };

  const buildDistrictBuilding = (plotId, buildingId) => {
    const result = buildOnDistrictPlot(district, plotId, buildingId, growth.points, Date.now(), perks);
    if (!result.ok) { setDistrictNotice(result.error); return; }
    setDistrict(result.state);
    setGrowth((state) => ({ ...state, points: result.points }));
    setDistrictNotice(`✅ ${result.building.name} berdiri di ${result.plot.name} (−${result.cost} poin). Nilai wilayah +${result.building.value}, pendapatan +${result.building.coinsPerMin} koin/menit.`);
    setMessage(`🏙️ ${result.building.name} dibangun di ${result.plot.name}!`);
    // Event yang sama dengan aset kota supaya misi "kota hijau" ikut menghitung pembangunan wilayah.
    twin.emit({ type: 'build_city_asset', id: plotId, target: buildingId });
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, district: result.state });
  };

  const collectDistrict = () => {
    const result = collectDistrictIncome(district, Date.now());
    if (!result.ok) { setDistrictNotice(result.error); return; }
    setDistrict(result.state);
    setCoins((value) => value + result.coins);
    setGrowth((state) => addGrowthPoints(state, result.growth));
    setDistrictNotice(`💰 Pendapatan wilayah diklaim: +${result.coins} koin dan +${result.growth} poin pertumbuhan.`);
    setMessage(`💰 +${result.coins} koin · +${result.growth} poin dari wilayah pengembangan.`);
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, district: result.state });
  };

  // ── Profil aksesori per karakter: topi, pakaian, sepatu, aksesori/lencana ────────────────────
  const buyCharacterCosmetic = (id) => {
    const result = buyCosmetic(cosmetics, id, coins, selectedCharacterId);
    if (!result.ok) { setCosmeticsNotice(result.error); return; }
    setCosmetics(result.state);
    setCoins(result.coins);
    setCosmeticsNotice(`✅ ${result.item.name} dibeli & langsung dipakai oleh ${selectedCharacter?.name || 'karakter ini'} (−${result.price} koin).`);
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, cosmetics: result.state, coins: result.coins });
  };

  const equipCharacterCosmetic = (id) => {
    const result = equipCosmetic(cosmetics, id, selectedCharacterId);
    if (!result.ok) { setCosmeticsNotice(result.error); return; }
    setCosmetics(result.state);
    setCosmeticsNotice(`👕 ${result.item.name} dipakai ${selectedCharacter?.name || 'karakter ini'}.`);
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, cosmetics: result.state });
  };

  const unequipCharacterCosmetic = (slot) => {
    const result = unequipCosmeticSlot(cosmetics, slot, selectedCharacterId);
    if (!result.ok) { setCosmeticsNotice(result.error); return; }
    setCosmetics(result.state);
    setCosmeticsNotice('Atribut dilepas dari slot tersebut.');
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, cosmetics: result.state });
  };

  const toggleCharacterCosmeticSlot = (slot) => {
    const result = toggleCosmeticSlot(cosmetics, slot, selectedCharacterId);
    if (!result.ok) { setCosmeticsNotice(result.error); return; }
    setCosmetics(result.state);
    setCosmeticsNotice(`${SLOT_META[slot]?.label || slot}: ${result.enabled ? 'dipakai' : 'disembunyikan'} untuk ${selectedCharacter?.name || 'karakter ini'}.`);
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, cosmetics: result.state });
  };

  const applyCosmeticsToAll = () => {
    const next = applyProfileToAll(cosmetics, selectedCharacterId, CHARACTER_IDS);
    setCosmetics(next);
    setCosmeticsNotice('✅ Profil atribut disalin ke semua karakter Twini.');
    if (restoredKey.current) twin.saveExtra({ ...snapshot.current, cosmetics: next });
  };

  // Fire queued from the wabah panel once the game scene is mounted. Waiting for `wabah` (published by
  // WabahLayer) guarantees CombatLayer already re-read the fire sequence, so the shot is not swallowed.
  useEffect(() => {
    if (panel !== 'game' || !wabahFireAt.current) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (moveControl.current?.wabah) {
        wabahFireAt.current = 0;
        clearInterval(id);
        hudActions.current.fire?.();
      } else if (tries > 40) {
        wabahFireAt.current = 0;
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [panel]);

  // ---------- teleport ----------
  const teleportTo = (target, name, vehicleId = null) => {
    const now = Date.now();
    if (now - lastTeleport.current < 1500) return;
    if (energy < TELEPORT_COST) { setMessage(`✨ Energi kurang untuk teleport (butuh ${TELEPORT_COST}).`); return; }
    const c = moveControl.current;
    const world = c.world;
    const from = [c.pos[0], c.vehicle ? c.vehicle.y : (c.groundY ?? 0), c.pos[1]];
    let dest;
    if (c.vehicle) { c.vehicle.speed = 0; c.vehicle.vel = [0, 0]; c.vehicle = null; c.seat = null; }
    const vehicle = vehicleId ? (c.vehicles || []).find((v) => v.id === vehicleId) : null;
    if (vehicle) {
      dest = [vehicle.pos[0], vehicle.pos[1]];
    } else {
      // Land next to the target (sensor posts / landmarks are solid), on walkable ground, facing it.
      const toward = Math.atan2(c.pos[0] - target[0], c.pos[1] - target[1]);
      for (let i = 0; i < 16 && !dest; i += 1) {
        const a = toward + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 8);
        const r = i < 8 ? 1.6 : 2.6;
        const x = target[0] + Math.sin(a) * r;
        const z = target[1] + Math.cos(a) * r;
        if (isWalkable(x, z)) dest = [x, z];
      }
      if (!dest) dest = [0, 8];
      const fx = target[0] - dest[0];
      const fz = target[1] - dest[1];
      const fl = Math.hypot(fx, fz) || 1;
      c.facing = { dx: fx / fl, dz: fz / fl };
    }
    lastTeleport.current = now;
    c.pos[0] = dest[0]; c.pos[1] = dest[1];
    c.vel[0] = 0; c.vel[1] = 0; c.dashT = 0;
    c.input = { dx: 0, dz: 0 };
    const toY = vehicle ? vehicle.y : (world ? world.groundAt(dest[0], dest[1]) : 0);
    c.teleport = { seq: (c.teleport?.seq || 0) + 1, from, to: [dest[0], toY, dest[1]] };
    const next = [dest[0], dest[1]];
    syncedPos.current.add(next);
    setPlayerPosition(next);
    setRiding(null);
    setEnergy((value) => Math.max(0, value - TELEPORT_COST));
    setShowTeleport(false);
    setGuide(null);
    announceNearby(next);
    if (vehicle) board(vehicle);
    else setMessage(`✨ Teleport ke ${name} · energi −${TELEPORT_COST}`);
  };
  const openTeleport = () => { stopMovement(); setShowTeleport(true); };

  const startGame = () => {
    // Setiap permainan baru selalu dimulai dari start point environment (gerbang selatan).
    const spawn = startPointFor(environmentId);
    const controller = moveControl.current;
    if (controller) {
      if (controller.vehicle) { controller.vehicle.speed = 0; controller.vehicle.vel = [0, 0]; controller.vehicle = null; controller.seat = null; }
      controller.pos[0] = spawn.position[0];
      controller.pos[1] = spawn.position[1];
      controller.vel[0] = 0; controller.vel[1] = 0;
      controller.input = { dx: 0, dz: 0 };
      controller.facing = { dx: 0, dz: -1 };
    }
    const next = [spawn.position[0], spawn.position[1]];
    syncedPos.current.add(next);
    setPlayerPosition(next);
    setRiding(null);
    setAmmo(ammoCap);
    setShowInstructions(true);
    setShowNavigationBar(false);
    navigation?.setBottomNavigationVisible?.(false);
    setMessage(`🟢 Start point: ${spawn.label} — ${spawn.note} ${weapon.name} siap dengan ${weapon.damage} damage. 🏪 Distrik toko ada di utara-timur (gapura biru) atau ketuk chip koin di HUD.`);
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
  const MenuButton = ({ icon, title, detail, onPress, accent = '#83bdff' }) => <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.menuCard, { borderColor: `${accent}aa`, borderLeftColor: accent, backgroundColor: `${accent}2e` }]} accessibilityRole="button">
    <View style={[styles.menuIcon, { backgroundColor: `${accent}33` }]}><FontAwesomeIcon icon={icon} size={15} color={accent} /></View>
    <View style={styles.menuCardCopy}><Text style={styles.menuCardTitle}>{title}</Text><Text style={styles.menuCardDetail}>{detail}</Text></View>
    <FontAwesomeIcon icon={faChevronRight} size={12} color="#71839c" />
  </TouchableOpacity>;

  const hudActions = useRef({});
  hudActions.current = {
    emote, focus: focusCamera, guide: guideToTarget, item: quickItem, jump, interact, patrol: togglePatrol,
    back: () => moveBurst(-1, 0.9), dash: () => moveBurst(1, 1.35), run: () => setRunning((value) => !value),
    fire, ride: toggleRide, teleport: openTeleport,
  };
  const press = useMemo(() => Object.fromEntries(['emote', 'focus', 'guide', 'item', 'jump', 'interact', 'patrol', 'back', 'dash', 'run', 'fire', 'ride', 'teleport']
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
        <SurvivalWorldScene playerPosition={playerPosition} movementDirection={facingDirection.current} moving={moving} running={running} jumping={jumping} foundPickups={foundPickups} character={selectedCharacter} cameraZoom={cameraZoom} cameraTilt={cameraTilt} cameraForwardRef={cameraForward} worldObjects={visibleObjects} objectState={twin.objectState} highlightId={nearTarget?.object.id} zones={ZONES} lighting={lighting} cameraSensitivity={cameraSensitivity} emoteSignal={emoteSignal} focusSignal={focusSignal} guide={guide} controlRef={moveControl} environment={environmentId} growth={growth} unlockBonus={perks.unlockBonus || 0} weapon={weapon} vehicleStats={vehiclePerf} district={district} cosmetics={profileFor(cosmetics, selectedCharacterId)} characterId={selectedCharacterId} />
      </React.Suspense></WorldSceneBoundary>
      {weather === 'storm' ? <View pointerEvents="none" style={styles.stormOverlay}><Text style={[styles.stormText, { marginTop: insets.top }]}>⛈ BADAI SIMULASI · {safeZoneAt(playerPosition) ? 'AMAN DI SHELTER' : 'CARI SHELTER (EMERGENCY ZONE / GATEWAY)'}</Text></View> : null}
      <View pointerEvents="box-none" style={[styles.hudLayer, { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }]}>
      {/* ── Top-left: mini map + hero status ── */}
      <View pointerEvents="box-none" style={styles.mlTopLeft}>
        <TouchableOpacity onPress={() => { stopMovement(); setShowMap(true); }} style={styles.mlMapFrame} accessibilityRole="button" accessibilityLabel="Buka peta besar">
          <LiveMiniMap controlRef={moveControl} fallback={playerPosition} size={miniMapSize} targets={trackedTargets} wabah={WABAH_SPAWNS} label={nearbyLandmark?.short || currentZone?.short || environment.name.toUpperCase()} />
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
        <TouchableOpacity onPress={() => openShop('weapons')} style={styles.tpChip} accessibilityRole="button" accessibilityLabel={`Buka toko dan upgrade. ${coins} koin, senjata ${weapon.name}`}>
          <Text numberOfLines={1} style={styles.tpChipText}>{twin.session ? `${twin.wallet.balance.toLocaleString('id-ID')} TP` : 'TP · offline'} · Lv {twin.profile?.level || 1} · {xp} XP · 🪙 {coins} · 🔫 {weapon.short || weapon.name}</Text>
        </TouchableOpacity>
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
      <LiveSpeedometer controlRef={moveControl} boost={running && !!riding} bottom={controlsTop + 6} />
      {!nearTarget && !nearNpc && !nearShop && nearVehicle && !riding ? <View pointerEvents="none" style={[styles.interactPrompt, { bottom: controlsTop + SK + 16, borderColor: 'rgba(125,255,181,0.7)' }]}><Text numberOfLines={1} style={styles.interactPromptText}>{VEHICLE_TYPES[nearVehicle.type].emoji} {nearVehicle.name} → tekan NAIK / INTERACT</Text></View> : null}
      {nearNpc ? <View pointerEvents="none" style={[styles.interactPrompt, { bottom: controlsTop + SK + 16, borderColor: `${nearNpc.color}cc` }]}><Text numberOfLines={1} style={styles.interactPromptText}>💬 {nearNpc.icon} {nearNpc.name} · {nearNpc.role} → INTERACT untuk bicara</Text></View> : null}
      {nearShop && !nearNpc ? <View pointerEvents="none" style={[styles.interactPrompt, { bottom: controlsTop + SK + 16, borderColor: `${nearShop.color}cc` }]}><Text numberOfLines={1} style={styles.interactPromptText}>🏪 {nearShop.name} · {nearShop.role} → INTERACT untuk buka toko</Text></View> : null}
      {nearTarget && !nearNpc && !nearShop ? <View pointerEvents="none" style={[styles.interactPrompt, { bottom: controlsTop + SK + 16 }]}><Text numberOfLines={1} style={styles.interactPromptText}>
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
            { key: 'tele', label: 'TELE', icon: faWandMagicSparkles, color: '#c6a7ff', onPress: press.teleport, a11y: 'Teleport ke sensor, landmark, zona atau kendaraan' },
          ].map((action) => <SkillButton key={action.key} size={QUICK_SIZE} icon={action.icon} label={action.label} color={action.color} onPress={action.onPress} active={action.active} a11y={action.a11y} />)}
        </View>
        {/* ── Bottom-right: MOBA skill cluster ── */}
        <View pointerEvents="box-none" style={[styles.mlCluster, { width: clusterW, height: clusterH, bottom: CONTROLS_BOTTOM }]}>
          <SkillButton size={SK_SMALL} icon={faArrowDown} label="BACK" color="#c9ddf5" onPress={press.back} a11y="Mundur" style={skillAt(157.5, skR2, SK_SMALL)} />
          <SkillButton size={SK_SMALL} icon={faPlay} label="PATROL" color="#8fe0ff" onPress={press.patrol} active={patrolMode} a11y={patrolMode ? 'Matikan patroli lurus kiri-tengah-kanan' : 'Aktifkan patroli lurus kiri-tengah-kanan'} style={skillAt(112.5, skR2, SK_SMALL)} />
          <SkillButton size={SK} glyph="↟" label="JUMP" color="#d9b8ff" onPress={press.jump} a11y="Lompat" style={skillAt(180, skR, SK)} />
          <SkillButton size={SK} icon={faBolt} label="DASH" color="#ffd36e" onPress={press.dash} a11y="Dash ke arah hadap" style={skillAt(135, skR, SK)} />
          <SkillButton size={SK} icon={faWind} label={riding ? 'TURBO' : `RUN ${Math.round(stamina)}%`} color="#7fe7ff" onPress={press.run} active={running} a11y={riding ? (running ? 'Matikan turbo' : 'Aktifkan turbo') : running ? 'Matikan lari' : 'Aktifkan lari'} style={skillAt(90, skR, SK)} />
          <SkillButton size={SK_MAIN} primary icon={faTowerBroadcast} label="INTERACT" color="#ffc54d" onPress={press.interact} a11y="Interaksi" active={!!nearTarget || !!nearNpc || !!nearShop} style={skillAt(0, 0, SK_MAIN)} />
        </View>
        {/* ── Combat & vehicle row above the skill cluster ── */}
        <View pointerEvents="box-none" style={[styles.combatRow, { bottom: CONTROLS_BOTTOM + clusterH + 6 }]}>
          <SkillButton size={SK} icon={faWandMagicSparkles} label="TELEPORT" color="#c6a7ff" onPress={press.teleport} a11y="Teleport ke sensor, kendaraan, landmark atau zona" />
          <SkillButton size={SK} icon={riding ? faArrowRightFromBracket : nearVehicle ? VEHICLE_ICON[nearVehicle.type] : faCar} label={riding ? 'TURUN' : nearVehicle ? 'NAIK' : 'KENDARAAN'} color="#7dffb5" onPress={press.ride} active={!riding && !!nearVehicle} a11y={riding ? `Turun dari ${riding.name}` : nearVehicle ? `Naik ${nearVehicle.name}` : 'Tunjukkan kendaraan terdekat'} />
          <SkillButton size={SK} icon={faShieldHeart} label={`WABAH ${growth.cleared}`} color="#7cf5ff" onPress={() => setPanel('wabah')} active={growth.points > 0} a11y={`Panel wabah digital dan pertumbuhan kota, ${growth.points} poin`} />
          <SkillButton size={Math.round(SK * 1.12)} icon={faBullseye} label={`FIRE ${ammo}`} color="#ff6b6b" onPress={press.fire} active={ammo >= ammoCap} a11y={`Tembak ${weapon.name}, sisa ${ammo}`} />
        </View>
        {(dronesDown || growth.cleared || coopRoom) ? <View pointerEvents="none" style={[styles.droneCounter, { bottom: CONTROLS_BOTTOM + clusterH + SK + 22 }]}><Text style={styles.droneCounterText}>{[dronesDown ? `🎯 ${dronesDown} drone` : null, growth.cleared ? `🦠 ${growth.cleared} wabah · 🏗️ ${growth.points} poin` : null, coopRoom ? `👥 ${coopRoom.code} ${coopRoom.members.length}/${coopRoom.maxPlayers}` : null].filter(Boolean).join(' · ')}</Text></View> : null}
      </View>
    </View>
    <Modal visible={showMap} transparent animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setShowMap(false)}>
      <View style={[styles.mapModalBackdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.mapModalCard, landscape && styles.mapModalCardLandscape]}>
          {landscape ? null : mapHeader}
          <WorldMap size={mapSize} zoom={mapZoom} playerPosition={playerPosition} facing={facingDirection.current} targets={trackedTargets} pickups={PICKUPS.filter((_, index) => !foundPickups.includes(index))} guide={guide} envId={environmentId} vehicles={(moveControl.current.vehicles || []).map((v) => ({ id: v.id, type: v.type, pos: [v.pos[0], v.pos[1]] }))} wabah={WABAH_SPAWNS} onPickPoint={(point) => setWaypoint(point, 'Titik tujuan')} />
          <View style={landscape ? styles.mapModalSide : styles.mapModalBottom}>
            {landscape ? mapHeader : null}
            <View style={styles.mapZoomRow}>
              <TouchableOpacity onPress={() => setMapZoom((z) => Math.max(1, z / 2))} style={styles.cameraZoomButton} accessibilityRole="button" accessibilityLabel="Perkecil peta"><FontAwesomeIcon icon={faMinus} size={14} color="#eaf4ff" /></TouchableOpacity>
              {[1, 2, 4].map((z) => <TouchableOpacity key={z} onPress={() => setMapZoom(z)} style={[styles.mapZoomChip, mapZoom === z && styles.mapZoomChipActive]} accessibilityRole="button" accessibilityState={{ selected: mapZoom === z }}><Text style={[styles.mapZoomText, mapZoom === z && styles.mapZoomTextActive]}>{z}×</Text></TouchableOpacity>)}
              <TouchableOpacity onPress={() => setMapZoom((z) => Math.min(4, z * 2))} style={styles.cameraZoomButton} accessibilityRole="button" accessibilityLabel="Perbesar peta"><FontAwesomeIcon icon={faPlus} size={14} color="#eaf4ff" /></TouchableOpacity>
            </View>
            <Text style={styles.mapLegend}>▲ Twini  ● Energy Core  ◉ target misi  ◆ landmark  🚙🏍️🚤 kendaraan  🦠 wabah digital{'\n'}Ketuk peta untuk menandai tujuan (panah kuning).</Text>
            {guide ? <TouchableOpacity onPress={() => setGuide(null)} style={styles.mapClearGuide} accessibilityRole="button"><FontAwesomeIcon icon={faCrosshairs} size={11} color="#ffd36e" /><Text style={styles.mapClearGuideText}>Hapus tujuan · {guide.name}</Text></TouchableOpacity> : null}
            {guide ? <TouchableOpacity onPress={() => { setShowMap(false); teleportTo(guide.position, guide.name); }} style={[styles.mapClearGuide, styles.mapTeleport]} accessibilityRole="button" accessibilityLabel={`Teleport ke ${guide.name}`}><FontAwesomeIcon icon={faWandMagicSparkles} size={11} color="#d9c8ff" /><Text style={[styles.mapClearGuideText, { color: '#e4d8ff' }]}>Teleport ke tujuan · −{TELEPORT_COST} energi</Text></TouchableOpacity> : null}
          </View>
        </View>
      </View>
    </Modal>
    <Modal visible={showTeleport} transparent animationType="slide" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setShowTeleport(false)}>
      <View style={styles.missionsModalBackdrop}>
        <View style={[styles.missionsModalCard, { paddingBottom: insets.bottom }]}>
          <View style={styles.teleportHeader}>
            <View style={{ flexShrink: 1 }}><Text style={styles.teleportTitle}>✨ TELEPORT</Text><Text style={styles.teleportSubtitle}>Pindah instan ke sensor, kendaraan, landmark atau zona · −{TELEPORT_COST} energi</Text></View>
            <TouchableOpacity onPress={() => setShowTeleport(false)} style={styles.characterModalClose} accessibilityRole="button" accessibilityLabel="Tutup teleport"><FontAwesomeIcon icon={faXmark} size={15} color="#eaf4ff" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 4 }}>
            {[
              ['SENSOR IOT', iotObjects.map((object) => { const done = twin.objectState[object.id]?.done; return { key: object.id, icon: faTowerBroadcast, color: done ? '#62e0a9' : '#ffb86b', title: localizeObject(environmentId, object).name, detail: done ? 'ONLINE' : 'STANDBY · perlu diaktifkan', position: object.position }; })],
              ['KENDARAAN', spawnVehicles(environmentId).map((spot) => { const live = (moveControl.current.vehicles || []).find((v) => v.id === spot.id) || spot; return { key: spot.id, icon: VEHICLE_ICON[spot.type], color: '#7fe7ff', title: `${VEHICLE_TYPES[spot.type].emoji} ${spot.name}`, detail: 'Teleport & langsung naik', position: live.pos, vehicleId: spot.id }; })],
              ['LANDMARK', LANDMARKS.map((item) => { const l = localizeLandmark(environmentId, item); return { key: item.id, icon: faMapLocationDot, color: '#88c0ff', title: l.name, detail: foundLandmarks.includes(item.id) ? 'Sudah ditemukan' : 'Belum ditemukan', position: item.position }; })],
              ['ZONA', ZONES.map((zone) => { const z = localizeZone(environmentId, zone); return { key: zone.id, icon: faCompass, color: zone.color || '#9fe3ff', title: z.name, detail: 'Pusat zona', position: zone.center }; })],
              ['LAINNYA', [{ key: 'shop', icon: faStore, color: '#ffd178', title: 'Twini Shop District', detail: 'Toko, bengkel, garasi & gudang', position: SHOP_DISTRICT.door }, { key: 'spawn', icon: faLocationArrow, color: '#ffd36e', title: 'Titik awal', detail: 'Pelataran depan', position: [0, 8] }, { key: 'shelter', icon: faShieldHeart, color: '#ff8fa3', title: 'Gateway Shelter', detail: 'Aman saat badai', position: RESPAWN_POINT }]],
            ].map(([section, items]) => <View key={section} style={styles.teleportSection}>
              <Text style={styles.teleportSectionTitle}>{section}</Text>
              {items.map((item) => {
                const distance = Math.round(Math.hypot(item.position[0] - playerPosition[0], item.position[1] - playerPosition[1]));
                return <TouchableOpacity key={item.key} onPress={() => teleportTo(item.position, item.title, item.vehicleId)} style={styles.teleportRow} accessibilityRole="button" accessibilityLabel={`Teleport ke ${item.title}, ${distance} meter`}>
                  <View style={[styles.teleportIcon, { backgroundColor: `${item.color}22` }]}><FontAwesomeIcon icon={item.icon} size={13} color={item.color} /></View>
                  <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.teleportRowTitle}>{item.title}</Text><Text numberOfLines={1} style={[styles.teleportRowDetail, { color: item.color }]}>{item.detail}</Text></View>
                  <Text style={styles.teleportDistance}>{distance} m</Text>
                </TouchableOpacity>;
              })}
            </View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={showCharacterSettings} transparent animationType="fade" onRequestClose={() => setShowCharacterSettings(false)}>
      <View style={styles.characterModalBackdrop}>
        <View style={styles.characterModalCard}>
          <View style={styles.characterModalHeader}><View><Text style={styles.characterModalTitle}>Pengaturan Karakter</Text><Text style={styles.characterModalSubtitle}>Ketuk gambar karakter untuk memilih</Text></View><TouchableOpacity onPress={() => setShowCharacterSettings(false)} style={styles.characterModalClose} accessibilityRole="button" accessibilityLabel="Tutup pengaturan"><FontAwesomeIcon icon={faXmark} size={15} color="#eaf4ff" /></TouchableOpacity></View>
          {PLAYABLE_CHARACTERS.map((character) => {
            const selected = selectedCharacterId === character.id;
            return <TouchableOpacity key={character.id} onPress={() => { setSelectedCharacterId(character.id); setMessage(`Karakter berganti ke ${character.name}.`); setShowCharacterSettings(false); }} style={[styles.characterModalOption, selected && styles.characterModalOptionSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
              <Image source={characterArt(character.id)} style={styles.characterModalThumb} resizeMode="cover" accessibilityLabel={`Gambar ${character.name}`} />
              <View style={{ flex: 1 }}><Text style={[styles.characterModalOptionTitle, selected && styles.characterModalOptionTitleSelected]}>{character.name}</Text></View><Text style={styles.characterModalOptionMark}>{selected ? '✓' : '›'}</Text>
            </TouchableOpacity>;
          })}
          <Text style={[styles.characterModalSubtitle, { marginTop: 12 }]}>Environment (misi tetap sama)</Text>
          <EnvironmentPicker compact value={environmentId} onChange={(id) => { setEnvironmentId(id); setCurrentZone(null); setMessage(`Pindah ke ${environmentById(id).name} · misi & progres tetap sama`); }} />
          <Text style={[styles.characterModalSubtitle, { marginTop: 12 }]}>Sensitivitas putar kamera</Text>
          <View style={styles.sensitivityRow}>{[0.5, 0.75, 1, 1.5, 2].map((value) => <TouchableOpacity key={value} onPress={() => setCameraSensitivity(value)} style={[styles.sensitivityOption, cameraSensitivity === value && styles.sensitivityOptionActive]} accessibilityRole="button" accessibilityState={{ selected: cameraSensitivity === value }}><Text style={[styles.sensitivityText, cameraSensitivity === value && styles.sensitivityTextActive]}>{value}×</Text></TouchableOpacity>)}</View>
        </View>
      </View>
    </Modal>
    {npcTalk ? <Modal visible transparent animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setNpcTalk(null)}>
      <View style={styles.missionsModalBackdrop}>
        <View style={[styles.missionsModalCard, { padding: 16, paddingBottom: 16 + insets.bottom }]}>
          <NpcDialogue
            npc={npcById(npcTalk.id)}
            lineIndex={npcTalk.line}
            claimed={npcTalk.claimed}
            onNext={nextNpcLine}
            onClose={() => setNpcTalk(null)}
          />
        </View>
      </View>
    </Modal> : null}
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
          '• Dekati Mobil / Motor / Perahu lalu tekan NAIK (E): ▲ gas, ▼ rem/mundur, ◀▶ belok, RUN = turbo, TURUN untuk keluar',
          '• FIRE (F) menembakkan pelontar plasma; drone polusi di depan terkunci otomatis (+30 XP)',
          '• TELE (T) teleport ke sensor IoT, kendaraan, landmark, zona; di peta besar: "Teleport ke tujuan"',
          '• Tekan PATROL untuk gerak otomatis kiri→tengah→kanan',
          '• Dekati objek bercincin biru lalu tekan INTERACT untuk SCAN / aksi Digital Twin',
          '• Jaga HP, Energi, Hidrasi (H2O), Digital Connection (NET) dan Supply (SUP)',
          '• Ketuk 🏆 untuk Mission Center · semua hazard hanya simulasi game',
        ].join('\n')}</Text>
      </View>
    </View>}
  </View>;

  if (panel === 'coop') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <CoopPanel twin={twin} disciplineId={disciplineId} onRoomChange={(code, room) => { setCoopCode(code); setCoopRoom(room || null); }} onNotice={(text) => setMessage(text)} />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'shop') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <ShopPanel
      initialTab={shopTab}
      loadout={loadout}
      coins={coins}
      weapon={weapon}
      buildingBonus={cityBonus}
      vehicleStats={vehiclePerf}
      onBuyWeapon={buyWeaponItem}
      onEquipWeapon={equipWeaponItem}
      onBuyAccessory={buyAccessoryItem}
      onToggleAccessory={toggleAccessoryItem}
      onBuyBuilding={buyBuildingItem}
      onBuyVehicle={buyVehicleItem}
      onBuyGrowth={buyGrowthPack}
      onBackToGame={() => setPanel('game')}
      notice={shopNotice}
    />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'wabah') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <CityGrowthPanel growth={growth} onBuild={buildCityAsset} onFire={aimAndFireWabah} onBackToGame={() => setPanel('game')} unlockBonus={perks.unlockBonus || 0} modifiers={{ buildDiscount: perks.buildDiscount, buildFlat: perks.buildFlat }} bonus={cityBonus} />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'district') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <DistrictPanel
      district={district}
      coins={coins}
      growthPoints={growth.points}
      cleared={growth.cleared}
      modifiers={{ buildDiscount: perks.buildDiscount, buildFlat: perks.buildFlat }}
      notice={districtNotice}
      onBuy={buyDistrictPlot}
      onBuild={buildDistrictBuilding}
      onCollect={collectDistrict}
      onBackToGame={() => setPanel('game')}
    />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'cosmetics') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <CosmeticsPanel
      cosmetics={cosmetics}
      coins={coins}
      characters={CHARACTER_PROFILES}
      characterId={selectedCharacterId}
      notice={cosmeticsNotice}
      onSelectCharacter={setSelectedCharacterId}
      onBuy={buyCharacterCosmetic}
      onEquip={equipCharacterCosmetic}
      onUnequip={unequipCharacterCosmetic}
      onToggleSlot={toggleCharacterCosmeticSlot}
      onApplyAll={applyCosmeticsToAll}
      onBackToGame={() => setPanel('game')}
    />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'missions') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <MissionCenter twin={twin} />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'hub') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <TwinHub twin={twin} section={hubSection} onSection={setHubSection} navigation={navigation} stats={{ survivalSeconds }} />
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'inventory') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>TWNI FIELD KIT</Text><Text style={styles.pageTitle}>Inventory</Text><Text style={styles.pageSubtitle}>Resource yang ditemukan selama eksplorasi Jakarta.</Text>
    <View style={styles.inventoryCard}><Text style={styles.inventoryEmoji}>🎒</Text><View style={styles.inventoryCopy}><Text style={styles.inventoryTitle}>Status survival</Text><Text style={styles.inventoryDescription}>HP {Math.round(health)}% · Energi {Math.round(energy)}% · Hidrasi {Math.round(hydration)}% · Connection {Math.round(battery)}% · Supply {Math.round(supply)}%</Text><Text style={styles.inventoryCount}>Aset Digital Twin: {twin.ownedAssetIds.size}/{twin.assets.length} · lihat Twin Hub → Aset</Text></View></View>
    {[['crystals', 'Energy Crystal', 'Kristal data untuk memulihkan digital battery.', '💎'], ['batteries', 'Battery Pack', 'Mengisi ulang battery dan energy Twini.', '🔋'], ['kits', 'Health Kit', 'Memulihkan health saat menghadapi kondisi ekstrem.', '🩹'], ['fragments', 'Data Fragment', 'Potongan data landmark dan infrastruktur kota.', '🔷'], ['water', 'Botol Air', 'Memulihkan hidrasi +40.', '💧'], ['repairKits', 'Repair Kit', 'Memperbaiki perangkat digital: Digital Connection +50.', '🛠️']].map(([id, title, detail, emoji]) => <View key={id} style={styles.inventoryCard}><Text style={styles.inventoryEmoji}>{emoji}</Text><View style={styles.inventoryCopy}><Text style={styles.inventoryTitle}>{title}</Text><Text style={styles.inventoryDescription}>{detail}</Text><Text style={styles.inventoryCount}>Dimiliki: {inventory[id] || 0}</Text></View>{['kits', 'batteries', 'water', 'repairKits'].includes(id) && <TouchableOpacity onPress={() => useItem(id)} disabled={inventory[id] <= 0} style={[styles.useButton, inventory[id] <= 0 && styles.useDisabled]}><Text style={styles.useButtonText}>Gunakan</Text></TouchableOpacity>}</View>)}
  </ResponsiveContent></ScrollView></View>;

  if (panel === 'dashboard') return <View style={styles.screen}><TwiniMenuBackdrop width={width} height={height} calm /><ScrollView style={styles.screenClear} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>IDTC · SIMULATED TELEMETRY</Text><Text style={styles.pageTitle}>Digital Twin Dashboard</Text><Text style={styles.pageSubtitle}>Data berikut disimulasikan untuk prototipe edukasi, bukan sensor live.</Text>
    <View style={styles.telemetryGrid}>{[[faCloudSun, 'Suhu', '34°C', 'Kondisi panas', '#ffbf72'], [faDroplet, 'Kelembapan', '72%', 'Sensor taman', '#81ceff'], [faWind, 'Kualitas udara', 'AQI 84', 'Sedang', '#8de0b5'], [faTowerBroadcast, 'Kecepatan angin', '11 km/j', 'Diperbarui sekarang', '#c6a7ff']].map(([icon, title, value, note, color]) => <View key={title} style={styles.telemetryCard}><FontAwesomeIcon icon={icon} size={17} color={color} /><Text style={styles.telemetryTitle}>{title}</Text><Text style={styles.telemetryValue}>{value}</Text><Text style={styles.telemetryNote}>{note} · SIMULASI</Text></View>)}</View>
    <View style={styles.sensorDashCard}><Text style={styles.menuSectionTitle}>Perangkat IoT di sekitar</Text>{iotObjects.map((object) => <View key={object.id} style={styles.sensorDashRow}><View style={[styles.sensorStatusDot, twin.objectState[object.id]?.done && styles.sensorActiveDot]} /><Text style={styles.sensorDashName}>{object.name}</Text><Text style={styles.sensorDashValue}>{twin.objectState[object.id]?.done ? 'ONLINE' : 'STANDBY'}</Text></View>)}</View>
    <View style={styles.mapSectionHeader}><View><Text style={styles.menuSectionTitle}>Open Maps · OpenStreetMap</Text><Text style={styles.panelHint}>Peta Jakarta tersemat langsung di TWINI.</Text></View><TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/#map=14/-6.208/106.816').catch(() => {})} style={styles.mapOpenButton}><Text style={styles.mapOpenText}>Buka penuh</Text></TouchableOpacity></View>
    <View style={styles.embeddedMap}><OpenStreetMapEmbed /></View>
  </ResponsiveContent></ScrollView></View>;

  return <View style={styles.screen}>
    <TwiniMenuBackdrop width={width} height={height} />
    <ScrollView style={styles.screenClear} contentContainerStyle={styles.content}>
    <ResponsiveContent>
      <View style={[styles.homeHeader, compact && styles.homeHeaderCompact]}>
        <View style={styles.brandPill}><Image source={require('../../../assets/twini-logo.png')} style={styles.brandLogo} resizeMode="contain" /><Text style={styles.brandText}>TWINI <Text style={styles.brandSub}>· IDTC</Text></Text></View>
        <View style={styles.homeHeaderRight}>
          <View style={styles.locationBadge}><View style={styles.liveDot} /><Text style={styles.locationBadgeText}>{environment.emoji} {environment.name.toUpperCase()}</Text></View>
          <TouchableOpacity onPress={() => setMusicOn((value) => !value)} style={[styles.musicButton, musicOn && musicAvailable && styles.musicButtonOn]} accessibilityRole="button" accessibilityState={{ selected: musicOn }} accessibilityLabel={musicOn ? 'Matikan musik' : 'Nyalakan musik'}>
            <FontAwesomeIcon icon={musicOn && musicAvailable ? faMusic : faVolumeXmark} size={13} color={musicOn && musicAvailable ? '#1a0b2e' : '#d9c8ff'} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        {/* Rotating Twini portrait on the right, colour wash on top for legible text */}
        <CyclingTwini style={compact ? styles.heroArtCompact : styles.heroArt} interval={3800} />
        <LinearGradient pointerEvents="none" colors={compact ? ['rgba(255,60,172,0.62)', 'rgba(110,50,220,0.72)', 'rgba(20,150,210,0.78)'] : ['rgba(120,30,190,0.94)', 'rgba(255,60,172,0.62)', 'rgba(43,210,255,0.14)']} start={compact ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 }} end={compact ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>✦ DIGITAL TWIN SURVIVAL · PHASE 01 ✦</Text>
          <Text style={[styles.heroTitle, { fontSize: heroFontSize, lineHeight: Math.round(heroFontSize * 1.12) }]} numberOfLines={3}>
            <Text style={{ color: '#6fe9ff' }}>Explore.</Text>{'\n'}<Text style={{ color: '#ff8fd8' }}>Survive.</Text>{'\n'}<Text style={{ color: '#ffd56e' }}>Learn.</Text>
          </Text>
          <Text style={styles.heroDescription}>TWINI: Monas Survival Adventure. Explore. Survive. Learn. Build the Future.</Text>
        </View>
        <View style={styles.characterPicker}>
          <View style={styles.characterPreview}>
            <Image source={characterArt(selectedCharacter.id)} style={styles.characterThumb} resizeMode="cover" accessibilityLabel={`Gambar ${selectedCharacter.name}`} />
            <View style={styles.characterOrb}><FontAwesomeIcon icon={faGamepad} size={16} color="#bde3ff" /></View>
          </View>
          <Text style={styles.characterCaption}>{selectedCharacter.name}</Text>
          <View style={styles.characterOptions}>{PLAYABLE_CHARACTERS.map((character) => <TouchableOpacity key={character.id} onPress={() => setSelectedCharacterId(character.id)} style={[styles.characterOption, selectedCharacterId === character.id && styles.characterOptionSelected]} accessibilityRole="button" accessibilityState={{ selected: selectedCharacterId === character.id }} accessibilityLabel={`Pilih karakter ${character.name}`}>
            <Image source={characterArt(character.id)} style={[styles.characterOptionImage, selectedCharacterId === character.id && styles.characterOptionImageSelected]} resizeMode="cover" />
            <Text numberOfLines={1} style={[styles.characterOptionText, selectedCharacterId === character.id && styles.characterOptionTextSelected]}>{character.name}</Text>
          </TouchableOpacity>)}</View>
        </View>
        {/* Disiplin ilmu: memberi efek gameplay nyata (lihat data/disciplines.js). */}
        <View style={styles.disciplineSection}>
          <Text style={styles.characterPickerLabel}>DISCIPLINE · PROFESI KARAKTER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
            {DISCIPLINES.map((item) => {
              const active = disciplineId === item.id;
              return <TouchableOpacity
                key={item.id}
                onPress={() => { setDisciplineId(item.id); setMessage(`Disiplin dipilih: ${item.name} — ${item.perk}`); }}
                style={[styles.disciplineCard, active && { borderColor: item.color, backgroundColor: `${item.color}22` }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Pilih disiplin ${item.name}. ${item.perk}`}
              >
                <Text style={styles.disciplineIcon}>{item.icon}</Text>
                <Text numberOfLines={1} style={[styles.disciplineName, active && { color: item.color }]}>{item.short}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView>
          <Text style={styles.disciplinePerk}>{disciplineById(disciplineId).icon} {disciplineById(disciplineId).name} · {disciplineById(disciplineId).perk}</Text>
        </View>
        {/* Primary action sits right below the character picker. */}
        <View style={styles.startButtonCenter}>
          <View style={styles.startButtonWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.startButtonPulse, {
                opacity: startPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0] }),
                transform: [{ scale: startPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
              }]}
            />
            <TouchableOpacity onPress={startGame} activeOpacity={0.85} style={styles.startButton} accessibilityRole="button" accessibilityLabel="Mulai Eksplorasi">
              <LinearGradient pointerEvents="none" colors={['#ffe27a', '#ff9a5c', '#ff6ec7']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              <FontAwesomeIcon icon={faPlay} size={13} color="#2a0d2e" /><Text style={styles.startButtonText}>Mulai Eksplorasi</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.envSection}>
          <Text style={styles.characterPickerLabel}>PILIH ENVIRONMENT · MISI SAMA, DUNIA BERBEDA</Text>
          <EnvironmentPicker value={environmentId} onChange={setEnvironmentId} />
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
        <MenuButton icon={faShieldHeart} title="Wabah & Pertumbuhan Kota" detail={`${growth.cleared} wabah dinetralkan · ${growth.points} poin · ${WABAH_SPAWNS.length} titik pencarian`} onPress={() => setPanel('wabah')} accent="#7cf5ff" />
        <MenuButton icon={faMapLocationDot} title="Wilayah & Petak" detail={`${districtSummary(district).owned}/${DISTRICT_PLOTS.length} petak · ${districtSummary(district).built} bangunan · 🪙 ${districtSummary(district).coinsPerMin}/mnt · ⭐ ${districtSummary(district).growthPerMin}/mnt`} onPress={() => setPanel('district')} accent="#ffd178" />
        <MenuButton icon={faShirt} title="Atribut Karakter" detail={`${cosmeticsSummary(cosmetics, selectedCharacterId).active}/4 aktif · ${cosmeticsSummary(cosmetics, selectedCharacterId).owned}/${cosmeticsSummary(cosmetics, selectedCharacterId).total} dimiliki · profil ${selectedCharacter?.name || 'Twini'}`} onPress={() => setPanel('cosmetics')} accent="#ff9fd0" />
        <MenuButton icon={faStore} title="Toko & Upgrade" detail={`${weapon.name} · ${coins} koin · distrik toko utara Monas`} onPress={() => openShop('weapons')} accent="#ffd178" />
        <MenuButton icon={faUser} title="Multiplayer Co-op" detail={coopRoom ? `Ruangan ${coopRoom.code} · ${coopRoom.members.length}/${coopRoom.maxPlayers} pemain · ${coopRoom.status === 'completed' ? 'MISI TUNTAS' : 'berjalan'}` : `Buat/join ruangan misi tim · ${disciplineById(disciplineId).short}`} onPress={() => setPanel('coop')} accent="#9fd5ff" />
        <MenuButton icon={faCompass} title="OpenStreetMap" detail="Lihat peta Jakarta di dalam aplikasi" onPress={() => setPanel('dashboard')} accent="#85c9ff" />
      </View>

      <View style={styles.miniMissionCard}>
        <View style={styles.miniMissionIcon}><FontAwesomeIcon icon={faTrophy} size={14} color="#ffd178" /></View>
        <View style={styles.miniMissionCopy}><Text style={styles.miniMissionEyebrow}>MISI BERIKUTNYA</Text><Text style={styles.miniMissionTitle}>{twin.trackedMission?.title || (completedMissions === campaignMissions.length ? 'Semua misi campaign selesai!' : 'Buka Mission Center')}</Text><Text style={styles.miniMissionDetail}>{twin.trackedMission?.description || 'Jakarta Digital Twin telah pulih.'}</Text></View>
        <TouchableOpacity onPress={() => setPanel('missions')}><FontAwesomeIcon icon={faChevronRight} size={13} color="#90a4bc" /></TouchableOpacity>
      </View>
      <Text style={styles.poweredBy}>Powered by Indonesia Digital Twin Community</Text>
    </ResponsiveContent>
  </ScrollView>
    <MenuOverlayFx width={width} height={height} count={compact ? 7 : 11} />
  </View>;
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
  screenClear: { flex: 1, backgroundColor: 'transparent' },
  miniVehicle: { position: 'absolute', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 1.5, backgroundColor: '#7dffb5', borderWidth: 1, borderColor: '#06301c' },
  miniWabah: { position: 'absolute', width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: 1.5, borderWidth: 1, borderColor: '#06121f' },
  bigMapVehicle: { position: 'absolute', fontSize: 14, marginLeft: -8, marginTop: -9 },
  bigMapWabah: { position: 'absolute', fontSize: 12, marginLeft: -7, marginTop: -8 },
  homeHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  musicButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(120,90,220,0.28)', borderWidth: 1, borderColor: 'rgba(198,167,255,0.6)' },
  musicButtonOn: { backgroundColor: '#ffd56e', borderColor: '#fff0b8' },
  heroArt: { left: '40%' },
  heroArtCompact: { opacity: 0.75 },
  content: { flexGrow: 1, paddingTop: 20, paddingBottom: 35 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 17 },
  homeHeaderCompact: { alignItems: 'flex-start' },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 32, height: 32 },
  brandText: { color: '#f0f6ff', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  brandSub: { color: '#8dabc9', fontSize: 10, fontWeight: '700' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(62,203,155,0.22)', borderWidth: 1, borderColor: 'rgba(125,255,181,0.55)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5de0ad' },
  locationBadgeText: { color: '#a5dcca', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  hero: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', minHeight: 330, overflow: 'hidden', padding: 24, borderRadius: 27, backgroundColor: '#5a1fa8', borderWidth: 2, borderColor: 'rgba(255,214,110,0.85)' },
  heroCompact: { padding: 19, minHeight: 390 },
  heroGlow: { position: 'absolute', right: -70, top: -100, width: 290, height: 290, borderRadius: 145, backgroundColor: 'rgba(46,132,235,0.16)' },
  heroCopy: { flex: 1, minWidth: 240, justifyContent: 'center', zIndex: 1 },
  heroEyebrow: { color: '#ffd56e', fontSize: 8, fontWeight: '900', letterSpacing: 1.25 },
  heroTitle: { maxWidth: '100%', flexShrink: 1, color: '#f3f7ff', fontWeight: '900', letterSpacing: -1.3, marginTop: 13 },
  heroDescription: { maxWidth: 330, color: '#a0b2c9', fontSize: 11, lineHeight: 17, marginTop: 12 },
  startButtonCenter: { width: '100%', alignItems: 'center', marginTop: 10 },
  startButtonWrap: { position: 'relative' },
  startButtonPulse: { ...StyleSheet.absoluteFill, borderRadius: 16, borderWidth: 2, borderColor: '#ff8fd8' },
  startButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderRadius: 15, overflow: 'hidden', backgroundColor: '#ffb45c', borderWidth: 1.5, borderColor: '#fff0c4' },
  startButtonText: { color: '#071321', fontSize: 10, fontWeight: '900' },
  characterPicker: { width: '100%', minHeight: 205, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginLeft: 10 },
  characterPreview: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  characterLogo: { width: 118, height: 118, opacity: 0.93 },
  // Character thumbnails replace the old "3D GLB" text labels: the object is shown as an image.
  characterThumb: { width: 82, height: 82, borderRadius: 41, borderWidth: 2, borderColor: 'rgba(190,235,255,0.6)', backgroundColor: '#0b1626' },
  characterOptionImage: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#0b1626' },
  characterOptionImageSelected: { borderWidth: 2, borderColor: '#72c7ff' },
  characterModalThumb: { width: 44, height: 44, borderRadius: 12, marginRight: 10, backgroundColor: '#0b1626' },
  disciplineSection: { width: '100%', alignItems: 'center', marginTop: 8 },
  disciplineCard: { width: 62, alignItems: 'center', paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(150,190,230,0.22)', backgroundColor: 'rgba(10,22,40,0.55)' },
  disciplineIcon: { fontSize: 20 },
  disciplineName: { color: '#cfe1f4', fontSize: 9, fontWeight: '800', marginTop: 2, maxWidth: 56, textAlign: 'center' },
  disciplinePerk: { color: '#9fc3e6', fontSize: 9.5, fontWeight: '700', marginTop: 4, textAlign: 'center', paddingHorizontal: 8 },
  characterOrb: { position: 'absolute', right: 16, top: 22, width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(91,157,239,0.2)', borderWidth: 1, borderColor: 'rgba(163,215,255,0.28)' },
  characterCaption: { color: '#e8f4ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  envSection: { width: '100%', alignItems: 'center', marginTop: 10 },
  envGrid: { width: '100%', maxWidth: 420, gap: 7, marginTop: 7 },
  envCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(150,190,230,0.22)', backgroundColor: 'rgba(10,22,40,0.55)' },
  envCardCompact: { paddingVertical: 7 },
  envEmoji: { fontSize: 22 },
  envName: { color: '#e8f2ff', fontSize: 13, fontWeight: '800' },
  envSubtitle: { color: '#8ea6c1', fontSize: 10.5, marginTop: 1 },
  envCheck: { fontSize: 16, fontWeight: '900' },
  characterPickerLabel: { color: '#86a6c5', fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 7 },
  characterOptions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 6, maxWidth: 350 },
  characterOption: { borderWidth: 1, borderColor: '#42556d', borderRadius: 12, paddingHorizontal: 5, paddingVertical: 5, backgroundColor: '#101d2b', alignItems: 'center', minWidth: 58 },
  characterOptionSelected: { borderColor: '#72c7ff', backgroundColor: '#1e4560' },
  characterOptionText: { color: '#a8bdd2', fontSize: 8, fontWeight: '700' },
  characterOptionTextSelected: { color: '#eaf7ff' },
  heroFooter: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(217,236,255,0.1)' },
  heroFooterText: { color: '#8da6c3', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroFooterDot: { color: '#4f83b8', fontSize: 12 },
  playerPanel: { marginTop: 15, padding: 16, borderRadius: 20, backgroundColor: 'rgba(120,40,190,0.5)', borderWidth: 1.5, borderColor: 'rgba(111,233,255,0.8)' },
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
  menuCard: { flexGrow: 1, flexBasis: '47%', minWidth: 220, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(22,16,64,0.6)', borderWidth: 1, borderLeftWidth: 4, borderColor: 'rgba(225,240,255,0.1)' },
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
  combatRow: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10, zIndex: 7 },
  droneCounter: { position: 'absolute', right: 18, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(40,8,16,0.72)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.5)', zIndex: 7 },
  droneCounterText: { color: '#ffd0d0', fontSize: 10, fontWeight: '900' },
  speedo: { position: 'absolute', alignSelf: 'center', bottom: 20, flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(6,14,28,0.78)', borderWidth: 1, borderColor: 'rgba(127,231,255,0.45)', zIndex: 6 },
  speedoValue: { color: '#eaf8ff', fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  speedoUnit: { color: '#8fdcff', fontSize: 9, fontWeight: '800' },
  mapTeleport: { borderColor: 'rgba(198,167,255,0.55)', backgroundColor: 'rgba(110,80,200,0.18)', marginTop: 8 },
  teleportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  teleportTitle: { color: '#e4d8ff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  teleportSubtitle: { color: '#93a6bf', fontSize: 10, marginTop: 3 },
  teleportSection: { marginTop: 10 },
  teleportSectionTitle: { color: '#7f93ad', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  teleportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 6 },
  teleportIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  teleportRowTitle: { color: '#e6f0fb', fontSize: 12, fontWeight: '800' },
  teleportRowDetail: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  teleportDistance: { color: '#9fb3cc', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
