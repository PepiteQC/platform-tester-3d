'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEtherWorldStore } from '@/lib/etherworld/store'

interface CardReaderProps {
  position: [number, number, number]
}

const CARD_ACCESS_LEVELS = {
  resident: '#22c55e',
  staff: '#3b82f6',
  admin: '#ef4444',
}

export function SecurityDoor({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  doorId = 'main',
  requiredLevel = 'resident'
}: { 
  position?: [number, number, number]
  rotation?: [number, number, number]
  doorId?: string
  requiredLevel?: string
}) {
  const { doors, requestDoorAccess, playerCard } = useEtherWorldStore()
  const doorRef = useRef<THREE.Group>(null)
  const door = doors[doorId || 'main']

  useFrame(() => {
    if (doorRef.current && door) {
      const target = door.isOpen ? -Math.PI / 2 : 0
      
      const currentRotation = doorRef.current.rotation.y
      const diff = target - currentRotation
      
      if (Math.abs(diff) > 0.01) {
        doorRef.current.rotation.y += diff * 0.1
      } else {
        doorRef.current.rotation.y = target
      }
    }
  })
  
  return (
    <group position={position} rotation={rotation}>
      {/* Door frame */}
      <DoorFrame />
      
      {/* Door panel (hinged on left side) */}
      <group ref={doorRef} position={[-0.45, 0, 0]}>
        <mesh 
          position={[0.45, 1.1, 0]} 
          castShadow
          onClick={() => requestDoorAccess(doorId || 'main')}
        >
          <boxGeometry args={[0.9, 2.2, 0.08]} />
          <meshStandardMaterial 
            color="#1a1a2e" 
            metalness={0.4} 
            roughness={0.6} 
          />
        </mesh>
        
        {/* Door handle */}
        <mesh position={[0.8, 1.05, 0.06]}>
          <boxGeometry args={[0.12, 0.04, 0.04]} />
          <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.82, 1.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Peephole */}
        <mesh position={[0.45, 1.5, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      
      {/* Card reader */}
      <CardReader position={[0.6, 1.1, 0.05]} />
    </group>
  )
}

function DoorFrame() {
  return (
    <group>
      {/* Left frame */}
      <mesh position={[-0.48, 1.1, 0]} castShadow>
        <boxGeometry args={[0.08, 2.3, 0.15]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Right frame */}
      <mesh position={[0.48, 1.1, 0]} castShadow>
        <boxGeometry args={[0.08, 2.3, 0.15]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Top frame */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[1.04, 0.08, 0.15]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  )
}

function CardReader({ position }: CardReaderProps) {
  return (
    <group position={position}>
      {/* Reader body */}
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.15, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Card scan area */}
      <mesh position={[0, -0.02, 0.016]}>
        <boxGeometry args={[0.07, 0.08, 0.005]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* LED indicator - green for access granted */}
      <mesh position={[0, 0.055, 0.016]}>
        <boxGeometry args={[0.03, 0.015, 0.005]} />
        <meshStandardMaterial 
          color="#22c55e" 
          emissive="#22c55e" 
          emissiveIntensity={0.5} 
        />
      </mesh>
      
      {/* Access level indicator */}
      <mesh position={[0, -0.065, 0.016]}>
        <boxGeometry args={[0.04, 0.01, 0.002]} />
        <meshStandardMaterial 
          color={CARD_ACCESS_LEVELS.resident} 
          emissive={CARD_ACCESS_LEVELS.resident} 
          emissiveIntensity={0.3} 
        />
      </mesh>
    </group>
  )
}

export function BathroomFixtures({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Toilet */}
      <Toilet position={[0.8, 0, -0.5]} />
      
      {/* Sink */}
      <Sink position={[-0.5, 0, 0.3]} />
      
      {/* Shower */}
      <Shower position={[-0.8, 0, -0.8]} />
      
      {/* Mirror */}
      <mesh position={[-0.5, 1.4, 0.48]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
        <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0} />
      </mesh>
      
      {/* Towel rack */}
      <group position={[0.9, 1.2, 0.4]}>
        <mesh>
          <boxGeometry args={[0.02, 0.02, 0.4]} />
          <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Towel */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.02, 0.3, 0.35]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

function Toilet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
      </mesh>
      
      {/* Tank */}
      <mesh position={[0, 0.45, -0.18]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.15]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
      </mesh>
      
      {/* Seat */}
      <mesh position={[0, 0.32, 0.05]}>
        <boxGeometry args={[0.35, 0.04, 0.4]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.4} />
      </mesh>
      
      {/* Lid */}
      <mesh position={[0, 0.35, -0.1]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.33, 0.02, 0.35]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.4} />
      </mesh>
      
      {/* Flush button */}
      <mesh position={[0, 0.65, -0.18]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function Sink({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Basin */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.4]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.2} />
      </mesh>
      
      {/* Inner basin */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.4, 0.08, 0.3]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.3} />
      </mesh>
      
      {/* Pedestal */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.15, 0.8, 0.15]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
      </mesh>
      
      {/* Faucet */}
      <mesh position={[0, 0.95, -0.12]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.98, -0.05]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

function Shower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.4} />
      </mesh>
      
      {/* Glass walls (2 sides) */}
      <mesh position={[0.48, 1.05, 0]}>
        <boxGeometry args={[0.02, 2, 1]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.05, 0.48]}>
        <boxGeometry args={[1, 2, 0.02]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Shower head */}
      <mesh position={[-0.3, 2, -0.3]}>
        <cylinderGeometry args={[0.08, 0.1, 0.05, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Shower arm */}
      <mesh position={[-0.3, 2.05, -0.4]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

export function WindowWithCurtains({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  size = [3, 2.2]
}: { 
  position?: [number, number, number]
  rotation?: [number, number, number]
  size?: [number, number]
}) {
  // Always open curtains for exterior view
  const curtainWidth = size[0] / 2 - 0.1
  const leftCurtainX = -size[0] / 4
  const rightCurtainX = size[0] / 4
  
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
        position={[leftCurtainX, 0, 0.1]}
        castShadow
      >
        <boxGeometry args={[curtainWidth, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Right curtain */}
      <mesh 
        position={[rightCurtainX, 0, 0.1]}
        castShadow
      >
        <boxGeometry args={[curtainWidth, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
