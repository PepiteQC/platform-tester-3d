// ============================================================
//  EtherGlue — SpawnerTool
// ============================================================

export class SpawnerTool {
  constructor({ game, prop = 'crate' } = {}) {
    this.game = game
    this.id = 'spawner'
    this.label = 'Spawner'
    this.icon = '▣'
    this.description = 'Spawn des props EtherGlue dans la scène'
    this.prop = prop
  }

  activate() {
    this.game.notify?.(`Spawner actif: ${this.prop}`, 'info')
  }

  setProp(prop) {
    this.prop = prop
    this.game.emit('spawner.prop', { prop })
    this.game.notify?.(`Prop sélectionné: ${prop}`, 'info')
  }

  onMouseDown(button, event) {
    if (button !== 0) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(6)
    const point = hit?.point || this.game.defaultSpawnPosition
    const normal = hit?.face?.normal || { x: 0, y: 1, z: 0 }
    let pos = point.clone ? point.clone() : this.game.vector(point)
    if (normal && pos.add) pos.add(this.game.vector(normal).multiplyScalar(0.35))
    if (this.game.grid?.enabled && this.game.gridTool?.snapVector) pos = this.game.gridTool.snapVector(pos)
    pos.y = Math.max(0.35, pos.y)

    const record = this.game.propFactory.create(this.prop, { position: pos })
    this.game.selectObject(record.mesh)
    this.game.notify?.(`Spawn: ${this.prop}`, 'success')
  }
}

export default SpawnerTool
