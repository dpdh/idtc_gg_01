import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
const pickupPoints = [[2, -3], [-4, 4], [7, 0], [-7, -5], [5, 6], [-2, -7], [8, 5], [-8, 0], [3, 8], [-6, 7]];
const sensorPoints = [[1, 4], [-5, 0], [4, -2]];

function Monas() {
  const marble = '#e4e8e6';
  const gold = '#e8ae37';
  return <group position={[0, 0, 0]}>
    {/* The square museum base, broad ceremonial podium and stepped marble plinth. */}
    <mesh position={[0, 0.035, 0]}><cylinderGeometry args={[3.6, 3.75, 0.12, 48]} /><meshStandardMaterial color="#9a9b91" roughness={0.78} /></mesh>
    <mesh position={[0, 0.14, 0]}><boxGeometry args={[3.15, 0.18, 3.15]} /><meshStandardMaterial color="#c7c8c0" roughness={0.72} /></mesh>
    <mesh position={[0, 0.28, 0]}><boxGeometry args={[2.82, 0.14, 2.82]} /><meshStandardMaterial color="#dedfd9" roughness={0.66} /></mesh>
    <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[2.52, 0.78, 2.52]} /><meshStandardMaterial color={marble} roughness={0.42} /></mesh>
    <mesh position={[0, 1.13, 0]}><boxGeometry args={[2.72, 0.12, 2.72]} /><meshStandardMaterial color="#c4c9c6" roughness={0.48} /></mesh>
    <mesh position={[0, 1.22, 0]}><boxGeometry args={[2.46, 0.08, 2.46]} /><meshStandardMaterial color="#f0f1ed" roughness={0.45} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`museum-corner-${x}-${z}`} position={[x * 1.05, 0.73, z * 1.05]}>
      <mesh castShadow><boxGeometry args={[0.16, 0.6, 0.16]} /><meshStandardMaterial color="#c5cbc7" roughness={0.38} /></mesh>
      <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.24, 0.07, 0.24]} /><meshStandardMaterial color="#f3f3ee" roughness={0.35} /></mesh>
    </group>))}
    {[-0.72, 0, 0.72].flatMap((x) => [-1, 1].map((side) => <mesh key={`museum-window-front-${x}-${side}`} position={[x, 0.75, side * 1.267]}>
      <boxGeometry args={[0.28, 0.48, 0.026]} /><meshStandardMaterial color="#7b9a9b" emissive="#264f5b" emissiveIntensity={0.12} roughness={0.3} />
    </mesh>))}
    {/* The tall tapered shaft and observation deck give Monas its distinct skyline silhouette. */}
    <mesh position={[0, 3.67, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><cylinderGeometry args={[0.31, 0.52, 4.85, 4]} /><meshStandardMaterial color="#f0f1ed" roughness={0.3} metalness={0.08} /></mesh>
    {Array.from({ length: 4 }, (_, index) => <group key={`shaft-rib-${index}`} rotation={[0, index * Math.PI / 2, 0]}>
      <mesh position={[0, 3.65, 0.37]}><boxGeometry args={[0.055, 4.55, 0.035]} /><meshStandardMaterial color="#c4ccc9" roughness={0.38} /></mesh>
    </group>)}
    {[2.0, 3.1, 4.2, 5.25].map((y) => <mesh key={`shaft-band-${y}`} position={[0, y, 0]}><cylinderGeometry args={[0.46 - (y - 1.3) * 0.035, 0.49 - (y - 1.3) * 0.035, 0.055, 4]} /><meshStandardMaterial color="#d2d8d4" roughness={0.4} /></mesh>)}
    <mesh position={[0, 6.2, 0]}><boxGeometry args={[1.16, 0.14, 1.16]} /><meshStandardMaterial color="#d2d7d3" roughness={0.42} /></mesh>
    <mesh position={[0, 6.34, 0]}><cylinderGeometry args={[0.67, 0.67, 0.12, 32]} /><meshStandardMaterial color="#e8ebe7" roughness={0.38} /></mesh>
    <mesh position={[0, 6.43, 0]}><cylinderGeometry args={[0.59, 0.64, 0.08, 32]} /><meshStandardMaterial color="#aeb8b4" metalness={0.25} roughness={0.35} /></mesh>
    {/* Gold flame and needle spire above the viewing platform. */}
    <mesh position={[0, 6.55, 0]}><cylinderGeometry args={[0.39, 0.49, 0.16, 24]} /><meshStandardMaterial color={gold} metalness={0.76} roughness={0.2} /></mesh>
    <mesh position={[0, 6.86, 0]} castShadow><coneGeometry args={[0.4, 0.56, 12]} /><meshStandardMaterial color="#f3c34f" metalness={0.82} roughness={0.18} emissive="#9c6614" emissiveIntensity={0.24} /></mesh>
    <mesh position={[0, 7.22, 0]} rotation={[0, 0, 0.12]}><coneGeometry args={[0.2, 0.62, 10]} /><meshStandardMaterial color="#ffdc73" metalness={0.8} roughness={0.18} emissive="#ffb62e" emissiveIntensity={0.5} /></mesh>
    <mesh position={[0, 7.55, 0]}><sphereGeometry args={[0.055, 12, 10]} /><meshStandardMaterial color="#fff0a4" emissive="#ffbf36" emissiveIntensity={0.9} /></mesh>
    <pointLight position={[0, 7.0, 0]} color="#ffbf4a" intensity={0.8} distance={7} />
  </group>;
}

function ParkLamp({ position }) {
  return <group position={position}>
    <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.045, 0.075, 1.55, 8]} /><meshStandardMaterial color="#344653" metalness={0.65} roughness={0.34} /></mesh>
    <mesh position={[0, 1.58, 0]}><cylinderGeometry args={[0.16, 0.11, 0.14, 10]} /><meshStandardMaterial color="#344653" metalness={0.6} /></mesh>
    <mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.095, 12, 10]} /><meshStandardMaterial color="#ffe4a1" emissive="#ffbd54" emissiveIntensity={0.85} roughness={0.25} /></mesh>
  </group>;
}

function ParkBench({ position, rotation = 0 }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[1.15, 0.1, 0.34]} /><meshStandardMaterial color="#76543d" roughness={0.78} /></mesh>
    <mesh position={[0, 0.65, -0.14]}><boxGeometry args={[1.15, 0.38, 0.08]} /><meshStandardMaterial color="#76543d" roughness={0.78} /></mesh>
    {[-0.42, 0.42].map((x) => <mesh key={x} position={[x, 0.22, 0]}><boxGeometry args={[0.07, 0.42, 0.28]} /><meshStandardMaterial color="#485761" metalness={0.45} /></mesh>)}
  </group>;
}

function ParkTree({ position, scale = 1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.09, 0.14, 0.95, 7]} /><meshStandardMaterial color="#79533d" /></mesh>
    <mesh position={[0, 1.22, 0]} castShadow><coneGeometry args={[0.62, 1.55, 8]} /><meshStandardMaterial color="#237c56" roughness={0.88} /></mesh>
    <mesh position={[0, 1.83, 0]} castShadow><coneGeometry args={[0.42, 1.1, 8]} /><meshStandardMaterial color="#38a66e" roughness={0.84} /></mesh>
  </group>;
}

function CityBlock({ position, size, color }) {
  return <group position={position}>
    <mesh position={[0, size[1] / 2, 0]} castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.68} /></mesh>
    {Array.from({ length: Math.max(2, Math.floor(size[1] / 0.47)) }, (_, floor) => {
      const y = 0.34 + floor * 0.47;
      return <group key={`floor-${floor}`}>
        {[-1, 1].map((side) => <React.Fragment key={`facade-${side}`}>
          {[-1, 0, 1].map((column) => <mesh key={`front-${column}`} position={[column * size[0] * 0.27, y, side * (size[2] / 2 + 0.012)]}><boxGeometry args={[size[0] * 0.16, 0.23, 0.025]} /><meshStandardMaterial color="#9ccbd8" emissive="#548da5" emissiveIntensity={0.12} roughness={0.28} /></mesh>)}
          {[-1, 1].map((end) => <mesh key={`side-${end}`} position={[side * (size[0] / 2 + 0.012), y, end * size[2] * 0.24]}><boxGeometry args={[0.025, 0.23, size[2] * 0.18]} /><meshStandardMaterial color="#9ccbd8" emissive="#548da5" emissiveIntensity={0.12} roughness={0.28} /></mesh>)}
        </React.Fragment>)}
        <mesh position={[0, y - 0.18, 0]}><boxGeometry args={[size[0] * 1.01, 0.055, size[2] * 1.01]} /><meshStandardMaterial color="#7b8e94" roughness={0.58} /></mesh>
      </group>;
    })}
    <mesh position={[0, size[1] + 0.08, 0]}><boxGeometry args={[size[0] * 1.08, 0.16, size[2] * 1.08]} /><meshStandardMaterial color="#62798c" metalness={0.22} roughness={0.48} /></mesh>
    <mesh position={[0, size[1] + 0.24, 0]}><boxGeometry args={[size[0] * 0.48, 0.18, size[2] * 0.48]} /><meshStandardMaterial color="#536977" metalness={0.25} roughness={0.45} /></mesh>
    <mesh position={[0, size[1] + 0.36, 0]}><boxGeometry args={[size[0] * 0.28, 0.08, size[2] * 0.28]} /><meshStandardMaterial color="#738994" metalness={0.3} roughness={0.4} /></mesh>
    {size[1] > 4.5 && <group position={[size[0] * 0.16, size[1] + 0.48, -size[2] * 0.12]}>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.025, 0.04, 0.42, 8]} /><meshStandardMaterial color="#526573" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.44, 0]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color="#ffca70" emissive="#f3993f" emissiveIntensity={0.35} /></mesh>
    </group>}
  </group>;
}

function TwiniAvatar({ position, running, jumping }) {
  const group = useRef(null);
  const leftArm = useRef(null);
  const rightArm = useRef(null);
  const leftLeg = useRef(null);
  const rightLeg = useRef(null);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * (running ? 11 : 2.2);
    if (group.current) group.current.position.y = (jumping ? 0.65 : 0) + (running ? Math.abs(Math.sin(phase)) * 0.08 : Math.sin(phase) * 0.025);
    if (leftArm.current) leftArm.current.rotation.x = running ? Math.sin(phase) * 0.68 : Math.sin(phase) * 0.08;
    if (rightArm.current) rightArm.current.rotation.x = running ? -Math.sin(phase) * 0.68 : -Math.sin(phase) * 0.08;
    if (leftLeg.current) leftLeg.current.rotation.x = running ? -Math.sin(phase) * 0.58 : 0;
    if (rightLeg.current) rightLeg.current.rotation.x = running ? Math.sin(phase) * 0.58 : 0;
  });
  const blue = '#2f8be8';
  const white = '#eaf3fa';
  const gold = '#f2c45f';
  return <group ref={group} position={[position[0], 0, position[1]]} rotation={[0, Math.atan2(position[0], position[1]) + Math.PI, 0]} scale={0.75}>
    {/* Compact IDTC digital guardian: helmet, glowing face, armored body and gold circuit accents. */}
    <mesh position={[0, 0.42, 0]} castShadow><sphereGeometry args={[0.23, 18, 14]} /><meshStandardMaterial color={blue} roughness={0.38} metalness={0.35} /></mesh>
    <mesh position={[0, 0.47, 0.15]} castShadow><boxGeometry args={[0.3, 0.14, 0.12]} /><meshStandardMaterial color={white} roughness={0.42} metalness={0.28} /></mesh>
    <group ref={leftLeg} position={[-0.115, 0.29, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow><cylinderGeometry args={[0.075, 0.07, 0.25, 12]} /><meshStandardMaterial color="#9db5c8" metalness={0.35} roughness={0.4} /></mesh>
      <mesh position={[0, -0.23, 0.01]}><sphereGeometry args={[0.083, 12, 10]} /><meshStandardMaterial color={gold} metalness={0.68} roughness={0.25} /></mesh>
      <mesh position={[0, -0.25, 0.045]} castShadow><boxGeometry args={[0.16, 0.09, 0.22]} /><meshStandardMaterial color={blue} roughness={0.42} metalness={0.25} /></mesh>
    </group>
    <group ref={rightLeg} position={[0.115, 0.29, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow><cylinderGeometry args={[0.075, 0.07, 0.25, 12]} /><meshStandardMaterial color="#9db5c8" metalness={0.35} roughness={0.4} /></mesh>
      <mesh position={[0, -0.23, 0.01]}><sphereGeometry args={[0.083, 12, 10]} /><meshStandardMaterial color={gold} metalness={0.68} roughness={0.25} /></mesh>
      <mesh position={[0, -0.25, 0.045]} castShadow><boxGeometry args={[0.16, 0.09, 0.22]} /><meshStandardMaterial color={blue} roughness={0.42} metalness={0.25} /></mesh>
    </group>
    <mesh position={[0, 0.38, -0.11]} castShadow><boxGeometry args={[0.36, 0.22, 0.22]} /><meshStandardMaterial color="#253d56" metalness={0.48} roughness={0.35} /></mesh>
    <mesh position={[0, 0.38, -0.235]}><boxGeometry args={[0.22, 0.1, 0.035]} /><meshStandardMaterial color="#65d8ff" emissive="#28bce9" emissiveIntensity={0.72} metalness={0.5} /></mesh>
    <mesh position={[0, 0.76, 0]} castShadow><sphereGeometry args={[0.36, 20, 16]} /><meshStandardMaterial color={white} roughness={0.34} metalness={0.22} /></mesh>
    <mesh position={[0, 0.76, 0.235]}><torusGeometry args={[0.255, 0.045, 8, 24]} /><meshStandardMaterial color={gold} metalness={0.72} roughness={0.25} /></mesh>
    <mesh position={[0, 0.78, 0.285]}><sphereGeometry args={[0.205, 20, 14]} /><meshStandardMaterial color="#17314a" roughness={0.22} metalness={0.2} /></mesh>
    {[-0.082, 0.082].map((x) => <group key={x} position={[x, 0.79, 0.445]}>
      <mesh><sphereGeometry args={[0.066, 14, 12]} /><meshStandardMaterial color="#b8efff" emissive="#72d8ff" emissiveIntensity={0.6} roughness={0.18} /></mesh>
      <mesh position={[0, -0.012, 0.045]}><sphereGeometry args={[0.031, 12, 10]} /><meshStandardMaterial color="#10223a" roughness={0.16} /></mesh>
      <mesh position={[-0.015, 0.018, 0.07]}><sphereGeometry args={[0.012, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
    </group>)}
    <mesh position={[0, 0.57, 0.45]}><boxGeometry args={[0.07, 0.018, 0.015]} /><meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.35} /></mesh>
    <mesh position={[0, 0.91, 0.345]}><boxGeometry args={[0.34, 0.17, 0.035]} /><meshStandardMaterial color={blue} metalness={0.62} roughness={0.3} /></mesh>
    <mesh position={[0, 0.91, 0.37]}><torusGeometry args={[0.075, 0.014, 6, 16]} /><meshStandardMaterial color={gold} metalness={0.76} roughness={0.2} /></mesh>
    <mesh position={[0, 0.91, 0.39]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color="#a9f0ff" emissive="#54d5ff" emissiveIntensity={1} /></mesh>
    <mesh position={[0, 1.18, 0]} castShadow><sphereGeometry args={[0.39, 24, 18]} /><meshStandardMaterial color={white} roughness={0.3} metalness={0.27} /></mesh>
    <mesh position={[0, 1.15, 0.32]}><sphereGeometry args={[0.265, 24, 16]} /><meshStandardMaterial color="#12243a" roughness={0.22} metalness={0.25} /></mesh>
    {[-0.105, 0.105].map((x) => <group key={`eye-${x}`} position={[x, 1.16, 0.54]}>
      <mesh><sphereGeometry args={[0.073, 16, 12]} /><meshStandardMaterial color="#b7f2ff" emissive="#5fd3ff" emissiveIntensity={0.72} /></mesh>
      <mesh position={[0, -0.012, 0.045]}><sphereGeometry args={[0.035, 12, 10]} /><meshStandardMaterial color="#12304e" /></mesh>
      <mesh position={[-0.018, 0.024, 0.073]}><sphereGeometry args={[0.014, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
    </group>)}
    <mesh position={[0, 1.43, 0]}><torusGeometry args={[0.3, 0.035, 8, 24]} /><meshStandardMaterial color={blue} metalness={0.68} roughness={0.25} /></mesh>
    <mesh position={[0, 1.61, 0]}><cylinderGeometry args={[0.035, 0.045, 0.27, 10]} /><meshStandardMaterial color={gold} metalness={0.78} roughness={0.2} /></mesh>
    <mesh position={[0, 1.76, 0]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#70deff" emissive="#42c9ff" emissiveIntensity={1.2} /></mesh>
    <mesh position={[0, 1.12, -0.29]} castShadow><boxGeometry args={[0.33, 0.36, 0.16]} /><meshStandardMaterial color={blue} roughness={0.38} metalness={0.42} /></mesh>
    <mesh position={[0, 1.19, -0.39]}><boxGeometry args={[0.19, 0.09, 0.035]} /><meshStandardMaterial color={gold} emissive="#bd8c2c" emissiveIntensity={0.28} metalness={0.6} /></mesh>
    {[-1, 1].map((side) => <group key={`shoulder-${side}`} position={[side * 0.35, 1.34, 0]}>
      <mesh castShadow><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color={blue} metalness={0.48} roughness={0.32} /></mesh>
      <mesh position={[0, 0.025, 0.095]}><boxGeometry args={[0.12, 0.07, 0.055]} /><meshStandardMaterial color={gold} metalness={0.72} roughness={0.22} /></mesh>
    </group>)}
    <group ref={leftArm} position={[-0.36, 1.2, 0]}>
      <mesh position={[0, -0.19, 0]} rotation={[0, 0, -0.15]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.39, 12]} /><meshStandardMaterial color={white} metalness={0.28} roughness={0.38} /></mesh>
      <mesh position={[0, -0.22, 0.015]}><torusGeometry args={[0.084, 0.018, 6, 12]} /><meshStandardMaterial color="#61c9f0" metalness={0.62} roughness={0.24} /></mesh>
      <mesh position={[0, -0.4, 0.02]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color={gold} metalness={0.65} roughness={0.27} /></mesh>
      <mesh position={[0, -0.49, 0.045]} castShadow><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color="#dfeaf0" metalness={0.38} roughness={0.33} /></mesh>
    </group>
    <group ref={rightArm} position={[0.36, 1.2, 0]}>
      <mesh position={[0, -0.19, 0]} rotation={[0, 0, 0.15]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.39, 12]} /><meshStandardMaterial color={white} metalness={0.28} roughness={0.38} /></mesh>
      <mesh position={[0, -0.22, 0.015]}><torusGeometry args={[0.084, 0.018, 6, 12]} /><meshStandardMaterial color="#61c9f0" metalness={0.62} roughness={0.24} /></mesh>
      <mesh position={[0, -0.4, 0.02]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color={gold} metalness={0.65} roughness={0.27} /></mesh>
      <mesh position={[0, -0.49, 0.045]} castShadow><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color="#dfeaf0" metalness={0.38} roughness={0.33} /></mesh>
    </group>
  </group>;
}

function World({ playerPosition, running, jumping, foundPickups, activatedSensors }) {
  const trees = [[-3, -4], [3, -4], [-4, 1], [4, 2], [-2, 6], [2, 7], [-8, 4], [8, -5], [-6, -7], [6, -7], [-9, -2], [9, 2], [-3, 9], [3, -9], [-7, 0], [7, 0], [0, -8], [0, 8], [-10, -5], [10, 5]];
  const blocks = [[-12, -10, 2.3, 4, 3], [-8, -12, 2.1, 3, 2.5], [-3, -12, 2.5, 5, 3], [3, -12, 2.5, 3.6, 3], [8, -11, 3, 5.2, 3.2], [12, -8, 2.6, 4.2, 3], [-12, 8, 2.6, 4.5, 3], [-8, 12, 2.2, 3.6, 3], [8, 11, 2.8, 5, 3], [12, 8, 2.5, 4, 3], [-12, 0, 2.4, 5, 3], [12, -1, 2.5, 4.5, 3], [-10, 11, 2.6, 6.5, 3.2], [10, -13, 2.8, 7, 3.4], [-13, -4, 2.5, 6, 3.2], [13, 4, 2.4, 5.5, 3]];
  const lamps = [[-5, -5], [5, -5], [-5, 5], [5, 5], [-10, 0], [10, 0], [0, -10], [0, 10]];
  return <>
    <color attach="background" args={['#8db5c1']} />
    <fog attach="fog" args={['#8db5c1', 35, 90]} />
    <ambientLight intensity={1.5} />
    <directionalLight position={[14, 22, 10]} intensity={2.3} castShadow />
    <hemisphereLight args={['#d7f3ff', '#365744', 0.8]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#4a9a70" roughness={0.95} /></mesh>
    {/* Medan Merdeka's planted lawns, tiled ceremonial plaza, and radial walks. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}><ringGeometry args={[3.8, 4.45, 64]} /><meshStandardMaterial color="#b9b5a5" roughness={0.82} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.038, 0]}><ringGeometry args={[4.55, 8.4, 64]} /><meshStandardMaterial color="#c6bda7" roughness={0.82} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}><ringGeometry args={[8.35, 9.8, 64]} /><meshStandardMaterial color="#d4c8a8" roughness={0.87} /></mesh>
    {[5.2, 6.2, 7.2, 8.15].map((radius) => <mesh key={`plaza-line-${radius}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.026, 0]}><ringGeometry args={[radius, radius + 0.035, 64]} /><meshStandardMaterial color="#918e83" roughness={0.78} /></mesh>)}
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => <group key={`walk-${angle}`} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 6.2]}><planeGeometry args={[1.15, 12.4]} /><meshStandardMaterial color="#c9c0a8" roughness={0.88} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.022, 6.2]}><planeGeometry args={[0.07, 12.4]} /><meshStandardMaterial color="#a6a08f" roughness={0.82} /></mesh>
    </group>)}
    {/* Garden paths and the four broad city avenues around the park. */}
    {[-1, 1].flatMap((side) => [-1, 1].map((other) => <mesh key={`park-path-${side}-${other}`} rotation={[-Math.PI / 2, 0, 0]} position={[side * 10.4, -0.015, other * 10.4]}><planeGeometry args={[9, 0.42]} /><meshStandardMaterial color="#b8ad92" roughness={0.9} /></mesh>))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -15]}><planeGeometry args={[70, 5]} /><meshStandardMaterial color="#343d47" roughness={0.8} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 15]}><planeGeometry args={[70, 5]} /><meshStandardMaterial color="#343d47" roughness={0.8} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0, 0]}><planeGeometry args={[5, 70]} /><meshStandardMaterial color="#343d47" roughness={0.8} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0, 0]}><planeGeometry args={[5, 70]} /><meshStandardMaterial color="#343d47" roughness={0.8} /></mesh>
    {Array.from({ length: 8 }, (_, i) => <mesh key={`dash-x-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-13 + i * 3.7, 0.02, 15]}><planeGeometry args={[1.5, 0.12]} /><meshBasicMaterial color="#f4e8bc" /></mesh>)}
    {Array.from({ length: 8 }, (_, i) => <mesh key={`dash-z-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[15, 0.02, -13 + i * 3.7]}><planeGeometry args={[0.12, 1.5]} /><meshBasicMaterial color="#f4e8bc" /></mesh>)}
    <Monas />
    {trees.map(([x, z], index) => <ParkTree key={`tree-${index}`} position={[x, 0, z]} scale={0.72 + (index % 3) * 0.13} />)}
    {lamps.map(([x, z], index) => <ParkLamp key={`lamp-${index}`} position={[x, 0, z]} />)}
    {[[-5, -2, 0], [5, -2, 0], [-5, 2, Math.PI], [5, 2, Math.PI]].map(([x, z, rotation], index) => <ParkBench key={`bench-${index}`} position={[x, 0, z]} rotation={rotation} />)}
    {blocks.map(([x, z, sx, sy, sz], index) => <CityBlock key={`block-${index}`} position={[x, 0, z]} size={[sx, sy, sz]} color={['#aab9c2', '#b9c2bd', '#899eaa'][index % 3]} />)}
    {pickupPoints.map(([x, z], index) => !foundPickups.includes(index) && <group key={`crystal-${index}`} position={[x, 0.65, z]}>
      <mesh rotation={[0.2, 0.5, 0]}><octahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#6de7ff" emissive="#11bde8" emissiveIntensity={1.2} metalness={0.55} roughness={0.2} /></mesh>
      <pointLight intensity={1.3} distance={3} color="#31d9ff" />
    </group>)}
    {sensorPoints.map(([x, z], index) => <group key={`sensor-${index}`} position={[x, 0, z]}>
      <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.045, 0.06, 1.44, 8]} /><meshStandardMaterial color="#cbd7dd" metalness={0.5} /></mesh>
      <mesh position={[0, 1.48, 0]}><sphereGeometry args={[0.18, 14, 12]} /><meshStandardMaterial color={activatedSensors.includes(index) ? '#6ef0a9' : '#b898ff'} emissive={activatedSensors.includes(index) ? '#20d974' : '#8965e4'} emissiveIntensity={0.9} /></mesh>
      <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.18, 0.22, 0.16, 12]} /><meshStandardMaterial color="#43566b" /></mesh>
    </group>)}
    <TwiniAvatar position={playerPosition} running={running} jumping={jumping} />
    <OrbitControls makeDefault target={[playerPosition[0], 0.6, playerPosition[1]]} enablePan={false} enableDamping minDistance={12} maxDistance={36} maxPolarAngle={Math.PI * 0.43} />
  </>;
}

export default function SurvivalWorldScene(props) {
  return <Canvas camera={{ position: [18, 19, 23], fov: 42, near: 0.1, far: 150 }} dpr={[1, 1.4]} shadows>
    <World {...props} />
  </Canvas>;
}
