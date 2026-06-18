// ============================================================
// 🧬 SELF MUTATION — Mutation consciente
// ============================================================

import { NeuralSeed } from '../genesis/NeuralSeed.js'
import type { FitnessResult, MutationResult, BrainConfig } from '../types/index.js'

const MUTATION_STRATEGIES: Record<string, (val: number, rate: number) => number> = {
  boost:     (v, r) => Math.min(1, v * (1 + r)),
  slight:    (v, r) => Math.min(1, v + r * 0.5),
  random:    (v, r) => Math.min(1, Math.max(0, v + (Math.random() - 0.5) * r)),
  reset:     (_v, _r) => 0.5 + Math.random() * 0.5,
}

export class SelfMutation {

  mutate(seed: NeuralSeed, fitness: FitnessResult): MutationResult {
    const mutations: string[] = []
    const config: Partial<BrainConfig> = {}
    let totalDelta = 0

    // Corriger les faiblesses
    for (const weakness of fitness.weaknesses) {
      switch (weakness) {
        case 'iq':
          config.intelligence = MUTATION_STRATEGIES.boost(seed.intelligence, 0.20)
          mutations.push(`intelligence ↑ ${(config.intelligence - seed.intelligence).toFixed(2)}`)
          totalDelta += config.intelligence - seed.intelligence
          break

        case 'creativity':
          config.creativity = MUTATION_STRATEGIES.boost(seed.creativity, 0.25)
          mutations.push(`creativity ↑ ${(config.creativity - seed.creativity).toFixed(2)}`)
          totalDelta += config.creativity - seed.creativity
          break

        case 'memory':
          config.memory = MUTATION_STRATEGIES.boost(seed.memory, 0.22)
          mutations.push(`memory ↑ ${(config.memory - seed.memory).toFixed(2)}`)
          totalDelta += config.memory - seed.memory
          break

        case 'speed':
          config.intelligence = MUTATION_STRATEGIES.slight(seed.intelligence, 0.15)
          mutations.push('speed optimization')
          break

        case 'adaptability':
          config.learningRate = MUTATION_STRATEGIES.boost(seed.learningRate, 0.30)
          mutations.push(`learningRate ↑`)
          break

        case 'patterns':
          config.learningRate = MUTATION_STRATEGIES.boost(seed.learningRate, 0.20)
          mutations.push('pattern recognition enhanced')
          break
      }
    }

    // Préserver les forces
    for (const strength of fitness.strengths) {
      switch (strength) {
        case 'iq':
          config.intelligence = config.intelligence ?? seed.intelligence
          mutations.push('intelligence preserved')
          break
        case 'creativity':
          config.creativity = config.creativity ?? seed.creativity
          break
      }
    }

    // Mutation aléatoire pour la diversité génétique
    if (Math.random() < seed.mutationRate) {
      const trait  = (['intelligence', 'creativity', 'memory', 'learningRate'] as const)[
        Math.floor(Math.random() * 4)
      ]
      const strategy = Math.random() > 0.7 ? 'random' : 'slight'
      const current  = seed[trait]
      const mutated  = MUTATION_STRATEGIES[strategy](current, 0.15)

      config[trait] = mutated
      mutations.push(`random mutation: ${trait} ${strategy}`)
      totalDelta += Math.abs(mutated - current)
    }

    // Hériter la spécialisation (avec chance de changement)
    config.specialization = Math.random() > 0.9
      ? NeuralSeed.random().specialization
      : seed.specialization

    config.mutationRate = Math.max(0.02, seed.mutationRate * (1 + (Math.random() - 0.6) * 0.2))

    return {
      config,
      mutations,
      delta: totalDelta,
    }
  }
}