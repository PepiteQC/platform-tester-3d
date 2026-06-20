import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnimationPreset, AnimationProps, EasingFunction } from '../types'

const ANIMATION_NAME: Record<AnimationPreset, string> = {
  fadeIn:'enhanced-fade-in', fadeOut:'enhanced-fade-out', slideUp:'enhanced-slide-up',
  slideDown:'enhanced-slide-down', slideLeft:'enhanced-slide-left', slideRight:'enhanced-slide-right',
  scaleIn:'enhanced-scale-in', scaleOut:'enhanced-scale-out', bounce:'enhanced-bounce',
  pulse:'enhanced-pulse', shake:'enhanced-shake', flip:'enhanced-flip', rotateIn:'enhanced-rotate-in', none:'none',
}

export interface AnimationConfig {
  preset?: AnimationPreset
  duration?: number
  delay?: number
  easing?: EasingFunction
  iteration?: number | 'infinite'
  direction?: AnimationProps['direction']
  fillMode?: AnimationProps['fillMode']
  autoPlay?: boolean
  reducedMotion?: boolean
}

export function useAnimation(config: AnimationConfig = {}): AnimationProps {
  const {
    preset = 'fadeIn', duration = 300, delay = 0, easing = 'ease-out',
    iteration = 1, direction = 'normal', fillMode = 'both', autoPlay = true,
    reducedMotion = false,
  } = config
  const [isPlaying, setIsPlaying] = useState(autoPlay && preset !== 'none' && !reducedMotion)
  const [generation, setGeneration] = useState(0)
  const callbacks = useRef(new Set<() => void>())
  const replayFrame = useRef<number | null>(null)

  useEffect(() => () => {
    if (replayFrame.current !== null) cancelAnimationFrame(replayFrame.current)
  }, [])

  const playAnimation = useCallback(() => setIsPlaying(true), [])
  const pauseAnimation = useCallback(() => setIsPlaying(false), [])
  const resetAnimation = useCallback(({ replay = false }: { replay?: boolean } = {}) => {
    setIsPlaying(false)
    setGeneration(value => value + 1)
    if (replay && !reducedMotion && preset !== 'none') {
      replayFrame.current = requestAnimationFrame(() => setIsPlaying(true))
    }
  }, [preset, reducedMotion])
  const onAnimationEnd = useCallback((callback: () => void) => {
    callbacks.current.add(callback)
    return () => callbacks.current.delete(callback)
  }, [])
  const handleEnd = useCallback(() => {
    if (iteration !== 'infinite') setIsPlaying(false)
    callbacks.current.forEach(callback => callback())
  }, [iteration])

  const style = useMemo<CSSProperties>(() => {
    if (preset === 'none' || reducedMotion) return {}
    return {
      animationName: ANIMATION_NAME[preset],
      animationDuration: `${Math.max(0, duration)}ms`,
      animationDelay: `${Math.max(0, delay)}ms`,
      animationTimingFunction: easing,
      animationIterationCount: iteration,
      animationDirection: direction,
      animationFillMode: fillMode,
      animationPlayState: isPlaying ? 'running' : 'paused',
    }
  }, [preset, reducedMotion, duration, delay, easing, iteration, direction, fillMode, isPlaying])

  return {
    preset, duration, delay, easing, iteration, direction, fillMode,
    isPlaying, generation, playAnimation, pauseAnimation, resetAnimation, onAnimationEnd,
    binding: { key: generation, style, onAnimationEnd: handleEnd },
    style,
  }
}
