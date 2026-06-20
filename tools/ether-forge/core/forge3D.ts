// ============================================================
// 🔥 FORGE3D CORE — Moteur 3D Principal v2
// ============================================================

import * as THREE from 'three'
import { OrbitControls }   from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SSAOPass }        from 'three/examples/jsm/postprocessing/SSAOPass.js'
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js'

import type { ForgeObject, ForgeScene, ForgeConfig, ForgeStats } from '../types/index.js'
import { FORGE_CONFIG, LIGHTING_CONFIG, CAMERA_CONFIG, CONTROLS_CONFIG } from '../config/index.js'
import { geometryCache }    from '../geometry/geometryCache.js'
import { geometryFactory }  from '../geometry/geometryFactory.js'
import { InstanceManager }  from '../geometry/instanceManager.js'
import { materialFactory }  from '../materials/materialFactory.js'
import { textureGenerator } from '../materials/textureGenerator.js'
import { animationEngine }  from '../animation/animationEngine.js'
import { ForgeRaycaster }   from '../interaction/raycaster.js'

export class Forge3DCore {
  private renderer!: THREE.WebGLRenderer
  private composer!: EffectComposer
  private canvas!: HTMLCanvasElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls

  private instanceMgr!: InstanceManager
  private raycaster!: ForgeRaycaster

  private objects = new Map<string, THREE.Object3D>()
  private clock = new THREE.Clock()
  private rafId: number | null = null

  private config: ForgeConfig = { ...FORGE_CONFIG }

  private stats: ForgeStats = {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    objects: 0,
    geometries: 0,
    textures: 0,
    memoryGeometry: 0,
    memoryTexture: 0,
    instanceGroups: 0,
  }

  private frameCount = 0
  private lastFpsCheck = 0

  onObjectClick?: (id: string, point: THREE.Vector3) => void
  onObjectHover?: (id: string | null) => void
  onAnimationLoop?: (delta: number, elapsed: number) => void
  onStatsUpdate?: (stats: ForgeStats) => void

  async init(canvas: HTMLCanvasElement, config?: Partial<ForgeConfig>): Promise<void> {
    this.canvas = canvas
    if (config) Object.assign(this.config, config)

    this.setupRenderer()
    this.setupScene()
    this.setupCamera()
    this.setupControls()
    this.setupLighting()
    this.setupPostProcessing()
    this.setupModules()
    this.setupResizeObserver()
    this.startRenderLoop()

    console.log('Forge3DCore initialized')
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.config.antialias,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      premultipliedAlpha: false,
    })

    this.renderer.setPixelRatio(this.config.pixelRatio)
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false)
    this.renderer.shadowMap.enabled = this.config.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = this.config.exposure
    this.renderer.info.autoReset = false
  }

  private setupScene(): void {
    this.scene = new THREE.Scene()

    if (this.config.fogEnabled) {
      this.scene.fog = new THREE.FogExp2(
        this.config.fogColor,
        this.config.fogDensity
      )
    }
  }

  private setupCamera(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      w / h,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    )

    this.camera.position.set(
      CAMERA_CONFIG.position.x,
      CAMERA_CONFIG.position.y,
      CAMERA_CONFIG.position.z
    )
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.canvas)

    this.controls.enableDamping = CONTROLS_CONFIG.enableDamping
    this.controls.dampingFactor = CONTROLS_CONFIG.dampingFactor
    this.controls.minDistance = CONTROLS_CONFIG.minDistance
    this.controls.maxDistance = CONTROLS_CONFIG.maxDistance
    this.controls.minPolarAngle = CONTROLS_CONFIG.minPolarAngle
    this.controls.maxPolarAngle = CONTROLS_CONFIG.maxPolarAngle
    this.controls.panSpeed = CONTROLS_CONFIG.panSpeed
    this.controls.rotateSpeed = CONTROLS_CONFIG.rotateSpeed
    this.controls.zoomSpeed = CONTROLS_CONFIG.zoomSpeed
  }

  private setupLighting(): void {
    const cfg = LIGHTING_CONFIG

    this.scene.add(
      new THREE.AmbientLight(cfg.ambient.color, cfg.ambient.intensity)
    )

    this.scene.add(
      new THREE.HemisphereLight(
        cfg.hemisphere.skyColor,
        cfg.hemisphere.groundColor,
        cfg.hemisphere.intensity
      )
    )

    const sun = new THREE.DirectionalLight(cfg.sun.color, cfg.sun.intensity)
    sun.position.set(cfg.sun.position.x, cfg.sun.position.y, cfg.sun.position.z)
    sun.castShadow = true

    const sm = cfg.sun.shadow
    sun.shadow.mapSize.set(sm.mapSize, sm.mapSize)
    sun.shadow.camera.near = sm.near
    sun.shadow.camera.far = sm.far
    sun.shadow.camera.left = -sm.area
    sun.shadow.camera.right = sm.area
    sun.shadow.camera.top = sm.area
    sun.shadow.camera.bottom = -sm.area
    sun.shadow.bias = sm.bias

    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(cfg.fill.color, cfg.fill.intensity)
    fill.position.set(cfg.fill.position.x, cfg.fill.position.y, cfg.fill.position.z)
    this.scene.add(fill)

    const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity)
    rim.position.set(cfg.rim.position.x, cfg.rim.position.y, cfg.rim.position.z)
    this.scene.add(rim)
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (this.config.ssao) {
      const ssao = new SSAOPass(this.scene, this.camera)
      ssao.kernelRadius = this.config.ssaoKernelRadius
      ssao.minDistance = 0.01
      ssao.maxDistance = 0.1
      this.composer.addPass(ssao)
    }

    if (this.config.bloom) {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
        this.config.bloomStrength,
        this.config.bloomRadius,
        this.config.bloomThreshold
      )
      this.composer.addPass(bloom)
    }

    this.composer.addPass(new OutputPass())
  }

  private setupModules(): void {
    this.instanceMgr = new InstanceManager(this.scene)
    this.raycaster = new ForgeRaycaster(this.camera, this.canvas)

    this.raycaster.onClick = (hit) => {
      const id = hit.object.userData.forgeId
      if (id && this.onObjectClick) this.onObjectClick(id, hit.point)
    }

    this.raycaster.onHover = (hit) => {
      if (this.onObjectHover) {
        this.onObjectHover(hit?.object.userData.forgeId ?? null)
      }
    }
  }

  private setupResizeObserver(): void {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.resize(width, height)
      }
    })
    observer.observe(this.canvas)
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
  }

  async loadScene(sceneData: ForgeScene): Promise<void> {
    this.clearScene()

    if (sceneData.background) {
      this.scene.background = new THREE.Color(sceneData.background)
    }

    if (sceneData.fog) {
      const fog = sceneData.fog
      if (fog.type === 'linear') {
        this.scene.fog = new THREE.Fog(
          new THREE.Color(fog.color ?? 0x111122),
          fog.near ?? 10,
          fog.far ?? 100
        )
      } else {
        this.scene.fog = new THREE.FogExp2(
          new THREE.Color(fog.color ?? 0x111122),
          fog.density ?? 0.008
        )
      }
    }

    if (sceneData.camera) {
      const c = sceneData.camera
      if (c.position) {
        this.camera.position.set(c.position.x ?? 10, c.position.y ?? 8, c.position.z ?? 10)
      }
      if (c.target) {
        this.controls.target.set(c.target.x ?? 0, c.target.y ?? 0, c.target.z ?? 0)
      }
      if (c.fov) {
        this.camera.fov = c.fov
        this.camera.updateProjectionMatrix()
      }
    }

    await Promise.all(sceneData.objects.map(o => this.addMesh(o)))
  }

  async addMesh(object: ForgeObject): Promise<void> {
    const material = materialFactory.create(object.material)
    const built = geometryFactory.create(object.geometry, material)
    const geometry = built.geometry
    const cacheKey = geometryCache.buildKey(object.geometry)

    const group = this.instanceMgr.getOrCreateGroup(
      cacheKey,
      geometry,
      material,
      object.maxInstances ?? this.config.maxInstances
    )

    this.instanceMgr.addInstance(group, object.id, object.transform ?? {})

    group.mesh.userData.forgeId = object.id
    group.mesh.userData.forgeType = object.type

    this.objects.set(object.id, group.mesh)
    this.raycaster.addTarget(group.mesh)

    if (object.animation) {
      animationEngine.add({
        target: group.mesh,
        ...object.animation,
      })
    }

    if (object.children?.length) {
      await Promise.all(object.children.map(c => this.addMesh(c)))
    }

    this.stats.objects = this.objects.size
  }

  removeMesh(id: string): void {
    const obj = this.objects.get(id)
    if (!obj) return

    animationEngine.remove(obj)
    this.raycaster.removeTarget(obj)
    this.scene.remove(obj)
    this.objects.delete(id)
    this.stats.objects = this.objects.size
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop)

      const delta = this.clock.getDelta()
      const elapsed = this.clock.getElapsedTime()

      animationEngine.update(delta, elapsed)
      this.raycaster.updateHover()
      this.controls.update()
      this.updateStats()

      this.renderer.info.reset()
      this.composer.render()

      if (this.onAnimationLoop) this.onAnimationLoop(delta, elapsed)
    }

    loop()
  }

  stopRenderLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private updateStats(): void {
    this.frameCount++
    const now = performance.now()

    if (now - this.lastFpsCheck >= 1000) {
      this.stats.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsCheck))
      this.frameCount = 0
      this.lastFpsCheck = now

      const info = this.renderer.info
      this.stats.drawCalls = info.render?.calls ?? 0
      this.stats.triangles = info.render?.triangles ?? 0
      this.stats.geometries = info.memory?.geometries ?? 0
      this.stats.textures = info.memory?.textures ?? 0
      this.stats.instanceGroups = this.instanceMgr.getStats().groups

      if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats })
    }
  }

  takeScreenshot(quality = 1.0): string {
    this.renderer.render(this.scene, this.camera)
    return this.canvas.toDataURL('image/png', quality)
  }

  getScene(): THREE.Scene { return this.scene }
  getCamera(): THREE.PerspectiveCamera { return this.camera }
  getRenderer(): THREE.WebGLRenderer { return this.renderer }
  getControls(): OrbitControls { return this.controls }
  getStats(): ForgeStats { return { ...this.stats } }

  getObject(id: string): THREE.Object3D | undefined {
    return this.objects.get(id)
  }

  private clearScene(): void {
    this.objects.forEach((_, id) => this.removeMesh(id))
    this.instanceMgr.dispose()
    this.instanceMgr = new InstanceManager(this.scene)
    animationEngine.clear()

    const toRemove: THREE.Object3D[] = []
    this.scene.children.forEach(child => {
      if (!(child instanceof THREE.Light)) toRemove.push(child)
    })
    toRemove.forEach(c => this.scene.remove(c))

    geometryCache.purgeStale()
  }

  dispose(): void {
    this.stopRenderLoop()
    this.clearScene()
    this.instanceMgr.dispose()
    this.renderer.dispose()
    this.composer.dispose()
    textureGenerator.dispose()
    this.controls.dispose()
    materialFactory.dispose()
    geometryCache.clear()
    console.log('Forge3DCore disposed')
  }
}

export const forge3DCore = new Forge3DCore()
export default Forge3DCore
