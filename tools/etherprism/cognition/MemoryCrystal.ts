// ============================================================
// 💎 MEMORY CRYSTAL — Mémoire cristalline
// ============================================================

import type { Memory, Thought, NeuralPattern } from '../types/index.js'

const CAPACITY         = 10_000
const IMPORTANCE_FLOOR = 0.15
const RECALL_THRESHOLD = 0.25

export class MemoryCrystal {
  private memories:   Memory[] = []
  private index:      Map<string, Memory> = new Map()
  private totalStored = 0

  // ──────────────────────────────────────────────
  // STOCKER UNE PENSÉE
  // ──────────────────────────────────────────────
  store(thought: Thought): void {
    const importance = this.calculateImportance(thought)

    // Ne garder que les mémoires importantes
    if (importance < IMPORTANCE_FLOOR) return

    const memory: Memory = {
      id:          `mem_${Date.now()}_${this.totalStored}`,
      thoughtId:   thought.id,
      pattern:     thought.pattern,
      output:      thought.output,
      timestamp:   thought.timestamp,
      importance,
      accessCount: 0,
      decayRate:   0.001,
    }

    this.memories.push(memory)
    this.index.set(memory.id, memory)
    this.totalStored++

    if (this.memories.length > CAPACITY) {
      this.prune()
    }
  }

  // ──────────────────────────────────────────────
  // RAPPEL
  // ──────────────────────────────────────────────
  recall(pattern: NeuralPattern): Memory[] {
    return this.memories
      .filter(m => {
        const overlap    = m.pattern.uniqueTokens.filter(t =>
          pattern.uniqueTokens.includes(t)
        ).length
        const maxLen     = Math.max(m.pattern.uniqueTokens.length, pattern.uniqueTokens.length)
        const similarity = maxLen > 0 ? overlap / maxLen : 0
        return similarity > RECALL_THRESHOLD
      })
      .sort((a, b) => {
        // Trier par importance × fraîcheur
        const scoreA = a.importance * (1 - (Date.now() - a.timestamp) / 1e9)
        const scoreB = b.importance * (1 - (Date.now() - b.timestamp) / 1e9)
        return scoreB - scoreA
      })
      .slice(0, 10)
      .map(m => { m.accessCount++; return m })
  }

  // ──────────────────────────────────────────────
  // HÉRITAGE
  // ──────────────────────────────────────────────
  inheritFrom(other: MemoryCrystal, ratio: number): void {
    const topMems = [...other.memories]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, Math.floor(other.memories.length * ratio))

    for (const mem of topMems) {
      // Créer une copie avec importance réduite
      const inherited: Memory = {
        ...mem,
        id:         `inh_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        importance: mem.importance * 0.8,
        accessCount: 0,
      }
      this.memories.push(inherited)
      this.index.set(inherited.id, inherited)
    }

    this.prune()
  }

  // ──────────────────────────────────────────────
  // IMPORTANCE
  // ──────────────────────────────────────────────
  private calculateImportance(thought: Thought): number {
    return Math.min(1,
      thought.pattern.confidence * 0.40 +
      Math.min(0.30, thought.pattern.complexity / 10 * 0.30) +
      Math.abs(thought.learningDelta) * 0.20 +
      (thought.memoriesInvolved > 0 ? 0.10 : 0)
    )
  }

  // ──────────────────────────────────────────────
  // ÉLAGAGE — Garde les 80% les plus importants
  // ──────────────────────────────────────────────
  private prune(): void {
    this.memories.sort((a, b) => {
      const scoreA = a.importance + a.accessCount * 0.01
      const scoreB = b.importance + b.accessCount * 0.01
      return scoreB - scoreA
    })
    this.memories = this.memories.slice(0, Math.floor(CAPACITY * 0.80))
    this.index.clear()
    this.memories.forEach(m => this.index.set(m.id, m))
  }

  // ──────────────────────────────────────────────
  // UTILS
  // ──────────────────────────────────────────────
  size():              number    { return this.memories.length }
  dump():              Memory[]  { return [...this.memories]   }
  getTotalStored():    number    { return this.totalStored      }
  clear():             void      { this.memories = []; this.index.clear() }

  import(memories: Memory[]): void {
    this.memories.push(...memories)
    this.prune()
  }

  getTopMemories(n = 10): Memory[] {
    return [...this.memories]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, n)
  }
}