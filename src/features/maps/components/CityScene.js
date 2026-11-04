import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';

const terrainColor = { work: '#53677c', green: '#3c9878', spot: '#bc9f66', road: '#303b4b', water: '#286d9a', hazard: '#a85055' };
const assetColor = { residential: '#61a8ff', offices: '#ad91ff', transport: '#ffc66e', spots: '#ff9d72', utilities: '#f1db72', sensors: '#75e2d0', green: '#57d89a', community: '#ff86b4', bim: '#bdc6d3' };
const heightFor = (height) => height === 'high' ? 2.55 : height === 'mid' ? 1.75 : 1.05;

function Box({ position, args, color, roughness = 0.5, metalness = 0.08, emissive, intensity = 0 }) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive || color} emissiveIntensity={intensity} />
  </mesh>;
}

function Tower({ asset, color }) {
  const height = heightFor(asset.height);
  const floors = asset.height === 'high' ? 7 : asset.height === 'mid' ? 5 : 3;
  const windows = Array.from({ length: floors }, (_, floor) => Array.from({ length: 3 }, (_, column) => (
    <mesh key={`${floor}-${column}`} position={[(column - 1) * 0.17, 0.43 + floor * (height / floors), 0.308]}>
      <boxGeometry args={[0.09, 0.11, 0.018]} />
      <meshStandardMaterial color="#cbf1ff" emissive="#86ccff" emissiveIntensity={0.24} metalness={0.25} roughness={0.24} />
    </mesh>
  )));
  return <group>
    <Box position={[0, 0.12, 0]} args={[0.82, 0.24, 0.82]} color="#8798a7" roughness={0.78} />
    <Box position={[0, 0.24 + height / 2, 0]} args={[0.59, height, 0.62]} color={color} roughness={0.4} metalness={0.22} />
    {windows}
    {Array.from({ length: floors - 1 }, (_, index) => <Box key={`balcony-${index}`} position={[0, 0.62 + index * (height / floors), 0.33]} args={[0.64, 0.035, 0.09]} color="#d5e4eb" roughness={0.3} metalness={0.44} />)}
    <Box position={[0, height + 0.32, 0]} args={[0.68, 0.12, 0.72]} color="#dce6eb" roughness={0.35} metalness={0.28} />
    <Box position={[0.15, height + 0.53, 0]} args={[0.04, 0.3, 0.04]} color="#d6eaff" emissive="#72bfff" intensity={0.6} />
    <Box position={[-0.25, height + 0.39, 0]} args={[0.12, 0.08, 0.15]} color="#4b667c" />
  </group>;
}

function House({ color }) {
  return <group>
    <Box position={[0, 0.37, 0]} args={[0.64, 0.62, 0.64]} color={color} roughness={0.75} />
    <mesh position={[0, 0.84, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.49, 0.48, 4]} /><meshStandardMaterial color="#405970" roughness={0.76} /></mesh>
    <Box position={[0, 0.25, 0.33]} args={[0.13, 0.36, 0.025]} color="#263d54" />
    {[-0.18, 0.18].map((x) => <Box key={x} position={[x, 0.49, 0.335]} args={[0.12, 0.15, 0.025]} color="#c9efff" emissive="#8cd5ff" intensity={0.12} />)}
    <Box position={[0, 0.055, 0]} args={[0.78, 0.11, 0.75]} color="#cbd6d9" roughness={0.9} />
  </group>;
}

function Tree() {
  return <group>
    <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.07, 0.11, 0.85, 8]} /><meshStandardMaterial color="#79533f" roughness={0.9} /></mesh>
    <mesh position={[0, 1.02, 0]} castShadow><coneGeometry args={[0.43, 0.95, 8]} /><meshStandardMaterial color="#43b77b" roughness={0.8} /></mesh>
    <mesh position={[0, 1.42, 0]} castShadow><coneGeometry args={[0.3, 0.72, 8]} /><meshStandardMaterial color="#78dfa4" roughness={0.8} /></mesh>
    <mesh position={[0, 1.74, 0]} castShadow><sphereGeometry args={[0.16, 10, 10]} /><meshStandardMaterial color="#b7f2c3" roughness={0.75} /></mesh>
  </group>;
}

function SpecializedAsset({ asset, color }) {
  if (asset.categoryId === 'green') return <Tree />;
  if (asset.categoryId === 'sensors') return <group>
    <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[0.04, 0.06, 1.16, 8]} /><meshStandardMaterial color="#d0dbe3" metalness={0.6} roughness={0.32} /></mesh>
    <mesh position={[0, 1.18, 0]}><sphereGeometry args={[0.14, 14, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} /></mesh>
    <Box position={[0.12, 1.16, 0]} args={[0.24, 0.07, 0.1]} color="#d9e6ee" metalness={0.5} />
    <Box position={[0, 1.4, 0]} args={[0.025, 0.3, 0.025]} color="#abc6da" />
  </group>;
  if (asset.categoryId === 'transport') return <group>
    <Box position={[0, 0.13, 0]} args={[0.86, 0.26, 0.78]} color="#8b9aa6" />
    {[-0.3, 0.3].map((x) => [-0.24, 0.24].map((z) => <Box key={`${x}-${z}`} position={[x, 0.58, z]} args={[0.045, 0.82, 0.045]} color="#d8e3e8" metalness={0.54} />))}
    <Box position={[0, 1.02, 0]} args={[0.94, 0.13, 0.84]} color={color} metalness={0.32} />
    <Box position={[0, 0.59, 0.1]} args={[0.64, 0.36, 0.035]} color="#9ee7f5" roughness={0.2} metalness={0.25} />
    {[-0.25, 0, 0.25].map((x) => <Box key={x} position={[x, 0.17, 0.4]} args={[0.12, 0.11, 0.02]} color="#ffe099" emissive="#ffc650" intensity={0.5} />)}
  </group>;
  if (asset.categoryId === 'utilities') return <group>
    <Box position={[0, 0.42, 0]} args={[0.62, 0.82, 0.6]} color={color} />
    <Box position={[0, 0.86, 0]} args={[0.7, 0.1, 0.68]} color="#dbe4e7" metalness={0.45} />
    <mesh position={[0.18, 1.12, -0.12]}><cylinderGeometry args={[0.12, 0.15, 0.47, 12]} /><meshStandardMaterial color="#708c9e" metalness={0.58} /></mesh>
    <Box position={[-0.17, 0.58, 0.31]} args={[0.18, 0.14, 0.025]} color="#d9ffbd" emissive="#86ff99" intensity={0.45} />
  </group>;
  if (asset.categoryId === 'spots') return <group>
    <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.4, 0.46, 0.16, 28]} /><meshStandardMaterial color="#d7c59c" roughness={0.65} /></mesh>
    <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.22, 0.22, 0.05, 28]} /><meshStandardMaterial color="#75d6e8" metalness={0.32} roughness={0.22} /></mesh>
    <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.13, 0.19, 0.27, 18]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.52, 0]}><sphereGeometry args={[0.085, 16, 12]} /><meshStandardMaterial color="#e4faff" emissive="#87daff" emissiveIntensity={0.62} /></mesh>
    {[-0.27, 0.27].map((x) => <Box key={x} position={[x, 0.24, 0.22]} args={[0.12, 0.055, 0.04]} color="#8b7454" />)}
  </group>;
  if (asset.categoryId === 'bim') return <group>
    {[-0.27, 0.27].map((x) => [-0.27, 0.27].map((z) => <Box key={`${x}-${z}`} position={[x, 0.85, z]} args={[0.07, 1.7, 0.07]} color={color} metalness={0.58} />))}
    {[0.48, 0.95, 1.42].map((y) => <Box key={y} position={[0, y, 0]} args={[0.66, 0.065, 0.66]} color="#d8e0e4" metalness={0.42} />)}
  </group>;
  if (asset.categoryId === 'residential' || asset.categoryId === 'offices') return null;
  return <group>
    <Box position={[0, 0.37, 0]} args={[0.72, 0.72, 0.68]} color={color} />
    <Box position={[0, 0.78, 0]} args={[0.84, 0.13, 0.78]} color="#e2e8e7" />
    <Box position={[0, 0.43, 0.36]} args={[0.48, 0.12, 0.25]} color="#f0d49c" />
    {[-0.22, 0, 0.22].map((x) => <Box key={x} position={[x, 0.47, 0.35]} args={[0.11, 0.17, 0.025]} color="#c6edff" emissive="#8cd5ff" intensity={0.14} />)}
    <Box position={[0, 0.27, 0.35]} args={[0.13, 0.34, 0.025]} color="#334a60" />
  </group>;
}

function CityObjects({ level, terrain, placements }) {
  return <>
    {terrain.map((type, index) => {
      const row = Math.floor(index / level.columns);
      const column = index % level.columns;
      const x = column - (level.columns - 1) / 2;
      const z = row - (level.rows - 1) / 2;
      const asset = placements[index];
      return <group key={index} position={[x, 0, z]}>
        <mesh position={[0, -0.08, 0]} receiveShadow>
          <boxGeometry args={[0.94, 0.15, 0.94]} />
          <meshStandardMaterial color={terrainColor[type]} roughness={0.88} />
        </mesh>
        {asset && <group position={[0, 0, 0]}><SpecializedAsset asset={asset} color={assetColor[asset.categoryId] || '#a9c6e8'} />{(asset.categoryId === 'offices' || (asset.categoryId === 'residential' && asset.height !== 'low')) && <Tower asset={asset} color={assetColor[asset.categoryId]} />}</group>}
      </group>;
    })}
  </>;
}

export default function CityScene({ level, terrain, placements }) {
  return (
    <Canvas camera={{ position: [level.columns * 1.25, level.rows * 1.25, level.columns * 1.65], fov: 42 }} dpr={[1, 1.5]} shadows>
      <color attach="background" args={['#0b1421']} />
      <fog attach="fog" args={['#0b1421', 12, 32]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 10, 8]} intensity={2.3} castShadow />
      <pointLight position={[-6, 6, -5]} intensity={24} color="#619eff" />
      <CityObjects level={level} terrain={terrain} placements={placements} />
      <OrbitControls makeDefault enableDamping minDistance={5} maxDistance={28} maxPolarAngle={Math.PI * 0.48} />
    </Canvas>
  );
}
