// ============================================================
// 📦 GEOMETRY CACHE — Zéro doublon, zéro gaspillage GPU
// ============================================================

import * as THREE from 'three'
import type { CacheEntry, ForgeGeometry } from '../types/index.js'

class GeometryCache {
  private cache = new Map<string, CacheEntry>()
  private hits = 0
  private misses = 0

  // ──────────────────────────────────────────────
  // CLÉ DE CACHE — Déterministe basée sur le type + params
  // ──────────────────────────────────────────────
  buildKey(geometry: ForgeGeometry): string {
    return `${geometry.type}::${JSON.stringify(
      Object.entries(geometry.params || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    )}`
  }

  // ──────────────────────────────────────────────
  // GET OU CREATE
  // ──────────────────────────────────────────────
  getOrCreate(
    key: string,
    factory: () => THREE.BufferGeometry,
    material: THREE.Material
  ): CacheEntry {
    const existing = this.cache.get(key)

    if (existing) {
      this.hits++
      existing.refCount++
      existing.lastUsed = Date.now()
      return existing
    }

    this.misses++

    const geometry = factory()
    // Optimisation GPU : index + compute normals
    if (!geometry.index) {
      geometry.computeVertexNormals()
    }

    const entry: CacheEntry = {
      geometry,
      material,
      instances: new Map(),
      refCount: 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    }

    this.cache.set(key, entry)
    return entry
  }

  // ──────────────────────────────────────────────
  // RELEASE — Décrémente le refCount
  // ──────────────────────────────────────────────
  release(key: string): void {
    const entry = this.cache.get(key)
    if (!entry) return

    entry.refCount--

    if (entry.refCount <= 0) {
      this.dispose(key)
    }
  }

  // ──────────────────────────────────────────────
  // DISPOSE — Libère la mémoire GPU
  // ──────────────────────────────────────────────
  dispose(key: string): void {
    const entry = this.cache.get(key)
    if (!entry) return

    entry.geometry.dispose()
    entry.material.dispose()
    entry.instances.forEach(mesh => mesh.dispose())
    entry.instances.clear()

    this.cache.delete(key)
  }

  // ──────────────────────────────────────────────
  // PURGE — Nettoie les entrées non utilisées depuis N ms
  // ──────────────────────────────────────────────
  purgeStale(maxAgeMs: number = 60_000): number {
    const now = Date.now()
    let count = 0

    for (const [key, entry] of this.cache) {
      if (entry.refCount <= 0 && now - entry.lastUsed > maxAgeMs) {
        this.dispose(key)
        count++
      }
    }

    return count
  }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────
  getStats() {
    return {
      entries:    this.cache.size,
      hits:       this.hits,
      misses:     this.misses,
      hitRate:    this.hits + this.misses > 0
                    ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%'
                    : '0%',
    }
  }

  clear(): void {
    for (const key of this.cache.keys()) {
      this.dispose(key)
    }
    this.hits = 0
    this.misses = 0
  }
}

export const geometryCache = new GeometryCache()