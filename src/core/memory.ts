// ============================================================
//  Memory — Mémoire partagée TroxT
//  Stockage global accessible par tous les modules
// ============================================================

export interface MemoryEntry<T = unknown> {
  key: string
  value: T
  source: string
  createdAt: number
  updatedAt: number
  ttl?: number
  tags: string[]
}

export interface MemoryQuery {
  tag?: string
  source?: string
  before?: number
  after?: number
  limit?: number
}

// ─── Memory Store ────────────────────────────────────────────
export class Memory {
  private store: Map<string, MemoryEntry> = new Map()

  // TODO: Écrire en mémoire
  set<T = unknown>(
    _key: string,
    _value: T,
    _options?: { source?: string; ttl?: number; tags?: string[] }
  ): void {}

  // TODO: Lire depuis la mémoire
  get<T = unknown>(_key: string): T | null {
    const entry = this.store.get(_key)
    if (!entry) return null
    // TODO: Vérifier le TTL
    return entry.value as T
  }

  // TODO: Vérifier l'existence
  has(_key: string): boolean {
    return this.store.has(_key)
  }

  // TODO: Supprimer une entrée
  delete(_key: string): void {
    this.store.delete(_key)
  }

  // TODO: Requête par tags / source
  query(_query: MemoryQuery): MemoryEntry[] {
    return []
  }

  // TODO: Nettoyage des TTL expirés
  cleanup(): number {
    let removed = 0
    // TODO: Implémenter
    return removed
  }

  // TODO: Snapshot de la mémoire
  snapshot(): Record<string, unknown> {
    const snap: Record<string, unknown> = {}
    this.store.forEach((entry, key) => {
      snap[key] = entry.value
    })
    return snap
  }

  // TODO: Restaurer depuis un snapshot
  restore(_snap: Record<string, unknown>, _source = 'restore'): void {}

  // TODO: Effacer toute la mémoire
  clear(): void {
    this.store.clear()
  }

  // TODO: Taille actuelle
  size(): number {
    return this.store.size
  }

  // TODO: Toutes les clés
  keys(): string[] {
    return Array.from(this.store.keys())
  }
}

export const memory = new Memory()
export default Memory