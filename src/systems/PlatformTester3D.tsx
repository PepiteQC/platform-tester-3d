import React, { useRef, useState, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Sky, Stars, Grid, Box, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { useGenerateWorld, useClearPlatforms, useCreatePlatform } from '@workspace/api-client-react'

// ──────────────── PLATFORM TYPES ────────────────

interface PlatTypeDef {
  id: string
  label: string
  icon: string
  size: [number, number, number]
  defaultColor: string
  yOffset: number
  emissive?: boolean
  category: string
}

const PLAT_TYPES: PlatTypeDef[] = [
  { id: 'floor_sm',  label: 'Sol 4×4',    icon: '⬛', category: 'Base',   size: [4, 0.3, 4],   defaultColor: '#223344', yOffset: 0.15 },
  { id: 'floor_lg',  label: 'Sol 8×8',    icon: '🟫', category: 'Base',   size: [8, 0.3, 8],   defaultColor: '#1e2e3e', yOffset: 0.15 },
  { id: 'floor_thin',label: 'Dalle mince',icon: '🔲', category: 'Base',   size: [4, 0.15, 4],  defaultColor: '#334455', yOffset: 0.075 },
  { id: 'wall_h',    label: 'Mur haut',   icon: '🧱', category: 'Base',   size: [4, 5, 0.2],   defaultColor: '#445566', yOffset: 2.5 },
  { id: 'wall_sm',   label: 'Mur bas',    icon: '🟦', category: 'Base',   size: [4, 3, 0.2],   defaultColor: '#445566', yOffset: 1.5 },
  { id: 'ramp',      label: 'Rampe',      icon: '📐', category: 'Base',   size: [4, 0.2, 3.5], defaultColor: '#336655', yOffset: 0.1 },
  { id: 'pillar',    label: 'Pilier',     icon: '🏛️', category: 'Base',   size: [0.5, 4, 0.5], defaultColor: '#557788', yOffset: 2 },
  { id: 'roof',      label: 'Plafond',    icon: '🔳', category: 'Base',   size: [4, 0.25, 4],  defaultColor: '#334455', yOffset: 0.125 },
  { id: 'bounce',    label: 'Trampoline', icon: '🔴', category: 'Spécial', size: [2, 0.25, 2],  defaultColor: '#ff6600', yOffset: 0.125, emissive: true },
  { id: 'speed',     label: 'Boost',      icon: '⚡', category: 'Spécial', size: [2, 0.15, 3],  defaultColor: '#00ffaa', yOffset: 0.075, emissive: true },
  { id: 'lava',      label: 'Lave',       icon: '🌋', category: 'Spécial', size: [3, 0.2, 3],   defaultColor: '#ff3300', yOffset: 0.1,  emissive: true },
  { id: 'ice',       label: 'Glace',      icon: '🧊', category: 'Spécial', size: [3, 0.2, 3],   defaultColor: '#88ccff', yOffset: 0.1 },
  { id: 'moving',    label: 'Mobile',     icon: '↔️',  category: 'Spécial', size: [3, 0.25, 2],  defaultColor: '#ffaa22', yOffset: 0.125, emissive: true },
  { id: 'cloud',     label: 'Nuage',      icon: '☁️',  category: 'Spécial', size: [2.5, 0.2, 2], defaultColor: '#cceeff', yOffset: 0.1 },
  { id: 'trap',      label: 'Piège',      icon: '⚠️',  category: 'Spécial', size: [2, 0.2, 2],   defaultColor: '#ff44aa', yOffset: 0.1, emissive: true },
  { id: 'stair_step',label: 'Marche',     icon: '📶', category: 'Déco',   size: [2, 0.5, 1],   defaultColor: '#556677', yOffset: 0.25 },
  { id: 'bridge',    label: 'Pont',       icon: '🌉', category: 'Déco',   size: [8, 0.2, 2],   defaultColor: '#6a5030', yOffset: 0.1 },
  { id: 'platform_sm',label: 'Petite',    icon: '🟩', category: 'Déco',   size: [1.5, 0.2, 1.5],defaultColor: '#336644', yOffset: 0.1 },
]

const PLAT_CATS = ['Base', 'Spécial', 'Déco']
const PLAT_COLORS = ['#223344','#445566','#ff6600','#00ffaa','#ff3300','#88ccff','#ffaa22','#cceeff','#ff44aa','#336644','#6a5030','#557788']

interface PlacedPlat {
  id: string
  typeId: string
  position: [number, number, number]
  rotationY: number
  color: string
}

// ──────────────── BUILD MODE SCENE ────────────────

function MovingPlatMesh({ plat, typeDef }: { plat: PlacedPlat; typeDef: PlatTypeDef }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current || plat.typeId !== 'moving') return
    ref.current.position.x = plat.position[0] + Math.sin(s.clock.getElapsedTime() * 0.7) * 3
  })
  return (
    <mesh ref={ref} position={plat.position} rotation={[0, plat.rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={typeDef.size} />
      <meshStandardMaterial color={plat.color} emissive={typeDef.emissive ? plat.color : '#000'} emissiveIntensity={typeDef.emissive ? 0.35 : 0} roughness={plat.typeId === 'ice' ? 0.05 : 0.7} metalness={plat.typeId === 'speed' ? 0.7 : 0.1} />
    </mesh>
  )
}

function BuildScene({
  plats, toolMode, selTypeId, selColor, rotY: placementRot,
  selectedId, onPlace, onSelect, onDeselect,
}: {
  plats: PlacedPlat[]
  toolMode: 'place' | 'select' | 'delete'
  selTypeId: string
  selColor: string
  rotY: number
  selectedId: string | null
  onPlace: (pos: [number, number, number]) => void
  onSelect: (id: string) => void
  onDeselect: () => void
}) {
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)
  const selDef = PLAT_TYPES.find(d => d.id === selTypeId)

  const snap = (p: THREE.Vector3, g = 0.5): [number, number, number] => [
    Math.round(p.x / g) * g, 0, Math.round(p.z / g) * g
  ]

  const onGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (toolMode !== 'place' || !selDef) { onDeselect(); return }
    const s = snap(e.point)
    onPlace([s[0], selDef.yOffset, s[2]])
  }

  const onGroundMove = (e: ThreeEvent<PointerEvent>) => {
    if (toolMode !== 'place' || !selDef) { setGhostPos(null); return }
    const s = snap(e.point)
    setGhostPos([s[0], selDef.yOffset, s[2]])
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 15]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <Stars radius={200} depth={50} count={1500} factor={4} fade />

      <Grid args={[200, 200]} cellSize={0.5} cellColor="#141d2d" sectionSize={4} sectionColor="#1f2e45" infiniteGrid />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}
        onClick={onGroundClick} onPointerMove={onGroundMove} onPointerLeave={() => setGhostPos(null)}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial visible={false} />
      </mesh>

      {ghostPos && selDef && toolMode === 'place' && (
        <Box args={selDef.size} position={ghostPos} rotation={[0, (placementRot * Math.PI) / 180, 0]}>
          <meshStandardMaterial color={selColor} transparent opacity={0.35} emissive={selColor} emissiveIntensity={0.2} />
        </Box>
      )}

      {plats.map(plat => {
        const def = PLAT_TYPES.find(d => d.id === plat.typeId)
        if (!def) return null
        const selected = plat.id === selectedId
        return (
          <group key={plat.id}>
            <MovingPlatMesh plat={plat} typeDef={def} />
            {selected && (
              <Box args={[def.size[0] + 0.1, def.size[1] + 0.1, def.size[2] + 0.1]} position={plat.position} rotation={[0, plat.rotationY, 0]}>
                <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.5} />
              </Box>
            )}
            <mesh position={plat.position} rotation={[0, plat.rotationY, 0]}
              onClick={(e) => { e.stopPropagation(); onSelect(plat.id) }}>
              <boxGeometry args={[def.size[0] + 0.05, def.size[1] + 0.05, def.size[2] + 0.05]} />
              <meshStandardMaterial visible={false} />
            </mesh>
          </group>
        )
      })}

      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport axisColors={['#ff4466', '#44ff88', '#4488ff']} labelColor="white" />
      </GizmoHelper>
      <OrbitControls makeDefault mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY }} maxDistance={120} enableDamping dampingFactor={0.08} />
    </>
  )
}

// ──────────────── PLAY MODE ────────────────

const WEATHER_SKY: Record<string, { sunPosition: [number, number, number]; turbidity: number; rayleigh: number }> = {
  sunny:  { sunPosition: [100, 30, 100], turbidity: 2,  rayleigh: 1 },
  cloudy: { sunPosition: [100, 10, 100], turbidity: 10, rayleigh: 3 },
  rainy:  { sunPosition: [0, 5, 0],     turbidity: 20, rayleigh: 5 },
  storm:  { sunPosition: [-50, 2, -50], turbidity: 40, rayleigh: 8 },
  snowy:  { sunPosition: [100, 20, 100],turbidity: 5,  rayleigh: 2 },
  fog:    { sunPosition: [100, 5, 100], turbidity: 30, rayleigh: 6 },
}

function Player({ plats }: { plats: PlacedPlat[] }) {
  const ref = useRef<THREE.Group>(null)
  const vel = useRef(new THREE.Vector3())
  const onGround = useRef(false)
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    const dt = Math.min(delta, 0.05)
    const speed = 8, gravity = -22, jumpForce = 11

    if (keys.current['KeyW'] || keys.current['ArrowUp'])    vel.current.z -= speed * dt
    if (keys.current['KeyS'] || keys.current['ArrowDown'])  vel.current.z += speed * dt
    if (keys.current['KeyA'] || keys.current['ArrowLeft'])  vel.current.x -= speed * dt
    if (keys.current['KeyD'] || keys.current['ArrowRight']) vel.current.x += speed * dt
    if (keys.current['Space'] && onGround.current) { vel.current.y = jumpForce; onGround.current = false }

    vel.current.x *= 0.82
    vel.current.z *= 0.82
    vel.current.y += gravity * dt

    ref.current.position.add(vel.current.clone().multiplyScalar(dt))

    // Ground collision
    if (ref.current.position.y <= 0.6) {
      ref.current.position.y = 0.6
      vel.current.y = 0
      onGround.current = true
    }

    // Platform collisions (simple AABB)
    for (const plat of plats) {
      const def = PLAT_TYPES.find(d => d.id === plat.typeId)
      if (!def) continue
      const px = ref.current.position.x, py = ref.current.position.y, pz = ref.current.position.z
      const platX = plat.position[0], platY = plat.position[1], platZ = plat.position[2]
      const hw = def.size[0] / 2 + 0.4, hh = def.size[1] / 2, hd = def.size[2] / 2 + 0.4
      if (Math.abs(px - platX) < hw && Math.abs(pz - platZ) < hd) {
        const topY = platY + hh
        if (py > topY - 0.2 && py < topY + 1.2 && vel.current.y <= 0) {
          ref.current.position.y = topY + 0.6
          if (plat.typeId === 'bounce') { vel.current.y = jumpForce * 1.8 }
          else if (plat.typeId === 'speed') { vel.current.z -= 8 * dt }
          else if (plat.typeId === 'trap') { setTimeout(() => {}, 300) }
          else { vel.current.y = 0; onGround.current = true }
        }
      }
    }

    if (ref.current.position.y < -25) {
      ref.current.position.set(0, 4, 0)
      vel.current.set(0, 0, 0)
    }

    state.camera.position.lerp(new THREE.Vector3(ref.current.position.x, ref.current.position.y + 9, ref.current.position.z + 18), 0.07)
    state.camera.lookAt(ref.current.position)
  })

  return (
    <group ref={ref} position={[0, 3, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 0.9, 8, 16]} />
        <meshStandardMaterial color="#7b6fff" emissive="#4422aa" emissiveIntensity={0.5} />
      </mesh>
      <pointLight intensity={3} color="#7b6fff" distance={5} position={[0, 0.5, 0]} />
    </group>
  )
}

function PlayScene({ plats, weather, timeOfDay }: { plats: PlacedPlat[]; weather: string; timeOfDay: number }) {
  const sky = WEATHER_SKY[weather] || WEATHER_SKY.sunny
  const ambient = (timeOfDay < 6 || timeOfDay > 20) ? 0.15 : 0.7
  return (
    <>
      <Sky {...sky} />
      <Stars radius={200} depth={50} count={2000} factor={4} fade speed={1} />
      <ambientLight intensity={ambient} />
      <directionalLight position={sky.sunPosition} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      <Grid args={[100, 100]} cellSize={1} cellThickness={0.3} cellColor="#1a2040" sectionColor="#2a3060" fadeDistance={50} infiniteGrid />
      {plats.map(plat => {
        const def = PLAT_TYPES.find(d => d.id === plat.typeId)
        if (!def) return null
        return (
          <Box key={plat.id} args={def.size} position={plat.position} rotation={[0, plat.rotationY, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={plat.color} emissive={def.emissive ? plat.color : '#000'} emissiveIntensity={def.emissive ? 0.4 : 0} roughness={plat.typeId === 'ice' ? 0.05 : 0.6} metalness={plat.typeId === 'speed' ? 0.7 : 0.1} />
          </Box>
        )
      })}
      <Suspense fallback={null}>
        <Player plats={plats} />
      </Suspense>
    </>
  )
}

// ──────────────── MAIN COMPONENT ────────────────

const TOOL_COLOR = { place: '#44ff88', select: '#7b6fff', delete: '#ff5555' }

export const PlatformTester3D: React.FC<{ weather?: string; timeOfDay?: number }> = ({
  weather = 'sunny', timeOfDay = 14,
}) => {
  const [mode, setMode] = useState<'build' | 'play'>('build')
  const [plats, setPlats] = useState<PlacedPlat[]>([])
  const [toolMode, setToolMode] = useState<'place' | 'select' | 'delete'>('place')
  const [activeCat, setActiveCat] = useState('Base')
  const [selTypeId, setSelTypeId] = useState('floor_sm')
  const [selColor, setSelColor] = useState('#223344')
  const [rotY, setRotY] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<PlacedPlat[][]>([[]])

  const generateWorld = useGenerateWorld()
  const clearPlatforms = useClearPlatforms()
  const createPlatform = useCreatePlatform()

  const catTypes = PLAT_TYPES.filter(t => t.category === activeCat)
  const selDef = PLAT_TYPES.find(d => d.id === selTypeId)
  const selObj = plats.find(p => p.id === selectedId)

  const push = (next: PlacedPlat[]) => { setHistory(h => [...h.slice(-30), next]); setPlats(next) }
  const undo = () => setHistory(h => { if (h.length <= 1) return h; const prev = h[h.length - 2]; setPlats(prev); return h.slice(0, -1) })

  const handlePlace = useCallback((pos: [number, number, number]) => {
    const def = PLAT_TYPES.find(d => d.id === selTypeId)
    if (!def) return
    const obj: PlacedPlat = { id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, typeId: selTypeId, position: pos, rotationY: (rotY * Math.PI) / 180, color: selColor }
    push([...plats, obj])
    createPlatform.mutateAsync({ data: { type: selTypeId, position: pos, size: def.size, color: selColor, material: 'standard', isStatic: true } }).catch(() => { })
  }, [selTypeId, selColor, rotY, plats, createPlatform])

  const handleSelect = useCallback((id: string) => {
    if (toolMode === 'delete') { push(plats.filter(p => p.id !== id)); if (selectedId === id) setSelectedId(null) }
    else setSelectedId(id)
  }, [toolMode, plats, selectedId])

  const handleGenerate = async () => {
    const seed = Math.floor(Math.random() * 99999)
    const rng = (s: number) => { let x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const generated: PlacedPlat[] = []
    const floorTypes = ['floor_sm', 'floor_lg', 'floor_thin', 'platform_sm', 'bridge']
    const specTypes = ['bounce', 'speed', 'lava', 'ice', 'moving', 'cloud', 'trap']
    for (let i = 0; i < 20; i++) {
      const t = rng(seed + i) < 0.7 ? floorTypes[Math.floor(rng(seed + i + 100) * floorTypes.length)] : specTypes[Math.floor(rng(seed + i + 200) * specTypes.length)]
      const def = PLAT_TYPES.find(d => d.id === t)!
      const x = (rng(seed + i + 300) - 0.5) * 50
      const y = 1 + i * 1.5
      const z = (rng(seed + i + 400) - 0.5) * 50
      generated.push({ id: `g_${i}`, typeId: t, position: [x, y + def.yOffset, z], rotationY: 0, color: def.defaultColor })
    }
    push(generated)
    await generateWorld.mutateAsync({ data: { seed, count: 20 } })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement === document.body && selectedId) {
        push(plats.filter(p => p.id !== selectedId)); setSelectedId(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const S = { fontSize: '10px', fontWeight: 700 as const }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#030609', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ─── LEFT PANEL (Build only) ─── */}
      {mode === 'build' && (
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#060912', flexShrink: 0 }}>

          {/* Header */}
          <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ color: '#ffaa44', fontWeight: 800, fontSize: '13px' }}>🎮 PLATFORM BUILDER</div>
            <div style={{ color: '#333', fontSize: '10px', marginTop: '1px' }}>Créateur de niveaux 3D temps réel</div>
          </div>

          {/* Tools */}
          <div style={{ display: 'flex', gap: '5px', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {(['place', 'select', 'delete'] as const).map(t => (
              <button key={t} onClick={() => setToolMode(t)}
                style={{ flex: 1, padding: '7px 3px', background: toolMode === t ? `${TOOL_COLOR[t]}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${toolMode === t ? TOOL_COLOR[t] + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '7px', color: toolMode === t ? TOOL_COLOR[t] : '#444', cursor: 'pointer', ...S, fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', transition: 'all 0.12s' }}>
                <span style={{ fontSize: '15px' }}>{{ place: '✏️', select: '↖️', delete: '🗑️' }[t]}</span>
                {{ place: 'Placer', select: 'Sélect', delete: 'Effacer' }[t]}
              </button>
            ))}
            <button onClick={undo} style={{ padding: '7px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', color: '#444', cursor: 'pointer', ...S, fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '15px' }}>↩️</span>Annuler
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {PLAT_CATS.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ flex: 1, padding: '5px 3px', background: activeCat === cat ? 'rgba(255,170,68,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeCat === cat ? 'rgba(255,170,68,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', color: activeCat === cat ? '#ffaa44' : '#444', ...S, fontSize: '9px', cursor: 'pointer' }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Platform grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              {catTypes.map(pt => {
                const active = selTypeId === pt.id && toolMode === 'place'
                return (
                  <button key={pt.id} onClick={() => { setSelTypeId(pt.id); setSelColor(pt.defaultColor); setToolMode('place') }}
                    style={{ padding: '8px 5px', background: active ? `${pt.defaultColor}28` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? pt.defaultColor + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.12s' }}>
                    <span style={{ fontSize: '18px' }}>{pt.icon}</span>
                    <span style={{ ...S, fontSize: '9px', color: active ? '#fff' : '#666' }}>{pt.label}</span>
                    <div style={{ width: '16px', height: '4px', borderRadius: '2px', background: pt.defaultColor, opacity: 0.7 }} />
                  </button>
                )
              })}
            </div>

            {/* Color & rotation */}
            {toolMode === 'place' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)', padding: '9px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: '#444', ...S, fontSize: '9px' }}>COULEUR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {PLAT_COLORS.map(c => (
                    <button key={c} onClick={() => setSelColor(c)}
                      style={{ width: '22px', height: '22px', background: c, border: `2px solid ${selColor === c ? '#fff' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={selColor} onChange={e => setSelColor(e.target.value)}
                  style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
                <div style={{ color: '#444', ...S, fontSize: '9px' }}>ROTATION</div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {[0, 45, 90, 135, 180, 270].map(deg => (
                    <button key={deg} onClick={() => setRotY(deg)}
                      style={{ flex: 1, padding: '3px 1px', background: rotY === deg ? 'rgba(255,170,68,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${rotY === deg ? 'rgba(255,170,68,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '4px', color: rotY === deg ? '#ffaa44' : '#444', fontSize: '8px', cursor: 'pointer', fontWeight: 700 }}>
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected object props */}
            {toolMode === 'select' && selObj && (() => {
              const def = PLAT_TYPES.find(d => d.id === selObj.typeId)!
              return (
                <div style={{ background: 'rgba(123,111,255,0.05)', borderRadius: '9px', border: '1px solid rgba(123,111,255,0.2)', padding: '9px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>{def.icon}</span>
                    <div>
                      <div style={{ ...S, fontSize: '11px', color: '#ddd' }}>{def.label}</div>
                      <div style={{ fontSize: '9px', color: '#444' }}>{selObj.position.map(v => v.toFixed(1)).join(', ')}</div>
                    </div>
                  </div>
                  {(['X', 'Y', 'Z'] as const).map((ax, i) => (
                    <div key={ax} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', fontSize: '9px', fontWeight: 700, color: ['#ff4466', '#44ff88', '#4488ff'][i] }}>{ax}</span>
                      <input type="range" min={i === 1 ? 0 : -60} max={i === 1 ? 30 : 60} step={0.25} value={selObj.position[i]}
                        onChange={e => { const v = parseFloat(e.target.value); setPlats(prev => prev.map(p => { if (p.id !== selectedId) return p; const pos: [number, number, number] = [...p.position] as any; pos[i] = v; return { ...p, position: pos } })) }}
                        style={{ flex: 1, accentColor: ['#ff4466', '#44ff88', '#4488ff'][i] }} />
                      <span style={{ width: '30px', fontSize: '9px', color: '#555', textAlign: 'right' }}>{selObj.position[i].toFixed(1)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {PLAT_COLORS.map(c => <button key={c} onClick={() => setPlats(prev => prev.map(p => p.id === selectedId ? { ...p, color: c } : p))}
                      style={{ width: '20px', height: '20px', background: c, border: `2px solid ${selObj.color === c ? '#fff' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer' }} />)}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { const n = { ...selObj, id: `p_${Date.now()}`, position: [selObj.position[0] + 3, selObj.position[1], selObj.position[2]] as [number,number,number] }; push([...plats, n]); setSelectedId(n.id) }} style={{ flex: 1, padding: '6px', background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.3)', borderRadius: '6px', color: '#7b6fff', ...S, fontSize: '9px', cursor: 'pointer' }}>📋 Dup.</button>
                    <button onClick={() => { push(plats.filter(p => p.id !== selectedId)); setSelectedId(null) }} style={{ flex: 1, padding: '6px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '6px', color: '#ff5555', ...S, fontSize: '9px', cursor: 'pointer' }}>🗑️ Suppr.</button>
                  </div>
                </div>
              )
            })()}

            {/* Stats & actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={handleGenerate} style={{ flex: 1, padding: '8px', background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.3)', borderRadius: '8px', color: '#7b6fff', ...S, fontSize: '9px', cursor: 'pointer' }}>🌍 Générer</button>
                <button onClick={() => { push([]); setSelectedId(null) }} style={{ flex: 1, padding: '8px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '8px', color: '#ff5555', ...S, fontSize: '9px', cursor: 'pointer' }}>🗑️ Vider</button>
              </div>
              <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', fontSize: '9px', color: '#444' }}>
                {plats.length} plateformes · Ctrl+Z: annuler
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── 3D VIEWPORT ─── */}
      <div style={{ flex: 1, position: 'relative' }}>

        {/* Mode toggle */}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', background: 'rgba(3,6,9,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setMode('build')}
            style={{ padding: '9px 22px', background: mode === 'build' ? 'rgba(255,170,68,0.2)' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', color: mode === 'build' ? '#ffaa44' : '#555', cursor: 'pointer', fontWeight: 800, fontSize: '12px', transition: 'all 0.2s' }}>
            🏗️ Builder
          </button>
          <button onClick={() => setMode('play')}
            style={{ padding: '9px 22px', background: mode === 'play' ? 'rgba(68,255,136,0.2)' : 'transparent', border: 'none', color: mode === 'play' ? '#44ff88' : '#555', cursor: 'pointer', fontWeight: 800, fontSize: '12px', transition: 'all 0.2s' }}>
            ▶ Jouer
          </button>
        </div>

        <Canvas shadows={{ type: 0 }} camera={{ position: [0, 10, 20], fov: 55 }} style={{ width: '100%', height: '100%' }}>
          {mode === 'build' ? (
            <BuildScene plats={plats} toolMode={toolMode} selTypeId={selTypeId} selColor={selColor} rotY={rotY} selectedId={selectedId} onPlace={handlePlace} onSelect={handleSelect} onDeselect={() => setSelectedId(null)} />
          ) : (
            <PlayScene plats={plats} weather={weather} timeOfDay={timeOfDay} />
          )}
        </Canvas>

        {/* Overlays */}
        {mode === 'build' && (
          <>
            <div style={{ position: 'absolute', top: '56px', left: '12px', pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(3,6,9,0.85)', border: `1px solid ${TOOL_COLOR[toolMode]}44`, borderRadius: '9px', padding: '7px 12px', backdropFilter: 'blur(6px)' }}>
                <div style={{ color: TOOL_COLOR[toolMode], fontWeight: 800, fontSize: '11px' }}>
                  {{ place: `✏️ Placer — ${selDef?.label ?? ''}`, select: '↖️ Sélectionner', delete: '🗑️ Effacer' }[toolMode]}
                </div>
                <div style={{ color: '#333', fontSize: '9px', marginTop: '2px' }}>Clic gauche = action · Clic droit drag = orbiter · Molette = zoom</div>
              </div>
            </div>
          </>
        )}

        {mode === 'play' && (
          <div style={{ position: 'absolute', top: '56px', left: '12px', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(3,6,9,0.85)', border: '1px solid rgba(68,255,136,0.3)', borderRadius: '9px', padding: '7px 12px' }}>
              <div style={{ color: '#44ff88', fontWeight: 800, fontSize: '11px' }}>▶ MODE JEU</div>
              <div style={{ color: '#333', fontSize: '9px', marginTop: '2px' }}>WASD / Flèches — Espace: Saut</div>
            </div>
          </div>
        )}

        {mode === 'build' && plats.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', background: 'rgba(3,6,9,0.8)', border: '1px solid rgba(255,170,68,0.2)', borderRadius: '16px', padding: '28px 44px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>🏗️</div>
              <p style={{ color: '#ffaa44', fontWeight: 700, margin: '0 0 6px', fontSize: '14px' }}>Niveau vide</p>
              <p style={{ color: '#444', fontSize: '11px', margin: 0 }}>Sélectionne un type · Clique sur la grille pour placer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlatformTester3D
