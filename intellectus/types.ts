export type Awaitable<T> = T | Promise<T>

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown ? T
    : T extends readonly (infer U)[] ? readonly DeepReadonly<U>[]
      : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T

export interface Disposable {
  dispose(): void
}

export interface Result<T, E = Error> {
  ok: boolean
  value?: T
  error?: E
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

export type Priority = 'critical' | 'high' | 'normal' | 'low' | 'idle'

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  idle: 0,
}

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  correlationId?: string
  causationId?: string
}

export interface IntellectusTelemetry {
  name: string
  startedAt: number
  endedAt: number
  durationMs: number
  success: boolean
  trace: TraceContext
  metadata: Record<string, unknown>
  error?: string
}

export interface Clock {
  now(): number
  setTimeout(handler: () => void, delayMs: number): ReturnType<typeof setTimeout>
  clearTimeout(handle: ReturnType<typeof setTimeout>): void
}

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (handler, delayMs) => setTimeout(handler, delayMs),
  clearTimeout: handle => clearTimeout(handle),
}

export function createId(prefix = 'id'): string {
  const uuid = typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

  return `${prefix}_${uuid}`
}

export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  return Boolean(
    value
    && (typeof value === 'object' || typeof value === 'function')
    && 'then' in value
    && typeof (value as { then?: unknown }).then === 'function',
  )
}

export function safeStructuredClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value)
    } catch {
      // Certaines valeurs applicatives contiennent volontairement des fonctions.
    }
  }

  return value
}
