import { logger } from '../utils/logger.mjs'

/**
 * Store en mémoire pour les jobs de mutation
 * En production: remplacer par Redis ou une base de données
 */
class InMemoryJobStore {
  constructor(options = {}) {
    this._jobs = new Map()

    this._ttlMs = options.ttlMs ?? 2 * 60 * 60 * 1000

    this._cleanupInterval = setInterval(
      () => this._cleanup(),
      options.cleanupIntervalMs ?? 15 * 60 * 1000
    )

    this._cleanupInterval.unref?.()
  }

  register(jobId, meta = {}) {
    if (this._jobs.has(jobId)) {
      throw new Error(`Job déjà enregistré: ${jobId}`)
    }

    this._jobs.set(jobId, {
      jobId,
      ...meta,
      registeredAt: Date.now(),
    })

    logger.debug('Job enregistré', { jobId })
    return jobId
  }

  update(jobId, updates = {}) {
    const existing = this._jobs.get(jobId)

    if (!existing) {
      logger.warn('Tentative de mise à jour d\'un job inconnu', { jobId })
      return false
    }

    this._jobs.set(jobId, {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    })

    return true
  }

  get(jobId) {
    return this._jobs.get(jobId) ?? null
  }

  has(jobId) {
    return this._jobs.has(jobId)
  }

  list() {
    return Array.from(this._jobs.values())
  }

  delete(jobId) {
    return this._jobs.delete(jobId)
  }

  _cleanup() {
    const now     = Date.now()
    let   deleted = 0

    for (const [id, job] of this._jobs) {
      const age = now - (job.registeredAt ?? 0)

      if (age > this._ttlMs) {
        this._jobs.delete(id)
        deleted++
      }
    }

    if (deleted > 0) {
      logger.info('Nettoyage JobStore', { deleted, remaining: this._jobs.size })
    }
  }

  dispose() {
    clearInterval(this._cleanupInterval)
    this._jobs.clear()
  }
}

export const JobStore = new InMemoryJobStore()
export default JobStore