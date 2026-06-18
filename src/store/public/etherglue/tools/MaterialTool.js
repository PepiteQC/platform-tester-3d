// ============================================================
//  EtherGlue — MaterialTool
// ============================================================

import * as THREE from 'three'

const PRESETS = [
  { id: 'cyan', color: '#7dd3fc', emissive: '#001826', emissiveIntensity: 0.25, roughness: 0.24, metalness: 0.3 },
  { id: 'gold', color: '#c9a84c', roughness: 0.16, metalness: 0.9 },
  { id: 'concrete', color: '#8e939c', roughness: 0.86, metalness: 0.04 },
  { id: 'dark', color: '#111827', roughness: 0.32, metalness: 0.75 },
  { id: 'green', color: '#44cc88', emissive: '#003018', emissiveIntensity: 0.18, roughness: 0.48, metalness: 0.1 }
]

export class MaterialTool {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'material'
    this.label = 'Material'
    this.icon = '◐'
    this.description = 'Peint les props EtherGlue avec un preset matériau'
    this.index = 0
  }

  get preset() {
    return PRESETS[this.index % PRESETS.length]
  }

  nextPreset() {
    this.index = (this.index + 1) % PRESETS.length
    this.game.notify?.(`Material: ${this.preset.id}`, 'info')
    this.game.emit('material.preset', this.preset)
  }

  onKeyDown(event) {
    if (event.key.toLowerCase() === 'm') this.nextPreset()
  }

  onMouseDown(button, event) {
    if (button !== 0) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(8)
    const target = this.game.findEtherGlueObject(hit?.object)
    if (!target) return
    const preset = this.preset
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(preset.color),
      roughness: preset.roughness,
      metalness: preset.metalness,
      emissive: preset.emissive ? new THREE.Color(preset.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: preset.emissiveIntensity || 0
    })
    target.mesh.traverse(child => {
      if (!child.isMesh) return
      if (child.material) child.material.dispose?.()
      child.material = material.clone()
    })
    this.game.notify?.(`Peint: ${preset.id}`, 'success')
  }

  listPresets() {
    return PRESETS
  }
}

export default MaterialTool
