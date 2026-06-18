// ============================================================
// 🌱 GENERATION BREEDER — Reproduction d'intelligences
// ============================================================

import { NeuralSeed } from '../genesis/NeuralSeed.js'
import type { BrainConfig, BreedingResult, BrainSpecialization } from '../types/index.js'

interface CrossConfig {
  dominance:     number    // 0-1 (0 = parent2 dominant, 1 = parent1 dominant)
  mutationChance: number   // 0-1
  hybridVigor:   boolean   // Bonus enfant > parents
}

export class GenerationBreeder {

  cross(
    seed1:  NeuralSeed,
    seed2:  NeuralSeed,
    config: CrossConfig
  ): BreedingResult {
    const d  = config.dominance
    const mu = config.mutationChance
    const vigor = config.hybridVigor ? 1.08 : 1.0

    // Croisement des traits (dominance + vigor)
    const crossTrait = (a: number, b: number): number =>
      Math.min(1, (a * d + b * (1 - d)) * vigor + (Math.random() - 0.5) * mu * 0.2)

    const intelligence  = crossTrait(seed1.intelligence, seed2.intelligence)
    const creativity    = crossTrait(seed1.creativity,   seed2.creativity)
    const memory        = crossTrait(seed1.memory,       seed2.memory)
    const learningRate  = crossTrait(seed1.learningRate, seed2.learningRate)
    const mutationRate  = (seed1.mutationRate + seed2.mutationRate) / 2

    // Spécialisation : la plus compatible gagne
    const compatibility = seed1.compatibilityWith(seed2)
    const specialization: BrainSpecialization = compatibility > 0.7
      ? seed1.specialization  // Très compatibles → dominant
      : Math.random() > 0.5
        ? seed1.specialization
        : seed2.specialization

    // Traits mélangés (pour rapport)
    const traitsMixed: string[] = []
    if (Math.abs(intelligence - seed1.intelligence) > 0.05)  traitsMixed.push('intelligence')
    if (Math.abs(creativity   - seed1.creativity)   > 0.05)  traitsMixed.push('creativity')
    if (Math.abs(memory       - seed1.memory)       > 0.05)  traitsMixed.push('memory')

    const childConfig: BrainConfig = {
      intelligence,
      creativity,
      memory,
      learningRate,
      mutationRate,
      specialization,
      depth:        Math.max(seed1.adaptiveCapacity, seed2.adaptiveCapacity) > 0.7 ? 6 : 4,
      complexity:   Math.round((seed1.processingSpeed + seed2.processingSpeed) / 2 * 8) + 2,
      adaptability: Math.min(1, (seed1.adaptiveCapacity + seed2.adaptiveCapacity) / 2 * vigor),
    }

    return {
      childConfig,
      dominantParent: d >= 0.5 ? 'parent1' : 'parent2',
      traitsMixed,
      hybridVigor:    config.hybridVigor ? vigor : 1.0,
    }
  }
}