// ============================================================
//  lensDetect — Détection d'objets
// ============================================================

import type { LensTarget, LensDetection } from '../types'

export class LensDetect {
  // TODO: Détecter les objets
  async detect(_target: LensTarget): Promise<LensDetection[]> { return [] }

  // TODO: Détecter les visages
  async detectFaces(_target: LensTarget): Promise<LensDetection[]> { return [] }

  // TODO: Détecter le texte (OCR)
  async detectText(_target: LensTarget): Promise<LensDetection[]> { return [] }

  // TODO: Détecter les formes
  async detectShapes(_target: LensTarget): Promise<LensDetection[]> { return [] }

  // TODO: Classification
  async classify(_target: LensTarget): Promise<LensDetection[]> { return [] }

  // TODO: Segmentation
  async segment(_target: LensTarget): Promise<LensDetection[]> { return [] }
}

export const lensDetect = new LensDetect()
export default LensDetect