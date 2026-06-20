// ============================================================
//  weaveTiles — Gestion des tuiles
// ============================================================

import type { WeaveTile, WeavePattern } from '../types'

export class WeaveTiles {
  // TODO: Créer une tile
  create(_x: number, _y: number, _pattern: WeavePattern): WeaveTile {
    return {} as WeaveTile
  }

  // TODO: Rendre une tile sur canvas
  render(_tile: WeaveTile, _ctx: CanvasRenderingContext2D): void {}

  // TODO: Remplissage par répétition
  fill(_pattern: WeavePattern, _width: number, _height: number): WeaveTile[] { return [] }

  // TODO: Vérification seamless
  isSeamless(_tiles: WeaveTile[]): boolean { return false }
}

export const weaveTiles = new WeaveTiles()
export default WeaveTiles