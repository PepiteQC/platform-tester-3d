import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Box, GizmoHelper, GizmoViewport, Sphere, Cylinder } from '@react-three/drei'
import * as THREE from 'three'

interface ObjectDef {
  id: string
  label: string
  icon: string
  category: string
  size: [number, number, number]
  defaultColor: string
  yOffset: number
  shape?: 'box' | 'sphere' | 'cylinder'
  emissive?: boolean
}

const OBJECT_LIBRARY: ObjectDef[] = [
  { id: 'floor_sm', label: 'Sol 4×4', icon: '⬛', category: 'Structure', size: [4, 0.15, 4], defaultColor: '#2a3d50', yOffset: 0.075 },
  { id: 'floor_lg', label: 'Sol 8×8', icon: '🟫', category: 'Structure', size: [8, 0.15, 8], defaultColor: '#2a3d50', yOffset: 0.075 },
  { id: 'wall', label: 'Mur 4m', icon: '🧱', category: 'Structure', size: [4, 3, 0.2], defaultColor: '#556677', yOffset: 1.5 },
  { id: 'wall_sm', label: 'Mur 2m', icon: '🟦', category: 'Structure', size: [2, 3, 0.2], defaultColor: '#556677', yOffset: 1.5 },
  { id: 'wall_tall', label: 'Mur 5m', icon: '🏢', category: 'Structure', size: [4, 5, 0.2], defaultColor: '#445566', yOffset: 2.5 },
  { id: 'roof', label: 'Toit plat', icon: '🏠', category: 'Structure', size: [4.2, 0.25, 4.2], defaultColor: '#334455', yOffset: 0.125 },
  { id: 'roof_lg', label: 'Toit large', icon: '🏛️', category: 'Structure', size: [8.2, 0.25, 8.2], defaultColor: '#334455', yOffset: 0.125 },
  { id: 'pillar', label: 'Pilier', icon: '🏟️', category: 'Structure', size: [0.4, 4, 0.4], defaultColor: '#aabbcc', yOffset: 2 },
  { id: 'stairs', label: 'Escalier', icon: '📶', category: 'Structure', size: [1, 1.8, 3.5], defaultColor: '#667788', yOffset: 0.9 },
  { id: 'door', label: 'Porte', icon: '🚪', category: 'Structure', size: [0.15, 2.6, 1.1], defaultColor: '#8855aa', yOffset: 1.3 },
  { id: 'window', label: 'Fenêtre', icon: '🪟', category: 'Structure', size: [0.1, 1.3, 1.5], defaultColor: '#44aaff', yOffset: 1.5, emissive: true },
  { id: 'arch', label: 'Arche', icon: '⛩️', category: 'Structure', size: [3.5, 3, 0.3], defaultColor: '#998877', yOffset: 1.5 },

  { id: 'sofa', label: 'Canapé', icon: '🛋️', category: 'Mobilier', size: [2.2, 0.85, 0.9], defaultColor: '#7a5c3a', yOffset: 0.425 },
  { id: 'table', label: 'Table', icon: '🪑', category: 'Mobilier', size: [1.6, 0.78, 0.8], defaultColor: '#aa8855', yOffset: 0.39 },
  { id: 'desk', label: 'Bureau', icon: '🗃️', category: 'Mobilier', size: [1.8, 0.78, 0.9], defaultColor: '#8a6840', yOffset: 0.39 },
  { id: 'bed', label: 'Lit', icon: '🛏️', category: 'Mobilier', size: [1.8, 0.5, 2.4], defaultColor: '#9999cc', yOffset: 0.25 },
  { id: 'shelf', label: 'Étagère', icon: '📚', category: 'Mobilier', size: [1.5, 2, 0.3], defaultColor: '#885533', yOffset: 1 },
  { id: 'chest', label: 'Coffre', icon: '📦', category: 'Mobilier', size: [0.8, 0.6, 0.55], defaultColor: '#774422', yOffset: 0.3 },
  { id: 'lamp_table', label: 'Lampe', icon: '🪔', category: 'Mobilier', size: [0.2, 0.7, 0.2], defaultColor: '#ffdd88', yOffset: 0.35, emissive: true },
  { id: 'tv', label: 'Écran TV', icon: '📺', category: 'Mobilier', size: [0.1, 0.9, 1.5], defaultColor: '#111111', yOffset: 0.65 },

  { id: 'car_red', label: 'Voiture', icon: '🚗', category: 'Véhicules', size: [2, 1.35, 4.2], defaultColor: '#cc3333', yOffset: 0.675 },
  { id: 'truck', label: 'Camion', icon: '🚛', category: 'Véhicules', size: [2.5, 2.2, 6.5], defaultColor: '#334499', yOffset: 1.1 },
  { id: 'van', label: 'Van', icon: '🚐', category: 'Véhicules', size: [2.2, 1.9, 4.8], defaultColor: '#558833', yOffset: 0.95 },
  { id: 'container', label: 'Conteneur', icon: '📫', category: 'Véhicules', size: [2.4, 2.5, 6], defaultColor: '#226633', yOffset: 1.25 },

  { id: 'tree_trunk', label: 'Tronc', icon: '🌲', category: 'Nature', size: [0.35, 4.5, 0.35], defaultColor: '#4a3020', yOffset: 2.25 },
  { id: 'foliage', label: 'Feuillage', icon: '🌿', category: 'Nature', size: [2.5, 2.5, 2.5], defaultColor: '#2a5a20', yOffset: 1.25, shape: 'sphere' },
  { id: 'bush', label: 'Buisson', icon: '🌾', category: 'Nature', size: [1.5, 1, 1.5], defaultColor: '#2d6020', yOffset: 0.5, shape: 'sphere' },
  { id: 'rock', label: 'Rocher', icon: '🪨', category: 'Nature', size: [1.3, 0.9, 1.1], defaultColor: '#6a7880', yOffset: 0.45 },
  { id: 'water_tile', label: 'Eau', icon: '💧', category: 'Nature', size: [4, 0.1, 4], defaultColor: '#1a44bb', yOffset: 0.05, emissive: true },
  { id: 'flower_bed', label: 'Parterre', icon: '🌸', category: 'Nature', size: [2, 0.2, 2], defaultColor: '#cc5588', yOffset: 0.1 },

  { id: 'road', label: 'Route', icon: '🛣️', category: 'Infrastructure', size: [4, 0.06, 8], defaultColor: '#2a3035', yOffset: 0.03 },
  { id: 'sidewalk', label: 'Trottoir', icon: '🚶', category: 'Infrastructure', size: [2, 0.12, 8], defaultColor: '#888888', yOffset: 0.06 },
  { id: 'fence', label: 'Clôture', icon: '🚧', category: 'Infrastructure', size: [4, 1.3, 0.08], defaultColor: '#885544', yOffset: 0.65 },
  { id: 'streetlight', label: 'Réverbère', icon: '🏮', category: 'Infrastructure', size: [0.12, 5, 0.12], defaultColor: '#aaaaaa', yOffset: 2.5, emissive: true },
  { id: 'dumpster', label: 'Benne', icon: '🗑️', category: 'Infrastructure', size: [0.9, 1.1, 1.8], defaultColor: '#224422', yOffset: 0.55 },
  { id: 'barrier', label: 'Barrière', icon: '⛔', category: 'Infrastructure', size: [2, 0.8, 0.25], defaultColor: '#cc6600', yOffset: 0.4 },

  { id: 'fire', label: 'Feu', icon: '🔥', category: 'Effets', size: [0.5, 0.8, 0.5], defaultColor: '#ff6600', yOffset: 0.4, shape: 'sphere', emissive: true },
  { id: 'crate', label: 'Caisse', icon: '📫', category: 'Effets', size: [0.9, 0.9, 0.9], defaultColor: '#776644', yOffset: 0.45 },
  { id: 'barrel_stack', label: 'Baril', icon: '🛢️', category: 'Effets', size: [0.55, 0.9, 0.55], defaultColor: '#443322', yOffset: 0.45, shape: 'cylinder' },
  { id: 'portal', label: 'Portail', icon: '🌀', category: 'Effets', size: [0.15, 2.5, 2.5], defaultColor: '#8844ff', yOffset: 1.25, emissive: true },
  { id: 'spotlight', label: 'Projecteur', icon: '💡', category: 'Effets', size: [0.3, 0.3, 0.5], defaultColor: '#ffeeaa', yOffset: 0.15, emissive: true },
]

const CATEGORIES = ['Structure', 'Mobilier', 'Véhicules', 'Nature', 'Infrastructure', 'Effets']
const CAT_ICONS: Record<string, string> = { Structure: '🏗️', Mobilier: '🛋️', Véhicules: '🚗', Nature: '🌲', Infrastructure: '🛣️', Effets: '✨' }

const COLORS_PRESET = ['#2a3d50','#556677','#8855aa','#44aaff','#44ff88','#ff4444','#ffaa44','#ffffff','#aa8855','#665533','#cc3333','#334499','#2a5a20','#aabbcc','#ff6600']

interface PlacedObject {
  id: string
  typeId: string
  position: [number, number, number]
  rotationY: number
  color: string
}

function ObjectMesh({ objDef, color, position, rotationY, selected, onClick, ghost }: {
  objDef: ObjectDef
  color: string
  position: [number, number, number]
  rotationY: number
  selected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  ghost?: boolean
}) {
  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={objDef.id === 'window' || objDef.id === 'portal' ? 0.1 : 0.7}
      metalness={objDef.id === 'car_red' || objDef.id === 'truck' || objDef.id === 'van' ? 0.5 : 0.1}
      emissive={objDef.emissive ? color : '#000000'}
      emissiveIntensity={objDef.emissive ? 0.4 : 0}
      transparent={ghost || objDef.id === 'window' || objDef.id === 'water_tile' || objDef.id === 'portal'}
      opacity={ghost ? 0.35 : objDef.id === 'window' ? 0.45 : objDef.id === 'water_tile' ? 0.65 : objDef.id === 'portal' ? 0.7 : 1}
      wireframe={false}
    />
  )

  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotationY, 0]}
      onClick={onClick}
    >
      {objDef.shape === 'sphere' ? (
        <Sphere args={[objDef.size[0] / 2, 16, 12]} castShadow receiveShadow>{mat}</Sphere>
      ) : objDef.shape === 'cylinder' ? (
        <Cylinder args={[objDef.size[0] / 2, objDef.size[0] / 2, objDef.size[1], 12]} castShadow receiveShadow>{mat}</Cylinder>
      ) : (
        <Box args={objDef.size} castShadow receiveShadow>{mat}</Box>
      )}
      {selected && !ghost && (
        <Box args={[objDef.size[0] + 0.07, objDef.size[1] + 0.07, objDef.size[2] + 0.07]}>
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.6} />
        </Box>
      )}
    </group>
  )
}

function SceneContent({
  objects, toolMode, selectedTypeId, selectedColor, rotationY: placementRotY,
  selectedId, onPlace, onSelect, onDeselect,
}: {
  objects: PlacedObject[]
  toolMode: 'place' | 'select' | 'delete'
  selectedTypeId: string
  selectedColor: string
  rotationY: number
  selectedId: string | null
  onPlace: (pos: [number, number, number]) => void
  onSelect: (id: string) => void
  onDeselect: () => void
}) {
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)
  const orbitRef = useRef<any>(null)

  const selectedDef = OBJECT_LIBRARY.find(d => d.id === selectedTypeId)

  const snapToGrid = (p: THREE.Vector3, gridSize = 0.5): [number, number, number] => [
    Math.round(p.x / gridSize) * gridSize,
    0,
    Math.round(p.z / gridSize) * gridSize,
  ]

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (toolMode !== 'place') {
      onDeselect()
      return
    }
    const snapped = snapToGrid(e.point)
    if (selectedDef) {
      onPlace([snapped[0], selectedDef.yOffset, snapped[2]])
    }
  }

  const handleGroundMove = (e: ThreeEvent<PointerEvent>) => {
    if (toolMode !== 'place' || !selectedDef) {
      setGhostPos(null)
      return
    }
    const snapped = snapToGrid(e.point)
    setGhostPos([snapped[0], selectedDef.yOffset, snapped[2]])
  }

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 30, 15]} intensity={1.3} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-15, 15, -10]} intensity={0.25} />
      <pointLight position={[0, 15, 0]} intensity={0.3} />

      <Grid
        args={[200, 200]}
        cellSize={0.5}
        cellColor="#141d2d"
        sectionSize={4}
        sectionColor="#1f2e45"
        infiniteGrid
        sectionThickness={1.2}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleGroundClick}
        onPointerMove={handleGroundMove}
        onPointerLeave={() => setGhostPos(null)}
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial visible={false} />
      </mesh>

      {ghostPos && selectedDef && toolMode === 'place' && (
        <ObjectMesh
          objDef={selectedDef}
          color={selectedColor}
          position={ghostPos}
          rotationY={(placementRotY * Math.PI) / 180}
          ghost
        />
      )}

      {objects.map(obj => {
        const def = OBJECT_LIBRARY.find(d => d.id === obj.typeId)
        if (!def) return null
        return (
          <ObjectMesh
            key={obj.id}
            objDef={def}
            color={obj.color}
            position={obj.position}
            rotationY={obj.rotationY}
            selected={obj.id === selectedId}
            onClick={(e) => {
              e.stopPropagation()
              if (toolMode === 'delete') {
                onSelect(obj.id)
              } else {
                onSelect(obj.id)
              }
            }}
          />
        )
      })}

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#ff4466', '#44ff88', '#4488ff']} labelColor="white" />
      </GizmoHelper>

      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY }}
        maxDistance={120}
        minDistance={2}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}

type STab = 'library' | 'selected' | 'list' | 'export'

const TOOL_COLORS = { place: '#44ff88', select: '#7b6fff', delete: '#ff5555' }
const TOOL_ICONS = { place: '✏️', select: '↖️', delete: '🗑️' }

export const BuildingPRO: React.FC = () => {
  const [objects, setObjects] = useState<PlacedObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<'place' | 'select' | 'delete'>('place')
  const [activeCat, setActiveCat] = useState('Structure')
  const [selectedTypeId, setSelectedTypeId] = useState('floor_sm')
  const [placementColor, setPlacementColor] = useState('#2a3d50')
  const [placementRot, setPlacementRot] = useState(0)
  const [sTab, setSTab] = useState<STab>('library')
  const [sceneName, setSceneName] = useState('Ma Scène RP')
  const [history, setHistory] = useState<PlacedObject[][]>([[]])

  const selectedDef = OBJECT_LIBRARY.find(d => d.id === selectedTypeId)
  const selectedObject = objects.find(o => o.id === selectedId) || null
  const catObjs = OBJECT_LIBRARY.filter(o => o.category === activeCat)

  const pushHistory = useCallback((newObjs: PlacedObject[]) => {
    setHistory(h => [...h.slice(-30), newObjs])
    setObjects(newObjs)
  }, [])

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length <= 1) return h
      const prev = h[h.length - 2]
      setObjects(prev)
      return h.slice(0, -1)
    })
  }, [])

  const handlePlace = useCallback((pos: [number, number, number]) => {
    const def = OBJECT_LIBRARY.find(d => d.id === selectedTypeId)
    if (!def) return
    const newObj: PlacedObject = {
      id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      typeId: selectedTypeId,
      position: pos,
      rotationY: (placementRot * Math.PI) / 180,
      color: placementColor,
    }
    const next = [...objects, newObj]
    pushHistory(next)
  }, [selectedTypeId, placementColor, placementRot, objects, pushHistory])

  const handleSelect = useCallback((id: string) => {
    if (toolMode === 'delete') {
      const next = objects.filter(o => o.id !== id)
      pushHistory(next)
      if (selectedId === id) setSelectedId(null)
    } else {
      setSelectedId(id)
      setSTab('selected')
    }
  }, [toolMode, objects, selectedId, pushHistory])

  const updateObj = (updater: (o: PlacedObject) => PlacedObject) => {
    if (!selectedId) return
    setObjects(prev => prev.map(o => o.id === selectedId ? updater(o) : o))
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const next = objects.filter(o => o.id !== selectedId)
    pushHistory(next)
    setSelectedId(null)
    setSTab('library')
  }

  const duplicateSelected = () => {
    if (!selectedObject) return
    const newObj: PlacedObject = {
      ...selectedObject,
      id: `o_${Date.now()}`,
      position: [selectedObject.position[0] + 2, selectedObject.position[1], selectedObject.position[2]],
    }
    const next = [...objects, newObj]
    pushHistory(next)
    setSelectedId(newObj.id)
  }

  const exportScene = () => {
    const data = JSON.stringify({ name: sceneName, version: 1, objects }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${sceneName.replace(/\s+/g, '_')}.json`
    a.click()
  }

  const importScene = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (Array.isArray(data.objects)) {
          setObjects(data.objects)
          setSceneName(data.name || 'Importé')
          setHistory([data.objects])
        }
      } catch { }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement === document.body) deleteSelected()
      }
      if (e.key === 'Escape') setSelectedId(null)
      if (e.key === 'p' || e.key === 'P') setToolMode('place')
      if (e.key === 's' || e.key === 'S') setToolMode('select')
      if (e.key === 'd' || e.key === 'D') setToolMode('delete')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, deleteSelected])

  const S = { fontSize: '10px', fontWeight: 700 as const }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#030609', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ─── LEFT SIDEBAR ─── */}
      <div style={{ width: '270px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: '#060912' }}>

        {/* Header */}
        <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ color: '#ff44aa', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>🏗️ BUILDING PRO</div>
          <div style={{ color: '#333', fontSize: '10px', marginTop: '1px' }}>Éditeur de scène 3D temps réel</div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '5px', padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {(['place', 'select', 'delete'] as const).map(t => (
            <button key={t} onClick={() => setToolMode(t)} title={{ place: 'Placer [P]', select: 'Sélectionner [S]', delete: 'Effacer [D]' }[t]}
              style={{ flex: 1, padding: '8px 3px', background: toolMode === t ? `${TOOL_COLORS[t]}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${toolMode === t ? TOOL_COLORS[t] + '66' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', color: toolMode === t ? TOOL_COLORS[t] : '#444', cursor: 'pointer', ...S, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '16px' }}>{TOOL_ICONS[t]}</span>
              {{ place: 'Placer', select: 'Sélect', delete: 'Effacer' }[t]}
            </button>
          ))}
          <button onClick={undo} title="Annuler [Ctrl+Z]"
            style={{ padding: '8px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#444', cursor: 'pointer', ...S, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '16px' }}>↩️</span>Annuler
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {([['library', '📚', 'Biblio'], ['selected', '⚙️', 'Objet'], ['list', '📋', 'Liste'], ['export', '💾', 'Export']] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setSTab(id)}
              style={{ flex: 1, padding: '8px 2px', background: sTab === id ? 'rgba(123,111,255,0.1)' : 'transparent', border: 'none', borderBottom: sTab === id ? '2px solid #7b6fff' : '2px solid transparent', color: sTab === id ? '#7b6fff' : '#444', cursor: 'pointer', ...S, fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '14px' }}>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>

          {/* ── LIBRARY ── */}
          {sTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    style={{ padding: '3px 9px', background: activeCat === cat ? 'rgba(255,68,170,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeCat === cat ? 'rgba(255,68,170,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', color: activeCat === cat ? '#ff44aa' : '#444', ...S, fontSize: '9px', cursor: 'pointer', transition: 'all 0.12s' }}>
                    {CAT_ICONS[cat]} {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {catObjs.map(obj => {
                  const active = selectedTypeId === obj.id && toolMode === 'place'
                  return (
                    <button key={obj.id} onClick={() => { setSelectedTypeId(obj.id); setPlacementColor(obj.defaultColor); setToolMode('place') }}
                      style={{ padding: '9px 6px', background: active ? `${obj.defaultColor}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? obj.defaultColor + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '9px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '20px' }}>{obj.icon}</span>
                      <span style={{ ...S, fontSize: '9px', color: active ? '#fff' : '#777' }}>{obj.label}</span>
                      <span style={{ fontSize: '8px', color: '#333' }}>{obj.size.join('×')}</span>
                    </button>
                  )
                })}
              </div>

              {toolMode === 'place' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#444', ...S, fontSize: '9px' }}>COULEUR</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {COLORS_PRESET.map(c => (
                      <button key={c} onClick={() => setPlacementColor(c)}
                        style={{ width: '22px', height: '22px', background: c, border: `2px solid ${placementColor === c ? '#fff' : 'transparent'}`, borderRadius: '5px', cursor: 'pointer' }} />
                    ))}
                  </div>
                  <input type="color" value={placementColor} onChange={e => setPlacementColor(e.target.value)}
                    style={{ width: '100%', height: '28px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />

                  <div style={{ color: '#444', ...S, fontSize: '9px' }}>ROTATION</div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 45, 90, 135, 180, 270].map(deg => (
                      <button key={deg} onClick={() => setPlacementRot(deg)}
                        style={{ flex: 1, padding: '3px 1px', background: placementRot === deg ? 'rgba(123,111,255,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${placementRot === deg ? 'rgba(123,111,255,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '4px', color: placementRot === deg ? '#7b6fff' : '#444', fontSize: '8px', cursor: 'pointer', fontWeight: 700 }}>
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SELECTED OBJECT ── */}
          {sTab === 'selected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {!selectedObject ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#333' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>↖️</div>
                  <div style={{ fontSize: '10px' }}>Passe en mode Sélect<br />puis clique un objet</div>
                </div>
              ) : (() => {
                const def = OBJECT_LIBRARY.find(d => d.id === selectedObject.typeId)!
                const rotDeg = Math.round((selectedObject.rotationY * 180) / Math.PI)
                return (
                  <>
                    <div style={{ padding: '9px 11px', background: `${def.defaultColor}18`, border: `1px solid ${def.defaultColor}33`, borderRadius: '9px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '22px' }}>{def.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '12px', color: '#ddd' }}>{def.label}</div>
                        <div style={{ fontSize: '9px', color: '#444' }}>{def.category} · {def.size.join('×')}</div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)', padding: '9px' }}>
                      <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>POSITION</div>
                      {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                        <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                          <span style={{ width: '12px', fontSize: '9px', fontWeight: 700, color: ['#ff4466', '#44ff88', '#4488ff'][i] }}>{axis}</span>
                          <input type="range" min={i === 1 ? 0 : -60} max={i === 1 ? 20 : 60} step={0.25} value={selectedObject.position[i]}
                            onChange={e => {
                              const v = parseFloat(e.target.value)
                              updateObj(o => { const p: [number, number, number] = [...o.position] as any; p[i] = v; return { ...o, position: p } })
                            }}
                            style={{ flex: 1, accentColor: ['#ff4466', '#44ff88', '#4488ff'][i] }} />
                          <span style={{ width: '34px', fontSize: '9px', color: '#666', textAlign: 'right' }}>{selectedObject.position[i].toFixed(1)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)', padding: '9px' }}>
                      <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>ROTATION Y</div>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {[0, 45, 90, 135, 180, 270].map(deg => (
                          <button key={deg} onClick={() => updateObj(o => ({ ...o, rotationY: (deg * Math.PI) / 180 }))}
                            style={{ padding: '4px 8px', background: rotDeg === deg ? 'rgba(123,111,255,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${rotDeg === deg ? 'rgba(123,111,255,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '4px', color: rotDeg === deg ? '#7b6fff' : '#444', fontSize: '9px', cursor: 'pointer', fontWeight: 700 }}>
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)', padding: '9px' }}>
                      <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '7px' }}>
                        {COLORS_PRESET.map(c => (
                          <button key={c} onClick={() => updateObj(o => ({ ...o, color: c }))}
                            style={{ width: '22px', height: '22px', background: c, border: `2px solid ${selectedObject.color === c ? '#fff' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer' }} />
                        ))}
                      </div>
                      <input type="color" value={selectedObject.color} onChange={e => updateObj(o => ({ ...o, color: e.target.value }))}
                        style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={duplicateSelected} style={{ flex: 1, padding: '8px', background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.3)', borderRadius: '8px', color: '#7b6fff', ...S, fontSize: '10px', cursor: 'pointer' }}>📋 Dupliquer</button>
                      <button onClick={deleteSelected} style={{ flex: 1, padding: '8px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '8px', color: '#ff5555', ...S, fontSize: '10px', cursor: 'pointer' }}>🗑️ Supprimer</button>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ── LIST ── */}
          {sTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#555', ...S, fontSize: '9px' }}>{objects.length} OBJETS</span>
                {objects.length > 0 && (
                  <button onClick={() => { pushHistory([]); setSelectedId(null) }}
                    style={{ background: 'none', border: 'none', color: '#ff5555', ...S, fontSize: '9px', cursor: 'pointer' }}>
                    Vider
                  </button>
                )}
              </div>
              {objects.length === 0 ? (
                <div style={{ color: '#333', fontSize: '11px', textAlign: 'center', padding: '20px' }}>Aucun objet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                  {[...objects].reverse().map(obj => {
                    const def = OBJECT_LIBRARY.find(d => d.id === obj.typeId)!
                    return (
                      <button key={obj.id} onClick={() => { setSelectedId(obj.id); setSTab('selected') }}
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 9px', background: selectedId === obj.id ? 'rgba(123,111,255,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedId === obj.id ? 'rgba(123,111,255,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '7px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
                        <span style={{ fontSize: '14px' }}>{def?.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#bbb' }}>{def?.label}</div>
                          <div style={{ fontSize: '8px', color: '#333' }}>[{obj.position.map(v => v.toFixed(0)).join(', ')}]</div>
                        </div>
                        <div style={{ width: '12px', height: '12px', background: obj.color, borderRadius: '3px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── EXPORT ── */}
          {sTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '5px' }}>NOM DE LA SCÈNE</div>
                <input value={sceneName} onChange={e => setSceneName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '7px 10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ padding: '10px', background: 'rgba(123,111,255,0.05)', border: '1px solid rgba(123,111,255,0.15)', borderRadius: '9px' }}>
                <div style={{ color: '#7b6fff', ...S, fontSize: '11px', marginBottom: '7px' }}>📊 Statistiques</div>
                <div style={{ fontSize: '10px', color: '#555', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>Total objets: <span style={{ color: '#aaa' }}>{objects.length}</span></div>
                  {CATEGORIES.map(cat => {
                    const count = objects.filter(o => OBJECT_LIBRARY.find(d => d.id === o.typeId)?.category === cat).length
                    if (!count) return null
                    return <div key={cat}>{CAT_ICONS[cat]} {cat}: <span style={{ color: '#aaa' }}>{count}</span></div>
                  })}
                </div>
              </div>

              <button onClick={exportScene} style={{ padding: '10px', background: 'rgba(68,255,136,0.1)', border: '1px solid rgba(68,255,136,0.3)', borderRadius: '9px', color: '#44ff88', ...S, fontSize: '11px', cursor: 'pointer' }}>
                💾 Exporter JSON
              </button>

              <label style={{ display: 'block' }}>
                <div style={{ padding: '10px', background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.3)', borderRadius: '9px', color: '#7b6fff', ...S, fontSize: '11px', cursor: 'pointer', textAlign: 'center' }}>
                  📂 Importer JSON
                </div>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importScene(f) }} />
              </label>

              <button onClick={() => { if (confirm('Vider toute la scène ?')) { pushHistory([]); setSelectedId(null) } }}
                style={{ padding: '10px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '9px', color: '#ff5555', ...S, fontSize: '11px', cursor: 'pointer' }}>
                🗑️ Vider la scène
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3D VIEWPORT ─── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          shadows={{ type: 0 }}
          camera={{ position: [14, 12, 18], fov: 52 }}
          style={{ width: '100%', height: '100%' }}
          onPointerMissed={() => { if (toolMode === 'select') setSelectedId(null) }}
        >
          <SceneContent
            objects={objects}
            toolMode={toolMode}
            selectedTypeId={selectedTypeId}
            selectedColor={placementColor}
            rotationY={placementRot}
            selectedId={selectedId}
            onPlace={handlePlace}
            onSelect={handleSelect}
            onDeselect={() => setSelectedId(null)}
          />
        </Canvas>

        {/* Status overlay */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(3,6,9,0.88)', border: `1px solid ${TOOL_COLORS[toolMode]}44`, borderRadius: '10px', padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
            <div style={{ color: TOOL_COLORS[toolMode], fontWeight: 800, fontSize: '12px' }}>
              {TOOL_ICONS[toolMode]}{' '}
              {toolMode === 'place' ? `Placer — ${selectedDef?.label ?? ''}` : toolMode === 'select' ? 'Sélectionner' : 'Effacer'}
            </div>
            <div style={{ color: '#333', fontSize: '10px', marginTop: '2px' }}>
              {toolMode === 'place' ? '🖱️ Clic gauche → placer · Clic droit drag → orbiter' : toolMode === 'select' ? '🖱️ Clic → sélectionner objet · Drag → orbiter' : '🖱️ Clic → supprimer objet'}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', top: '12px', right: '12px', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(3,6,9,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', padding: '6px 11px', fontSize: '10px', color: '#444', textAlign: 'right' }}>
            <div style={{ color: '#777' }}>{objects.length} objets</div>
            <div style={{ color: '#333', fontSize: '9px' }}>{sceneName}</div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '12px', left: '12px', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(3,6,9,0.7)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', padding: '5px 10px', fontSize: '9px', color: '#333', display: 'flex', gap: '10px' }}>
            <span>⌨️ P: Placer · S: Sélect · D: Effacer · Ctrl+Z: Annuler · Suppr: Effacer sélection</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuildingPRO
