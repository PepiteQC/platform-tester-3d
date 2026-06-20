'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEtherWorldStore } from '@/lib/etherworld/store'

const CARD_ACCESS_LEVELS = {
  resident: '#22c55e',
  staff: '#3b82f6',
  admin: '#ef4444',
}

export function SecurityDoor({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0]
}: { 
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  const { doors, requestDoorAccess } = useEtherWorldStore()
  const doorRef = useRef<THREE.Group>(null)
  const door = doors.main
  
  useFrame(() => {
    if (doorRef.current) {
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
          onClick={() => requestDoorAccess('main')}
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

function CardReader({ position }: { position: [number, number, number] }) {
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
