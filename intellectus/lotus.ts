import { Awaitable, Clock, createId, safeStructuredClone, systemClock, toError } from './types'

export interface LotusEntry<T = unknown> {
  key: string
  value: T
  source: string
  tags: string[]
  version: number
  createdAt: number
  updatedAt: number
  lastAccessedAt: number
  accessCount: number
  ttl?: number
  expiresAt?: number
  metadata: Record<string, unknown>
}

export interface LotusSetOptions {
  source?: string
  tags?: string[]
  ttl?: number
  metadata?: Record<string, unknown>
  expectedVersion?: number
}

export interface LotusQuery {
  keyPrefix?: string
  tag?: string
  tags?: string[]
  matchAllTags?: boolean
  source?: string
  before?: number
  after?: number
  includeExpired?: boolean
  limit?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount' | 'key'
  direction?: 'asc' | 'desc'
}

export interface LotusSnapshot {
  version: 1
  createdAt: number
  entries: LotusEntry[]
}

export interface LotusPersistenceAdapter {
  load(): Awaitable<LotusSnapshot | null>
  save(snapshot: LotusSnapshot): Awaitable<void>
  clear?(): Awaitable<void>
}

export type LotusListener = (change: LotusChange) => void

export type LotusChange =
  | { type: 'set'; key: string; entry: LotusEntry; previous: LotusEntry | null }
  | { type: 'delete'; key: string; previous: LotusEntry }
  | { type: 'clear'; keys: string[] }
  | { type: 'restore'; keys: string[] }
  | { type: 'expire'; key: string; previous: LotusEntry }
  | { type: 'evict'; key: string; previous: LotusEntry }

export interface LotusTransaction {
  get<T = unknown>(key: string): T | null
  set<T = unknown>(key: string, value: T, options?: LotusSetOptions): LotusEntry<T>
  delete(key: string): boolean
  has(key: string): boolean
}

export interface LotusMetrics {
  size: number
  hits: number
  misses: number
  writes: number
  deletes: number
  expirations: number
  evictions: number
}

export class Lotus {
  private readonly store = new Map<string, LotusEntry>()
  private readonly listeners = new Set<LotusListener>()
  private readonly keyListeners = new Map<string, Set<LotusListener>>()
  private readonly clock: Clock
  private readonly maxEntries: number
  private readonly defaultSource: string
  private readonly persistence?: LotusPersistenceAdapter
  private persistTimer?: ReturnType<typeof setTimeout>
  private cleanupTimer?: ReturnType<typeof setInterval>
  private readonly cleanupIntervalMs: number
  private transactionDepth = 0
  private pendingChanges: LotusChange[] = []
  private counters = {
    hits: 0,
    misses: 0,
    writes: 0,
    deletes: 0,
    expirations: 0,
    evictions: 0,
  }

  constructor(options: {
    maxEntries?: number
    defaultSource?: string
    clock?: Clock
    persistence?: LotusPersistenceAdapter
    cleanupIntervalMs?: number
  } = {}) {
    this.maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 2_000))
    this.defaultSource = options.defaultSource ?? 'lotus'
    this.clock = options.clock ?? systemClock
    this.persistence = options.persistence
    this.cleanupIntervalMs = Math.max(1_000, Math.floor(options.cleanupIntervalMs ?? 30_000))
  }

  async hydrate(): Promise<number> {
    if (!this.persistence) return 0
    const snapshot = await this.persistence.load()
    if (!snapshot) return 0
    return this.restore(snapshot, { replace: true })
  }

  startCleanup(intervalMs = this.cleanupIntervalMs): void {
    if (this.cleanupTimer !== undefined) return
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.max(1_000, intervalMs))
  }

  stopCleanup(): void {
    if (this.cleanupTimer === undefined) return
    clearInterval(this.cleanupTimer)
    this.cleanupTimer = undefined
  }

  set<T = unknown>(key: string, value: T, options: LotusSetOptions = {}): LotusEntry<T> {
    assertKey(key)
    const now = this.clock.now()
    const previous = this.store.get(key) ?? null

    if (options.expectedVersion !== undefined && previous?.version !== options.expectedVersion) {
      throw new Error(
        `Lotus compare-and-swap échoué pour ${key}: version attendue ${options.expectedVersion}, version actuelle ${previous?.version ?? 0}.`,
      )
    }

    const ttl = options.ttl !== undefined ? Math.max(0, options.ttl) : previous?.ttl
    const entry: LotusEntry<T> = {
      key,
      value: safeStructuredClone(value),
      source: options.source ?? previous?.source ?? this.defaultSource,
      tags: uniqueStrings(options.tags ?? previous?.tags ?? []),
      version: (previous?.version ?? 0) + 1,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: previous?.accessCount ?? 0,
      ttl,
      expiresAt: ttl === undefined ? undefined : now + ttl,
      metadata: { ...(previous?.metadata ?? {}), ...(options.metadata ?? {}) },
    }

    this.store.set(key, entry)
    this.counters.writes += 1
    this.queueChange({ type: 'set', key, entry: cloneEntry(entry), previous: previous ? cloneEntry(previous) : null })
    this.evictIfNeeded()
    this.schedulePersist()
    return cloneEntry(entry)
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.getEntry<T>(key)
    return entry ? safeStructuredClone(entry.value) : null
  }

  getEntry<T = unknown>(key: string): LotusEntry<T> | null {
    const entry = this.store.get(key) as LotusEntry<T> | undefined
    if (!entry) {
      this.counters.misses += 1
      return null
    }
    if (this.isExpired(entry)) {
      this.expire(key, entry)
      this.counters.misses += 1
      return null
    }

    entry.lastAccessedAt = this.clock.now()
    entry.accessCount += 1
    this.counters.hits += 1
    return cloneEntry(entry)
  }

  peek<T = unknown>(key: string): T | null {
    const entry = this.store.get(key) as LotusEntry<T> | undefined
    if (!entry || this.isExpired(entry)) return null
    return safeStructuredClone(entry.value)
  }

  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.expire(key, entry)
      return false
    }
    return true
  }

  update<T = unknown>(
    key: string,
    updater: (current: T | null) => T,
    options: LotusSetOptions = {},
  ): LotusEntry<T> {
    const current = this.get<T>(key)
    return this.set(key, updater(current), options)
  }

  compareAndSwap<T = unknown>(
    key: string,
    expectedVersion: number,
    value: T,
    options: Omit<LotusSetOptions, 'expectedVersion'> = {},
  ): LotusEntry<T> {
    return this.set(key, value, { ...options, expectedVersion })
  }

  delete(key: string): boolean {
    const previous = this.store.get(key)
    if (!previous) return false
    this.store.delete(key)
    this.counters.deletes += 1
    this.queueChange({ type: 'delete', key, previous: cloneEntry(previous) })
    this.schedulePersist()
    return true
  }

  query(query: LotusQuery = {}): LotusEntry[] {
    const now = this.clock.now()
    const requestedTags = uniqueStrings(query.tags ?? (query.tag ? [query.tag] : []))

    const entries = [...this.store.values()].filter(entry => {
      const expired = entry.expiresAt !== undefined && entry.expiresAt <= now
      if (expired && !query.includeExpired) return false
      if (query.keyPrefix !== undefined && !entry.key.startsWith(query.keyPrefix)) return false
      if (query.source !== undefined && entry.source !== query.source) return false
      if (query.before !== undefined && entry.updatedAt >= query.before) return false
      if (query.after !== undefined && entry.updatedAt <= query.after) return false
      if (requestedTags.length > 0) {
        return query.matchAllTags
          ? requestedTags.every(tag => entry.tags.includes(tag))
          : requestedTags.some(tag => entry.tags.includes(tag))
      }
      return true
    })

    const orderBy = query.orderBy ?? 'updatedAt'
    const direction = query.direction ?? 'desc'
    entries.sort((a, b) => compareEntries(a, b, orderBy) * (direction === 'asc' ? 1 : -1))

    return entries
      .slice(0, Math.max(0, query.limit ?? entries.length))
      .map(cloneEntry)
  }

  cleanup(): number {
    const now = this.clock.now()
    let removed = 0
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        this.expire(key, entry)
        removed += 1
      }
    }
    if (removed > 0) this.schedulePersist()
    return removed
  }

  snapshot(): LotusSnapshot {
    this.cleanup()
    return {
      version: 1,
      createdAt: this.clock.now(),
      entries: [...this.store.values()].map(cloneEntry),
    }
  }

  snapshotValues(): Record<string, unknown> {
    this.cleanup()
    const values: Record<string, unknown> = {}
    for (const [key, entry] of this.store) values[key] = safeStructuredClone(entry.value)
    return values
  }

  restore(
    snapshot: LotusSnapshot | Record<string, unknown>,
    options: { replace?: boolean; source?: string } = {},
  ): number {
    const replace = options.replace ?? false
    const now = this.clock.now()
    const entries: LotusEntry[] = isLotusSnapshot(snapshot)
      ? snapshot.entries
      : Object.entries(snapshot).map(([key, value]) => ({
          key,
          value,
          source: options.source ?? 'restore',
          tags: ['restore'],
          version: 1,
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
          accessCount: 0,
          metadata: {},
        }))

    if (replace) this.store.clear()

    let restored = 0
    for (const raw of entries) {
      if (!raw || typeof raw.key !== 'string' || !raw.key.trim()) continue
      if (raw.expiresAt !== undefined && raw.expiresAt <= now) continue
      const entry: LotusEntry = {
        ...raw,
        value: safeStructuredClone(raw.value),
        source: raw.source || options.source || 'restore',
        tags: uniqueStrings(raw.tags ?? []),
        version: Math.max(1, raw.version ?? 1),
        createdAt: raw.createdAt ?? now,
        updatedAt: raw.updatedAt ?? now,
        lastAccessedAt: raw.lastAccessedAt ?? now,
        accessCount: Math.max(0, raw.accessCount ?? 0),
        metadata: { ...(raw.metadata ?? {}) },
      }
      this.store.set(entry.key, entry)
      restored += 1
    }

    this.evictIfNeeded()
    this.queueChange({ type: 'restore', keys: entries.map(entry => entry.key) })
    this.schedulePersist()
    return restored
  }

  async transaction<T>(work: (tx: LotusTransaction) => Awaitable<T>): Promise<T> {
    const backup = new Map<string, LotusEntry>()
    this.store.forEach((entry, key) => backup.set(key, cloneEntry(entry)))
    const previousChanges = this.pendingChanges
    this.pendingChanges = []
    this.transactionDepth += 1

    const tx: LotusTransaction = {
      get: key => this.get(key),
      set: (key, value, options) => this.set(key, value, options),
      delete: key => this.delete(key),
      has: key => this.has(key),
    }

    try {
      const result = await work(tx)
      this.transactionDepth -= 1
      const committedChanges = this.pendingChanges
      this.pendingChanges = previousChanges
      for (const change of committedChanges) this.queueChange(change)
      this.schedulePersist()
      return result
    } catch (error) {
      this.store.clear()
      backup.forEach((entry, key) => this.store.set(key, entry))
      this.transactionDepth -= 1
      this.pendingChanges = previousChanges
      throw toError(error)
    }
  }

  subscribe(listener: LotusListener, key?: string): () => void {
    if (key === undefined) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    }

    const bucket = this.keyListeners.get(key) ?? new Set<LotusListener>()
    bucket.add(listener)
    this.keyListeners.set(key, bucket)
    return () => {
      bucket.delete(listener)
      if (bucket.size === 0) this.keyListeners.delete(key)
    }
  }

  clear(): void {
    const keys = [...this.store.keys()]
    if (keys.length === 0) return
    this.store.clear()
    this.queueChange({ type: 'clear', keys })
    this.schedulePersist()
  }

  keys(): string[] {
    this.cleanup()
    return [...this.store.keys()].sort()
  }

  size(): number {
    this.cleanup()
    return this.store.size
  }

  getMetrics(): LotusMetrics {
    return { size: this.store.size, ...this.counters }
  }

  async flushPersistence(): Promise<void> {
    if (!this.persistence) return
    if (this.persistTimer !== undefined) {
      this.clock.clearTimeout(this.persistTimer)
      this.persistTimer = undefined
    }
    await this.persistence.save(this.snapshot())
  }

  private isExpired(entry: LotusEntry): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= this.clock.now()
  }

  private expire(key: string, entry: LotusEntry): void {
    this.store.delete(key)
    this.counters.expirations += 1
    this.queueChange({ type: 'expire', key, previous: cloneEntry(entry) })
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxEntries) {
      const candidate = [...this.store.values()].sort((a, b) =>
        a.lastAccessedAt - b.lastAccessedAt
        || a.accessCount - b.accessCount
        || a.updatedAt - b.updatedAt,
      )[0]
      if (!candidate) return
      this.store.delete(candidate.key)
      this.counters.evictions += 1
      this.queueChange({ type: 'evict', key: candidate.key, previous: cloneEntry(candidate) })
    }
  }

  private queueChange(change: LotusChange): void {
    if (this.transactionDepth > 0) {
      this.pendingChanges.push(change)
      return
    }
    this.notify(change)
  }

  private notify(change: LotusChange): void {
    this.listeners.forEach(listener => safeNotify(listener, change))
    const key = 'key' in change ? change.key : undefined
    if (key) this.keyListeners.get(key)?.forEach(listener => safeNotify(listener, change))
  }

  private schedulePersist(): void {
    if (!this.persistence || this.transactionDepth > 0) return
    if (this.persistTimer !== undefined) this.clock.clearTimeout(this.persistTimer)
    this.persistTimer = this.clock.setTimeout(() => {
      this.persistTimer = undefined
      void Promise.resolve(this.persistence?.save(this.snapshot())).catch((error: unknown) => {
        if (typeof console !== 'undefined') console.error('[Lotus] persistence failed', error)
      })
    }, 50)
  }
}

export class LocalStorageLotusAdapter implements LotusPersistenceAdapter {
  constructor(
    private readonly key = 'etherworld.intellectus.lotus',
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null =
      typeof localStorage === 'undefined' ? null : localStorage,
  ) {}

  load(): LotusSnapshot | null {
    const raw = this.storage?.getItem(this.key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return isLotusSnapshot(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  save(snapshot: LotusSnapshot): void {
    this.storage?.setItem(this.key, JSON.stringify(snapshot))
  }

  clear(): void {
    this.storage?.removeItem(this.key)
  }
}

function assertKey(key: string): void {
  if (!key.trim()) throw new Error('Lotus: la clé ne peut pas être vide.')
  if (key.length > 512) throw new Error('Lotus: la clé dépasse 512 caractères.')
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort()
}

function cloneEntry<T>(entry: LotusEntry<T>): LotusEntry<T> {
  return {
    ...entry,
    value: safeStructuredClone(entry.value),
    tags: [...entry.tags],
    metadata: { ...entry.metadata },
  }
}

function compareEntries(a: LotusEntry, b: LotusEntry, field: NonNullable<LotusQuery['orderBy']>): number {
  if (field === 'key') return a.key.localeCompare(b.key)
  return Number(a[field]) - Number(b[field])
}

function safeNotify(listener: LotusListener, change: LotusChange): void {
  try {
    listener(change)
  } catch (error) {
    if (typeof console !== 'undefined') console.error('[Lotus] listener failed', error)
  }
}

function isLotusSnapshot(value: unknown): value is LotusSnapshot {
  return Boolean(
    value
    && typeof value === 'object'
    && (value as { version?: unknown }).version === 1
    && Array.isArray((value as { entries?: unknown }).entries),
  )
}

export const lotus = new Lotus()
