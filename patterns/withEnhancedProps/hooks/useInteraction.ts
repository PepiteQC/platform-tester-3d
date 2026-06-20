import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GestureEvent, InteractionProps, InteractionState } from '../types'

interface InteractionConfig {
  a11y?: Partial<InteractionProps['a11y']>
  longPressDelay?: number
  dragThreshold?: number
  rippleDuration?: number
}

interface Point { x: number; y: number; time: number }
const INITIAL_STATE: InteractionState = {
  isHovered:false, isFocused:false, isPressed:false, isDragging:false,
  isLongPressed:false, clickCount:0, lastInteractionAt:null,
}

export function useInteraction(config: InteractionConfig = {}): InteractionProps {
  const { a11y: a11yConfig = {}, longPressDelay = 500, dragThreshold = 6, rippleDuration = 600 } = config
  const [state, setState] = useState(INITIAL_STATE)
  const [gesture, setGesture] = useState<GestureEvent | null>(null)
  const [ripple, setRipple] = useState({ isActive:false, x:0, y:0 })
  const start = useRef<Point | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }, [])

  useEffect(() => () => {
    clearLongPress()
    if (rippleTimer.current) clearTimeout(rippleTimer.current)
  }, [clearLongPress])

  const update = useCallback((patch: Partial<InteractionState> | ((current: InteractionState) => Partial<InteractionState>)) => {
    setState(current => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
      lastInteractionAt: new Date(),
    }))
  }, [])

  const begin = useCallback((x: number, y: number) => {
    clearLongPress()
    start.current = { x, y, time: performance.now() }
    update({ isPressed:true, isDragging:false, isLongPressed:false })
    longPressTimer.current = setTimeout(() => update({ isLongPressed:true }), longPressDelay)
  }, [clearLongPress, longPressDelay, update])

  const move = useCallback((x: number, y: number) => {
    if (!start.current) return
    const distance = Math.hypot(x - start.current.x, y - start.current.y)
    if (distance >= dragThreshold) {
      clearLongPress()
      update({ isDragging:true, isLongPressed:false })
    }
  }, [clearLongPress, dragThreshold, update])

  const finish = useCallback((x: number, y: number) => {
    clearLongPress()
    const origin = start.current
    start.current = null
    if (!origin) {
      update({ isPressed:false, isDragging:false, isLongPressed:false })
      return
    }
    const duration = Math.max(1, performance.now() - origin.time)
    const deltaX = x - origin.x
    const deltaY = y - origin.y
    const distance = Math.hypot(deltaX, deltaY)
    const direction = distance < dragThreshold ? null
      : Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? 'right' : 'left')
      : (deltaY > 0 ? 'down' : 'up')
    setGesture({ deltaX, deltaY, distance, direction, duration, velocity: distance / duration })
    update(current => ({
      isPressed:false, isDragging:false, isLongPressed:false,
      clickCount: distance < dragThreshold ? current.clickCount + 1 : current.clickCount,
    }))
  }, [clearLongPress, dragThreshold, update])

  const resetInteraction = useCallback(() => {
    clearLongPress()
    start.current = null
    setGesture(null)
    setState(INITIAL_STATE)
  }, [clearLongPress])

  const handlers = useMemo<InteractionProps['handlers']>(() => ({
    onMouseEnter: () => update({ isHovered:true }),
    onMouseLeave: () => { clearLongPress(); update({ isHovered:false, isPressed:false, isDragging:false }) },
    onFocus: () => update({ isFocused:true }),
    onBlur: () => { clearLongPress(); update({ isFocused:false, isPressed:false }) },
    onPointerDown: event => begin(event.clientX, event.clientY),
    onPointerMove: event => move(event.clientX, event.clientY),
    onPointerUp: event => finish(event.clientX, event.clientY),
    onPointerCancel: () => resetInteraction(),
    onTouchStart: event => { const touch = event.touches[0]; if (touch) begin(touch.clientX, touch.clientY) },
    onTouchEnd: event => { const touch = event.changedTouches[0]; if (touch) finish(touch.clientX, touch.clientY) },
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.key === ' ') event.preventDefault()
        update({ isPressed:true })
      }
    },
    onKeyUp: event => {
      if (event.key === 'Enter' || event.key === ' ') update(current => ({ isPressed:false, clickCount:current.clickCount + 1 }))
    },
  }), [begin, clearLongPress, finish, move, resetInteraction, update])

  const trigger = useCallback<InteractionProps['ripple']['trigger']>(event => {
    const rect = event.currentTarget.getBoundingClientRect()
    setRipple({ isActive:true, x:event.clientX - rect.left, y:event.clientY - rect.top })
    if (rippleTimer.current) clearTimeout(rippleTimer.current)
    rippleTimer.current = setTimeout(() => setRipple(current => ({ ...current, isActive:false })), rippleDuration)
  }, [rippleDuration])

  const rippleStyle = useMemo<CSSProperties>(() => ({
    position:'absolute', width:100, height:100, left:ripple.x - 50, top:ripple.y - 50,
    borderRadius:'50%', pointerEvents:'none', background:'rgb(255 255 255 / .28)',
    transform:ripple.isActive ? 'scale(2.4)' : 'scale(0)', opacity:ripple.isActive ? 0 : 1,
    transition:`transform ${rippleDuration}ms ease-out, opacity ${rippleDuration}ms ease-out`,
  }), [ripple, rippleDuration])

  const a11y = useMemo<InteractionProps['a11y']>(() => ({
    role:'button', tabIndex:0, ariaLabel:'', ariaDisabled:false, ariaLive:'polite', ...a11yConfig,
  }), [a11yConfig])

  return { state, gesture, a11y, handlers, ripple:{ ...ripple, trigger, style:rippleStyle }, resetInteraction }
}
