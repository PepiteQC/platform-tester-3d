// ============================================================
//  lensReport — Génération de rapports
// ============================================================

import type { LensTarget, LensDetection, LensMeasurement, LensReport } from '../types'

export class LensReport {
  // TODO: Générer un rapport complet
  async generate(
    _target: LensTarget,
    _detections: LensDetection[],
    _measurements: LensMeasurement[]
  ): Promise<LensReport> {
    return {} as LensReport
  }

  // TODO: Exporter en JSON
  toJSON(_report: LensReport): string { return '' }

  // TODO: Exporter en CSV
  toCSV(_report: LensReport): string { return '' }

  // TODO: Générer un résumé textuel
  summarize(_report: LensReport): string { return '' }

  // TODO: Télécharger
  download(_report: LensReport, _format: 'json' | 'csv'): void {}
}

export const lensReport = new LensReport()
export default LensReport