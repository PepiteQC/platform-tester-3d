import { Arcadius, EventMap } from './arcadius'
import { Benedictus } from './benedictus'
import {
  CommandMap,
  Decaprius,
  DecapriusEvents,
} from './decaprius'
import { LocalStorageLotusAdapter, Lotus, LotusPersistenceAdapter } from './lotus'
import { Momentus } from './momentus'

export interface IntellectusRuntimeOptions {
  maxEventHistory?: number
  schedulerConcurrency?: number
  maxMemoryEntries?: number
  cleanupIntervalMs?: number
  persistence?: LotusPersistenceAdapter | false
}

export interface IntellectusRuntime<
  TCommands extends CommandMap = CommandMap,
  TEvents extends EventMap = Record<string, unknown>,
> {
  benedictus: Benedictus
  arcadius: Arcadius<DecapriusEvents<TEvents>>
  momentus: Momentus
  lotus: Lotus
  decaprius: Decaprius<TCommands, TEvents>
  initialize(): Promise<void>
  shutdown(): Promise<void>
  snapshot(): {
    events: ReturnType<Arcadius<DecapriusEvents<TEvents>>['getMetrics']>
    scheduler: ReturnType<Momentus['getMetrics']>
    memory: ReturnType<Lotus['getMetrics']>
    commands: ReturnType<Decaprius<TCommands, TEvents>['getMetrics']>
  }
}

export function createIntellectusRuntime<
  TCommands extends CommandMap = CommandMap,
  TEvents extends EventMap = Record<string, unknown>,
>(options: IntellectusRuntimeOptions = {}): IntellectusRuntime<TCommands, TEvents> {
  const benedictus = new Benedictus()
  const arcadius = new Arcadius<DecapriusEvents<TEvents>>({
    maxHistory: options.maxEventHistory ?? 1_000,
  })
  const momentus = new Momentus({
    concurrency: options.schedulerConcurrency ?? 6,
  })
  const persistence = options.persistence === false
    ? undefined
    : options.persistence ?? new LocalStorageLotusAdapter()
  const lotus = new Lotus({
    maxEntries: options.maxMemoryEntries ?? 10_000,
    cleanupIntervalMs: options.cleanupIntervalMs ?? 30_000,
    persistence,
  })
  const decaprius = new Decaprius<TCommands, TEvents>(
    benedictus,
    arcadius,
    momentus,
    lotus,
  )

  let initialized = false

  return {
    benedictus,
    arcadius,
    momentus,
    lotus,
    decaprius,

    async initialize() {
      if (initialized) return
      initialized = true
      await lotus.hydrate()
      lotus.startCleanup()
    },

    async shutdown() {
      if (!initialized) return
      initialized = false
      lotus.stopCleanup()
      await lotus.flushPersistence()
      arcadius.clear()
    },

    snapshot() {
      return {
        events: arcadius.getMetrics(),
        scheduler: momentus.getMetrics(),
        memory: lotus.getMetrics(),
        commands: decaprius.getMetrics(),
      }
    },
  }
}

export const intellectus = createIntellectusRuntime()
