// ============================================================
//  prismGenerator — Main créative de TroxT
//  Génère de nouveaux visuels
// ============================================================

import type { GenerationParams, PrismOutput } from '../types'

export class PrismGenerator {
  // TODO: Générer depuis un prompt
  async generateFromPrompt(_params: GenerationParams): Promise<PrismOutput | null> {
    return null
  }

  // TODO: Générer des variations
  async generateVariations(_input: unknown, _count: number): Promise<PrismOutput[]> {
    return []
  }

  // TODO: Inpainting / édition partielle
  async inpaint(_input: unknown, _mask: unknown, _prompt: string): Promise<PrismOutput | null> {
    return null
  }
}

export const prismGenerator = new PrismGenerator()
export default PrismGenerator