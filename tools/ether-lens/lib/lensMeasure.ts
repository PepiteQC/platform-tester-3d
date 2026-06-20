// ============================================================
//  lensMeasure — Outils de mesure
// ============================================================

import type { LensMeasurement } from '../types'

export class LensMeasure {
  // TODO: Mesurer une distance en pixels
  measureDistance(_p1: [number, number], _p2: [number, number]): LensMeasurement {
    return {} as LensMeasurement
  }

  // TODO: Mesurer une surface
  measureArea(_points: [number, number][]): LensMeasurement {
    return {} as LensMeasurement
  }

  // TODO: Mesurer un angle
  measureAngle(_p1: [number, number], _vertex: [number, number], _p2: [number, number]): LensMeasurement {
    return {} as LensMeasurement
  }

  // TODO: Analyser une couleur
  sampleColor(_target: unknown, _point: [number, number]): LensMeasurement {
    return {} as LensMeasurement
  }

  // TODO: Mesurer la luminosité
  measureBrightness(_target: unknown): LensMeasurement {
    return {} as LensMeasurement
  }
}

export const lensMeasure = new LensMeasure()
export default LensMeasure