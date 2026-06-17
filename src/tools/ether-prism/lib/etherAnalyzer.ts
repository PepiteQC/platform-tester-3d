// ============================================================
//  etherAnalyzer — Œil de TroxT
//  Analyse les images et extrait les données visuelles
// ============================================================

import type { PrismInput, AnalysisResult } from '../types'

export class EtherAnalyzer {
  // TODO: Analyser les couleurs dominantes
  async extractColors(_input: PrismInput): Promise<string[]> {
    return []
  }

  // TODO: Détecter les dimensions et format
  async detectFormat(_input: PrismInput): Promise<{ width: number; height: number; format: string }> {
    return { width: 0, height: 0, format: 'unknown' }
  }

  // TODO: Générer des tags automatiques
  async generateTags(_input: PrismInput): Promise<string[]> {
    return []
  }

  // TODO: Analyse complète
  async analyze(_input: PrismInput): Promise<AnalysisResult | null> {
    return null
  }
}

export const etherAnalyzer = new EtherAnalyzer()
export default EtherAnalyzer