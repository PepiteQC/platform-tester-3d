// ============================================================
//  EtherGlue — PhysicsGun
// ============================================================

import * as THREE from 'three'

export class PhysicsGun {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'physgun'
    this.label = 'PhysGun'
    this.icon = '✦'
    this.description = 'Attrape et déplace les props EtherGlue'
    this.held = null
    this.holdDistance = 4
    this.beam = null
    this.highlight = null
  }

  activate() {
    this.game.notify?.('PhysGun actif', 'info')
  }

  deactivate() {
    this.release()
  }

  onMouseDown(button, event) {
    if (button !== 0) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(8)
    const target = this.game.findEtherGlueObject(hit?.object)
    if (!target) return
    this.held = target
    this.holdDistance = Math.max(1.5, this.game.camera.position.distanceTo(target.mesh.position))
    this.game.selectObject(target.mesh)
    this.createBeam()
    this.game.emit('physgun.pickup', { id: target.id, propId: target.propId })
  }

  onMouseUp(button) {
    if (button === 0) this.release()
  }

  onWheel(event) {
    this.holdDistance = Math.max(1.2, Math.min(14, this.holdDistance + event.deltaY * 0.01))
  }

  release() {
    if (!this.held) return
    this.game.emit('physgun.release', { id: this.held.id })
    this.held = null
    this.removeBeam()
  }

  createBeam() {
    this.removeBeam()
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)])
    const material = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75 })
    this.beam = new THREE.Line(geometry, material)
    this.beam.name = 'EtherGlue PhysGun Beam'
    this.game.scene.add(this.beam)
  }

  removeBeam() {
    if (!this.beam) return
    this.game.scene.remove(this.beam)
    this.beam.geometry.dispose()
    this.beam.material.dispose()
    this.beam = null
  }

  update() {
    if (!this.held) return
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.camera.quaternion).normalize()
    const target = this.game.camera.position.clone().add(dir.multiplyScalar(this.holdDistance))
    target.y = Math.max(0.25, target.y)

    if (this.held.body) {
      this.held.body.position.set(target.x, target.y, target.z)
      this.held.body.velocity.set(0, 0, 0)
      this.held.body.angularVelocity.set(0, 0, 0)
    }
    this.held.mesh.position.lerp(target, 0.55)

    if (this.beam) {
      this.beam.geometry.setFromPoints([this.game.camera.position.clone(), this.held.mesh.position.clone()])
      this.beam.geometry.attributes.position.needsUpdate = true
    }
  }
}

export default PhysicsGun
