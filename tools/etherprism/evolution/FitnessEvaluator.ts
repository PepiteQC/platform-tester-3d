// ============================================================
// 📈 FITNESS EVALUATOR — Évaluation de performance
// ============================================================

import type { BrainInstance, FitnessResult } from '../types/index.js'

const GRADE_THRESHOLDS = {
  S: 0.90, A: 0.75, B: 0.60, C: 0.45, D: 0.30,
}

export class FitnessEvaluator {

  evaluate(brain: BrainInstance): FitnessResult {
    const m = brain.metrics

    // Scores normalisés (0-1)
    const scores = {
      iq:           Math.min(1, m.iq / 150),
      creativity:   m.creativity,
      memory:       Math.min(1, m.memoriesStored / 500),
      patterns:     Math.min(1, m.patternsLearned / 100),
      thoughts:     Math.min(1, m.thoughtsProcessed / 1000),
      adaptability: m.adaptability,
      speed:        m.processingSpeed,
    }

    // Score global pondéré
    const score =
      scores.iq           * 0.25 +
      scores.creativity   * 0.20 +
      scores.memory       * 0.15 +
      scores.patterns     * 0.15 +
      scores.thoughts     * 0.10 +
      scores.adaptability * 0.10 +
      scores.speed        * 0.05

    // Identifier forces et faiblesses
    const strengths:  string[] = []
    const weaknesses: string[] = []

    for (const [trait, value] of Object.entries(scores)) {
      if (value >= 0.75) strengths.push(trait)
      else if (value < 0.35) weaknesses.push(trait)
    }

    // Grade
    const grade = this.getGrade(score)

    return {
      score,
      strengths,
      weaknesses,
      metrics: scores,
      grade,
    }
  }

  private getGrade(score: number): FitnessResult['grade'] {
    if (score >= GRADE_THRESHOLDS.S) return 'S'
    if (score >= GRADE_THRESHOLDS.A) return 'A'
    if (score >= GRADE_THRESHOLDS.B) return 'B'
    if (score >= GRADE_THRESHOLDS.C) return 'C'
    if (score >= GRADE_THRESHOLDS.D) return 'D'
    return 'F'
  }

  // Comparer deux cerveaux
  compare(a: BrainInstance, b: BrainInstance): number {
    const fa = this.evaluate(a).score
    const fb = this.evaluate(b).score
    return fb - fa // Décroissant
  }

  // Trier une population
  rank(brains: BrainInstance[]): Array<{ brain: BrainInstance; fitness: FitnessResult }> {
    return brains
      .map(brain => ({ brain, fitness: this.evaluate(brain) }))
      .sort((a, b) => b.fitness.score - a.fitness.score)
  }
}