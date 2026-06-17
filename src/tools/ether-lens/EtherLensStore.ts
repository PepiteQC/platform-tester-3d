// ============================================================
//  EtherLensStore — State
// ============================================================

import type { LensState, LensTarget, LensDetection, LensMeasurement } from './types'

export class EtherLensStore {
  private state: LensState

  constructor() {
    this.state = {
      isAnalyzing: false,
      target: null,
      detections: [],
      measurements: [],
      report: null,
      error: null
    }
  }

  // TODO: Définir la cible
  setTarget(_target: LensTarget): void {}

  // TODO: Lancer l'analyse
  async analyze(): Promise<void> {}

  // TODO: Ajouter une mesure manuelle
  addMeasurement(_m: LensMeasurement): void {}

  // TODO: Générer le rapport
  async generateReport(): Promise<void> {}

  // TODO: Effacer
  clear(): void {
    this.state.detections = []
    this.state.measurements = []
    this.state.report = null
  }

  getState(): LensState { return this.state }
}

export default EtherLensStore