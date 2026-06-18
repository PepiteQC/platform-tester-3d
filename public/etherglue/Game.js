// ============================================================
//  EtherGlue — Official TroxT EtherWorld Glue Game Object
//  Integrates with Platform Tester 3D without replacing game.js
// ============================================================

import * as THREE from 'three'
import { EventEmitter } from './core/EventEmitter.js'
import { ToolManager } from './core/ToolManager.js'
import { PropFactory } from './core/PropFactory.js'
import { PluginManager } from './core/PluginManager.js'
import { UIManager } from './ui/UIManager.js'
import { registerBasicProps } from './props/basicProps.js'
import { PhysicsGun } from './tools/PhysicsGun.js'
import { SpawnerTool } from './tools/SpawnerTool.js'
import { DeleteTool } from './tools/DeleteTool.js'
import { MaterialTool } from './tools/MaterialTool.js'

export class Game extends EventEmitter {
  constructor(options = {}) {
    super()
    this.id = 'etherglue-game'
    this.version = '2.0.0-troxtmod'
    this.sourceGame = options.sourceGame || window.game || null
    this.isStandalone = !this.sourceGame
    this.scene = this.sourceGame?.scene || new THREE.Scene()
    this.camera = this.sourceGame?.camera || new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200)
    this.renderer = this.sourceGame?.renderer || this.createStandaloneRenderer(options.canvasId || 'c')
    this.physicsWorld = this.sourceGame?.physicsWorld || null
    this.platformMaterial = this.sourceGame?.platformMaterial || null
    this.defaultSpawnPosition = new THREE.Vector3(0, 1.4, 0)
    this.selectedObject = null
    this.clock = new THREE.Clock()
    this.disposers = []
    this.loopId = null

    this.tools = new ToolManager(this)
    this.propFactory = new PropFactory(this)
    this.plugins = new PluginManager(this)
    this.ui = new UIManager(this)

    this.setup()
  }

  createStandaloneRenderer(canvasId) {
    let canvas = document.getElementById(canvasId)
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = canvasId
      document.body.appendChild(canvas)
    }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.camera.position.set(0, 2.4, 6)
    return renderer
  }

  setup() {
    this.ensureLights()
    registerBasicProps(this.propFactory)

    this.tools.register(new SpawnerTool({ game: this, prop: 'crate' }))
    this.tools.register(new PhysicsGun({ game: this }))
    this.tools.register(new MaterialTool({ game: this }))
    this.tools.register(new DeleteTool({ game: this }))

    this.ui.init()
    this.bindInput()
    this.loop()
    this.patchSourceGame()

    this.emit('ready', { version: this.version, standalone: this.isStandalone })
    this.notify('EtherGlue TroxTMOD prêt', 'success')
  }

  ensureLights() {
    if (!this.isStandalone) return
    this.scene.background = new THREE.Color(0x050810)
    this.scene.fog = new THREE.FogExp2(0x050810, 0.025)
    this.scene.add(new THREE.HemisphereLight(0x9edcff, 0x20140a, 0.8))
    const light = new THREE.DirectionalLight(0xffffff, 1.2)
    light.position.set(3, 5, 2)
    light.castShadow = true
    this.scene.add(light)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.88 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)
  }

  bindInput() {
    const target = this.renderer.domElement || window
    const down = e => this.tools.handleMouseDown(e.button ?? 0, e)
    const move = e => this.tools.handleMouseMove(e)
    const up = e => this.tools.handleMouseUp(e.button ?? 0, e)
    const wheel = e => {
      if (this.ui.isEventInsideUI(e)) return
      this.tools.activeTool?.onWheel?.(e)
    }
    const key = e => this.handleKeyDown(e)

    target.addEventListener('mousedown', down)
    target.addEventListener('mousemove', move)
    target.addEventListener('mouseup', up)
    target.addEventListener('wheel', wheel, { passive: true })
    window.addEventListener('keydown', key)

    this.disposers.push(() => target.removeEventListener('mousedown', down))
    this.disposers.push(() => target.removeEventListener('mousemove', move))
    this.disposers.push(() => target.removeEventListener('mouseup', up))
    this.disposers.push(() => target.removeEventListener('wheel', wheel))
    this.disposers.push(() => window.removeEventListener('keydown', key))
  }

  handleKeyDown(event) {
    if (this.ui.isTypingTarget(event.target)) return
    const key = event.key.toLowerCase()
    if (key === 'q') this.tools.cycle(1)
    if (key === 'g') this.ui.toggle()
    if (key === 'delete' || key === 'backspace') {
      if (this.selectedObject?.userData?.etherglueId) this.propFactory.remove(this.selectedObject.userData.etherglueId)
      this.clearSelection()
    }
    const number = Number(key)
    if (Number.isInteger(number) && number >= 1 && number <= 9) {
      const prop = this.propFactory.list()[number - 1]
      if (prop) {
        this.tools.use('spawner')
        this.tools.activeTool?.setProp?.(prop.id)
      }
    }
    this.tools.handleKeyDown(event)
  }

  patchSourceGame() {
    if (!this.sourceGame) return
    this.sourceGame.etherGlue = this
    this.sourceGame.spawnGlueProp = (propId, options) => this.propFactory.create(propId, options)
    this.sourceGame.removeGlueProp = id => this.propFactory.remove(id)
    this.sourceGame.serializeGlueProps = () => this.propFactory.serialize()
  }

  vector(value) {
    if (value instanceof THREE.Vector3) return value.clone()
    if (Array.isArray(value)) return new THREE.Vector3(value[0] || 0, value[1] || 0, value[2] || 0)
    return new THREE.Vector3(value?.x || 0, value?.y || 0, value?.z || 0)
  }

  raycastFromEvent(event) {
    if (!event || !this.renderer?.domElement) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)
    const hits = raycaster.intersectObjects(this.scene.children, true)
    return hits.find(hit => !this.ui.root?.contains(hit.object)) || hits[0] || null
  }

  raycastFromScreen(x, y) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)
    return raycaster.intersectObjects(this.scene.children, true)[0] || null
  }

  raycastForward(distance = 5) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize()
    const origin = this.camera.position.clone()
    const raycaster = new THREE.Raycaster(origin, dir, 0.1, distance)
    const hits = raycaster.intersectObjects(this.scene.children, true)
    return hits[0] || { point: origin.clone().add(dir.multiplyScalar(distance)), object: null }
  }

  findEtherGlueObject(object) {
    let current = object
    while (current) {
      const id = current.userData?.etherglueId
      if (id && this.propFactory.instances.has(id)) return this.propFactory.instances.get(id)
      current = current.parent
    }
    return null
  }

  selectObject(object) {
    this.clearSelection(false)
    this.selectedObject = object || null
    if (this.selectedObject?.material?.emissive) {
      this.selectedObject.userData.__prevEmissive = this.selectedObject.material.emissive.clone()
      this.selectedObject.material.emissive.setHex(0x17324a)
      this.selectedObject.material.emissiveIntensity = 0.25
    }
    this.emit('selection.changed', { object: this.selectedObject })
  }

  clearSelection(emit = true) {
    if (this.selectedObject?.material?.emissive && this.selectedObject.userData.__prevEmissive) {
      this.selectedObject.material.emissive.copy(this.selectedObject.userData.__prevEmissive)
      this.selectedObject.material.emissiveIntensity = 0
    }
    this.selectedObject = null
    if (emit) this.emit('selection.changed', { object: null })
  }

  notify(message, type = 'info') {
    if (this.sourceGame?.notify) this.sourceGame.notify(`[EtherGlue] ${message}`, type)
    else console.log(`[EtherGlue:${type}] ${message}`)
  }

  loop() {
    const tick = () => {
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.propFactory.update(dt)
      this.tools.update(dt)
      if (this.isStandalone) this.renderer.render(this.scene, this.camera)
      this.loopId = requestAnimationFrame(tick)
    }
    tick()
  }

  status() {
    return {
      version: this.version,
      standalone: this.isStandalone,
      activeTool: this.tools.activeTool?.id || null,
      props: this.propFactory.instances.size,
      registeredProps: this.propFactory.definitions.size,
      plugins: this.plugins.list().map(plugin => plugin.id),
      selected: this.selectedObject?.userData?.etherglueId || null
    }
  }

  dispose() {
    if (this.loopId) cancelAnimationFrame(this.loopId)
    this.disposers.forEach(dispose => dispose())
    this.propFactory.clear()
    this.ui.root?.remove()
    this.clear()
  }
}

export default Game
