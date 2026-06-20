'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { CorridorScene } from './CorridorScene'

export function CorridorView() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 1.6, 8], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Environment preset="night" />
          <ambientLight intensity={0.15} />
          <fog attach="fog" args={['#0a0a0f', 8, 30]} />
          <CorridorScene />
          <OrbitControls
            makeDefault
            minDistance={2}
            maxDistance={15}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 1.2, 0]}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
