'use client'

import * as THREE from 'three'

interface WindowWithCurtainsProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  size?: [number, number]
}

const curtainWidth = 0.3

export function WindowWithCurtains({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  size = [3, 2.2]
}: WindowWithCurtainsProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={[size[0] + 0.15, size[1] + 0.15, 0.1]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Glass */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[size[0], size[1], 0.02]} />
        <meshStandardMaterial 
          color="#1e3a5f" 
          transparent 
          opacity={0.4} 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>
      
      {/* City lights visible through window (night effect) */}
      {[...Array(20)].map((_, i) => (
        <mesh 
          key={i} 
          position={[
            (Math.random() - 0.5) * size[0] * 0.8,
            (Math.random() - 0.5) * size[1] * 0.8,
            -0.02
          ]}
        >
          <boxGeometry args={[0.03, 0.02, 0.01]} />
          <meshStandardMaterial 
            color={['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 4)]} 
            emissive={['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 4)]}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      
      {/* Curtain rod */}
      <mesh position={[0, size[1] / 2 + 0.15, 0.08]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, size[0] + 0.4, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Left curtain */}
      <mesh 
        position={[-size[0] / 4, 0, 0.1]}
        castShadow
      >
        <boxGeometry args={[curtainWidth, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Right curtain */}
      <mesh 
        position={[size[0] / 4, 0, 0.1]}
        castShadow
      >
        <boxGeometry args={[curtainWidth, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
