// ============================================================
//  EtherLens — Types
//  Lentille d'analyse d'Etherworld
// ============================================================

export interface LensConfig {
  id: string
  name: string
  mode: LensMode
  sensitivity: number
}

export type LensMode =
  | 'detect'
  | 'measure'
  | 'compare'
  | 'report'
  | 'live'

export interface LensTarget {
  type: 'image' | 'url' | 'screen' | 'camera'
  data: unknown
}

export interface LensDetection {
  id: string
  label: string
  confidence: number
  bbox: [number, number, number, number]
  category: string
  metadata: Record<string, unknown>
}

export interface LensMeasurement {
  id: string
  type: 'distance' | 'area' | 'angle' | 'color' | 'brightness'
  value: number
  unit: string
  points: [number, number][]
}

export interface LensReport {
  id: string
  target: LensTarget
  detections: LensDetection[]
  measurements: LensMeasurement[]
  summary: string
  generatedAt: number
  exportFormat?: 'json' | 'pdf' | 'csv'
}

export interface LensState {
  isAnalyzing: boolean
  target: LensTarget | null
  detections: LensDetection[]
  measurements: LensMeasurement[]
  report: LensReport | null
  error: string | null
}