// ============================================================
//  lensReport — Génération de rapports
// ============================================================

import type { LensTarget, LensDetection, LensMeasurement, LensReport as LensReportData } from '../types'

export class LensReport {
  // TODO: Générer un rapport complet
  async generate(
    _target: LensTarget,
    _detections: LensDetection[],
    _measurements: LensMeasurement[]
  ): Promise<LensReportData> {
    return {} as LensReportData
  }

  // TODO: Exporter en JSON
  toJSON(_report: LensReportData): string { return '' }

  // TODO: Exporter en CSV
  toCSV(_report: LensReportData): string { return '' }

  // TODO: Générer un résumé textuel
  summarize(_report: LensReportData): string { return '' }

  // TODO: Télécharger
  download(_report: LensReportData, _format: 'json' | 'csv'): void {}
}

export const lensReport = new LensReport()
export default LensReport
