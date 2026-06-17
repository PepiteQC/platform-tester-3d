// ============================================================
//  etherCompress — Utilitaire compression
// ============================================================

import type { CompressionOptions, PrismInput, PrismOutput } from '../types'

export class EtherCompress {
  // TODO: Compresser une image
  async compress(_input: PrismInput, _options: CompressionOptions): Promise<PrismOutput | null> {
    return null
  }

  // TODO: Optimiser pour le web
  async optimizeForWeb(_input: PrismInput): Promise<PrismOutput | null> {
    return null
  }

  // TODO: Compresser en batch
  async compressBatch(_inputs: PrismInput[], _options: CompressionOptions): Promise<PrismOutput[]> {
    return []
  }

  // TODO: Calculer le ratio de compression
  calculateRatio(_originalSize: number, _compressedSize: number): number {
    return 0
  }
}

export const etherCompress = new EtherCompress()
export default EtherCompress