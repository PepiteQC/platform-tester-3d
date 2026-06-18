// ============================================================
//  EtherGlue — PropFactory
//  Mesh + optional Cannon body factory for Platform Tester 3D
// ============================================================

import * as THREE from 'three'
import * as CANNON from 'cannon-es'

function makeId(prefix = 'prop') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function asVector3(value, fallback = [0, 1, 0]) {
  if (value instanceof THREE.Vector3) return value.clone()
  if (Array.isArray(value)) return new THREE.Vector3(value[0] || 0, value[1] || 0, value[2] || 0)
  if (value && typeof value === 'object') return new THREE.Vector3(value.x || 0, value.y || 0, value.z || 0)
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2])
}

function createMaterial(def = {}) {
  const params = {
    color: new THREE.Color(def.color || '#8e939c'),
    roughness: def.roughness ?? 0.72,
    metalness: def.metalness ?? 0.08,
    transparent: Boolean(def.transparent || (def.opacity !== undefined && def.opacity < 1)),
    opacity: def.opacity ?? 1,
    emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: def.emissiveIntensity || 0
  }
  return new THREE.MeshStandardMaterial(params)
}

function createGeometry(def) {
  const size = def.size || [1, 1, 1]
  switch (def.geometry || 'box') {
    case 'sphere': return new THREE.SphereGeometry(def.radius || 0.5, def.widthSegments || 24, def.heightSegments || 16)
    case 'cylinder': return new THREE.CylinderGeometry(def.radiusTop ?? def.radius ?? 0.45, def.radiusBottom ?? def.radius ?? 0.45, def.height ?? size[1] ?? 1, def.segments || 24)
    case 'cone': return new THREE.ConeGeometry(def.radius || 0.45, def.height || 1, def.segments || 24)
    case 'capsule': return new THREE.CapsuleGeometry(def.radius || 0.25, def.length || 0.75, 8, 16)
    case 'plane': return new THREE.PlaneGeometry(size[0], size[2] || size[1], 2, 2)
    case 'box':
    default: return new THREE.BoxGeometry(size[0], size[1], size[2], def.ws || 1, def.hs || 1, def.ds || 1)
  }
}

function createShape(def) {
  const size = def.size || [1, 1, 1]
  switch (def.physicsShape || def.geometry || 'box') {
    case 'sphere': return new CANNON.Sphere(def.radius || Math.max(size[0], size[1], size[2]) * 0.5)
    case 'cylinder': return new CANNON.Cylinder(def.radiusTop ?? def.radius ?? 0.45, def.radiusBottom ?? def.radius ?? 0.45, def.height ?? size[1] ?? 1, def.segments || 16)
    case 'box':
    default: return new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2))
  }
}

export class PropFactory {
  constructor(game) {
    this.game = game
    this.scene = game.scene
    this.definitions = new Map()
    this.instances = new Map()
  }

  register(id, definition) {
    this.definitions.set(id, { id, ...definition })
    this.game.emit('prop.registered', { id, definition })
  }

  unregister(id) {
    return this.definitions.delete(id)
  }

  list() {
    return Array.from(this.definitions.values()).map(def => ({
      id: def.id,
      label: def.label || def.id,
      category: def.category || 'misc',
      icon: def.icon || '⬡',
      description: def.description || ''
    }))
  }

  create(id, options = {}) {
    const def = this.definitions.get(id)
    if (!def) throw new Error(`Prop definition not found: ${id}`)

    const instanceId = makeId(id)
    const position = asVector3(options.position || def.position || this.game.defaultSpawnPosition)
    const rotation = options.rotation || def.rotation || [0, 0, 0]
    const scale = options.scale || def.scale || [1, 1, 1]
    const material = createMaterial({ ...(def.material || {}), ...(options.material || {}) })
    const mesh = new THREE.Mesh(createGeometry(def), material)

    mesh.name = options.name || def.label || id
    mesh.position.copy(position)
    mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0)
    mesh.scale.set(scale[0] || 1, scale[1] || 1, scale[2] || 1)
    mesh.castShadow = def.castShadow !== false
    mesh.receiveShadow = def.receiveShadow !== false
    mesh.userData.etherglue = true
    mesh.userData.etherglueId = instanceId
    mesh.userData.propId = id
    mesh.userData.category = def.category || 'misc'
    mesh.userData.createdAt = Date.now()

    this.scene.add(mesh)

    let body = null
    if (this.game.physicsWorld && def.physics !== false) {
      body = new CANNON.Body({
        mass: options.mass ?? def.mass ?? 0,
        shape: createShape(def),
        position: new CANNON.Vec3(position.x, position.y, position.z),
        material: this.game.platformMaterial || undefined,
        linearDamping: def.linearDamping ?? 0.04,
        angularDamping: def.angularDamping ?? 0.05
      })
      body.quaternion.setFromEuler(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0)
      this.game.physicsWorld.addBody(body)
    }

    const record = { id: instanceId, propId: id, definition: def, mesh, body, createdAt: Date.now() }
    this.instances.set(instanceId, record)
    this.game.emit('prop.created', { id: instanceId, propId: id, position: position.toArray() })
    return record
  }

  remove(instanceOrId) {
    const id = typeof instanceOrId === 'string' ? instanceOrId : instanceOrId?.id || instanceOrId?.mesh?.userData?.etherglueId
    const record = this.instances.get(id)
    if (!record) return false
    this.scene.remove(record.mesh)
    record.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => mat.dispose?.())
      }
    })
    if (record.body && this.game.physicsWorld) this.game.physicsWorld.removeBody(record.body)
    this.instances.delete(id)
    this.game.emit('prop.removed', { id })
    return true
  }

  update(dt) {
    this.instances.forEach(record => {
      if (!record.body) return
      record.mesh.position.copy(record.body.position)
      record.mesh.quaternion.copy(record.body.quaternion)
    })
  }

  serialize() {
    return Array.from(this.instances.values()).map(record => ({
      id: record.id,
      propId: record.propId,
      name: record.mesh.name,
      position: record.mesh.position.toArray(),
      rotation: [record.mesh.rotation.x, record.mesh.rotation.y, record.mesh.rotation.z],
      scale: record.mesh.scale.toArray(),
      mass: record.body?.mass ?? 0,
      createdAt: record.createdAt
    }))
  }

  clear() {
    Array.from(this.instances.keys()).forEach(id => this.remove(id))
  }
}

export default PropFactory
