// ============================================================
// 💭 THOUGHT ENGINE — Moteur de pensée
// ============================================================

import type { NeuralPattern } from '../types/index.js'

// Mots à haute valeur sémantique
const HIGH_VALUE_WORDS = new Set([
  'intelligence', 'créativité', 'conscience', 'apprentissage',
  'évolution', 'mémoire', 'pattern', 'système', 'analyse',
  'solution', 'problème', 'stratégie', 'logique', 'intuition',
  'knowledge', 'wisdom', 'understanding', 'reason', 'thought',
  'idea', 'concept', 'theory', 'model', 'architecture',
])

export class ThoughtEngine {
  private patterns:    NeuralPattern[] = []
  private patternMap:  Map<string, NeuralPattern> = new Map()
  private totalProcessed = 0

  // ──────────────────────────────────────────────
  // TRAITER UNE ENTRÉE
  // ──────────────────────────────────────────────
  async process(input: string): Promise<NeuralPattern> {
    const startTime = Date.now()

    // Tokenisation
    const tokens = this.tokenize(input)
    const unique  = [...new Set(tokens)]

    // Analyse sémantique
    const complexity  = this.analyzeComplexity(tokens)
    const confidence  = this.calculateConfidence(unique, tokens)
    const associations = this.findAssociations(unique)

    const pattern: NeuralPattern = {
      id:           `pat_${Date.now()}_${this.totalProcessed}`,
      input,
      tokens,
      uniqueTokens:  unique,
      complexity,
      confidence,
      timestamp:     Date.now(),
      associations,
    }

    this.patterns.push(pattern)
    this.patternMap.set(pattern.id, pattern)
    this.totalProcessed++

    return pattern
  }

  // ──────────────────────────────────────────────
  // TOKENISATION
  // ──────────────────────────────────────────────
  private tokenize(input: string): string[] {
    return input
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëîïôùûüç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  }

  // ──────────────────────────────────────────────
  // ANALYSE DE COMPLEXITÉ
  // ──────────────────────────────────────────────
  private analyzeComplexity(tokens: string[]): number {
    const wordCount    = tokens.length
    const avgLen       = tokens.reduce((s, w) => s + w.length, 0) / (wordCount || 1)
    const uniqueRatio  = new Set(tokens).size / (wordCount || 1)

    return Math.min(10, wordCount * 0.3 + avgLen * 0.5 + uniqueRatio * 5)
  }

  // ──────────────────────────────────────────────
  // CONFIANCE
  // ──────────────────────────────────────────────
  private calculateConfidence(unique: string[], all: string[]): number {
    const uniqueRatio   = unique.length / (all.length || 1)
    const highValueCount = unique.filter(w => HIGH_VALUE_WORDS.has(w)).length
    const lengthBonus   = Math.min(0.2, all.length * 0.01)

    return Math.min(1,
      uniqueRatio  * 0.40 +
      highValueCount * 0.05 +
      lengthBonus  +
      0.20
    )
  }

  // ──────────────────────────────────────────────
  // ASSOCIATIONS — Patterns similaires passés
  // ──────────────────────────────────────────────
  private findAssociations(unique: string[]): string[] {
    const associated: string[] = []

    for (const pattern of this.patterns.slice(-50)) { // Derniers 50
      const overlap = pattern.uniqueTokens.filter(t => unique.includes(t)).length
      const ratio   = overlap / Math.max(unique.length, pattern.uniqueTokens.length)

      if (ratio > 0.3) {
        associated.push(pattern.id)
      }
    }

    return associated.slice(0, 5)
  }

  // ──────────────────────────────────────────────
  // GETTERS
  // ──────────────────────────────────────────────
  getPatterns():        NeuralPattern[]                 { return [...this.patterns] }
  getPattern(id: string): NeuralPattern | undefined     { return this.patternMap.get(id) }
  getTotalProcessed():  number                          { return this.totalProcessed }
  clear():              void                            { this.patterns = []; this.patternMap.clear() }
}