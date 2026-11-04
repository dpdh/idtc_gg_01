import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, PanResponder, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faArrowLeft, faBars, faBatteryThreeQuarters, faBolt, faChevronRight, faCloudSun, faCompass, faDroplet, faGamepad, faGear, faHeart, faMapLocationDot, faPlay, faShieldHeart, faTowerBroadcast, faTrophy, faWind, faXmark } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import SurvivalWorldScene from '../components/SurvivalWorldScene';
import OpenStreetMapEmbed from '../../maps/components/OpenStreetMapEmbed';
import glbModels from '../../library/data/glbModels';

const PLAYABLE_CHARACTERS = glbModels.filter(({ id }) => ['twini-idtc', 'dni-01', 'dni-02'].includes(id));

const LANDMARKS = [
  { id: 'monas', name: 'Monumen Nasional', short: 'MONAS', position: [0, 0] },
  { id: 'medan', name: 'Medan Merdeka', short: 'MEDAN MERDEKA', position: [-5, -5] },
  { id: 'gambir', name: 'Stasiun Gambir', short: 'GAMBIR', position: [7, 6] },
  { id: 'museum', name: 'Museum Nasional', short: 'MUSEUM NASIONAL', position: [-7, 3] },
  { id: 'istiqlal', name: 'Masjid Istiqlal', short: 'ISTIQLAL', position: [6, -7] },
];
const PICKUPS = [[2, -3], [-4, 4], [7, 0], [-7, -5], [5, 6], [-2, -7], [8, 5], [-8, 0], [3, 8], [-6, 7]];
const SENSORS = [[1, 4], [-5, 0], [4, -2]];
const MISSIONS = [
  { id: 'arrival', title: 'First Arrival', description: 'Jelajahi area Monas untuk memulai perjalanan.', reward: '100 XP · 50 koin' },
  { id: 'explorer', title: 'Digital Explorer', description: 'Temukan lima landmark di sekitar Medan Merdeka.', reward: '250 XP · Explorer badge' },
  { id: 'energy', title: 'Energy Hunter', description: 'Kumpulkan 10 Energy Crystal.', reward: '200 XP · 100 koin' },
  { id: 'guardian', title: 'Smart City Guardian', description: 'Aktifkan tiga sensor IoT simulasi.', reward: '300 XP · Guardian badge' },
  { id: 'survivor', title: 'Urban Survivor', description: 'Bertahan hidup selama 10 menit.', reward: '500 XP · Survivor badge' },
  { id: 'core', title: 'Digital Core', description: 'Aktifkan Digital Twin Core di Monas.', reward: '1000 XP · Core badge' },
];
const MISSION_REWARDS = { arrival: { xp: 100, coins: 50 }, explorer: { xp: 250, coins: 0 }, energy: { xp: 200, coins: 100 }, guardian: { xp: 300, coins: 0 }, survivor: { xp: 500, coins: 0 }, core: { xp: 1000, coins: 0 } };
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

function MiniMap({ playerPosition, foundLandmarks }) {
  return <View style={styles.miniMap}>
    <View style={styles.miniMapGrid} />
    <View style={styles.miniMapRing} />
    <View style={[styles.miniMonas, { left: '50%', top: '50%' }]} />
    {foundLandmarks.map((id) => {
      const landmark = LANDMARKS.find((item) => item.id === id);
      return <View key={id} style={[styles.miniPoi, { left: `${Math.max(8, Math.min(92, 50 + landmark.position[0] * 3.3))}%`, top: `${Math.max(8, Math.min(92, 50 + landmark.position[1] * 3.3))}%` }]} />;
    })}
    <View style={[styles.miniPlayer, { left: `${Math.max(5, Math.min(95, 50 + playerPosition[0] * 3.3))}%`, top: `${Math.max(5, Math.min(95, 50 + playerPosition[1] * 3.3))}%` }]} />
    <Text style={styles.miniMapLabel}>MONAS ZONE</Text>
  </View>;
}

export default function TwiniSurvivalScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const [panel, setPanel] = useState('home');
  const [selectedCharacterId, setSelectedCharacterId] = useState('twini-idtc');
  const [showCharacterSettings, setShowCharacterSettings] = useState(false);
  const selectedCharacter = PLAYABLE_CHARACTERS.find(({ id }) => id === selectedCharacterId) || PLAYABLE_CHARACTERS[0];
  const [playerPosition, setPlayerPosition] = useState([0, 5]);
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [battery, setBattery] = useState(100);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const [foundLandmarks, setFoundLandmarks] = useState([]);
  const [foundPickups, setFoundPickups] = useState([]);
  const [activatedSensors, setActivatedSensors] = useState([]);
  const [coreActive, setCoreActive] = useState(false);
  const [claimedMissions, setClaimedMissions] = useState([]);
  const [inventory, setInventory] = useState({ crystals: 0, batteries: 0, kits: 1, fragments: 0 });
  const [message, setMessage] = useState('Selamat datang di Digital Twin Jakarta.');
  const [running, setRunning] = useState(false);
  const [moving, setMoving] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [nearbyLandmark, setNearbyLandmark] = useState(null);
  const [sceneAttempt, setSceneAttempt] = useState(0);
  const [showNavigationBar, setShowNavigationBar] = useState(false);
  const startPulse = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const jumpTimer = useRef(null);
  const movementTimer = useRef(null);
  const lastMovementTick = useRef(0);
  const lastMovementMessage = useRef(0);
  const movePlayerRef = useRef(null);
  const joystickDirection = useRef({ dx: 0, dz: 0 });
  const facingDirection = useRef({ dx: 0, dz: 1 });
  const joystickMoveHandler = useRef(null);
  const joystickEndHandler = useRef(null);
  const knobPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
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
  const survivalClock = useRef(0);
  const compact = width < 680;
  const landscape = width > height;
  const heroFontSize = width < 360 ? 28 : compact ? 32 : 43;
  const gameComplete = survivalSeconds >= 600;

  useEffect(() => {
    if (panel !== 'game' || gameComplete) {
      clearInterval(timer.current);
      clearInterval(movementTimer.current);
      movementTimer.current = null;
      joystickEndHandler.current?.();
      return undefined;
    }
    timer.current = setInterval(() => {
      const next = Math.min(600, survivalClock.current + 1);
      survivalClock.current = next;
      setSurvivalSeconds(next);
      if (next > 0 && next % 30 === 0) setEnergy((value) => Math.max(0, value - 3));
      if (next > 0 && next % 60 === 0) setHealth((value) => Math.max(0, value - 1));
      if (next === 600) setMessage('Misi Urban Survivor selesai!');
    }, 1000);
    return () => clearInterval(timer.current);
  }, [panel, gameComplete]);
  useEffect(() => () => {
    clearTimeout(jumpTimer.current);
    clearInterval(movementTimer.current);
  }, []);

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
    if (panel === 'game') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    return () => ScreenOrientation.unlockAsync().catch(() => {});
  }, [panel]);

  const missions = useMemo(() => [
    { ...MISSIONS[0], progress: survivalSeconds > 0 || foundLandmarks.includes('monas') ? 1 : 0, total: 1 },
    { ...MISSIONS[1], progress: foundLandmarks.length, total: 5 },
    { ...MISSIONS[2], progress: inventory.crystals, total: 10 },
    { ...MISSIONS[3], progress: activatedSensors.length, total: 3 },
    { ...MISSIONS[4], progress: survivalSeconds, total: 600, time: true },
    { ...MISSIONS[5], progress: coreActive ? 1 : 0, total: 1 },
  ], [survivalSeconds, foundLandmarks, inventory.crystals, activatedSensors, coreActive]);
  const completedMissions = missions.filter((mission) => mission.progress >= mission.total).length;

  useEffect(() => {
    const newlyCompleted = missions.filter((mission) => mission.progress >= mission.total && !claimedMissions.includes(mission.id));
    if (!newlyCompleted.length) return;
    const reward = newlyCompleted.reduce((total, mission) => ({ xp: total.xp + MISSION_REWARDS[mission.id].xp, coins: total.coins + MISSION_REWARDS[mission.id].coins }), { xp: 0, coins: 0 });
    setClaimedMissions((current) => [...current, ...newlyCompleted.map((mission) => mission.id)]);
    setXp((current) => current + reward.xp);
    setCoins((current) => current + reward.coins);
    setMessage(`${newlyCompleted.map((mission) => mission.title).join(', ')} selesai · +${reward.xp} XP${reward.coins ? ` · +${reward.coins} koin` : ''}`);
  }, [missions, claimedMissions]);

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
    const step = (running ? 4 : 2.2) * elapsed * magnitude;
    const next = [
      Math.max(-38, Math.min(38, playerPosition[0] + dx * step)),
      Math.max(-38, Math.min(38, playerPosition[1] + dz * step)),
    ];
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
    setMoving(false);
  };
  const updateJoystick = (dx, dy) => {
    const radius = landscape ? 34 : compact ? 38 : 47;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    knobPosition.setValue({ x, y });
    joystickDirection.current = { dx: x / radius, dz: y / radius };
    if (Math.hypot(x, y) >= 5) {
      const directionLength = Math.hypot(x, y);
      facingDirection.current = { dx: x / directionLength, dz: y / directionLength };
    }

    if (Math.hypot(x, y) < 5) {
      joystickDirection.current = { dx: 0, dz: 0 };
      lastMovementTick.current = 0;
      stopMovement();
      return;
    }
    const step = () => {
      const direction = joystickDirection.current;
      const now = Date.now();
      const deltaSeconds = lastMovementTick.current ? (now - lastMovementTick.current) / 1000 : 1 / 30;
      lastMovementTick.current = now;
      if (movePlayerRef.current?.(direction.dx, direction.dz, deltaSeconds) === false) stopMovement();
    };
    if (!movementTimer.current) {
      lastMovementTick.current = 0;
      setMoving(true);
      step();
      movementTimer.current = setInterval(step, 33);
    }
  };
  const resetJoystick = () => {
    joystickDirection.current = { dx: 0, dz: 0 };
    knobPosition.setValue({ x: 0, y: 0 });
    lastMovementTick.current = 0;
    stopMovement();
  };
  joystickMoveHandler.current = updateJoystick;
  joystickEndHandler.current = resetJoystick;

  const interact = () => {
    const pickupIndex = PICKUPS.findIndex(([x, z], index) => !foundPickups.includes(index) && Math.hypot(x - playerPosition[0], z - playerPosition[1]) <= 2.25);
    if (pickupIndex >= 0) {
      setFoundPickups((current) => [...current, pickupIndex]);
      setInventory((value) => ({ ...value, crystals: value.crystals + 1 }));
      setBattery((value) => Math.min(100, value + 12));
      setCoins((value) => value + 15);
      setXp((value) => value + 40);
      setMessage('Energy Crystal didapatkan · baterai +12 · +40 XP');
      return;
    }
    const sensorIndex = SENSORS.findIndex(([x, z], index) => !activatedSensors.includes(index) && Math.hypot(x - playerPosition[0], z - playerPosition[1]) <= 2.4);
    if (sensorIndex >= 0) {
      setActivatedSensors((current) => [...current, sensorIndex]);
      setXp((value) => value + 80);
      setInventory((value) => ({ ...value, fragments: value.fragments + 1 }));
      setMessage(`Sensor IoT ${sensorIndex + 1} aktif · simulasi data tersambung · +80 XP`);
      return;
    }
    if (nearbyLandmark?.id === 'monas' && activatedSensors.length >= 3 && !coreActive) {
      setCoreActive(true);
      setMessage('Digital Twin Core Monas aktif! Kota kembali terhubung · +1000 XP');
      setXp((value) => value + 1000);
      return;
    }
    if (nearbyLandmark?.id === 'monas' && activatedSensors.length < 3) {
      setMessage(`Digital Twin Core terkunci. Aktifkan ${3 - activatedSensors.length} sensor IoT lagi.`);
      return;
    }
    setMessage(nearbyLandmark ? `Kamu berada di ${nearbyLandmark.name}. Terus jelajahi dan interaksi dengan objek terdekat.` : 'Belum ada objek di dekatmu. Bergerak ke marker pada mini map.');
  };

  const jump = () => {
    setJumping(true);
    setStamina((value) => Math.max(0, value - 6));
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setJumping(false), 480);
  };

  const moveBurst = (direction, distance = 1) => {
    stopMovement();
    const startedAt = Date.now();
    const duration = direction > 0 ? 260 : 210;
    setMoving(true);
    const step = () => {
      const elapsed = Math.min((Date.now() - startedAt) / 1000, 0.08);
      const facing = facingDirection.current;
      const stillMoving = movePlayerRef.current?.(facing.dx * direction * distance, facing.dz * direction * distance, elapsed);
      if (Date.now() - startedAt >= duration || stillMoving === false) {
        stopMovement();
        return;
      }
      movementTimer.current = setTimeout(step, 33);
    };
    step();
  };

  const useItem = (item) => {
    if (inventory[item] <= 0) return;
    setInventory((value) => ({ ...value, [item]: value[item] - 1 }));
    if (item === 'kits') setHealth((value) => Math.min(100, value + 35));
    if (item === 'batteries') { setBattery((value) => Math.min(100, value + 45)); setEnergy((value) => Math.min(100, value + 25)); }
    setMessage(item === 'kits' ? 'Health Kit digunakan · health +35' : 'Battery Pack digunakan · battery +45 · energy +25');
  };

  const startGame = () => {
    setShowNavigationBar(false);
    navigation?.setBottomNavigationVisible?.(false);
    setMessage('Twini tiba di kawasan Monas. Temukan landmark dan pulihkan sensor kota!');
    setPanel('game');
  };
  const backToMenu = () => {
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

  if (panel === 'game') return <View style={styles.gameScreen}>
    <StatusBar hidden />
    <View style={[styles.worldFrame, styles.worldFrameGame]}>
      <WorldSceneBoundary key={sceneAttempt} onRetry={() => setSceneAttempt((attempt) => attempt + 1)}><React.Suspense fallback={<View style={styles.worldFallback}><Text style={styles.fallbackText}>Menyiapkan Monas Digital Twin…</Text></View>}>
        <SurvivalWorldScene playerPosition={playerPosition} movementDirection={facingDirection.current} moving={moving} running={running} jumping={jumping} foundPickups={foundPickups} activatedSensors={activatedSensors} character={selectedCharacter} />
      </React.Suspense></WorldSceneBoundary>
      <View style={styles.mapOverlay}><MiniMap playerPosition={playerPosition} foundLandmarks={foundLandmarks} /></View>
      <View pointerEvents="box-none" style={styles.gameHudTop}>
        <View style={styles.gameStatusPill}>
          <View style={styles.gameLocation}><View style={styles.liveDot} /><Text numberOfLines={1} style={styles.gameLocationText}>{nearbyLandmark?.short || 'JAKARTA · MONAS'}</Text></View>
          <View style={styles.hudDivider} />
          <FontAwesomeIcon icon={faCloudSun} size={10} color="#ffda8b" /><Text style={styles.survivalTimerText}>{formatTime(survivalSeconds)} / 10:00</Text>
          <TouchableOpacity onPress={() => setPanel('missions')} style={styles.missionShortcut} accessibilityRole="button" accessibilityLabel="Buka misi">
            <FontAwesomeIcon icon={faTrophy} size={10} color="#ffd37b" /><Text style={styles.missionShortcutText}>{completedMissions}/6</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gameHudActions}>
          <TouchableOpacity onPress={() => { stopMovement(); setShowCharacterSettings(true); }} style={styles.hudIconButton} accessibilityRole="button" accessibilityLabel="Pengaturan karakter">
            <FontAwesomeIcon icon={faGear} size={15} color="#eaf4ff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const nextVisible = !showNavigationBar;
              setShowNavigationBar(nextVisible);
              navigation?.setBottomNavigationVisible?.(nextVisible);
            }}
            style={styles.hudIconButton}
            accessibilityRole="button"
            accessibilityLabel={showNavigationBar ? 'Sembunyikan navigasi' : 'Tampilkan navigasi'}
          ><FontAwesomeIcon icon={faBars} size={15} color="#eaf4ff" /></TouchableOpacity>
          <TouchableOpacity onPress={backToMenu} style={[styles.hudIconButton, styles.exitGameButton]} accessibilityRole="button" accessibilityLabel="Keluar dari game">
            <FontAwesomeIcon icon={faXmark} size={16} color="#ffe7eb" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.gameStats, { width: compact ? '68%' : 326 }]}>
        <ResourceBar compact label="HP" value={health} color="#ff7f91" icon={faHeart} />
        <ResourceBar compact label="NRG" value={energy} color="#ffd06f" icon={faBolt} />
        <ResourceBar compact label="STM" value={stamina} color="#70e0ae" icon={faShieldHeart} />
        <ResourceBar compact label="BAT" value={battery} color="#75c8ff" icon={faBatteryThreeQuarters} />
      </View>
      <View style={styles.worldCaption}><Text style={styles.worldCaptionText}>MEDAN MERDEKA · JAKARTA PUSAT · © OSM</Text></View>
      <View pointerEvents="box-none" style={styles.floatingControls}>
        <View
          {...joystickResponder.current.panHandlers}
          style={[styles.joystickBase, compact && styles.joystickBaseCompact, landscape && styles.joystickBaseLandscape]}
          accessibilityRole="adjustable"
          accessibilityLabel="Joystick arah gerak Twini"
          accessibilityHint="Geser untuk menggerakkan Twini secara halus."
        >
          <Text style={[styles.joystickDirection, styles.joystickUp]}>▲</Text>
          <Text style={[styles.joystickDirection, styles.joystickDown]}>▼</Text>
          <Text style={[styles.joystickDirection, styles.joystickLeft]}>◀</Text>
          <Text style={[styles.joystickDirection, styles.joystickRight]}>▶</Text>
          <Animated.View pointerEvents="none" style={[styles.joystickKnob, compact && styles.joystickKnobCompact, landscape && styles.joystickKnobLandscape, { transform: knobPosition.getTranslateTransform() }]}>
            <FontAwesomeIcon icon={faCompass} size={compact ? 16 : 19} color="#eaf5ff" />
          </Animated.View>
        </View>
        <View style={[styles.actionButtons, compact && styles.actionButtonsCompact, landscape && styles.actionButtonsLandscape]}>
          <TouchableOpacity onPress={() => setRunning((value) => !value)} style={[styles.actionCircle, compact && styles.actionCircleCompact, landscape && styles.actionCircleLandscape, running && styles.actionCircleActive]} accessibilityRole="button" accessibilityLabel={running ? 'Matikan lari' : 'Aktifkan lari'}><FontAwesomeIcon icon={faWind} size={compact ? 13 : 15} color={running ? '#071321' : '#b9d9ff'} /><Text style={[styles.actionLabel, running && styles.actionLabelActive]}>{running ? 'RUN ON' : 'RUN'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={jump} style={[styles.actionCircle, compact && styles.actionCircleCompact, landscape && styles.actionCircleLandscape]} accessibilityRole="button" accessibilityLabel="Lompat"><Text style={styles.jumpGlyph}>↟</Text><Text style={styles.actionLabel}>JUMP</Text></TouchableOpacity>
          <TouchableOpacity onPress={interact} style={[styles.actionCircle, compact && styles.actionCircleCompact, landscape && styles.actionCircleLandscape, styles.interactCircle]} accessibilityRole="button" accessibilityLabel="Interaksi"><FontAwesomeIcon icon={faTowerBroadcast} size={compact ? 13 : 15} color="#071321" /><Text style={[styles.actionLabel, styles.actionLabelActive]}>INTERACT</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => moveBurst(1, 1.35)} style={[styles.actionCircle, compact && styles.actionCircleCompact, landscape && styles.actionCircleLandscape]} accessibilityRole="button" accessibilityLabel="Dash ke arah hadap"><FontAwesomeIcon icon={faBolt} size={compact ? 13 : 15} color="#ffd36e" /><Text style={styles.actionLabel}>DASH</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => moveBurst(-1, 0.9)} style={[styles.actionCircle, compact && styles.actionCircleCompact, landscape && styles.actionCircleLandscape]} accessibilityRole="button" accessibilityLabel="Mundur"><FontAwesomeIcon icon={faArrowDown} size={compact ? 13 : 15} color="#c9ddf5" /><Text style={styles.actionLabel}>BACK</Text></TouchableOpacity>
        </View>
      </View>
    </View>
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
        </View>
      </View>
    </Modal>
    <View pointerEvents="none" style={styles.toast}><Text numberOfLines={1} style={styles.toastText}>{message}</Text></View>
  </View>;

  if (panel === 'missions') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>JOURNEY LOG · {completedMissions}/6 COMPLETE</Text><Text style={styles.pageTitle}>Mission Center</Text><Text style={styles.pageSubtitle}>Pulihkan ekosistem Digital Twin Jakarta, satu misi setiap perjalanan.</Text>
    {missions.map((mission, index) => { const done = mission.progress >= mission.total; const pct = Math.min(100, (mission.progress / mission.total) * 100); return <View key={mission.id} style={styles.missionCard}>
      <View style={styles.missionCardTop}><View style={[styles.missionNumber, done && styles.missionNumberDone]}><Text style={styles.missionNumberText}>{done ? '✓' : `0${index + 1}`}</Text></View><View style={styles.missionCardCopy}><Text style={styles.missionTitle}>{mission.title}</Text><Text style={styles.missionDescription}>{mission.description}</Text></View><Text style={[styles.missionState, done && styles.missionStateDone]}>{done ? 'SELESAI' : 'AKTIF'}</Text></View>
      <View style={styles.missionProgressTrack}><View style={[styles.missionProgressFill, { width: `${pct}%` }]} /></View>
      <View style={styles.missionFooter}><Text style={styles.missionProgressText}>{mission.time ? `${formatTime(mission.progress)} / 10:00` : `${Math.min(mission.progress, mission.total)} / ${mission.total}`}</Text><Text style={styles.rewardText}>{mission.reward}</Text></View>
    </View>; })}
  </ResponsiveContent></ScrollView>;

  if (panel === 'inventory') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>TWNI FIELD KIT</Text><Text style={styles.pageTitle}>Inventory</Text><Text style={styles.pageSubtitle}>Resource yang ditemukan selama eksplorasi Jakarta.</Text>
    {[['crystals', 'Energy Crystal', 'Kristal data untuk memulihkan digital battery.', '💎'], ['batteries', 'Battery Pack', 'Mengisi ulang battery dan energy Twini.', '🔋'], ['kits', 'Health Kit', 'Memulihkan health saat menghadapi kondisi ekstrem.', '🩹'], ['fragments', 'Data Fragment', 'Potongan data landmark dan infrastruktur kota.', '🔷']].map(([id, title, detail, emoji]) => <View key={id} style={styles.inventoryCard}><Text style={styles.inventoryEmoji}>{emoji}</Text><View style={styles.inventoryCopy}><Text style={styles.inventoryTitle}>{title}</Text><Text style={styles.inventoryDescription}>{detail}</Text><Text style={styles.inventoryCount}>Dimiliki: {inventory[id]}</Text></View>{['kits', 'batteries'].includes(id) && <TouchableOpacity onPress={() => useItem(id)} disabled={inventory[id] <= 0} style={[styles.useButton, inventory[id] <= 0 && styles.useDisabled]}><Text style={styles.useButtonText}>Gunakan</Text></TouchableOpacity>}</View>)}
  </ResponsiveContent></ScrollView>;

  if (panel === 'dashboard') return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ResponsiveContent>
    <TouchableOpacity onPress={backToMenu} style={styles.backButtonLight}><FontAwesomeIcon icon={faArrowLeft} size={13} color="#e7f2ff" /><Text style={styles.backText}>Menu TWINI</Text></TouchableOpacity>
    <Text style={styles.pageEyebrow}>IDTC · SIMULATED TELEMETRY</Text><Text style={styles.pageTitle}>Digital Twin Dashboard</Text><Text style={styles.pageSubtitle}>Data berikut disimulasikan untuk prototipe edukasi, bukan sensor live.</Text>
    <View style={styles.telemetryGrid}>{[[faCloudSun, 'Suhu', '34°C', 'Kondisi panas', '#ffbf72'], [faDroplet, 'Kelembapan', '72%', 'Sensor taman', '#81ceff'], [faWind, 'Kualitas udara', 'AQI 84', 'Sedang', '#8de0b5'], [faTowerBroadcast, 'Kecepatan angin', '11 km/j', 'Diperbarui sekarang', '#c6a7ff']].map(([icon, title, value, note, color]) => <View key={title} style={styles.telemetryCard}><FontAwesomeIcon icon={icon} size={17} color={color} /><Text style={styles.telemetryTitle}>{title}</Text><Text style={styles.telemetryValue}>{value}</Text><Text style={styles.telemetryNote}>{note} · SIMULASI</Text></View>)}</View>
    <View style={styles.sensorDashCard}><Text style={styles.menuSectionTitle}>Perangkat IoT di sekitar</Text>{SENSORS.map((_, index) => <View key={index} style={styles.sensorDashRow}><View style={[styles.sensorStatusDot, activatedSensors.includes(index) && styles.sensorActiveDot]} /><Text style={styles.sensorDashName}>{['Flood & Drainage', 'Air Quality Monitor', 'Smart Energy Pole'][index]}</Text><Text style={styles.sensorDashValue}>{activatedSensors.includes(index) ? 'ONLINE' : 'STANDBY'}</Text></View>)}</View>
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
            {'Explore.\nSurvive.\nReconnect.'}
          </Text>
          <Text style={styles.heroDescription}>Jelajahi Monas, pulihkan sensor kota, dan bangunkan kembali Digital Twin Jakarta.</Text>
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
        <View style={styles.playerPanelHead}><View><Text style={styles.menuSectionTitle}>Twini Status</Text><Text style={styles.panelHint}>Digital Guardian · Level 01</Text></View><View style={styles.xpBadge}><FontAwesomeIcon icon={faBolt} size={11} color="#ffcf77" /><Text style={styles.xpBadgeText}>{xp} XP · {coins} koin</Text></View></View>
        <View style={styles.homeResources}><ResourceBar label="HEALTH" value={health} color="#ff7f91" icon={faHeart} /><ResourceBar label="ENERGY" value={energy} color="#ffd06f" icon={faBolt} /><ResourceBar label="BATTERY" value={battery} color="#75c8ff" icon={faBatteryThreeQuarters} /></View>
        <View style={styles.playerSummary}><Text style={styles.summaryText}><FontAwesomeIcon icon={faMapLocationDot} size={10} color="#88c0ff" />  {foundLandmarks.length}/5 landmark</Text><Text style={styles.summaryText}><FontAwesomeIcon icon={faTowerBroadcast} size={10} color="#7be0c0" />  {activatedSensors.length}/3 sensor</Text><Text style={styles.summaryText}><FontAwesomeIcon icon={faTrophy} size={10} color="#ffd37b" />  {completedMissions}/6 misi</Text></View>
      </View>

      <View style={styles.menuSectionHead}><Text style={styles.menuSectionTitle}>Twin City Hub</Text><Text style={styles.panelHint}>Pilih aktivitas</Text></View>
      <View style={styles.menuGrid}>
        <MenuButton icon={faGamepad} title="Mission Center" detail={`${completedMissions} dari 6 misi selesai`} onPress={() => setPanel('missions')} accent="#ffd178" />
        <MenuButton icon={faBatteryThreeQuarters} title="Inventory" detail={`${inventory.crystals} crystal · ${inventory.kits} health kit`} onPress={() => setPanel('inventory')} accent="#7fcfff" />
        <MenuButton icon={faTowerBroadcast} title="Digital Twin" detail="Cuaca, kualitas udara, dan sensor" onPress={() => setPanel('dashboard')} accent="#72e0bd" />
        <MenuButton icon={faMapLocationDot} title="Bangun Kota" detail="Buka mode city builder 3D" onPress={() => navigation.navigate('CityBuilder')} accent="#c7a5ff" />
        <MenuButton icon={faCompass} title="OpenStreetMap" detail="Lihat peta Jakarta di dalam aplikasi" onPress={() => setPanel('dashboard')} accent="#85c9ff" />
      </View>

      <View style={styles.miniMissionCard}>
        <View style={styles.miniMissionIcon}><FontAwesomeIcon icon={faTrophy} size={14} color="#ffd178" /></View>
        <View style={styles.miniMissionCopy}><Text style={styles.miniMissionEyebrow}>MISI BERIKUTNYA</Text><Text style={styles.miniMissionTitle}>{missions.find((mission) => mission.progress < mission.total)?.title || 'Semua misi selesai!'}</Text><Text style={styles.miniMissionDetail}>{missions.find((mission) => mission.progress < mission.total)?.description || 'Jakarta Digital Twin telah pulih.'}</Text></View>
        <TouchableOpacity onPress={() => setPanel('missions')}><FontAwesomeIcon icon={faChevronRight} size={13} color="#90a4bc" /></TouchableOpacity>
      </View>
      <Text style={styles.poweredBy}>Powered by Indonesia Digital Twin Community</Text>
    </ResponsiveContent>
  </ScrollView>;
}

const styles = StyleSheet.create({
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
  startButtonPulse: { ...StyleSheet.absoluteFillObject, borderRadius: 16, borderWidth: 2, borderColor: '#ffc45f' },
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
  gameScreen: { flex: 1, minHeight: 0, backgroundColor: '#080f1c' },
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
  worldFrameGame: { flex: 1, minHeight: 0, borderRadius: 0, borderWidth: 0 },
  worldFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17334a' },
  fallbackText: { color: '#d6e8f7', fontSize: 11 },
  retrySceneButton: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11, backgroundColor: '#9dcbff' },
  retrySceneText: { color: '#071321', fontSize: 9, fontWeight: '900' },
  mapOverlay: { position: 'absolute', top: 64, right: 10 },
  miniMap: { width: 78, height: 78, overflow: 'hidden', borderRadius: 40, backgroundColor: 'rgba(8,20,35,0.78)', borderWidth: 1, borderColor: 'rgba(203,233,255,0.48)' },
  miniMapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.4, borderWidth: 1, borderColor: '#7391ac' },
  miniMapRing: { position: 'absolute', left: 14, top: 14, width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(153,201,245,0.35)' },
  miniMonas: { position: 'absolute', width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: 4, backgroundColor: '#ffcf77' },
  miniPoi: { position: 'absolute', width: 4, height: 4, borderRadius: 2, marginLeft: -2, marginTop: -2, backgroundColor: '#79d9bd' },
  miniPlayer: { position: 'absolute', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: 5, backgroundColor: '#81c4ff', borderWidth: 1, borderColor: '#fff' },
  miniMapLabel: { position: 'absolute', bottom: 5, width: '100%', color: '#b5c9de', fontSize: 5, fontWeight: '900', textAlign: 'center', letterSpacing: 0.4 },
  survivalTimer: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(8,20,35,0.8)' },
  survivalTimerText: { color: '#e1efff', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  worldCaption: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(8,20,35,0.74)' },
  worldCaptionText: { color: '#d5e6f4', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  gameHudTop: { position: 'absolute', zIndex: 4, top: 8, left: 9, right: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gameStatusPill: { maxWidth: '78%', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderRadius: 11, backgroundColor: 'rgba(7,17,30,0.78)', borderWidth: 1, borderColor: 'rgba(211,233,255,0.17)' },
  hudDivider: { width: 1, height: 13, backgroundColor: 'rgba(220,238,255,0.24)' },
  gameHudActions: { flexDirection: 'row', gap: 7 },
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
  floatingControls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 30 },
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
  toast: { minHeight: 22, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.055)' },
  toastText: { color: '#a6bad1', fontSize: 8, textAlign: 'center' },
});
