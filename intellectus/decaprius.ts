import { Arcadius, ArcadiusEvent, EventMap } from './arcadius'
import { Benedictus, BenedictusValidationError, Contract } from './benedictus'
import { Lotus, LotusTransaction } from './lotus'
import { Momentus, MomentusScheduleOptions } from './momentus'
import {
  Awaitable,
  IntellectusTelemetry,
  Result,
  TraceContext,
  createId,
  err,
  ok,
  toError,
} from './types'

export type CommandMap = Record<string, unknown>

export interface DecapriusCommand<TKey extends string = string, TPayload = unknown> {
  id: string
  type: TKey
  source: string
  payload: TPayload
  createdAt: number
  idempotencyKey?: string
  trace: TraceContext
  metadata: Record<string, unknown>
}

export interface DecapriusContext<TEvents extends EventMap = Record<string, unknown>> {
  command: DecapriusCommand
  arcadius: Arcadius<TEvents>
  lotus: Lotus
  momentus: Momentus
  transaction: LotusTransaction
  emit<TKey extends Extract<keyof TEvents, string>>(
    type: TKey,
    payload: TEvents[TKey],
    metadata?: Record<string, unknown>,
  ): ArcadiusEvent<TKey, TEvents[TKey]>
  registerCompensation(compensation: () => Awaitable<void>): void
  signal: AbortSignal
}

export type DecapriusHandler<TPayload, TResult, TEvents extends EventMap> = (
  payload: TPayload,
  context: DecapriusContext<TEvents>,
) => Awaitable<TResult>

export interface DecapriusHandlerOptions<TPayload> {
  contract?: Contract<TPayload>
  timeoutMs?: number
  retry?: MomentusScheduleOptions['retry']
  priority?: MomentusScheduleOptions['priority']
  cacheResultTtlMs?: number
  dangerous?: boolean
}

export interface DecapriusDispatchOptions {
  id?: string
  source?: string
  idempotencyKey?: string
  signal?: AbortSignal
  metadata?: Record<string, unknown>
  correlationId?: string
  causationId?: string
  allowDangerous?: boolean
}

export interface DecapriusDispatchError {
  commandId: string
  commandType: string
  phase: 'validation' | 'authorization' | 'execution' | 'compensation' | 'unknown'
  error: Error
}

export interface DecapriusMetrics {
  dispatched: number
  succeeded: number
  failed: number
  deduplicated: number
  compensated: number
  averageDurationMs: number
}

export interface DecapriusLifecycleEvents {
  'decaprius.command.started': { command: DecapriusCommand }
  'decaprius.command.succeeded': { command: DecapriusCommand; result: unknown; durationMs: number }
  'decaprius.command.failed': { command: DecapriusCommand; error: string; phase: string; durationMs: number }
  'decaprius.command.compensated': { command: DecapriusCommand; compensationCount: number }
  'decaprius.telemetry': IntellectusTelemetry
}

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K]
}

export type DecapriusEvents<TEvents extends EventMap> =
  Omit<RemoveIndexSignature<TEvents>, keyof DecapriusLifecycleEvents> & DecapriusLifecycleEvents

interface RegisteredHandler<TEvents extends EventMap> {
  handler: DecapriusHandler<unknown, unknown, TEvents>
  options: DecapriusHandlerOptions<unknown>
}

export class Decaprius<
  TCommands extends CommandMap = CommandMap,
  TEvents extends EventMap = Record<string, unknown>,
> {
  private readonly handlers = new Map<string, RegisteredHandler<DecapriusEvents<TEvents>>>()
  private readonly authorizers: Array<(command: DecapriusCommand) => Awaitable<boolean>> = []
  private readonly telemetryListeners = new Set<(telemetry: IntellectusTelemetry) => void>()
  private counters = {
    dispatched: 0,
    succeeded: 0,
    failed: 0,
    deduplicated: 0,
    compensated: 0,
    totalDurationMs: 0,
  }

  constructor(
    readonly benedictus: Benedictus,
    readonly arcadius: Arcadius<DecapriusEvents<TEvents>>,
    readonly momentus: Momentus,
    readonly lotus: Lotus,
  ) {}

  register<TKey extends Extract<keyof TCommands, string>, TResult>(
    type: TKey,
    handler: DecapriusHandler<TCommands[TKey], TResult, DecapriusEvents<TEvents>>,
    options: DecapriusHandlerOptions<TCommands[TKey]> = {},
  ): () => void {
    if (this.handlers.has(type)) {
      throw new Error(`Decaprius: un handler est déjà enregistré pour « ${type} ».`)
    }
    this.handlers.set(type, {
      handler: handler as DecapriusHandler<unknown, unknown, DecapriusEvents<TEvents>>,
      options: options as DecapriusHandlerOptions<unknown>,
    })
    return () => this.handlers.delete(type)
  }

  replace<TKey extends Extract<keyof TCommands, string>, TResult>(
    type: TKey,
    handler: DecapriusHandler<TCommands[TKey], TResult, DecapriusEvents<TEvents>>,
    options: DecapriusHandlerOptions<TCommands[TKey]> = {},
  ): void {
    this.handlers.set(type, {
      handler: handler as DecapriusHandler<unknown, unknown, DecapriusEvents<TEvents>>,
      options: options as DecapriusHandlerOptions<unknown>,
    })
  }

  authorize(authorizer: (command: DecapriusCommand) => Awaitable<boolean>): () => void {
    this.authorizers.push(authorizer)
    return () => {
      const index = this.authorizers.indexOf(authorizer)
      if (index >= 0) this.authorizers.splice(index, 1)
    }
  }

  onTelemetry(listener: (telemetry: IntellectusTelemetry) => void): () => void {
    this.telemetryListeners.add(listener)
    return () => this.telemetryListeners.delete(listener)
  }

  async dispatch<TKey extends Extract<keyof TCommands, string>, TResult = unknown>(
    type: TKey,
    payload: TCommands[TKey],
    options: DecapriusDispatchOptions = {},
  ): Promise<Result<TResult, DecapriusDispatchError>> {
    const startedAt = Date.now()
    this.counters.dispatched += 1

    const command = this.createCommand(type, payload, options)
    const registered = this.handlers.get(type)
    if (!registered) {
      return this.fail<TResult>(command, 'execution', new Error(`Aucun handler pour ${type}.`), startedAt)
    }

    if (options.idempotencyKey) {
      const cacheKey = this.idempotencyKey(type, options.idempotencyKey)
      const cached = this.lotus.get<TResult>(cacheKey)
      if (cached !== null) {
        this.counters.deduplicated += 1
        return ok(cached)
      }
    }

    let validatedPayload: unknown = payload
    try {
      if (registered.options.contract) {
        validatedPayload = registered.options.contract.parse(payload)
      }
    } catch (error) {
      return this.fail<TResult>(command, 'validation', toError(error), startedAt)
    }

    if (registered.options.dangerous && !options.allowDangerous) {
      return this.fail<TResult>(
        command,
        'authorization',
        new Error(`Commande dangereuse refusée sans allowDangerous: ${type}.`),
        startedAt,
      )
    }

    try {
      for (const authorizer of this.authorizers) {
        if (!(await authorizer(command))) {
          return this.fail<TResult>(command, 'authorization', new Error(`Commande non autorisée: ${type}.`), startedAt)
        }
      }
    } catch (error) {
      return this.fail<TResult>(command, 'authorization', toError(error), startedAt)
    }

    this.emitLifecycle('decaprius.command.started', { command }, {
      correlationId: command.trace.correlationId,
      causationId: command.trace.causationId,
      trace: command.trace,
    })

    const controller = new AbortController()
    const forwardAbort = () => controller.abort(options.signal?.reason)
    if (options.signal) {
      if (options.signal.aborted) controller.abort(options.signal.reason)
      else options.signal.addEventListener('abort', forwardAbort, { once: true })
    }

    const compensations: Array<() => Awaitable<void>> = []

    try {
      const result = await this.lotus.transaction(async transaction => {
        return this.momentus.run<TResult>(async taskContext => {
          const emit = <TEventKey extends Extract<keyof (DecapriusEvents<TEvents>), string>>(
            eventType: TEventKey,
            eventPayload: (DecapriusEvents<TEvents>)[TEventKey],
            metadata: Record<string, unknown> = {},
          ) => this.arcadius.emit(eventType, 'decaprius', eventPayload, {
            correlationId: command.trace.correlationId,
            causationId: command.id,
            trace: {
              traceId: command.trace.traceId,
              parentSpanId: command.trace.spanId,
            },
            metadata,
          })

          const context: DecapriusContext<DecapriusEvents<TEvents>> = {
            command,
            arcadius: this.arcadius,
            lotus: this.lotus,
            momentus: this.momentus,
            transaction,
            emit,
            registerCompensation: compensation => compensations.push(compensation),
            signal: taskContext.signal,
          }

          return registered.handler(validatedPayload, context) as Promise<TResult>
        }, {
          id: `command:${command.id}`,
          priority: registered.options.priority,
          timeoutMs: registered.options.timeoutMs,
          retry: registered.options.retry,
          dedupeKey: options.idempotencyKey ? `command:${type}:${options.idempotencyKey}` : undefined,
          metadata: { commandType: type, commandId: command.id },
          signal: controller.signal,
        })
      })

      const durationMs = Date.now() - startedAt
      this.counters.succeeded += 1
      this.counters.totalDurationMs += durationMs

      if (options.idempotencyKey) {
        this.lotus.set(this.idempotencyKey(type, options.idempotencyKey), result, {
          source: 'decaprius',
          tags: ['idempotency', type],
          ttl: registered.options.cacheResultTtlMs ?? 5 * 60_000,
        })
      }

      this.emitLifecycle('decaprius.command.succeeded', {
        command,
        result,
        durationMs,
      }, { trace: command.trace })
      this.emitTelemetry(command, startedAt, true, { commandType: type })
      return ok(result)
    } catch (error) {
      const executionError = toError(error)
      const compensationErrors: Error[] = []

      for (const compensation of compensations.reverse()) {
        try {
          await compensation()
          this.counters.compensated += 1
        } catch (compensationError) {
          compensationErrors.push(toError(compensationError))
        }
      }

      if (compensations.length > 0) {
        this.emitLifecycle('decaprius.command.compensated', {
          command,
          compensationCount: compensations.length - compensationErrors.length,
        }, { trace: command.trace })
      }

      const finalError = compensationErrors.length > 0
        ? new AggregateError([executionError, ...compensationErrors], 'Échec de commande et de compensation.')
        : executionError

      return this.fail<TResult>(
        command,
        compensationErrors.length > 0 ? 'compensation' : 'execution',
        finalError,
        startedAt,
      )
    } finally {
      options.signal?.removeEventListener('abort', forwardAbort)
    }
  }

  listHandlers(): string[] {
    return [...this.handlers.keys()].sort()
  }

  getMetrics(): DecapriusMetrics {
    return {
      dispatched: this.counters.dispatched,
      succeeded: this.counters.succeeded,
      failed: this.counters.failed,
      deduplicated: this.counters.deduplicated,
      compensated: this.counters.compensated,
      averageDurationMs: this.counters.succeeded + this.counters.failed === 0
        ? 0
        : this.counters.totalDurationMs / (this.counters.succeeded + this.counters.failed),
    }
  }

  private createCommand<TKey extends Extract<keyof TCommands, string>>(
    type: TKey,
    payload: TCommands[TKey],
    options: DecapriusDispatchOptions,
  ): DecapriusCommand<TKey, TCommands[TKey]> {
    const id = options.id ?? createId('cmd')
    const traceId = options.correlationId ?? createId('trace')
    return {
      id,
      type,
      source: options.source ?? 'unknown',
      payload,
      createdAt: Date.now(),
      idempotencyKey: options.idempotencyKey,
      trace: {
        traceId,
        spanId: createId('span'),
        correlationId: options.correlationId ?? traceId,
        causationId: options.causationId,
      },
      metadata: { ...options.metadata },
    }
  }

  private fail<TResult>(
    command: DecapriusCommand,
    phase: DecapriusDispatchError['phase'],
    error: Error,
    startedAt: number,
  ): Result<TResult, DecapriusDispatchError> {
    const durationMs = Date.now() - startedAt
    this.counters.failed += 1
    this.counters.totalDurationMs += durationMs
    this.emitLifecycle('decaprius.command.failed', {
      command,
      error: error.message,
      phase,
      durationMs,
    }, { trace: command.trace })
    this.emitTelemetry(command, startedAt, false, { commandType: command.type, phase }, error)
    return err({
      commandId: command.id,
      commandType: command.type,
      phase,
      error,
    })
  }

  private emitTelemetry(
    command: DecapriusCommand,
    startedAt: number,
    success: boolean,
    metadata: Record<string, unknown>,
    error?: Error,
  ): void {
    const endedAt = Date.now()
    const telemetry: IntellectusTelemetry = {
      name: `command:${command.type}`,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      success,
      trace: command.trace,
      metadata,
      error: error?.message,
    }
    this.telemetryListeners.forEach(listener => {
      try { listener(telemetry) } catch { /* observabilité non bloquante */ }
    })
    this.emitLifecycle('decaprius.telemetry', telemetry, { trace: command.trace })
  }

  private emitLifecycle<TKey extends Extract<keyof DecapriusLifecycleEvents, string>>(
    type: TKey,
    payload: DecapriusLifecycleEvents[TKey],
    options: Parameters<Arcadius<DecapriusLifecycleEvents>['emit']>[3] = {},
  ): ArcadiusEvent<TKey, DecapriusLifecycleEvents[TKey]> {
    const lifecycleBus = this.arcadius as unknown as Arcadius<DecapriusLifecycleEvents>
    return lifecycleBus.emit(type, 'decaprius', payload, options)
  }

  private idempotencyKey(type: string, key: string): string {
    return `decaprius.idempotency.${type}.${key}`
  }
}

export function createDecaprius<
  TCommands extends CommandMap = CommandMap,
  TEvents extends EventMap = Record<string, unknown>,
>(options: {
  benedictus?: Benedictus
  arcadius?: Arcadius<DecapriusEvents<TEvents>>
  momentus?: Momentus
  lotus?: Lotus
} = {}): Decaprius<TCommands, TEvents> {
  return new Decaprius(
    options.benedictus ?? new Benedictus(),
    options.arcadius ?? new Arcadius<DecapriusEvents<TEvents>>(),
    options.momentus ?? new Momentus(),
    options.lotus ?? new Lotus(),
  )
}

export { BenedictusValidationError }
