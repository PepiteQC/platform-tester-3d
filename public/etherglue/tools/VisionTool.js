// ============================================================
//  EtherGlue — VisionTool
//  Vision debug : X-Ray / Wireframe / Thermal / Semantic
// ============================================================

import * as THREE from 'three'

const MODES = ['semantic', 'xray', 'wireframe', 'thermal']

export class VisionTool {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'vision'
    this.label = 'Vision'
    this.icon = '◈'
    this.description = 'Analyse visuelle de la scène : semantic, xray, wireframe, thermal'
    this.modeIndex = 0
    this.helpers = new Map()
    this.original = new Map()
    this.panel = null
  }

  get mode() {
    return MODES[this.modeIndex % MODES.length]
  }

  activate() {
    this.installPanel()
    this.scan()
    this.applyMode()
    this.game.notify?.(`Vision ${this.mode}`, 'info')
  }

  deactivate() {
    this.clearHelpers()
    this.restoreMaterials()
    if (this.panel) this.panel.remove()
    this.panel = null
  }

  nextMode() {
    this.modeIndex = (this.modeIndex + 1) % MODES.length
    this.scan()
    this.applyMode()
    this.game.notify?.(`Vision ${this.mode}`, 'info')
  }

  onKeyDown(event) {
    if (event.key.toLowerCase() === 'v') this.nextMode()
  }

  passiveUpdate() {
    if (this.game.tools.activeTool !== this) return
    this.updatePanel()
  }

  installPanel() {
    if (this.panel) return
    this.panel = document.createElement('div')
    this.panel.className = 'etherglue-vision-panel'
    this.panel.style.cssText = 'position:fixed;right:14px;top:64px;z-index:1500;width:260px;padding:12px;border-radius:14px;background:rgba(5,8,16,.88);border:1px solid rgba(125,211,252,.25);color:#dbeafe;font:12px system-ui;backdrop-filter:blur(12px);box-shadow:0 18px 60px rgba(0,0,0,.45)'
    document.body.appendChild(this.panel)
    this.updatePanel()
  }

  updatePanel() {
    if (!this.panel) return
    const props = this.game.propFactory.instances.size
    const meshes = this.countMeshes()
    this.panel.innerHTML = `
      <div style="color:#7dd3fc;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">EtherVision</div>
      <div>Mode: <strong style="color:#c9a84c">${this.mode}</strong></div>
      <div>Props EtherGlue: <strong>${props}</strong></div>
      <div>Meshes scène: <strong>${meshes}</strong></div>
      <div style="margin-top:8px;color:#64748b">V: changer mode · clic: inspecter</div>
    `
  }

  countMeshes() {
    let count = 0
    this.game.scene.traverse(obj => { if (obj.isMesh) count++ })
    return count
  }

  scan() {
    this.clearHelpers()
    if (this.mode !== 'semantic') return
    this.game.propFactory.instances.forEach(record => {
      const box = new THREE.BoxHelper(record.mesh, 0x7dd3fc)
      box.name = `VisionBox_${record.id}`
      this.helpers.set(record.id, box)
      this.game.scene.add(box)
    })
  }

  applyMode() {
    this.restoreMaterials()
    if (this.mode === 'semantic') return

    this.game.propFactory.instances.forEach(record => {
      record.mesh.traverse(child => {
        if (!child.isMesh || !child.material) return
        this.original.set(child.uuid, child.material)
        if (this.mode === 'wireframe') {
          const mat = child.material.clone()
          mat.wireframe = true
          mat.color?.set?.(0x7dd3fc)
          child.material = mat
        }
        if (this.mode === 'xray') {
          child.material = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.22, depthWrite: false })
        }
        if (this.mode === 'thermal') {
          const mass = record.body?.mass || 0
          const color = mass > 0 ? 0xff8844 : 0x44ccff
          child.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
        }
      })
    })
  }

  restoreMaterials() {
    this.game.propFactory.instances.forEach(record => {
      record.mesh.traverse(child => {
        if (!child.isMesh) return
        const original = this.original.get(child.uuid)
        if (!original) return
        if (child.material !== original) child.material.dispose?.()
        child.material = original
      })
    })
    this.original.clear()
  }

  clearHelpers() {
    this.helpers.forEach(helper => {
      this.game.scene.remove(helper)
      helper.geometry?.dispose?.()
      helper.material?.dispose?.()
    })
    this.helpers.clear()
  }
}

export default VisionTool
