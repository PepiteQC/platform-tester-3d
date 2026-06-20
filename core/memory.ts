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

export class Memory {
  private store: Map<string, MemoryEntry> = new Map()

  set<T = unknown>(key: string, value: T, options?: { source?: string; ttl?: number; tags?: string[] }): void {
    const now = Date.now()
    const existing = this.store.get(key)
    this.store.set(key, {
      key,
      value,
      source: options?.source || 'unknown',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      ttl: options?.ttl,
      tags: options?.tags || []
    })
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
      this.store.delete(key)
      return false
    }
    return true
  }

  delete(key: string): void { this.store.delete(key) }

  query(query: MemoryQuery): MemoryEntry[] {
    const now = Date.now()
    let results: MemoryEntry[] = []
    this.store.forEach(entry => {
      if (entry.ttl && now > entry.createdAt + entry.ttl) return
      if (query.tag && !entry.tags.includes(query.tag)) return
      if (query.source && entry.source !== query.source) return
      if (query.before && entry.updatedAt >= query.before) return
      if (query.after && entry.updatedAt <= query.after) return
      results.push(entry)
    })
    results.sort((a, b) => b.updatedAt - a.updatedAt)
    if (query.limit) results = results.slice(0, query.limit)
    return results
  }

  cleanup(): number {
    const now = Date.now()
    let removed = 0
    this.store.forEach((entry, key) => {
      if (entry.ttl && now > entry.createdAt + entry.ttl) {
        this.store.delete(key)
        removed++
      }
    })
    return removed
  }

  snapshot(): Record<string, unknown> {
    const snap: Record<string, unknown> = {}
    this.store.forEach((entry, key) => { snap[key] = entry.value })
    return snap
  }

  restore(snap: Record<string, unknown>, source = 'restore'): void {
    Object.entries(snap).forEach(([key, value]) => {
      this.set(key, value, { source })
    })
  }

  clear(): void { this.store.clear() }

  size(): number { return this.store.size }
}

export const memory = new Memory()
export default Memory
