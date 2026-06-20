import {
  Awaitable,
  Clock,
  Priority,
  PRIORITY_WEIGHT,
  createId,
  systemClock,
  toError,
} from './types'

export interface RetryPolicy {
  attempts: number
  baseDelayMs: number
  maxDelayMs: number
  multiplier: number
  jitter: number
  retryIf?: (error: Error, attempt: number) => boolean
}

export interface MomentusTaskContext {
  id: string
  attempt: number
  signal: AbortSignal
  scheduledAt: number
  startedAt: number
}

export type MomentusTask<T> = (context: MomentusTaskContext) => Awaitable<T>

export type MomentusTaskStatus =
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export interface MomentusScheduleOptions {
  id?: string
  delayMs?: number
  runAt?: number
  priority?: Priority
  timeoutMs?: number
  retry?: Partial<RetryPolicy> | false
  dedupeKey?: string
  replaceExisting?: boolean
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}

export interface MomentusTaskSnapshot {
  id: string
  status: MomentusTaskStatus
  priority: Priority
  scheduledAt: number
  startedAt?: number
  endedAt?: number
  attempts: number
  dedupeKey?: string
  metadata: Record<string, unknown>
  error?: string
}

export interface MomentusHandle<T> {
  id: string
  promise: Promise<T>
  cancel(reason?: unknown): boolean
  getSnapshot(): MomentusTaskSnapshot
}

interface InternalTask<T = unknown> {
  id: string
  task: MomentusTask<T>
  priority: Priority
  scheduledAt: number
  timeoutMs?: number
  retry: RetryPolicy | false
  dedupeKey?: string
  metadata: Record<string, unknown>
  status: MomentusTaskStatus
  attempts: number
  controller: AbortController
  timer?: ReturnType<typeof setTimeout>
  startedAt?: number
  endedAt?: number
  error?: Error
  sequence: number
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
  promise: Promise<T>
  externalAbortCleanup?: () => void
}

export interface MomentusMetrics {
  scheduled: number
  running: number
  succeeded: number
  failed: number
  cancelled: number
  queued: number
}

const DEFAULT_RETRY: RetryPolicy = {
  attempts: 1,
  baseDelayMs: 200,
  maxDelayMs: 10_000,
  multiplier: 2,
  jitter: 0.15,
}

export class Momentus {
  private readonly tasks = new Map<string, InternalTask<any>>()
  private readonly dedupe = new Map<string, string>()
  private readonly queue: InternalTask<any>[] = []
  private readonly concurrency: number
  private readonly clock: Clock
  private runningCount = 0
  private sequence = 0
  private counters = {
    scheduled: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
  }
  private readonly debounceHandles = new Map<string, MomentusHandle<unknown>>()
  private readonly throttleState = new Map<string, { lastRun: number; trailing?: MomentusHandle<unknown> }>()

  constructor(options: { concurrency?: number; clock?: Clock } = {}) {
    this.concurrency = Math.max(1, Math.floor(options.concurrency ?? 4))
    this.clock = options.clock ?? systemClock
  }

  schedule<T>(task: MomentusTask<T>, options: MomentusScheduleOptions = {}): MomentusHandle<T> {
    const id = options.id ?? createId('task')
    if (this.tasks.has(id)) {
      throw new Error(`Momentus: une tâche nommée « ${id} » existe déjà.`)
    }

    if (options.dedupeKey) {
      const existingId = this.dedupe.get(options.dedupeKey)
      const existing = existingId ? this.tasks.get(existingId) : undefined
      if (existing && !isTerminal(existing.status)) {
        if (!options.replaceExisting) {
          return this.createHandle(existing as InternalTask<T>)
        }
        this.cancel(existing.id, new Error(`Tâche remplacée par le dedupeKey ${options.dedupeKey}.`))
      }
    }

    const now = this.clock.now()
    const scheduledAt = options.runAt ?? now + Math.max(0, options.delayMs ?? 0)
    const controller = new AbortController()
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    const internal: InternalTask<T> = {
      id,
      task,
      priority: options.priority ?? 'normal',
      scheduledAt,
      timeoutMs: options.timeoutMs,
      retry: normalizeRetry(options.retry),
      dedupeKey: options.dedupeKey,
      metadata: { ...options.metadata },
      status: 'scheduled',
      attempts: 0,
      controller,
      sequence: this.sequence++,
      resolve,
      reject,
      promise,
    }

    this.tasks.set(id, internal)
    if (options.signal) {
      const onAbort = () => this.cancel(id, options.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
      if (options.signal.aborted) {
        queueMicrotask(onAbort)
      } else {
        options.signal.addEventListener('abort', onAbort, { once: true })
        internal.externalAbortCleanup = () => options.signal?.removeEventListener('abort', onAbort)
      }
    }
    if (internal.dedupeKey) this.dedupe.set(internal.dedupeKey, id)
    this.counters.scheduled += 1

    const delay = Math.max(0, scheduledAt - now)
    if (delay === 0) {
      this.enqueue(internal)
    } else {
      internal.timer = this.clock.setTimeout(() => this.enqueue(internal), delay)
    }

    const handle = this.createHandle(internal)
    // Empêche les rejets non observés lorsque l'appelant conserve seulement le handle.
    void promise.catch(() => undefined)
    return handle
  }

  run<T>(task: MomentusTask<T>, options: Omit<MomentusScheduleOptions, 'runAt' | 'delayMs'> = {}): Promise<T> {
    return this.schedule(task, options).promise
  }

  cancel(id: string, reason: unknown = new DOMException('Cancelled', 'AbortError')): boolean {
    const task = this.tasks.get(id)
    if (!task || isTerminal(task.status)) return false

    task.status = 'cancelled'
    task.endedAt = this.clock.now()
    task.error = toError(reason)
    task.controller.abort(reason)
    if (task.timer !== undefined) this.clock.clearTimeout(task.timer)

    const queueIndex = this.queue.findIndex(entry => entry.id === id)
    if (queueIndex >= 0) this.queue.splice(queueIndex, 1)

    task.reject(reason)
    this.counters.cancelled += 1
    this.releaseDedupe(task)
    this.pump()
    return true
  }

  cancelByDedupeKey(key: string, reason?: unknown): boolean {
    const id = this.dedupe.get(key)
    return id ? this.cancel(id, reason) : false
  }

  getSnapshot(id: string): MomentusTaskSnapshot | null {
    const task = this.tasks.get(id)
    return task ? snapshot(task) : null
  }

  list(options: { status?: MomentusTaskStatus; limit?: number } = {}): MomentusTaskSnapshot[] {
    return [...this.tasks.values()]
      .filter(task => options.status === undefined || task.status === options.status)
      .sort((a, b) => b.scheduledAt - a.scheduledAt)
      .slice(0, Math.max(0, options.limit ?? 100))
      .map(snapshot)
  }

  getMetrics(): MomentusMetrics {
    return {
      scheduled: this.counters.scheduled,
      running: this.runningCount,
      succeeded: this.counters.succeeded,
      failed: this.counters.failed,
      cancelled: this.counters.cancelled,
      queued: this.queue.length,
    }
  }

  clearCompleted(): number {
    let removed = 0
    for (const [id, task] of this.tasks) {
      if (isTerminal(task.status)) {
        this.tasks.delete(id)
        removed += 1
      }
    }
    return removed
  }

  debounce<T>(
    key: string,
    task: MomentusTask<T>,
    delayMs: number,
    options: Omit<MomentusScheduleOptions, 'delayMs' | 'dedupeKey' | 'replaceExisting'> = {},
  ): MomentusHandle<T> {
    const previous = this.debounceHandles.get(key)
    previous?.cancel(new Error(`Debounce remplacé: ${key}`))
    const handle = this.schedule(task, {
      ...options,
      delayMs,
      dedupeKey: `debounce:${key}`,
      replaceExisting: true,
    })
    this.debounceHandles.set(key, handle as MomentusHandle<unknown>)
    void handle.promise.finally(() => {
      if (this.debounceHandles.get(key)?.id === handle.id) this.debounceHandles.delete(key)
    }).catch(() => undefined)
    return handle
  }

  throttle<T>(
    key: string,
    task: MomentusTask<T>,
    intervalMs: number,
    options: Omit<MomentusScheduleOptions, 'delayMs' | 'dedupeKey' | 'replaceExisting'> & { trailing?: boolean } = {},
  ): MomentusHandle<T> {
    const now = this.clock.now()
    const state = this.throttleState.get(key) ?? { lastRun: 0 }
    const elapsed = now - state.lastRun

    if (elapsed >= intervalMs) {
      state.lastRun = now
      const handle = this.schedule(task, options)
      this.throttleState.set(key, state)
      return handle
    }

    if (options.trailing === false && state.trailing) {
      return state.trailing as MomentusHandle<T>
    }

    state.trailing?.cancel(new Error(`Throttle trailing remplacé: ${key}`))
    const handle = this.schedule(async context => {
      state.lastRun = this.clock.now()
      return task(context)
    }, {
      ...options,
      delayMs: Math.max(0, intervalMs - elapsed),
      dedupeKey: `throttle:${key}`,
      replaceExisting: true,
    })
    state.trailing = handle as MomentusHandle<unknown>
    this.throttleState.set(key, state)
    return handle
  }

  sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
        return
      }

      const timer = this.clock.setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }, Math.max(0, delayMs))

      const onAbort = () => {
        this.clock.clearTimeout(timer)
        reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  private createHandle<T>(task: InternalTask<T>): MomentusHandle<T> {
    return {
      id: task.id,
      promise: task.promise,
      cancel: reason => this.cancel(task.id, reason),
      getSnapshot: () => snapshot(task),
    }
  }

  private enqueue(task: InternalTask<any>): void {
    if (task.status === 'cancelled') return
    task.status = 'queued'
    task.timer = undefined
    this.queue.push(task)
    this.queue.sort((a, b) =>
      PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      || a.scheduledAt - b.scheduledAt
      || a.sequence - b.sequence,
    )
    this.pump()
  }

  private pump(): void {
    while (this.runningCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      if (!task || task.status === 'cancelled') continue
      this.runningCount += 1
      void this.execute(task).finally(() => {
        this.runningCount -= 1
        this.pump()
      })
    }
  }

  private async execute<T>(task: InternalTask<T>): Promise<void> {
    task.status = 'running'
    task.startedAt = this.clock.now()

    const retry = task.retry
    const maxAttempts = retry === false ? 1 : Math.max(1, retry.attempts)

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (task.controller.signal.aborted) return
      task.attempts = attempt

      const attemptController = new AbortController()
      const forwardAbort = () => attemptController.abort(task.controller.signal.reason)
      task.controller.signal.addEventListener('abort', forwardAbort, { once: true })

      let timeout: ReturnType<typeof setTimeout> | undefined
      if (task.timeoutMs !== undefined) {
        timeout = this.clock.setTimeout(() => {
          attemptController.abort(new Error(`Momentus timeout après ${task.timeoutMs}ms.`))
        }, task.timeoutMs)
      }

      try {
        const value = await task.task({
          id: task.id,
          attempt,
          signal: attemptController.signal,
          scheduledAt: task.scheduledAt,
          startedAt: task.startedAt,
        })
        if (task.controller.signal.aborted) return
        task.status = 'succeeded'
        task.endedAt = this.clock.now()
        task.resolve(value)
        this.counters.succeeded += 1
        this.releaseDedupe(task)
        return
      } catch (error) {
        const normalized = toError(error)
        task.error = normalized

        if (task.controller.signal.aborted) return

        const mayRetry = retry !== false
          && attempt < maxAttempts
          && (retry.retryIf?.(normalized, attempt) ?? true)

        if (!mayRetry) {
          task.status = 'failed'
          task.endedAt = this.clock.now()
          task.reject(normalized)
          this.counters.failed += 1
          this.releaseDedupe(task)
          return
        }

        const delay = computeBackoff(retry, attempt)
        try {
          await this.sleep(delay, task.controller.signal)
        } catch {
          return
        }
      } finally {
        task.controller.signal.removeEventListener('abort', forwardAbort)
        if (timeout !== undefined) this.clock.clearTimeout(timeout)
      }
    }
  }

  private releaseDedupe(task: InternalTask<any>): void {
    task.externalAbortCleanup?.()
    task.externalAbortCleanup = undefined
    if (task.dedupeKey && this.dedupe.get(task.dedupeKey) === task.id) {
      this.dedupe.delete(task.dedupeKey)
    }
  }
}

function normalizeRetry(retry: Partial<RetryPolicy> | false | undefined): RetryPolicy | false {
  if (retry === false) return false
  const merged = { ...DEFAULT_RETRY, ...retry }
  return {
    ...merged,
    attempts: Math.max(1, Math.floor(merged.attempts)),
    baseDelayMs: Math.max(0, merged.baseDelayMs),
    maxDelayMs: Math.max(0, merged.maxDelayMs),
    multiplier: Math.max(1, merged.multiplier),
    jitter: Math.max(0, Math.min(1, merged.jitter)),
  }
}

function computeBackoff(policy: RetryPolicy, attempt: number): number {
  const exponential = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(policy.multiplier, Math.max(0, attempt - 1)),
  )
  const spread = exponential * policy.jitter
  return Math.max(0, Math.round(exponential - spread + Math.random() * spread * 2))
}

function isTerminal(status: MomentusTaskStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

function snapshot(task: InternalTask<any>): MomentusTaskSnapshot {
  return {
    id: task.id,
    status: task.status,
    priority: task.priority,
    scheduledAt: task.scheduledAt,
    startedAt: task.startedAt,
    endedAt: task.endedAt,
    attempts: task.attempts,
    dedupeKey: task.dedupeKey,
    metadata: { ...task.metadata },
    error: task.error?.message,
  }
}

export const momentus = new Momentus()
