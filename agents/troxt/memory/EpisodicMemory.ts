// ============================================================
//  EPISODICMEMORY.ts — Hippocampe Numérique
//  Mémoire épisodique avec forgetting curve, RAG simulé,
//  et consolidation en souvenirs sémantiques.
// ============================================================

export interface Episode {
  id: string
  type: string
  source: string
  content: string
  timestamp: number
  valence: number   // -1 (négatif) à +1 (positif)
  importance: number // 0-1
  tags?: string[]
  embedding?: number[] // Vecteur simple pour similitude
}

export interface ConsolidatedMemory {
  id: string
  summary: string
  firstSeen: number
  lastRecalled: number
  recallCount: number
  episodes: string[] // IDs
}

export class EpisodicMemory {
  private episodes: Episode[] = []
  private consolidated: ConsolidatedMemory[] = []
  private maxEpisodes = 500

  record(episode: Omit<Episode, 'id' | 'embedding'>): string {
    const id = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const emb = this.simpleEmbedding(episode.content)
    const full: Episode = { ...episode, id, embedding: emb, tags: episode.tags || [episode.type, episode.source] }

    this.episodes.push(full)
    if (this.episodes.length > this.maxEpisodes) {
      this.episodes.shift() // Oublie le plus ancien
    }

    // Auto-consolidation si importance élevée
    if (episode.importance > 0.8) {
      this.consolidate([id])
    }

    return id
  }

  retrieveById(id: string): Episode | undefined {
    return this.episodes.find(e => e.id === id)
  }

  retrieveRelevant(query: string, limit = 5, timeWindowMs?: number): Episode[] {
    const qEmb = this.simpleEmbedding(query)
    const now = Date.now()

    const scored = this.episodes.map(ep => {
      let score = 0

      // Similarité cosinus (simulée)
      if (ep.embedding && qEmb) {
        score += this.cosineSimilarity(ep.embedding, qEmb)
      }

      // Tags overlap
      const qWords = query.toLowerCase().split(/\s+/)
      const epWords = ep.content.toLowerCase().split(/\s+/)
      const overlap = qWords.filter(w => epWords.includes(w)).length
      score += (overlap / qWords.length) * 0.5

      // Temporal decay (récents = mieux)
      const age = now - ep.timestamp
      const recency = timeWindowMs ? (age < timeWindowMs ? 1 : 0) : Math.exp(-age / 86400000)
      score += recency * 0.2

      // Valence boost si query émotionnelle
      if (query.includes('erreur') || query.includes('bug') || query.includes('problème')) {
        if (ep.valence < -0.3) score += 0.15
      }
      if (query.includes('réussite') || query.includes('bravo') || query.includes('merci')) {
        if (ep.valence > 0.3) score += 0.15
      }

      // Importance boost
      score += ep.importance * 0.3

      return { ep, score }
    }).filter(s => s.score > 0.15).sort((a, b) => b.score - a.score)

    return scored.slice(0, limit).map(s => s.ep)
  }

  retrieveByTag(tag: string, limit = 10): Episode[] {
    return this.episodes
      .filter(e => e.tags?.includes(tag))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  forgetOld(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs
    const before = this.episodes.length
    this.episodes = this.episodes.filter(e => e.timestamp > cutoff || e.importance > 0.7)
    return before - this.episodes.length
  }

  consolidate(episodeIds: string[]): ConsolidatedMemory {
    const eps = episodeIds.map(id => this.episodes.find(e => e.id === id)).filter(Boolean) as Episode[]
    const summary = this.summarizeEpisodes(eps)
    const id = `cons_${Date.now()}`
    const cm: ConsolidatedMemory = {
      id,
      summary,
      firstSeen: Math.min(...eps.map(e => e.timestamp)),
      lastRecalled: Date.now(),
      recallCount: 1,
      episodes: episodeIds
    }
    this.consolidated.push(cm)
    return cm
  }

  getConsolidated(): ConsolidatedMemory[] {
    return this.consolidated
  }

  serialize(): { episodes: Episode[]; consolidated: ConsolidatedMemory[] } {
    return { episodes: this.episodes, consolidated: this.consolidated }
  }

  hydrate(data: { episodes: Episode[]; consolidated: ConsolidatedMemory[] }): void {
    this.episodes = data.episodes || []
    this.consolidated = data.consolidated || []
  }

  // ─── Utilitaires internes ─────────────────────────────────
  private simpleEmbedding(text: string): number[] {
    // Hash-based embedding rapide (simulation sans modèle lourd)
    const vec = new Array(64).fill(0)
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    const words = clean.split(/\s+/).filter(w => w.length > 2)
    for (const w of words) {
      for (let i = 0; i < w.length; i++) {
        const idx = (w.charCodeAt(i) + i * 7) % 64
        vec[idx] += (w.charCodeAt(i) % 10) / 10
      }
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
    return vec.map(v => v / norm)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
    return dot // déjà normalisés
  }

  private summarizeEpisodes(eps: Episode[]): string {
    const types = new Set(eps.map(e => e.type))
    const sources = new Set(eps.map(e => e.source))
    const valenceAvg = eps.reduce((s, e) => s + e.valence, 0) / eps.length
    return `Résumé de ${eps.length} épisodes (types: ${Array.from(types).join(',')}, sources: ${Array.from(sources).join(',')}, valence moyenne: ${valenceAvg.toFixed(2)})`
  }
}

export default EpisodicMemory
