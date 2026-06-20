'use client'

import { useRef } from 'react'
import { useFrame, type Vector3 } from '@react-three/fiber'
import * as THREE from 'three'

interface GTACameraProps {
  playerPosition: Vector3
  rotation: number
}

export function GTACamera({ playerPosition, rotation }: GTACameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const targetRotation = useRef(rotation)

  useFrame((state, delta) => {
    if (!cameraRef.current) return

    // Smooth rotation interpolation
    targetRotation.current = rotation
    const currentRot = cameraRef.current.rotation.y
    const diff = targetRotation.current - currentRot
    
    // Normalize rotation difference
    let normalizedDiff = diff
    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2
    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2
    
    cameraRef.current.rotation.y += normalizedDiff * 0.15 * delta * 60

    // Camera position - behind player like GTA
    const distance = 8
    const height = 3
    
    const offsetX = Math.sin(cameraRef.current.rotation.y) * distance
    const offsetZ = Math.cos(cameraRef.current.rotation.y) * distance

    const targetX = playerPosition.x + offsetX
    const targetY = playerPosition.y + height
    const targetZ = playerPosition.z + offsetZ

    cameraRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1 * delta * 60)
    
    // Look at player
    cameraRef.current.lookAt(
      playerPosition.x,
      playerPosition.y + 1.5,
      playerPosition.z
    )
  })

  return null
}
