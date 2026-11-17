import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../../viewer/components/ThreeDRenderer';
import { DISTRICT_PLOT_BY_ID, DISTRICT_BUILDINGS, SEA_DECK_Y } from '../data/districtPlots';

// Wilayah pengembangan: petak darat (pad beton + tiang sudut) dan petak laut (dek terapung di atas
// tiang pancang) beserta bangunan yang dibangun pemain. Satu useFrame hanya menganimasikan beacon
// petak kosong, jadi tidak ada state React per frame.

function Building({ building, y, deck }) {
  const color = building.color;
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, emissive: color, emissiveIntensity: 0.08 }), [color]);
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfeefc', roughness: 0.4, metalness: 0.35 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8fd8ff', emissive: '#3fa9e0', emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.5 }), []);
  const s = building.shape;

  return <group position={[0, y, 0]}>
    {s === 'house' ? <>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[2.1, 1.1, 1.8]} /><primitive object={body} attach="material" /></mesh>
      <mesh position={[0, 1.28, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.62, 0.75, 4]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 0.42, 0.92]}><boxGeometry args={[0.5, 0.84, 0.08]} /><meshStandardMaterial color="#2a3a4a" /></mesh>
      {[-0.68, 0.68].map((x) => <mesh key={x} position={[x, 0.68, 0.92]}><boxGeometry args={[0.38, 0.34, 0.06]} /><primitive object={glass} attach="material" /></mesh>)}
      <mesh position={[0.85, 0.14, -0.6]}><boxGeometry args={[0.5, 0.28, 0.5]} /><meshStandardMaterial color="#6ee7a8" /></mesh>
    </> : null}
    {s === 'office' ? <>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow><boxGeometry args={[1.5, 2.5, 1.5]} /><primitive object={body} attach="material" /></mesh>
      {[0.55, 1.15, 1.75, 2.3].map((yy) => <mesh key={yy} position={[0, yy, 0.76]}><boxGeometry args={[1.34, 0.2, 0.04]} /><primitive object={glass} attach="material" /></mesh>)}
      <mesh position={[0, 2.58, 0]}><boxGeometry args={[1.66, 0.14, 1.66]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 3.0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.8, 6]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 3.42, 0]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#ff6f91" emissive="#ff2e5b" emissiveIntensity={0.9} /></mesh>
    </> : null}
    {s === 'factory' ? <>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow><boxGeometry args={[2.5, 1.3, 1.9]} /><primitive object={body} attach="material" /></mesh>
      {[-0.8, 0, 0.8].map((x) => <mesh key={x} position={[x, 1.45, 0]} rotation={[0, 0, -0.42]}><boxGeometry args={[0.82, 0.09, 1.9]} /><primitive object={accent} attach="material" /></mesh>)}
      <mesh position={[1.0, 1.9, -0.55]}><cylinderGeometry args={[0.16, 0.2, 1.5, 10]} /><primitive object={body} attach="material" /></mesh>
      <mesh position={[1.0, 2.7, -0.55]}><cylinderGeometry args={[0.19, 0.19, 0.12, 10]} /><meshStandardMaterial color="#ffc94d" /></mesh>
      <mesh position={[-0.7, 0.5, 0.98]}><boxGeometry args={[0.7, 0.6, 0.06]} /><meshStandardMaterial color="#2a3a4a" /></mesh>
    </> : null}
    {s === 'park' ? <>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[2.0, 2.0, 0.2, 24]} /><meshStandardMaterial color="#6ee7a8" /></mesh>
      {[[-0.75, 0.4], [0.7, -0.25], [0.15, 0.85]].map(([x, z], index) => <group key={index} position={[x, 0, z]}>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.08, 0.1, 0.6, 6]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
        <mesh position={[0, 1.0, 0]}><coneGeometry args={[0.42, 0.9, 8]} /><meshStandardMaterial color="#3fbf6b" /></mesh>
      </group>)}
      <mesh position={[0, 0.75, -0.9]}><torusGeometry args={[0.55, 0.06, 8, 24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.6} /></mesh>
      <mesh position={[0, 0.32, -0.9]}><cylinderGeometry args={[0.07, 0.07, 0.5, 8]} /><primitive object={accent} attach="material" /></mesh>
    </> : null}
    {s === 'floating_house' ? <>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[1.3, 1.3, 0.24, 18]} /><meshStandardMaterial color="#3a7bd0" /></mesh>
      <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.9, 1.0, 1.7]} /><primitive object={body} attach="material" /></mesh>
      <mesh position={[0, 1.36, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.45, 0.6, 4]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 0.62, 0.88]}><boxGeometry args={[0.46, 0.8, 0.06]} /><primitive object={glass} attach="material" /></mesh>
      <mesh position={[0.95, 0.2, 0.55]}><torusGeometry args={[0.3, 0.05, 6, 16]} /><meshStandardMaterial color="#ffd178" /></mesh>
    </> : null}
    {s === 'marina_tower' ? <>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[1.9, 2.05, 0.2, 24]} /><meshStandardMaterial color="#3a6f96" /></mesh>
      <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.62, 0.85, 2.6, 12]} /><primitive object={body} attach="material" /></mesh>
      {[0.8, 1.4, 2.0, 2.5].map((yy) => <mesh key={yy} position={[0, yy, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72 + (2.5 - yy) * 0.06, 0.05, 6, 20]} /><primitive object={glass} attach="material" /></mesh>)}
      <mesh position={[0, 2.95, 0]}><cylinderGeometry args={[0.05, 0.05, 0.8, 6]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 3.4, 0]}><sphereGeometry args={[0.14, 12, 10]} /><meshStandardMaterial color="#7cf5ff" emissive="#22e6ff" emissiveIntensity={1} /></mesh>
    </> : null}
    {s === 'port' ? <>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 0.5, 1.9]} /><primitive object={body} attach="material" /></mesh>
      <mesh position={[-0.7, 0.75, 0.3]}><boxGeometry args={[0.8, 0.5, 0.6]} /><meshStandardMaterial color="#4a8fd0" /></mesh>
      <mesh position={[0.1, 0.75, -0.4]}><boxGeometry args={[0.8, 0.5, 0.6]} /><meshStandardMaterial color="#d08f4a" /></mesh>
      <mesh position={[0.95, 1.5, 0]}><boxGeometry args={[0.14, 2.4, 0.14]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0.35, 2.6, 0]}><boxGeometry args={[1.3, 0.14, 0.16]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[-0.25, 2.3, 0]}><boxGeometry args={[0.06, 0.6, 0.06]} /><primitive object={accent} attach="material" /></mesh>
    </> : null}
    {s === 'resort' ? <>
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[2.4, 0.9, 1.6]} /><primitive object={body} attach="material" /></mesh>
      <mesh position={[0, 1.16, 0]}><boxGeometry args={[2.1, 0.14, 1.4]} /><primitive object={accent} attach="material" /></mesh>
      <mesh position={[0, 0.26, 1.05]}><boxGeometry args={[1.6, 0.1, 0.7]} /><meshStandardMaterial color="#5ec8ff" transparent opacity={0.85} /></mesh>
      {[-0.9, 0.9].map((x) => <group key={x} position={[x, 0, 1.05]}>
        <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.04, 0.04, 0.8, 6]} /><primitive object={accent} attach="material" /></mesh>
        <mesh position={[0, 0.98, 0]}><coneGeometry args={[0.42, 0.26, 10]} /><meshStandardMaterial color="#ff9fd0" /></mesh>
      </group>)}
    </> : null}
  </group>;
}

function Plot({ plot, entry, groundY, beaconRef }) {
  const building = entry?.buildingId ? DISTRICT_BUILDINGS.find((item) => item.id === entry.buildingId) : null;
  const sea = plot.kind === 'sea';
  const mats = useMemo(() => ({
    pad: new THREE.MeshStandardMaterial({ color: sea ? '#1f4f6b' : '#2b4a3c', roughness: 0.9, metalness: 0.1 }),
    deck: new THREE.MeshStandardMaterial({ color: '#24405a', roughness: 0.75, metalness: 0.25 }),
    edge: new THREE.MeshBasicMaterial({ color: entry ? '#8ce8ff' : '#7f93a8', transparent: true, opacity: entry ? 0.85 : 0.55 }),
    ring: new THREE.MeshBasicMaterial({ color: '#67f7a3', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    beacon: new THREE.MeshBasicMaterial({ color: '#ffd178' }),
  }), [entry, sea]);
  const baseY = sea ? SEA_DECK_Y : groundY;

  return <group position={[plot.center[0], 0, plot.center[1]]}>
    {sea ? <>
      <mesh position={[0, SEA_DECK_Y, 0]} receiveShadow><boxGeometry args={[plot.size, 0.18, plot.size]} /><primitive object={mats.deck} attach="material" /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}-${sz}`} position={[(sx * plot.size) / 2.4, -0.2, (sz * plot.size) / 2.4]}>
          <cylinderGeometry args={[0.14, 0.14, 1.6, 8]} /><primitive object={mats.pad} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, SEA_DECK_Y + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[plot.size * 0.3, plot.size * 0.34, 28]} /><primitive object={mats.edge} attach="material" /></mesh>
    </> : <>
      <mesh position={[0, groundY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[plot.size, plot.size]} /><primitive object={mats.pad} attach="material" /></mesh>
      <mesh position={[0, groundY + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[plot.size * 0.32, plot.size * 0.36, 28]} /><primitive object={mats.edge} attach="material" /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}-${sz}`} position={[(sx * plot.size) / 2, groundY + 0.4, (sz * plot.size) / 2]}>
          <boxGeometry args={[0.09, 0.8, 0.09]} /><primitive object={mats.edge} attach="material" />
        </mesh>
      ))}
    </>}
    {building ? <Building building={building} y={baseY + 0.1} deck={sea} /> : null}
    {!building ? <group ref={beaconRef} position={[0, baseY + 0.9, 0]}>
      <mesh><octahedronGeometry args={[0.26, 0]} /><primitive object={mats.beacon} attach="material" /></mesh>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.42, 0.52, 24]} /><primitive object={mats.ring} attach="material" /></mesh>
    </group> : null}
  </group>;
}

export default function DistrictLayer({ district, groundAt, coastal = false }) {
  const beacons = useRef([]);
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
    {Object.keys(DISTRICT_PLOT_BY_ID).map((plotId, index) => {
      const plot = DISTRICT_PLOT_BY_ID[plotId];
      // Petak laut hanya terlihat di environment pesisir (di sana ada laut + dermaga).
      if (plot.kind === 'sea' && !coastal) return null;
      const groundY = groundAt ? groundAt(plot.center[0], plot.center[1]) : 0;
      return <Plot
        key={plot.id}
        plot={plot}
        entry={district?.owned?.[plot.id]}
        groundY={groundY}
        beaconRef={(group) => { beacons.current[index] = group; }}
      />;
    })}
  </group>;
}
