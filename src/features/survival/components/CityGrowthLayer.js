import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { BUILDING_BY_ID, GROWTH_PLOTS } from '../../game/engine/cityGrowth';

// Petak bidang tanah + aset bangunan yang dibangun pemain dari Poin Pertumbuhan.
// Setiap petak adalah kotak tanah dengan tiang sudut; petak kosong yang sudah terbuka menampilkan
// beacon berputar, petak terkunci tampil redup, dan petak terisi menampilkan mesh bangunannya.
// Satu useFrame menganimasikan semua beacon (tanpa state React per frame).

function BuildingMesh({ building, y }) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: building.color,
    emissive: building.color,
    emissiveIntensity: 0.18,
    metalness: 0.35,
    roughness: 0.55,
  }), [building.color]);
  const trim = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eaf7ff', transparent: true, opacity: 0.75 }), []);
  const h = y;
  return <group position={[0, h, 0]}>
    {building.kind === 'tower' ? <>
      <mesh position={[0, 1.3, 0]}><boxGeometry args={[1.25, 2.6, 1.25]} /><primitive object={material} attach="material" /></mesh>
      <mesh position={[0, 2.72, 0]}><boxGeometry args={[0.8, 0.24, 0.8]} /><primitive object={trim} attach="material" /></mesh>
      <mesh position={[0, 3.1, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6, 6]} /><primitive object={trim} attach="material" /></mesh>
    </> : null}
    {building.kind === 'hub' ? <>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.72, 0.86, 1.4, 12]} /><primitive object={material} attach="material" /></mesh>
      <mesh position={[0, 1.62, 0]}><cylinderGeometry args={[0.05, 0.05, 0.55, 6]} /><primitive object={trim} attach="material" /></mesh>
      <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.13, 10, 8]} /><primitive object={trim} attach="material" /></mesh>
    </> : null}
    {building.kind === 'solar' ? <>
      <mesh position={[0, 0.16, 0]}><boxGeometry args={[2.5, 0.2, 1.7]} /><primitive object={material} attach="material" /></mesh>
      {[-0.8, 0, 0.8].map((x) => <mesh key={x} position={[x, 0.52, 0]} rotation={[-0.45, 0, 0]}><boxGeometry args={[0.66, 0.06, 1.4]} /><primitive object={trim} attach="material" /></mesh>)}
    </> : null}
    {building.kind === 'water' ? <>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[1.25, 1.35, 0.36, 16]} /><primitive object={material} attach="material" /></mesh>
      <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.05, 20]} /><meshBasicMaterial color="#8fe4ff" transparent opacity={0.85} /></mesh>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.07, 0.07, 1.1, 8]} /><primitive object={trim} attach="material" /></mesh>
    </> : null}
    {building.kind === 'farm' ? <>
      {[0, 1, 2].map((level) => <mesh key={level} position={[0, 0.34 + level * 0.55, 0]}>
        <boxGeometry args={[2.1 - level * 0.4, 0.45, 1.6 - level * 0.3]} />
        <primitive object={material} attach="material" />
      </mesh>)}
      <mesh position={[0, 2.1, 0]}><coneGeometry args={[0.35, 0.6, 8]} /><primitive object={trim} attach="material" /></mesh>
    </> : null}
    {building.kind === 'clinic' ? <>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.9, 1.5, 1.5]} /><primitive object={material} attach="material" /></mesh>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[2.1, 0.16, 1.7]} /><primitive object={trim} attach="material" /></mesh>
      <mesh position={[0, 1.1, 0.78]}><boxGeometry args={[0.5, 0.14, 0.05]} /><meshBasicMaterial color="#fff3f5" /></mesh>
      <mesh position={[0, 1.1, 0.78]}><boxGeometry args={[0.14, 0.5, 0.05]} /><meshBasicMaterial color="#fff3f5" /></mesh>
    </> : null}
    {building.kind === 'transit' ? <>
      <mesh position={[0, 0.18, 0]}><boxGeometry args={[2.5, 0.36, 2.1]} /><primitive object={material} attach="material" /></mesh>
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[2.7, 0.22, 2.3]} /><primitive object={trim} attach="material" /></mesh>
      {[[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]].map(([x, z]) => <mesh key={`${x}-${z}`} position={[x, 0.85, z]}><boxGeometry args={[0.12, 1.2, 0.12]} /><primitive object={trim} attach="material" /></mesh>)}
    </> : null}
    {building.kind === 'park' ? <>
      <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[1.35, 1.35, 0.28, 18]} /><primitive object={material} attach="material" /></mesh>
      {[[-0.55, 0.2], [0.5, -0.35], [0.15, 0.6]].map(([x, z], index) => <group key={index} position={[x, 0, z]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.07, 0.09, 0.6, 6]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
        <mesh position={[0, 1.05, 0]}><coneGeometry args={[0.36, 0.8, 8]} /><meshStandardMaterial color="#3fbf6b" /></mesh>
      </group>)}
    </> : null}
  </group>;
}

function Plot({ plot, unlocked, building, y, beaconRef }) {
  const mats = useMemo(() => ({
    pad: new THREE.MeshStandardMaterial({ color: unlocked ? '#2b4a3c' : '#22303f', roughness: 0.95, metalness: 0.05, transparent: !unlocked, opacity: unlocked ? 1 : 0.6 }),
    edge: new THREE.MeshBasicMaterial({ color: unlocked ? '#8ce8ff' : '#4a6076', transparent: true, opacity: unlocked ? 0.75 : 0.4 }),
    ring: new THREE.MeshBasicMaterial({ color: '#67f7a3', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    beacon: new THREE.MeshBasicMaterial({ color: '#ffd178' }),
  }), [unlocked]);
  return <group position={[plot.center[0], 0, plot.center[1]]}>
    <mesh position={[0, y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[plot.size, plot.size]} />
      <primitive object={mats.pad} attach="material" />
    </mesh>
    <mesh position={[0, y + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[plot.size * 0.34, plot.size * 0.38, 28]} />
      <primitive object={mats.edge} attach="material" />
    </mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}-${sz}`} position={[(sx * plot.size) / 2, y + 0.4, (sz * plot.size) / 2]}>
      <boxGeometry args={[0.09, 0.8, 0.09]} />
      <primitive object={mats.edge} attach="material" />
    </mesh>)}
    {building ? <BuildingMesh building={building} y={y + 0.08} /> : null}
    {!building && unlocked ? <group ref={beaconRef} position={[0, y + 0.9, 0]}>
      <mesh><octahedronGeometry args={[0.26, 0]} /><primitive object={mats.beacon} attach="material" /></mesh>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.42, 0.52, 24]} /><primitive object={mats.ring} attach="material" /></mesh>
    </group> : null}
  </group>;
}

export default function CityGrowthLayer({ growth, groundAt, unlockBonus = 0 }) {
  const beacons = useRef([]);
  const cleared = (growth?.cleared || 0) + unlockBonus;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    beacons.current.forEach((group, index) => {
      if (!group) return;
      group.rotation.y = t * 0.85 + index;
      if (group.userData.baseY === undefined) group.userData.baseY = group.position.y;
      group.position.y = group.userData.baseY + Math.sin(t * 2 + index) * 0.1;
    });
  });
  return <group>
    {GROWTH_PLOTS.map((plot, index) => {
      const entry = growth?.built?.[plot.id];
      const building = BUILDING_BY_ID[entry?.buildingId] || null;
      const y = groundAt ? groundAt(plot.center[0], plot.center[1]) : 0;
      return <Plot
        key={plot.id}
        plot={plot}
        y={y}
        unlocked={cleared >= plot.unlockCleared}
        building={building}
        beaconRef={(group) => { beacons.current[index] = group; }}
      />;
    })}
  </group>;
}
