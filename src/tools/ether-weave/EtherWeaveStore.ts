// ============================================================
//  EtherWeaveStore — State
// ============================================================

import type { WeaveState, WeaveLayer, WeavePattern, WeaveTile } from './types'

export class EtherWeaveStore {
  private state: WeaveState

  constructor() {
    this.state = {
      canvas: null,
      activeLayer: null,
      selectedPattern: null,
      isEditing: false,
      zoom: 1
    }
  }

  // TODO: Créer un canvas
  createCanvas(_name: string, _size: [number, number]): void {}

  // TODO: Ajouter un layer
  addLayer(_name: string): WeaveLayer | null { return null }

  // TODO: Placer un tile
  placeTile(_tile: WeaveTile): void {}

  // TODO: Sélectionner un pattern
  selectPattern(_pattern: WeavePattern): void {}

  // TODO: Zoom
  setZoom(_zoom: number): void { this.state.zoom = _zoom }

  // TODO: Sync TroxT
  async syncWithTroxT(): Promise<void> {}

  getState(): WeaveState { return this.state }
}

export default EtherWeaveStore