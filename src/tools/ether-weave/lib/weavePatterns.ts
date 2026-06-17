// ============================================================
//  weavePatterns — Générateurs de patterns
// ============================================================

import type { WeavePattern } from '../types'

export class WeavePatterns {
  // TODO: Noise (Perlin, Simplex, Worley)
  generateNoise(_seed: number, _scale: number): ImageData | null { return null }

  // TODO: Voronoi
  generateVoronoi(_points: number, _seed: number): ImageData | null { return null }

  // TODO: Grid
  generateGrid(_spacing: number, _lineWidth: number, _color: string): ImageData | null { return null }

  // TODO: Brique
  generateBrick(_brickW: number, _brickH: number, _mortarSize: number): ImageData | null { return null }

  // TODO: Hexagonal
  generateHex(_size: number, _color1: string, _color2: string): ImageData | null { return null }

  // TODO: Depuis un pattern custom
  fromPattern(_pattern: WeavePattern): ImageData | null { return null }
}

export const weavePatterns = new WeavePatterns()
export default WeavePatterns