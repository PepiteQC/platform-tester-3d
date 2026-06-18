// ============================================================
// 📊 LEARNING MATRIX — Matrice d'apprentissage
// ============================================================

import type { NeuralPattern, Memory } from '../types/index.js'

interface LearningEntry {
  pattern:    NeuralPattern
  weight:     number
  count:      number
  lastSeen:   number
  reinforced: number
}

interface LearningResult {
  delta:       number
  newPatterns: boolean
  reinforced:  boolean
}

export class LearningMatrix {
  private matrix:       Map<string, LearningEntry> = new Map()
  private learningRate: number = 0.1
  private totalLearned  = 0

  constructor(learningRate = 0.1) {
    this.learningRate = learningRate
  }

  // ──────────────────────────────────────────────
  // APPRENDRE
  // ──────────────────────────────────────────────
  learn(pattern: NeuralPattern, memories: Memory[]): LearningResult {
    const key       = this.buildKey(pattern)
    const existing  = this.matrix.get(key)
    let   delta     = 0
    let   isNew     = false
    let   reinforced = false

    if (existing) {
      // Renforcement — le pattern est déjà connu
      const oldWeight    = existing.weight
      existing.weight    = Math.min(1, existing.weight + this.learningRate * pattern.confidence)
      existing.count++
      existing.lastSeen  = Date.now()
      existing.reinforced++

      delta     = existing.weight - oldWeight
      reinforced = true
    } else {
      // Nouveau pattern
      const entry: LearningEntry = {
        pattern,
        weight:     this.learningRate * pattern.confidence,
        count:      1,
        lastSeen:   Date.now(),
        reinforced: 0,
      }
      this.matrix.set(key, entry)
      delta  = entry.weight
      isNew  = true
      this.totalLearned++
    }

    // Bonus si les mémoires confirment ce pattern
    if (memories.length > 0) {
      const memBonus = Math.min(0.1, memories.length * 0.02)
      const entry    = this.matrix.get(key)
      if (entry) entry.weight = Math.min(1, entry.weight + memBonus)
      delta += memBonus
    }

    return {
      delta,
      newPatterns: isNew,
      reinforced,
    }
  }

  // ──────────────────────────────────────────────
  // HÉRITAGE
  // ──────────────────────────────────────────────
  inheritFrom(other: LearningMatrix, ratio: number): void {
    const entries = [...other.matrix.entries()]
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, Math.floor(other.matrix.size * ratio))

    for (const [key, entry] of entries) {
      if (!this.matrix.has(key)) {
        this.matrix.set(key, {
          ...entry,
          weight:     entry.weight * 0.75,
          count:      Math.floor(entry.count * 0.5),
          reinforced: 0,
        })
      }
    }
  }

  // ──────────────────────────────────────────────
  // CLÉ D'UN PATTERN
  // ──────────────────────────────────────────────
  private buildKey(pattern: NeuralPattern): string {
    return pattern.uniqueTokens.sort().slice(0, 8).join('|')
  }

  // ──────────────────────────────────────────────
  // UTILS
  // ──────────────────────────────────────────────
  size():           number           { return this.matrix.size }
  getTotalLearned(): number          { return this.totalLearned }
  clear():          void             { this.matrix.clear() }

  dump(): NeuralPattern[] {
    return [...this.matrix.values()].map(e => e.pattern)
  }

  import(patterns: NeuralPattern[]): void {
    for (const pattern of patterns) {
      const key = this.buildKey(pattern)
      if (!this.matrix.has(key)) {
        this.matrix.set(key, {
          pattern,
          weight:     0.3,
          count:      1,
          lastSeen:   Date.now(),
          reinforced: 0,
        })
      }
    }
  }

  getTopPatterns(n = 10): LearningEntry[] {
    return [...this.matrix.values()]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n)
  }

  getStats() {
    const entries = [...this.matrix.values()]
    const avgWeight = entries.reduce((s, e) => s + e.weight, 0) / (entries.length || 1)
    return {
      total:      this.matrix.size,
      learned:    this.totalLearned,
      avgWeight:  avgWeight.toFixed(3),
      topWeight:  entries.sort((a, b) => b.weight - a.weight)[0]?.weight.toFixed(3) ?? '0',
    }
  }
}