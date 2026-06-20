// ============================================================
// 🌱 NEURAL SEED — La graine d'intelligence
// ============================================================

import type { NeuralSeedData, BrainSpecialization } from '../types/index.js'

export class NeuralSeed implements NeuralSeedData {
  intelligence:   number
  creativity:     number
  memory:         number
  learningRate:   number
  mutationRate:   number
  specialization: BrainSpecialization

  // Traits dérivés
  readonly adaptiveCapacity: number
  readonly processingSpeed:  number
  readonly memoryDepth:      number

  constructor(data: NeuralSeedData) {
    this.intelligence   = Math.max(0, Math.min(1, data.intelligence))
    this.creativity     = Math.max(0, Math.min(1, data.creativity))
    this.memory         = Math.max(0, Math.min(1, data.memory))
    this.learningRate   = Math.max(0, Math.min(1, data.learningRate))
    this.mutationRate   = Math.max(0, Math.min(1, data.mutationRate))
    this.specialization = data.specialization

    // Calculer les traits dérivés
    this.adaptiveCapacity = (this.intelligence + this.learningRate) / 2
    this.processingSpeed  = this.intelligence * 0.7 + this.creativity * 0.3
    this.memoryDepth      = this.memory * 0.8 + this.intelligence * 0.2
  }

  // ──────────────────────────────────────────────
  // SÉRIALISATION
  // ──────────────────────────────────────────────
  toData(): NeuralSeedData {
    return {
      intelligence:   this.intelligence,
      creativity:     this.creativity,
      memory:         this.memory,
      learningRate:   this.learningRate,
      mutationRate:   this.mutationRate,
      specialization: this.specialization,
    }
  }

  // ──────────────────────────────────────────────
  // COMPATIBILITÉ AVEC UNE AUTRE GRAINE
  // ──────────────────────────────────────────────
  compatibilityWith(other: NeuralSeed): number {
    const diff =
      Math.abs(this.intelligence - other.intelligence) * 0.3 +
      Math.abs(this.creativity   - other.creativity)   * 0.3 +
      Math.abs(this.memory       - other.memory)        * 0.2 +
      Math.abs(this.learningRate - other.learningRate)  * 0.2

    return 1 - diff // 1 = parfait, 0 = incompatible
  }

  // ──────────────────────────────────────────────
  // RÉSUMÉ
  // ──────────────────────────────────────────────
  toString(): string {
    return [
      `[${this.specialization}]`,
      `IQ: ${(this.intelligence * 100).toFixed(0)}`,
      `CRE: ${(this.creativity * 100).toFixed(0)}`,
      `MEM: ${(this.memory * 100).toFixed(0)}`,
      `LR: ${(this.learningRate * 100).toFixed(0)}`,
    ].join(' | ')
  }

  // ──────────────────────────────────────────────
  // GRAINE ALÉATOIRE
  // ──────────────────────────────────────────────
  static random(specialization?: BrainSpecialization): NeuralSeed {
    const specs: BrainSpecialization[] = [
      'general', 'analytical', 'creative', 'logical',
      'intuitive', 'tactical', 'empathic', 'mathematical',
    ]
    return new NeuralSeed({
      intelligence:   0.3 + Math.random() * 0.7,
      creativity:     0.2 + Math.random() * 0.8,
      memory:         0.3 + Math.random() * 0.7,
      learningRate:   0.2 + Math.random() * 0.8,
      mutationRate:   0.05 + Math.random() * 0.25,
      specialization: specialization ?? specs[Math.floor(Math.random() * specs.length)],
    })
  }
}