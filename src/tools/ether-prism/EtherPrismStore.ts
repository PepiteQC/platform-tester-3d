// ============================================================
//  EtherPrismStore — State + Connexion TroxT
// ============================================================

import type { PrismState, PrismInput, PrismOutput, PrismMode } from './types'

export class EtherPrismStore {
  private state: PrismState

  constructor() {
    this.state = {
      isProcessing: false,
      queue: [],
      results: [],
      error: null
    }
  }

  // TODO: Ajouter un item à la queue
  enqueue(_input: PrismInput): void {}

  // TODO: Traiter la queue
  async processQueue(): Promise<void> {}

  // TODO: Analyser une image
  async analyze(_input: PrismInput): Promise<PrismOutput | null> {
    return null
  }

  // TODO: Générer une image
  async generate(_params: unknown): Promise<PrismOutput | null> {
    return null
  }

  // TODO: Synchroniser avec TroxT
  async syncWithTroxT(): Promise<void> {}

  getState(): PrismState {
    return this.state
  }

  clearResults(): void {
    this.state.results = []
  }
}

export default EtherPrismStore