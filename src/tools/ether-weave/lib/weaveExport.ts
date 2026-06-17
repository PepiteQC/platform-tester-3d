// ============================================================
//  weaveExport — Export de textures
// ============================================================

import type { WeaveCanvas, WeaveExportOptions } from '../types'

export class WeaveExport {
  // TODO: Exporter en PNG
  async toPNG(_canvas: WeaveCanvas, _size: [number, number]): Promise<Blob | null> { return null }

  // TODO: Exporter en WebP
  async toWebP(_canvas: WeaveCanvas, _quality: number): Promise<Blob | null> { return null }

  // TODO: Générer une texture seamless
  async toSeamless(_canvas: WeaveCanvas): Promise<Blob | null> { return null }

  // TODO: Exporter en SVG
  async toSVG(_canvas: WeaveCanvas): Promise<string> { return '' }

  // TODO: Télécharger
  download(_blob: Blob, _filename: string): void {}
}

export const weaveExport = new WeaveExport()
export default WeaveExport