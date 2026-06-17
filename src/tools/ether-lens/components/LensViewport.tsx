// ============================================================
//  LensViewport — Zone d'analyse
// ============================================================

import type { LensTarget, LensDetection } from '../types'

interface LensViewportProps {
  target?: LensTarget
  detections?: LensDetection[]
  showOverlay?: boolean
  onRegionSelect?: (region: [number, number, number, number]) => void
}

// TODO: Viewport avec overlays
export function LensViewport(_props: LensViewportProps) {
  // TODO: Afficher l'image/vidéo
  // TODO: Dessiner les bounding boxes
  // TODO: Sélection de région
  return null
}

export default LensViewport