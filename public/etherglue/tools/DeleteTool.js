// ============================================================
//  EtherGlue — DeleteTool
// ============================================================

export class DeleteTool {
  constructor({ game } = {}) {
    this.game = game
    this.id = 'delete'
    this.label = 'Delete'
    this.icon = '×'
    this.description = 'Supprime uniquement les props EtherGlue'
  }

  activate() {
    this.game.notify?.('Delete tool actif — props EtherGlue seulement', 'warning')
  }

  onMouseDown(button, event) {
    if (button !== 0) return
    const hit = this.game.raycastFromEvent(event) || this.game.raycastForward(8)
    const target = this.game.findEtherGlueObject(hit?.object)
    if (!target) return
    this.game.propFactory.remove(target.id)
    this.game.clearSelection()
    this.game.notify?.('Prop supprimé', 'info')
  }
}

export default DeleteTool
