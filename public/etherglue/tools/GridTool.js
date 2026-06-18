// ============================================================
//  EtherGlue — GridTool
//  Grille de construction + snapping + repères visuels
// ============================================================

import * as THREE from 'three'

export class GridTool {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'grid'
    this.label = 'Grid'
    this.icon = '▦'
    this.description = 'Active la grille de construction, le snapping et les repères de mesure'
    this.enabled = true
    this.size = 0.5
    this.helper = null
    this.axes = null
    this.ghost = null
  }

  activate() {
    this.ensureHelpers()
    this.setEnabled(true)
    this.game.notify?.(`Grid snap ${this.size}m actif`, 'info')
  }

  deactivate() {
    // La grille reste disponible même si l’outil change, comme dans un éditeur pro.
  }

  ensureHelpers() {
    if (this.helper) return
    this.helper = new THREE.GridHelper(80, 160, 0x7dd3fc, 0x1b2a3a)
    this.helper.name = 'EtherGlue Build Grid'
    this.helper.position.y = 0.035
    this.helper.material.transparent = true
    this.helper.material.opacity = 0.38
    this.game.scene.add(this.helper)

    this.axes = new THREE.AxesHelper(2.5)
    this.axes.name = 'EtherGlue Axis Helper'
    this.axes.position.set(-3, 0.05, -3)
    this.game.scene.add(this.axes)

    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(this.size, 0.025, this.size),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.22, depthWrite: false })
    )
    this.ghost.name = 'EtherGlue Snap Ghost'
    this.ghost.visible = false
    this.game.scene.add(this.ghost)
  }

  setEnabled(enabled) {
    this.enabled = enabled
    this.game.grid = this.game.grid || {}
    this.game.grid.enabled = enabled
    this.game.grid.size = this.size
    if (this.helper) this.helper.visible = enabled
    if (this.axes) this.axes.visible = enabled
    if (!enabled && this.ghost) this.ghost.visible = false
    this.game.emit('grid.changed', { enabled, size: this.size })
  }

  setSize(size) {
    this.size = Math.max(0.1, Math.min(4, Number(size) || 0.5))
    if (this.helper) {
      this.game.scene.remove(this.helper)
      this.helper.geometry.dispose()
      this.helper.material.dispose()
      this.helper = null
    }
    if (this.ghost) this.ghost.scale.setScalar(this.size / 0.5)
    this.ensureHelpers()
    this.setEnabled(this.enabled)
    this.game.notify?.(`Grid snap ${this.size}m`, 'info')
  }

  snapVector(vec) {
    if (!this.enabled) return vec.clone()
    const s = this.size
    return new THREE.Vector3(
      Math.round(vec.x / s) * s,
      Math.round(vec.y / s) * s,
      Math.round(vec.z / s) * s
    )
  }

  onMouseMove(event) {
    if (!this.enabled || !this.ghost) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(10)
    if (!hit?.point) return
    const pos = this.snapVector(hit.point)
    pos.y = Math.max(0.04, pos.y + 0.02)
    this.ghost.position.copy(pos)
    this.ghost.visible = true
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase()
    if (key === 'g') {
      this.setEnabled(!this.enabled)
      this.game.notify?.(`Grid ${this.enabled ? 'ON' : 'OFF'}`, this.enabled ? 'success' : 'info')
    }
    if (key === '[') this.setSize(this.size / 2)
    if (key === ']') this.setSize(this.size * 2)
  }

  dispose() {
    ;[this.helper, this.axes, this.ghost].forEach(obj => {
      if (!obj) return
      this.game.scene.remove(obj)
      obj.geometry?.dispose?.()
      obj.material?.dispose?.()
    })
  }
}

export default GridTool
