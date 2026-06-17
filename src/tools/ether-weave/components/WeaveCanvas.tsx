// ============================================================
//  WeaveCanvas — Canvas de dessin
// ============================================================

import type { WeaveCanvas as WeaveCanvasType } from '../types'

interface WeaveCanvasProps {
  canvas?: WeaveCanvasType
  zoom?: number
  onTileClick?: (x: number, y: number) => void
}

// TODO: Canvas interactif
export function WeaveCanvas(_props: WeaveCanvasProps) {
  // TODO: Rendu des layers
  // TODO: Grid overlay
  // TODO: Interaction souris
  return null
}

export default WeaveCanvas