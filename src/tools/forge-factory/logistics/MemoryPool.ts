// ============================================================
// 💾 MEMORY POOL — Gestion mémoire GPU intelligente
// ============================================================

import * as THREE from 'three'
import type { ForgeAsset, PoolConfig, PoolStats } from '../types/index.js'
import { createLogger } from '../utils/Logger.js'

const log = createLogger('MemoryPool')

export class MemoryPool {
  private tracked:   Map<string, ForgeAsset> = new Map()
  private lruOrder:  string[] = []
  private config:    Required<PoolConfig>
  private stats:     PoolStats = {
    allocated: 0, freed: 0,
    current: 0, maxReached: 0, gcRuns: 0,
  }

  constructor(config: PoolConfig) {
    this.config = {
      maxSize:     config.maxSize,
      gcThreshold: config.gcThreshold ?? config.maxSize * 0.85,
      strategy:    config.strategy    ?? 'lru',
    }
  }

  // ──────────────────────────────────────────────
  // TRACK — Enregistre un asset
  // ──────────────────────────────────────────────
  track(asset: ForgeAsset): void {
    this.tracked.set(asset.id, asset)
    this.lruOrder.push(asset.id)
    this.stats.allocated++
    this.stats.current = this.tracked.size
    this.stats.maxReached = Math.max(this.stats.maxReached, this.stats.current)
  }

  // ──────────────────────────────────────────────
  // OPTIMIZE — GC si seuil dépassé
  // ──────────────────────────────────────────────
  async optimize(): Promise<number> {
    const currentSize = this.estimateSize()

    if (currentSize < this.config.gcThreshold) return 0

    this.stats.gcRuns++
    log.info(`GC lancé — Usage: ${(currentSize / 1024 / 1024).toFixed(0)}MB`)

    return this.gc()
  }

  // ──────────────────────────────────────────────
  // GC — Libère les assets LRU
  // ──────────────────────────────────────────────
  private gc(): number {
    const targetFree = Math.floor(this.tracked.size * 0.3)
    let freed = 0

    // Libérer les plus anciens (LRU)
    const toFree = this.lruOrder.splice(0, targetFree)

    for (const id of toFree) {
      const asset = this.tracked.get(id)
      if (asset) {
        this.disposeAsset(asset)
        this.tracked.delete(id)
        this.stats.freed++
        freed++
      }
    }

    this.stats.current = this.tracked.size
    log.success(`GC terminé — ${freed} assets libérés`)

    return freed
  }

  // ──────────────────────────────────────────────
  // DISPOSE — Libère la mémoire GPU
  // ──────────────────────────────────────────────
  private disposeAsset(asset: ForgeAsset): void {
    try {
      asset.geometry?.dispose()

      if (Array.isArray(asset.material)) {
        asset.material.forEach(m => m.dispose())
      } else {
        asset.material?.dispose()
      }

      asset.mesh?.clear()
    } catch (err) {
      log.warn(`Erreur dispose asset ${asset.id}`)
    }
  }

  // ──────────────────────────────────────────────
  // TAILLE ESTIMÉE
  // ──────────────────────────────────────────────
  private estimateSize(): number {
    let total = 0

    for (const asset of this.tracked.values()) {
      const pos = asset.geometry?.attributes?.position
      if (pos) {
        total += pos.array.byteLength
      }
    }

    return total
  }

  // ──────────────────────────────────────────────
  // DISPOSE COMPLET
  // ──────────────────────────────────────────────
  disposeAll(): void {
    for (const asset of this.tracked.values()) {
      this.disposeAsset(asset)
    }
    this.tracked.clear()
    this.lruOrder = []
    this.stats.current = 0
  }

  getStats(): PoolStats    { return { ...this.stats } }
  getSize():  number       { return this.tracked.size }
  has(id: string): boolean { return this.tracked.has(id) }
}