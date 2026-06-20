// ============================================================
// 🧠 CONSCIOUSNESS FACTORY — Fabrique de consciences
// ============================================================

import type { ConsciousnessData } from '../types/index.js'
import { NeuralSeed } from './NeuralSeed.js'

interface DevelopConfig {
  depth:        number
  complexity:   number
  adaptability: number
}

export class ConsciousnessFactory {

  async develop(
    seed:   NeuralSeed,
    config: DevelopConfig
  ): Promise<ConsciousnessData> {
    // Simulation du développement de la conscience
    await this.simulateDevelopment(seed)

    const selfAwareness = this.calculateSelfAwareness(seed, config)
    const state         = this.determineState(selfAwareness, seed.intelligence)

    return {
      depth:         Math.min(10, config.depth + Math.floor(seed.intelligence * 3)),
      complexity:    Math.min(10, config.complexity + Math.floor(seed.creativity * 4)),
      adaptability:  Math.min(1, config.adaptability * (1 + seed.learningRate * 0.5)),
      selfAwareness,
      state,
    }
  }

  private async simulateDevelopment(seed: NeuralSeed): Promise<void> {
    // Pause proportionnelle à la complexité (simulation)
    const delay = Math.floor(seed.intelligence * 10)
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  private calculateSelfAwareness(
    seed:   NeuralSeed,
    config: DevelopConfig
  ): number {
    return Math.min(1,
      seed.intelligence   * 0.35 +
      seed.creativity     * 0.20 +
      config.adaptability * 0.25 +
      (config.depth / 10) * 0.20
    )
  }

  private determineState(
    selfAwareness: number,
    intelligence:  number
  ): ConsciousnessData['state'] {
    const score = (selfAwareness + intelligence) / 2

    if (score >= 0.85) return 'transcendent'
    if (score >= 0.55) return 'aware'
    return 'awakening'
  }
}