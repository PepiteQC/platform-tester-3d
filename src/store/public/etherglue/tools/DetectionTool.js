// ============================================================
//  EtherGlue — DetectionTool
//  Détection, inspection, mesure et markers
// ============================================================

import * as THREE from 'three'

export class DetectionTool {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'detect'
    this.label = 'Detect'
    this.icon = '◎'
    this.description = 'Détecte props, surfaces, distances et collisions visuelles'
    this.points = []
    this.markers = []
    this.line = null
  }

  activate() {
    this.game.notify?.('Detection actif — clic pour inspecter/mesurer', 'info')
  }

  deactivate() {
    this.clearMeasurements()
  }

  onMouseDown(button, event) {
    if (button !== 0) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(12)
    if (!hit?.point) return
    this.inspect(hit)
    this.addPoint(hit.point)
  }

  onKeyDown(event) {
    if (event.key.toLowerCase() === 'c') this.clearMeasurements()
  }

  inspect(hit) {
    const record = this.game.findEtherGlueObject(hit.object)
    const payload = {
      object: hit.object?.name || hit.object?.type || 'unknown',
      etherGlueId: record?.id || null,
      propId: record?.propId || null,
      point: hit.point.toArray().map(n => Math.round(n * 100) / 100),
      distance: Math.round(hit.distance * 100) / 100
    }
    this.game.emit('detect.hit', payload)
    this.game.notify?.(record ? `Detect: ${record.propId}` : `Surface: ${payload.object}`, 'info')
  }

  addPoint(point) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd580, transparent: true, opacity: 0.95 })
    )
    marker.name = 'EtherGlue Detection Marker'
    marker.position.copy(point)
    this.game.scene.add(marker)
    this.markers.push(marker)
    this.points.push(point.clone())

    while (this.points.length > 2) this.points.shift()
    while (this.markers.length > 2) {
      const old = this.markers.shift()
      this.game.scene.remove(old)
      old.geometry.dispose()
      old.material.dispose()
    }

    if (this.points.length === 2) this.drawMeasurement()
  }

  drawMeasurement() {
    if (this.line) {
      this.game.scene.remove(this.line)
      this.line.geometry.dispose()
      this.line.material.dispose()
    }
    const [a, b] = this.points
    const distance = a.distanceTo(b)
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b])
    const material = new THREE.LineBasicMaterial({ color: 0xffd580, transparent: true, opacity: 0.95 })
    this.line = new THREE.Line(geometry, material)
    this.line.name = 'EtherGlue Detection Measurement'
    this.game.scene.add(this.line)
    this.game.emit('detect.measure', { distance, a: a.toArray(), b: b.toArray() })
    this.game.notify?.(`Distance: ${distance.toFixed(2)}m`, 'success')
  }

  clearMeasurements() {
    this.markers.forEach(marker => {
      this.game.scene.remove(marker)
      marker.geometry.dispose()
      marker.material.dispose()
    })
    this.markers = []
    this.points = []
    if (this.line) {
      this.game.scene.remove(this.line)
      this.line.geometry.dispose()
      this.line.material.dispose()
      this.line = null
    }
  }
}

export default DetectionTool
