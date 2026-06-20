'use client'


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
