import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Breakpoint, ResponsiveProps, ResponsiveValue } from '../types'

export const BREAKPOINTS: Record<Breakpoint, number> = { xs:0, sm:640, md:768, lg:1024, xl:1280, '2xl':1536 }
const ORDER: Breakpoint[] = ['xs','sm','md','lg','xl','2xl']
const SERVER_VIEWPORT = { width: 1024, height: 768, pixelRatio: 1, reducedMotion: false, dark: false }

function readViewport() {
  if (typeof window === 'undefined') return SERVER_VIEWPORT
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  }
}

function subscribeViewport(notify: () => void) {
  if (typeof window === 'undefined') return () => undefined
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const dark = window.matchMedia('(prefers-color-scheme: dark)')
  window.addEventListener('resize', notify, { passive: true })
  reduced.addEventListener('change', notify)
  dark.addEventListener('change', notify)
  return () => {
    window.removeEventListener('resize', notify)
    reduced.removeEventListener('change', notify)
    dark.removeEventListener('change', notify)
  }
}

export function useResponsive(): ResponsiveProps {
  const viewport = useSyncExternalStore(subscribeViewport, readViewport, () => SERVER_VIEWPORT)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => setContainerWidth(entries[0]?.contentRect.width ?? null))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const breakpoint = useMemo(() => {
    let result: Breakpoint = 'xs'
    for (const candidate of ORDER) if (viewport.width >= BREAKPOINTS[candidate]) result = candidate
    return result
  }, [viewport.width])

  const resolve = useCallback(<T,>(value: ResponsiveValue<T>, fallback?: T): T => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value as T
    const map = value as Partial<Record<Breakpoint, T>>
    const currentIndex = ORDER.indexOf(breakpoint)
    for (let index = currentIndex; index >= 0; index -= 1) {
      const candidate = map[ORDER[index]]
      if (candidate !== undefined) return candidate
    }
    const first = ORDER.map(key => map[key]).find(candidate => candidate !== undefined)
    if (first !== undefined) return first
    if (fallback !== undefined) return fallback
    throw new Error(`ResponsiveValue sans valeur résoluble pour ${breakpoint}.`)
  }, [breakpoint])

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isPortrait: viewport.height > viewport.width,
    isLandscape: viewport.width >= viewport.height,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    pixelRatio: viewport.pixelRatio,
    prefersReducedMotion: viewport.reducedMotion,
    prefersDarkMode: viewport.dark,
    resolve,
    containerWidth,
    containerRef,
  }
}
