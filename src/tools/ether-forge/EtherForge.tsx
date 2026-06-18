// ============================================================
//  EtherForge — Composant Principal
//  Atelier de création 3D contrôlé par TroxT
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ForgeConfig, ForgeMaterial, ForgeObject, ForgeScene, ForgeState } from './types'
import './ether-forge.css'

interface EtherForgeProps {
  config?: Partial<ForgeConfig>
  onExport?: (data: unknown) => void
  onError?: (error: string) => void
}

type ForgePrimitiveKind = 'cube' | 'sphere' | 'cylinder' | 'wall' | 'table' | 'chair' | 'lamp'

interface ForgeRuntimeObject {
  id: string
  name: string
  kind: ForgePrimitiveKind
  position: [number, number, number]
  scale: [number, number, number]
  material: ForgeMaterial
  createdAt: number
  updatedAt: number
}

interface RuntimeRefs {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  objectRoot: THREE.Group
  helperRoot: THREE.Group
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  animationId: number | null
  cameraOrbit: { theta: number; phi: number; radius: number; target: THREE.Vector3 }
  dragging: boolean
  lastPointer: { x: number; y: number }
}

const DEFAULT_CONFIG: ForgeConfig = {
  id: 'ether-forge-studio',
  name: 'EtherForge Studio',
  renderer: 'three',
  quality: 'high'
}

const MATERIAL_PRESETS: ForgeMaterial[] = [
  { id: 'mat-concrete', name: 'Béton Ether', type: 'standard', color: '#8e939c', roughness: 0.84, metalness: 0.04 },
  { id: 'mat-glass', name: 'Verre Bleu', type: 'physical', color: '#7dd3fc', roughness: 0.05, metalness: 0.08, opacity: 0.36, transparent: true },
  { id: 'mat-gold', name: 'Laiton Doré', type: 'physical', color: '#c9a84c', roughness: 0.18, metalness: 0.9 },
  { id: 'mat-dark', name: 'Métal Nuit', type: 'physical', color: '#111827', roughness: 0.28, metalness: 0.82 },
  { id: 'mat-wood', name: 'Bois Foncé', type: 'standard', color: '#2d1f0e', roughness: 0.62, metalness: 0.05 },
]

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function cloneMaterial(material: ForgeMaterial): ForgeMaterial {
  return { ...material, id: createId(material.id) }
}

function toForgeObject(object: ForgeRuntimeObject): ForgeObject {
  return {
    id: object.id,
    type: 'mesh',
    name: object.name,
    data: {
      kind: object.kind,
      position: object.position,
      scale: object.scale,
      material: object.material
    },
    metadata: {
      source: 'ether-forge',
      materialId: object.material.id
    },
    createdAt: object.createdAt,
    updatedAt: object.updatedAt
  }
}

function materialToThree(material: ForgeMaterial) {
  const color = new THREE.Color(material.color)
  const params: THREE.MeshStandardMaterialParameters = {
    color,
    roughness: material.roughness,
    metalness: material.metalness,
    emissive: material.emissive ? new THREE.Color(material.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: material.emissiveIntensity || 0,
    transparent: Boolean(material.transparent || (material.opacity !== undefined && material.opacity < 1)),
    opacity: material.opacity ?? 1,
    depthWrite: !(material.transparent || (material.opacity !== undefined && material.opacity < 1))
  }

  return new THREE.MeshStandardMaterial(params)
}

function createCheckerTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#161b26'
  ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(125,211,252,0.08)' : 'rgba(201,168,76,0.06)'
      ctx.fillRect(x * 32, y * 32, 32, 32)
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(12, 12)
  texture.anisotropy = 8
  return texture
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach(material => material.dispose())
    }
  })
}

function markForgeObject(object: THREE.Object3D, id: string) {
  object.userData.forgeObjectId = id
  object.traverse(child => {
    child.userData.forgeObjectId = id
  })
}

function createPrimitive(object: ForgeRuntimeObject): THREE.Object3D {
  const material = materialToThree(object.material)
  const group = new THREE.Group()
  group.name = object.name

  const addMesh = (mesh: THREE.Mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  switch (object.kind) {
    case 'sphere':
      addMesh(new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 18), material))
      break

    case 'cylinder':
      addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 32), material))
      break

    case 'wall':
      addMesh(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.18, 4, 4, 1), material))
      break

    case 'table': {
      addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.9), material)).position.y = 0.72
      const legMat = material.clone()
      ;[[-0.68, -0.36], [0.68, -0.36], [-0.68, 0.36], [0.68, 0.36]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), legMat)
        leg.position.set(x, 0.36, z)
        addMesh(leg)
      })
      break
    }

    case 'chair': {
      addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), material)).position.y = 0.52
      addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.12), material)).position.set(0, 0.92, -0.36)
      const legMat = material.clone()
      ;[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.52, 8), legMat)
        leg.position.set(x, 0.25, z)
        addMesh(leg)
      })
      break
    }

    case 'lamp': {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.88, roughness: 0.18 })
      addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.65, 16), poleMat)).position.y = 0.82
      const shade = addMesh(new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 24, 1, true), material))
      shade.position.y = 1.72
      shade.rotation.x = Math.PI
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd580, emissive: 0xffd580, emissiveIntensity: 1.2 }))
      bulb.position.y = 1.48
      addMesh(bulb)
      const light = new THREE.PointLight(0xffd580, 0.75, 5)
      light.position.y = 1.45
      group.add(light)
      break
    }

    case 'cube':
    default:
      addMesh(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 3, 3, 3), material))
      break
  }

  group.position.set(...object.position)
  group.scale.set(...object.scale)
  markForgeObject(group, object.id)
  return group
}

function defaultObjects(): ForgeRuntimeObject[] {
  const now = Date.now()
  return [
    { id: createId('obj'), name: 'Bloc béton', kind: 'cube', position: [-1.4, 0.55, 0], scale: [1.2, 1.1, 1.2], material: cloneMaterial(MATERIAL_PRESETS[0]), createdAt: now, updatedAt: now },
    { id: createId('obj'), name: 'Table showroom', kind: 'table', position: [1.4, 0, -0.3], scale: [1, 1, 1], material: cloneMaterial(MATERIAL_PRESETS[4]), createdAt: now, updatedAt: now },
    { id: createId('obj'), name: 'Vitre bleue', kind: 'wall', position: [0, 1.05, -2], scale: [1.4, 1.15, 1], material: cloneMaterial(MATERIAL_PRESETS[1]), createdAt: now, updatedAt: now },
    { id: createId('obj'), name: 'Lampe dorée', kind: 'lamp', position: [0, 0, 1.7], scale: [1, 1, 1], material: cloneMaterial(MATERIAL_PRESETS[2]), createdAt: now, updatedAt: now },
  ]
}

export function EtherForge(props: EtherForgeProps) {
  const config = useMemo<ForgeConfig>(() => ({ ...DEFAULT_CONFIG, ...props.config }), [props.config])
  const mountRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<RuntimeRefs | null>(null)
  const [objects, setObjects] = useState<ForgeRuntimeObject[]>(() => defaultObjects())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState('Prêt')
  const selectedObject = objects.find(object => object.id === selectedId) || null

  const forgeScene = useMemo<ForgeScene>(() => ({
    id: config.id,
    name: config.name,
    objects: objects.map(toForgeObject),
    lights: [{ type: 'hemisphere' }, { type: 'directional' }, { type: 'point' }],
    camera: { mode: 'orbit', target: [0, 0.7, 0] },
    environment: 'ether-forge-studio'
  }), [config.id, config.name, objects])

  const forgeState = useMemo<ForgeState>(() => ({
    scene: forgeScene,
    selectedObject: selectedObject ? toForgeObject(selectedObject) : null,
    isLoading: false,
    error: null,
    history: [objects.map(toForgeObject)]
  }), [forgeScene, objects, selectedObject])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050810)
    scene.fog = new THREE.FogExp2(0x050810, 0.025)

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 200)
    const renderer = new THREE.WebGLRenderer({ antialias: config.quality !== 'low', alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.quality === 'ultra' ? 2 : 1.5))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = config.quality !== 'low'
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const objectRoot = new THREE.Group()
    objectRoot.name = 'EtherForge Objects'
    scene.add(objectRoot)

    const helperRoot = new THREE.Group()
    helperRoot.name = 'EtherForge Helpers'
    scene.add(helperRoot)

    const floorTexture = createCheckerTexture()
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28, 8, 8),
      new THREE.MeshStandardMaterial({ map: floorTexture, color: 0x1b2230, roughness: 0.86, metalness: 0.08 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    floor.userData.__disposeTexture = floorTexture
    helperRoot.add(floor)

    const grid = new THREE.GridHelper(28, 28, 0x7dd3fc, 0x243246)
    grid.position.y = 0.015
    helperRoot.add(grid)

    scene.add(new THREE.HemisphereLight(0x8ecaff, 0x20140c, 0.68))

    const keyLight = new THREE.DirectionalLight(0xfff0d0, 1.4)
    keyLight.position.set(6, 9, 7)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 40
    keyLight.shadow.camera.left = -12
    keyLight.shadow.camera.right = 12
    keyLight.shadow.camera.top = 12
    keyLight.shadow.camera.bottom = -12
    scene.add(keyLight)

    const rim = new THREE.PointLight(0x7dd3fc, 1.2, 16)
    rim.position.set(-4, 4, -4)
    scene.add(rim)

    const runtime: RuntimeRefs = {
      scene,
      camera,
      renderer,
      objectRoot,
      helperRoot,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      animationId: null,
      cameraOrbit: { theta: 0.72, phi: 0.42, radius: 6.8, target: new THREE.Vector3(0, 0.75, 0) },
      dragging: false,
      lastPointer: { x: 0, y: 0 }
    }
    runtimeRef.current = runtime

    const updateCamera = () => {
      const { theta, phi, radius, target } = runtime.cameraOrbit
      camera.position.set(
        target.x + radius * Math.sin(theta) * Math.cos(phi),
        target.y + radius * Math.sin(phi) + 1.2,
        target.z + radius * Math.cos(theta) * Math.cos(phi)
      )
      camera.lookAt(target)
    }
    updateCamera()

    const pickObject = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      runtime.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      runtime.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      runtime.raycaster.setFromCamera(runtime.pointer, camera)
      const hit = runtime.raycaster.intersectObjects(objectRoot.children, true).find(item => item.object.userData.forgeObjectId)
      setSelectedId(hit?.object.userData.forgeObjectId || null)
    }

    const onPointerDown = (event: PointerEvent) => {
      runtime.dragging = true
      runtime.lastPointer = { x: event.clientX, y: event.clientY }
      renderer.domElement.setPointerCapture?.(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!runtime.dragging) return
      const dx = event.clientX - runtime.lastPointer.x
      const dy = event.clientY - runtime.lastPointer.y
      runtime.cameraOrbit.theta -= dx * 0.006
      runtime.cameraOrbit.phi = Math.max(0.05, Math.min(1.15, runtime.cameraOrbit.phi - dy * 0.006))
      runtime.lastPointer = { x: event.clientX, y: event.clientY }
      updateCamera()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (Math.abs(event.clientX - runtime.lastPointer.x) < 2 && Math.abs(event.clientY - runtime.lastPointer.y) < 2) pickObject(event)
      runtime.dragging = false
      renderer.domElement.releasePointerCapture?.(event.pointerId)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      runtime.cameraOrbit.radius = Math.max(2.8, Math.min(16, runtime.cameraOrbit.radius + event.deltaY * 0.01))
      updateCamera()
    }

    const onResize = () => {
      if (!mountRef.current) return
      camera.aspect = mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    const animate = () => {
      runtime.animationId = requestAnimationFrame(animate)
      objectRoot.children.forEach(child => {
        if (child.userData.forgeObjectId === selectedId) child.rotation.y += 0.004
      })
      renderer.render(scene, camera)
    }
    animate()

    setStatus('Viewport Three.js actif')

    return () => {
      if (runtime.animationId) cancelAnimationFrame(runtime.animationId)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      disposeObject3D(scene)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      runtimeRef.current = null
    }
  }, [config.quality, selectedId])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return

    while (runtime.objectRoot.children.length) {
      const child = runtime.objectRoot.children[0]
      runtime.objectRoot.remove(child)
      disposeObject3D(child)
    }

    objects.forEach(object => runtime.objectRoot.add(createPrimitive(object)))
  }, [objects])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('etherworld:forge:state', {
      detail: {
        source: 'EtherForge',
        timestamp: Date.now(),
        selectedId,
        objects: objects.length,
        scene: forgeScene
      }
    }))
  }, [forgeScene, objects.length, selectedId])

  const addObject = useCallback((kind: ForgePrimitiveKind) => {
    const createdAt = Date.now()
    const preset = MATERIAL_PRESETS[Math.floor(Math.random() * MATERIAL_PRESETS.length)]
    const object: ForgeRuntimeObject = {
      id: createId('obj'),
      name: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${objects.length + 1}`,
      kind,
      position: [Math.sin(objects.length) * 1.8, kind === 'sphere' ? 0.65 : 0.5, Math.cos(objects.length) * 1.4],
      scale: [1, 1, 1],
      material: cloneMaterial(preset),
      createdAt,
      updatedAt: createdAt
    }
    setObjects(prev => [...prev, object])
    setSelectedId(object.id)
    setStatus(`${object.name} ajouté`)
  }, [objects.length])

  const updateSelectedMaterial = useCallback((patch: Partial<ForgeMaterial>) => {
    if (!selectedId) return
    setObjects(prev => prev.map(object => object.id === selectedId
      ? { ...object, material: { ...object.material, ...patch }, updatedAt: Date.now() }
      : object
    ))
  }, [selectedId])

  const removeSelected = useCallback(() => {
    if (!selectedId) return
    setObjects(prev => prev.filter(object => object.id !== selectedId))
    setStatus('Objet supprimé')
    setSelectedId(null)
  }, [selectedId])

  const resetScene = useCallback(() => {
    setObjects(defaultObjects())
    setSelectedId(null)
    setStatus('Scène réinitialisée')
  }, [])

  const exportScene = useCallback(() => {
    const data = { forgeState, exportedAt: new Date().toISOString(), generator: 'EtherForge' }
    props.onExport?.(data)
    window.dispatchEvent(new CustomEvent('etherworld:forge:export', { detail: data }))
    setStatus('Export JSON prêt')
  }, [forgeState, props])

  const setPosition = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedId) return
    setObjects(prev => prev.map(object => {
      if (object.id !== selectedId) return object
      const position: [number, number, number] = [...object.position]
      position[axis] = value
      return { ...object, position, updatedAt: Date.now() }
    }))
  }

  const setScale = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedId) return
    setObjects(prev => prev.map(object => {
      if (object.id !== selectedId) return object
      const scale: [number, number, number] = [...object.scale]
      scale[axis] = Math.max(0.1, value)
      return { ...object, scale, updatedAt: Date.now() }
    }))
  }

  return (
    <section className="ether-forge" aria-label="EtherForge Studio">
      <header className="ether-forge__toolbar">
        <div>
          <span className="ether-forge__eyebrow">TroxT controlled workshop</span>
          <h2>{config.name}</h2>
        </div>
        <div className="ether-forge__actions" aria-label="Ajouter un objet">
          {(['cube', 'sphere', 'cylinder', 'wall', 'table', 'chair', 'lamp'] as ForgePrimitiveKind[]).map(kind => (
            <button key={kind} type="button" onClick={() => addObject(kind)}>{kind}</button>
          ))}
          <button type="button" onClick={exportScene}>Export</button>
          <button type="button" onClick={resetScene}>Reset</button>
        </div>
      </header>

      <div className="ether-forge__workspace">
        <aside className="ether-forge__outliner" aria-label="Liste des objets">
          <div className="ether-forge__panel-title">Outliner</div>
          {objects.map(object => (
            <button
              key={object.id}
              type="button"
              className={object.id === selectedId ? 'is-active' : ''}
              onClick={() => setSelectedId(object.id)}
            >
              <span>{object.name}</span>
              <small>{object.kind}</small>
            </button>
          ))}
        </aside>

        <div className="ether-forge__viewport" ref={mountRef} role="img" aria-label="Viewport 3D EtherForge" />

        <aside className="ether-forge__inspector" aria-label="Panneau d'inspection">
          <div className="ether-forge__panel-title">Inspector</div>
          {selectedObject ? (
            <>
              <div className="ether-forge__selected-name">{selectedObject.name}</div>
              <div className="ether-forge__field-grid">
                {(['X', 'Y', 'Z'] as const).map((label, index) => (
                  <label key={`pos-${label}`}>Pos {label}
                    <input type="number" step="0.1" value={selectedObject.position[index]} onChange={e => setPosition(index as 0 | 1 | 2, Number(e.target.value))} />
                  </label>
                ))}
                {(['X', 'Y', 'Z'] as const).map((label, index) => (
                  <label key={`scale-${label}`}>Scale {label}
                    <input type="number" step="0.1" min="0.1" value={selectedObject.scale[index]} onChange={e => setScale(index as 0 | 1 | 2, Number(e.target.value))} />
                  </label>
                ))}
              </div>

              <div className="ether-forge__material-editor">
                <div className="ether-forge__panel-title">Matériau</div>
                <label>Couleur
                  <input type="color" value={selectedObject.material.color} onChange={e => updateSelectedMaterial({ color: e.target.value })} />
                </label>
                <label>Roughness
                  <input type="range" min="0" max="1" step="0.01" value={selectedObject.material.roughness} onChange={e => updateSelectedMaterial({ roughness: Number(e.target.value) })} />
                </label>
                <label>Metalness
                  <input type="range" min="0" max="1" step="0.01" value={selectedObject.material.metalness} onChange={e => updateSelectedMaterial({ metalness: Number(e.target.value) })} />
                </label>
                <div className="ether-forge__preset-row">
                  {MATERIAL_PRESETS.map(preset => (
                    <button key={preset.id} type="button" title={preset.name} style={{ background: preset.color }} onClick={() => updateSelectedMaterial(cloneMaterial(preset))} />
                  ))}
                </div>
              </div>

              <button className="ether-forge__danger" type="button" onClick={removeSelected}>Supprimer objet</button>
            </>
          ) : (
            <div className="ether-forge__empty">Sélectionne un objet dans la scène ou l'outliner.</div>
          )}
        </aside>
      </div>

      <footer className="ether-forge__status">
        <span>{status}</span>
        <span>{objects.length} objets</span>
        <span>{config.renderer} · {config.quality}</span>
      </footer>
    </section>
  )
}

export default EtherForge
