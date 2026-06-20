// ============================================================
//  EtherForgeStore — State + Connexion TroxT
// ============================================================

import type { ForgeState, ForgeObject, ForgeMaterial, ForgeScene } from './types'

export class EtherForgeStore {
  private state: ForgeState

  constructor() {
    this.state = {
      scene: null,
      selectedObject: null,
      isLoading: false,
      error: null,
      history: []
    }
  }

  // TODO: Créer une nouvelle scène
  createScene(_name: string): ForgeScene | null { return null }

  // TODO: Ajouter un objet
  addObject(_object: Partial<ForgeObject>): void {}

  // TODO: Supprimer un objet
  removeObject(_id: string): void {}

  // TODO: Sélectionner un objet
  selectObject(_id: string): void {}

  // TODO: Appliquer un matériau
  applyMaterial(_objectId: string, _material: ForgeMaterial): void {}

  // TODO: Undo / Redo
  undo(): void {}
  redo(): void {}

  // TODO: Synchroniser avec TroxT
  async syncWithTroxT(): Promise<void> {}

  getState(): ForgeState { return this.state }
}

export default EtherForgeStore