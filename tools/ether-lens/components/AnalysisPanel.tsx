// ============================================================
//  AnalysisPanel — Panneau de résultats
// ============================================================

import type { LensDetection, LensMeasurement, LensReport } from '../types'

interface AnalysisPanelProps {
  detections?: LensDetection[]
  measurements?: LensMeasurement[]
  report?: LensReport
  onExport?: () => void
}

// TODO: Panneau de résultats d'analyse
export function AnalysisPanel(_props: AnalysisPanelProps) {
  // TODO: Liste des détections avec confidence
  // TODO: Liste des mesures
  // TODO: Bouton export rapport
  return null
}

export default AnalysisPanel