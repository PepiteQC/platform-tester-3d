// ============================================================
// ⚡ BATCH PROCESSOR — Traitement par lots haute performance
// ============================================================

import type { BatchConfig, BatchResult } from '../types/index.js'
import { createLogger } from '../utils/Logger.js'

const log = createLogger('BatchProcessor')

export class BatchProcessor {
  private config: Required<BatchConfig>
  private activeJobs = 0

  constructor(config: BatchConfig) {
    this.config = {
      batchSize:   config.batchSize,
      concurrency: config.concurrency,
      memoryLimit: config.memoryLimit,
      retries:     config.retries  ?? 2,
      timeout:     config.timeout  ?? 30_000,
    }
  }

  // ──────────────────────────────────────────────
  // PROCESS BATCH — Traite un lot avec concurrence
  // ──────────────────────────────────────────────
  async processBatch<T, R>(
    items:    T[],
    handler:  (item: T, index: number) => Promise<R>,
    onProgress?: (done: number, total: number) => void
  ): Promise<BatchResult<R>> {
    const startTime = Date.now()
    const results:  R[]     = []
    const errors:   Error[] = []
    let   processed = 0
    let   failed    = 0

    // Diviser en chunks selon batchSize
    const chunks = this.chunk(items, this.config.batchSize)

    for (const chunk of chunks) {
      // Limiter la concurrence
      const semaphore = new Semaphore(this.config.concurrency)

      const promises = chunk.map((item, i) =>
        semaphore.acquire().then(async release => {
          try {
            const result = await this.withRetry(
              () => handler(item, processed + i),
              this.config.retries
            )
            results.push(result)
            processed++
          } catch (err) {
            errors.push(err as Error)
            failed++
            log.warn(`Échec item ${processed + i}: ${(err as Error).message}`)
          } finally {
            release()
            onProgress?.(processed + failed, items.length)
          }
        })
      )

      await Promise.all(promises)
      processed += chunk.length - failed
    }

    return {
      results,
      errors,
      duration:  Date.now() - startTime,
      processed,
      failed,
    }
  }

  // ──────────────────────────────────────────────
  // PROCESS STREAM — Traite en streaming
  // ──────────────────────────────────────────────
  async *processStream<T, R>(
    items:   T[],
    handler: (item: T, index: number) => Promise<R>
  ): AsyncGenerator<R> {
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const chunk = items.slice(i, i + this.config.batchSize)

      const results = await Promise.allSettled(
        chunk.map((item, j) => handler(item, i + j))
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          yield result.value
        }
      }
    }
  }

  // ──────────────────────────────────────────────
  // RETRY
  // ──────────────────────────────────────────────
  private async withRetry<T>(
    fn:      () => Promise<T>,
    retries: number
  ): Promise<T> {
    let lastError: Error | null = null

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err as Error
        if (i < retries) {
          await this.sleep(100 * Math.pow(2, i)) // Backoff exponentiel
        }
      }
    }

    throw lastError!
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getConfig(): Required<BatchConfig> { return { ...this.config } }
}

// ─────────────────────────────────────────────
// SEMAPHORE — Limite la concurrence
// ─────────────────────────────────────────────
class Semaphore {
  private permits: number
  private queue:   Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  acquire(): Promise<() => void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--
        resolve(() => this.release())
      } else {
        this.queue.push(() => {
          this.permits--
          resolve(() => this.release())
        })
      }
    })
  }

  private release(): void {
    this.permits++
    const next = this.queue.shift()
    if (next) next()
  }
}