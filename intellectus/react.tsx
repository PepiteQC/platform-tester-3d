import React, {
  ComponentType,
  PropsWithChildren,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { ArcadiusEvent, EventMap } from './arcadius'
import { CommandMap, DecapriusEvents, DecapriusDispatchOptions } from './decaprius'
import { IntellectusRuntime } from './runtime'
import { Result } from './types'

const RuntimeContext = createContext<IntellectusRuntime | null>(null)

export interface IntellectusProviderProps {
  runtime: IntellectusRuntime
  fallback?: ReactNode
  onError?: (error: Error) => void
}

export function IntellectusProvider({
  runtime,
  fallback = null,
  onError,
  children,
}: PropsWithChildren<IntellectusProviderProps>) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    void runtime.initialize()
      .then(() => {
        if (active) setReady(true)
      })
      .catch(reason => {
        const normalized = reason instanceof Error ? reason : new Error(String(reason))
        if (active) {
          setError(normalized)
          onError?.(normalized)
        }
      })

    return () => {
      active = false
      void runtime.shutdown()
    }
  }, [runtime, onError])

  if (error) throw error
  if (!ready) return <>{fallback}</>
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
}

export function useIntellectus<
  TCommands extends CommandMap = CommandMap,
  TEvents extends EventMap = Record<string, unknown>,
>(): IntellectusRuntime<TCommands, TEvents> {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error('useIntellectus doit être utilisé sous <IntellectusProvider>.')
  return runtime as IntellectusRuntime<TCommands, TEvents>
}

export function useLotusValue<T>(key: string, fallback: T): readonly [T, (value: T) => void] {
  const { lotus } = useIntellectus()
  const subscribe = useCallback(
    (notify: () => void) => lotus.subscribe(() => notify(), key),
    [lotus, key],
  )
  const getVersion = useCallback(
    () => lotus.getEntry(key)?.version ?? 0,
    [lotus, key],
  )
  useSyncExternalStore(subscribe, getVersion, getVersion)

  const value = lotus.get<T>(key) ?? fallback
  const setValue = useCallback((next: T) => {
    lotus.set(key, next, { source: 'react', tags: ['react'] })
  }, [lotus, key])
  return [value, setValue] as const
}

export function useArcadiusEvent<
  TEvents extends EventMap,
  TKey extends Extract<keyof DecapriusEvents<TEvents>, string>,
>(
  type: TKey,
  handler: (event: ArcadiusEvent<TKey, DecapriusEvents<TEvents>[TKey]>) => void | Promise<void>,
): void {
  const { arcadius } = useIntellectus<CommandMap, TEvents>()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => arcadius.on(type, event => handlerRef.current(
    event as ArcadiusEvent<TKey, DecapriusEvents<TEvents>[TKey]>,
  )), [arcadius, type])
}

export function useIntellectusCommand<
  TCommands extends CommandMap,
  TEvents extends EventMap,
  TKey extends Extract<keyof TCommands, string>,
  TResult = unknown,
>(type: TKey) {
  const { decaprius } = useIntellectus<TCommands, TEvents>()
  const [pending, setPending] = useState(false)
  const [lastResult, setLastResult] = useState<Result<TResult, unknown> | null>(null)

  const execute = useCallback(async (
    payload: TCommands[TKey],
    options?: DecapriusDispatchOptions,
  ) => {
    setPending(true)
    try {
      const result = await decaprius.dispatch<TKey, TResult>(type, payload, options)
      setLastResult(result as Result<TResult, unknown>)
      return result
    } finally {
      setPending(false)
    }
  }, [decaprius, type])

  return { execute, pending, lastResult }
}

export interface InjectedIntellectusProps {
  intellectus: IntellectusRuntime
}

export function withIntellectus<P extends InjectedIntellectusProps>(
  Component: ComponentType<P>,
) {
  type ExternalProps = Omit<P, keyof InjectedIntellectusProps>
  const Enhanced = forwardRef<unknown, ExternalProps>((props, ref) => {
    const runtime = useIntellectus()
    return <Component {...(props as P)} intellectus={runtime} ref={ref as never} />
  })
  Enhanced.displayName = `withIntellectus(${Component.displayName ?? Component.name ?? 'Component'})`
  return Enhanced
}

export function IntellectusConsumer({
  children,
}: {
  children: (runtime: IntellectusRuntime) => ReactNode
}) {
  const runtime = useIntellectus()
  return <>{children(runtime)}</>
}

export function useRuntimeSnapshot() {
  const runtime = useIntellectus()
  const [revision, setRevision] = useState(0)

  useEffect(() => runtime.arcadius.on('*', () => setRevision(value => value + 1)), [runtime])
  return useMemo(() => runtime.snapshot(), [runtime, revision])
}
