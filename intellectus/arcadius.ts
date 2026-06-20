import {
  Awaitable,
  Clock,
  Priority,
  PRIORITY_WEIGHT,
  TraceContext,
  createId,
  systemClock,
  toError,
} from './types'

export type EventMap = object

export interface ArcadiusEvent<TType extends string = string, TPayload = unknown> {
  id: string
  type: TType
  source: string
  payload: TPayload
  timestamp: number
  priority: Priority
  target?: string
  propagate: boolean
  trace: TraceContext
  metadata: Record<string, unknown>
}

export interface ArcadiusListenerOptions<TPayload = unknown> {
  priority?: number
  once?: boolean
  signal?: AbortSignal
  filter?: (event: ArcadiusEvent<string, TPayload>) => boolean
}

export interface ArcadiusEmitOptions {
  id?: string
  target?: string
  priority?: Priority
  propagate?: boolean
  correlationId?: string
  causationId?: string
  trace?: Partial<TraceContext>
  metadata?: Record<string, unknown>
}

export interface ArcadiusMiddlewareContext {
  phase: 'before' | 'after' | 'error'
  listenerId?: string
  error?: Error
}

export type ArcadiusMiddleware = (
  event: ArcadiusEvent,
  context: ArcadiusMiddlewareContext,
  next: () => Promise<void>,
) => Promise<void>

export interface ArcadiusMetrics {
  emitted: number
  delivered: number
  failed: number
  dropped: number
  activeListeners: number
  historySize: number
}

type EventKey<TEvents extends EventMap> = Extract<keyof TEvents, string>
type AnyEventKey<TEvents extends EventMap> = EventKey<TEvents> | '*'

type Listener<TPayload> = (event: ArcadiusEvent<string, TPayload>) => Awaitable<void>

interface ListenerRecord {
  id: string
  listener: Listener<unknown>
  priority: number
  once: boolean
  filter?: (event: ArcadiusEvent) => boolean
  createdAt: number
}

export class Arcadius<TEvents extends EventMap = Record<string, unknown>> {
  private readonly listeners = new Map<string, ListenerRecord[]>()
  private readonly middlewares: ArcadiusMiddleware[] = []
  private readonly history: ArcadiusEvent[] = []
  private readonly maxHistory: number
  private readonly clock: Clock
  private metrics: Omit<ArcadiusMetrics, 'activeListeners' | 'historySize'> = {
    emitted: 0,
    delivered: 0,
    failed: 0,
    dropped: 0,
  }

  constructor(options: { maxHistory?: number; clock?: Clock } = {}) {
    this.maxHistory = Math.max(0, options.maxHistory ?? 500)
    this.clock = options.clock ?? systemClock
  }

  on<TKey extends AnyEventKey<TEvents>>(
    type: TKey,
    listener: Listener<TKey extends '*' ? unknown : TEvents[Extract<TKey, EventKey<TEvents>>]>,
    options: ArcadiusListenerOptions<TKey extends '*' ? unknown : TEvents[Extract<TKey, EventKey<TEvents>>]> = {},
  ): () => void {
    const key = String(type)
    const record: ListenerRecord = {
      id: createId('listener'),
      listener: listener as Listener<unknown>,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      filter: options.filter as ((event: ArcadiusEvent) => boolean) | undefined,
      createdAt: this.clock.now(),
    }

    const bucket = this.listeners.get(key) ?? []
    bucket.push(record)
    bucket.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
    this.listeners.set(key, bucket)

    const unsubscribe = () => this.removeRecord(key, record.id)
    if (options.signal) {
      if (options.signal.aborted) unsubscribe()
      else options.signal.addEventListener('abort', unsubscribe, { once: true })
    }
    return unsubscribe
  }

  once<TKey extends AnyEventKey<TEvents>>(
    type: TKey,
    listener: Listener<TKey extends '*' ? unknown : TEvents[Extract<TKey, EventKey<TEvents>>]>,
    options: Omit<ArcadiusListenerOptions, 'once'> = {},
  ): () => void {
    return this.on(type, listener, { ...options, once: true })
  }

  off<TKey extends AnyEventKey<TEvents>>(
    type: TKey,
    listener: Listener<unknown>,
  ): void {
    const key = String(type)
    const bucket = this.listeners.get(key)
    if (!bucket) return
    const next = bucket.filter(record => record.listener !== listener)
    if (next.length === 0) this.listeners.delete(key)
    else this.listeners.set(key, next)
  }

  use(middleware: ArcadiusMiddleware): () => void {
    this.middlewares.push(middleware)
    return () => {
      const index = this.middlewares.indexOf(middleware)
      if (index >= 0) this.middlewares.splice(index, 1)
    }
  }

  emit<TKey extends EventKey<TEvents>>(
    type: TKey,
    source: string,
    payload: TEvents[TKey],
    options: ArcadiusEmitOptions = {},
  ): ArcadiusEvent<TKey, TEvents[TKey]> {
    const event = this.createEvent(type, source, payload, options)
    this.record(event)
    this.metrics.emitted += 1

    const deliveries = this.collectListeners(event)
    if (deliveries.length === 0) this.metrics.dropped += 1

    for (const { key, record } of deliveries) {
      void this.invokeListener(event, key, record).catch(error => {
        this.metrics.failed += 1
        this.reportUnhandledError(event, toError(error))
      })
    }

    return event
  }

  async emitAsync<TKey extends EventKey<TEvents>>(
    type: TKey,
    source: string,
    payload: TEvents[TKey],
    options: ArcadiusEmitOptions = {},
  ): Promise<ArcadiusEvent<TKey, TEvents[TKey]>> {
    const event = this.createEvent(type, source, payload, options)
    this.record(event)
    this.metrics.emitted += 1

    const deliveries = this.collectListeners(event)
    if (deliveries.length === 0) this.metrics.dropped += 1

    const errors: Error[] = []
    for (const { key, record } of deliveries) {
      try {
        await this.invokeListener(event, key, record)
      } catch (error) {
        const normalized = toError(error)
        errors.push(normalized)
        this.metrics.failed += 1
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `Arcadius: ${errors.length} listener(s) ont échoué pour ${String(type)}.`)
    }
    return event
  }

  emitTo<TKey extends EventKey<TEvents>>(
    target: string,
    type: TKey,
    source: string,
    payload: TEvents[TKey],
    options: Omit<ArcadiusEmitOptions, 'target'> = {},
  ): ArcadiusEvent<TKey, TEvents[TKey]> {
    return this.emit(type, source, payload, { ...options, target })
  }

  async waitFor<TKey extends EventKey<TEvents>>(
    type: TKey,
    options: {
      timeoutMs?: number
      signal?: AbortSignal
      filter?: (event: ArcadiusEvent<TKey, TEvents[TKey]>) => boolean
    } = {},
  ): Promise<ArcadiusEvent<TKey, TEvents[TKey]>> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      let settled = false

      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        unsubscribe()
        if (timeout !== undefined) this.clock.clearTimeout(timeout)
        callback()
      }

      const unsubscribe = this.on(type, event => {
        const typed = event as ArcadiusEvent<TKey, TEvents[TKey]>
        if (options.filter && !options.filter(typed)) return
        finish(() => resolve(typed))
      })

      if (options.timeoutMs !== undefined) {
        timeout = this.clock.setTimeout(() => {
          finish(() => reject(new Error(`Arcadius.waitFor timeout: ${String(type)} après ${options.timeoutMs}ms.`)))
        }, options.timeoutMs)
      }

      if (options.signal) {
        const onAbort = () => finish(() => reject(options.signal?.reason ?? new DOMException('Aborted', 'AbortError')))
        if (options.signal.aborted) onAbort()
        else options.signal.addEventListener('abort', onAbort, { once: true })
      }
    })
  }

  clear(type?: AnyEventKey<TEvents>): void {
    if (type === undefined) this.listeners.clear()
    else this.listeners.delete(String(type))
  }

  getHistory(options: {
    limit?: number
    type?: EventKey<TEvents>
    source?: string
    target?: string
    since?: number
  } = {}): ArcadiusEvent[] {
    const limit = Math.max(0, options.limit ?? 50)
    return this.history
      .filter(event => options.type === undefined || event.type === options.type)
      .filter(event => options.source === undefined || event.source === options.source)
      .filter(event => options.target === undefined || event.target === options.target)
      .filter(event => options.since === undefined || event.timestamp >= options.since)
      .slice(-limit)
      .reverse()
      .map(event => ({ ...event, metadata: { ...event.metadata }, trace: { ...event.trace } }))
  }

  getActiveTypes(): string[] {
    return [...this.listeners.keys()].filter(type => type !== '*').sort()
  }

  getMetrics(): ArcadiusMetrics {
    return {
      ...this.metrics,
      activeListeners: [...this.listeners.values()].reduce((sum, entries) => sum + entries.length, 0),
      historySize: this.history.length,
    }
  }

  private createEvent<TKey extends EventKey<TEvents>>(
    type: TKey,
    source: string,
    payload: TEvents[TKey],
    options: ArcadiusEmitOptions,
  ): ArcadiusEvent<TKey, TEvents[TKey]> {
    const id = options.id ?? createId('evt')
    const traceId = options.trace?.traceId ?? options.correlationId ?? createId('trace')
    return {
      id,
      type,
      source,
      payload,
      timestamp: this.clock.now(),
      priority: options.priority ?? 'normal',
      target: options.target,
      propagate: options.propagate ?? true,
      trace: {
        traceId,
        spanId: options.trace?.spanId ?? createId('span'),
        parentSpanId: options.trace?.parentSpanId,
        correlationId: options.correlationId ?? options.trace?.correlationId,
        causationId: options.causationId ?? options.trace?.causationId,
      },
      metadata: { ...options.metadata },
    }
  }

  private record(event: ArcadiusEvent): void {
    if (this.maxHistory <= 0) return
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory)
    }
  }

  private collectListeners(event: ArcadiusEvent): Array<{ key: string; record: ListenerRecord }> {
    const records: Array<{ key: string; record: ListenerRecord }> = []
    const direct = this.listeners.get(event.type) ?? []
    direct.forEach(record => records.push({ key: event.type, record }))

    const wildcard = this.listeners.get('*') ?? []
    wildcard.forEach(record => records.push({ key: '*', record }))

    if (event.target) {
      const targetKey = `@${event.target}`
      const targeted = this.listeners.get(targetKey) ?? []
      targeted.forEach(record => records.push({ key: targetKey, record }))
    }

    return records.sort((a, b) => {
      const eventPriority = PRIORITY_WEIGHT[event.priority]
      return (eventPriority + b.record.priority) - (eventPriority + a.record.priority)
    })
  }

  private async invokeListener(
    event: ArcadiusEvent,
    key: string,
    record: ListenerRecord,
  ): Promise<void> {
    if (record.filter && !record.filter(event)) return

    let index = -1
    const run = async (): Promise<void> => {
      index += 1
      const middleware = this.middlewares[index]
      if (middleware) {
        await middleware(event, { phase: 'before', listenerId: record.id }, run)
        return
      }
      await record.listener(event)
    }

    try {
      await run()
      this.metrics.delivered += 1
      if (record.once) this.removeRecord(key, record.id)
    } catch (error) {
      if (record.once) this.removeRecord(key, record.id)
      const normalized = toError(error)
      await this.runErrorMiddlewares(event, record.id, normalized)
      throw normalized
    }
  }

  private async runErrorMiddlewares(event: ArcadiusEvent, listenerId: string, error: Error): Promise<void> {
    for (const middleware of this.middlewares) {
      try {
        await middleware(event, { phase: 'error', listenerId, error }, async () => undefined)
      } catch {
        // L'erreur originale reste prioritaire.
      }
    }
  }

  private removeRecord(key: string, id: string): void {
    const bucket = this.listeners.get(key)
    if (!bucket) return
    const next = bucket.filter(record => record.id !== id)
    if (next.length === 0) this.listeners.delete(key)
    else this.listeners.set(key, next)
  }

  private reportUnhandledError(event: ArcadiusEvent, error: Error): void {
    if (typeof console !== 'undefined') {
      console.error(`[Arcadius] listener error for ${event.type}`, error)
    }
  }
}

export const arcadius = new Arcadius()
