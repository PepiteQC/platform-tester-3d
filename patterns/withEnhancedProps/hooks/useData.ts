import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DataProps, LoadingState } from '../types'

export interface DataConfig<TData, TError> {
  fetcher?: (signal: AbortSignal) => Promise<TData>
  initialData?: TData
  auto?: boolean
  retryDelayMs?: number
  isEmpty?: (data: TData | null) => boolean
  mapError?: (error: unknown) => TError
}

export function useData<TData = unknown, TError = Error>(config: DataConfig<TData, TError> = {}): DataProps<TData, TError> {
  const hasInitial = config.initialData !== undefined
  const [loadingState, setLoadingState] = useState<LoadingState>(hasInitial ? 'success' : 'idle')
  const [data, setData] = useState<TData | null>(hasInitial ? config.initialData! : null)
  const [error, setError] = useState<TError | null>(null)
  const [timestamp, setTimestamp] = useState<Date | null>(hasInitial ? new Date() : null)
  const [attempt, setAttempt] = useState(0)
  const controller = useRef<AbortController | null>(null)
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => () => { mounted.current = false; controller.current?.abort() }, [])

  const cancel = useCallback(() => controller.current?.abort(new DOMException('Cancelled', 'AbortError')), [])
  const refetch = useCallback(async (): Promise<TData | null> => {
    if (!config.fetcher) return data
    controller.current?.abort()
    const currentController = new AbortController()
    controller.current = currentController
    const id = ++requestId.current
    setLoadingState('loading')
    setError(null)
    setAttempt(current => current + 1)

    try {
      const result = await config.fetcher(currentController.signal)
      if (!mounted.current || id !== requestId.current) return null
      setData(result)
      setTimestamp(new Date())
      setLoadingState('success')
      return result
    } catch (reason) {
      if (currentController.signal.aborted) throw reason
      const mapped = config.mapError ? config.mapError(reason) : reason as TError
      if (mounted.current && id === requestId.current) {
        setError(mapped)
        setLoadingState('error')
      }
      throw mapped
    }
  }, [config.fetcher, config.mapError, data])

  const retry = useCallback(async (maxAttempts = 3) => {
    let lastError: unknown
    for (let index = 0; index < Math.max(1, maxAttempts); index += 1) {
      try { return await refetch() }
      catch (reason) {
        lastError = reason
        if (index < maxAttempts - 1) await new Promise(resolve => setTimeout(resolve, (config.retryDelayMs ?? 500) * (index + 1)))
      }
    }
    throw lastError
  }, [config.retryDelayMs, refetch])

  const reset = useCallback(() => {
    cancel(); requestId.current += 1
    setData(hasInitial ? config.initialData! : null)
    setError(null); setLoadingState(hasInitial ? 'success' : 'idle'); setTimestamp(hasInitial ? new Date() : null); setAttempt(0)
  }, [cancel, config.initialData, hasInitial])

  const mutate = useCallback<DataProps<TData,TError>['mutate']>(updater => {
    setData(current => typeof updater === 'function' ? (updater as (value:TData|null)=>TData|null)(current) : updater)
    setLoadingState('success'); setTimestamp(new Date())
  }, [])

  useEffect(() => {
    if (config.fetcher && (config.auto ?? true) && !hasInitial) void refetch().catch(() => undefined)
  }, [config.fetcher, config.auto, hasInitial]) // refetch intentionally omitted: one automatic request per fetcher/config change.

  const isEmpty = useMemo(() => {
    if (config.isEmpty) return config.isEmpty(data)
    if (data == null) return true
    if (Array.isArray(data) || typeof data === 'string') return data.length === 0
    if (data instanceof Map || data instanceof Set) return data.size === 0
    if (typeof data === 'object') return Object.keys(data).length === 0
    return false
  }, [config.isEmpty, data])

  const skeletonStyle = useMemo<CSSProperties>(() => ({
    background:'linear-gradient(90deg,#f0f0f0 25%,#dedede 50%,#f0f0f0 75%)',
    backgroundSize:'200% 100%', animation:loadingState === 'loading' ? 'enhanced-shimmer 1.4s infinite' : 'none', borderRadius:4,
  }), [loadingState])

  return {
    loadingState, data, error, isIdle:loadingState==='idle', isLoading:loadingState==='loading',
    isSuccess:loadingState==='success', isError:loadingState==='error', isEmpty, timestamp, attempt,
    refetch, reset, retry, mutate, cancel,
    skeleton:{ lines:3, isAnimated:loadingState==='loading', style:skeletonStyle },
  }
}
