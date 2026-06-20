import type {
  AnimationEventHandler,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
  TouchEventHandler,
} from 'react'

export type ColorScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>
export type ThemeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type ThemeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type Breakpoint = ThemeSize
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

export interface ThemeTokens {
  spacing: Record<ThemeSize, string>
  fontSize: Record<ThemeSize, string>
  borderRadius: Record<ThemeSize, string>
  shadow: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', string>
  duration: Record<'instant' | 'fast' | 'normal' | 'slow', number>
  zIndex: Record<'base' | 'dropdown' | 'sticky' | 'overlay' | 'modal' | 'toast', number>
}

export interface ThemeProps {
  variant: ThemeVariant
  size: ThemeSize
  colorScale: ColorScale
  isDark: boolean
  cssVars: Record<`--${string}`, string>
  tokens: ThemeTokens
}

export type EasingFunction =
  | 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`

export type AnimationPreset =
  | 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'scaleIn' | 'scaleOut' | 'bounce' | 'pulse' | 'shake' | 'flip' | 'rotateIn' | 'none'

export interface AnimationBinding {
  key: number
  style: CSSProperties
  onAnimationEnd: AnimationEventHandler<HTMLElement>
}

export interface AnimationProps {
  preset: AnimationPreset
  duration: number
  delay: number
  easing: EasingFunction
  iteration: number | 'infinite'
  direction: CSSProperties['animationDirection']
  fillMode: CSSProperties['animationFillMode']
  isPlaying: boolean
  generation: number
  playAnimation(): void
  pauseAnimation(): void
  resetAnimation(options?: { replay?: boolean }): void
  onAnimationEnd(callback: () => void): () => void
  binding: AnimationBinding
  style: CSSProperties
}

export interface ResponsiveProps {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isPortrait: boolean
  isLandscape: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  prefersReducedMotion: boolean
  prefersDarkMode: boolean
  resolve<T>(value: ResponsiveValue<T>, fallback?: T): T
  containerWidth: number | null
  containerRef: RefObject<HTMLDivElement>
}

export interface GestureEvent {
  deltaX: number
  deltaY: number
  velocity: number
  direction: 'up' | 'down' | 'left' | 'right' | null
  distance: number
  duration: number
}

export interface InteractionState {
  isHovered: boolean
  isFocused: boolean
  isPressed: boolean
  isDragging: boolean
  isLongPressed: boolean
  clickCount: number
  lastInteractionAt: Date | null
}

export interface InteractionHandlers {
  onMouseEnter: MouseEventHandler<HTMLElement>
  onMouseLeave: MouseEventHandler<HTMLElement>
  onFocus: FocusEventHandler<HTMLElement>
  onBlur: FocusEventHandler<HTMLElement>
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerMove: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
  onPointerCancel: PointerEventHandler<HTMLElement>
  onTouchStart: TouchEventHandler<HTMLElement>
  onTouchEnd: TouchEventHandler<HTMLElement>
  onKeyDown: KeyboardEventHandler<HTMLElement>
  onKeyUp: KeyboardEventHandler<HTMLElement>
}

export interface InteractionProps {
  state: InteractionState
  gesture: GestureEvent | null
  a11y: {
    role: string
    tabIndex: number
    ariaLabel: string
    ariaDescribedBy?: string
    ariaExpanded?: boolean
    ariaDisabled: boolean
    ariaLive: 'off' | 'polite' | 'assertive'
  }
  handlers: InteractionHandlers
  ripple: {
    isActive: boolean
    x: number
    y: number
    trigger: MouseEventHandler<HTMLElement>
    style: CSSProperties
  }
  resetInteraction(): void
}

export interface FlexProps {
  direction?: CSSProperties['flexDirection']
  justify?: CSSProperties['justifyContent']
  align?: CSSProperties['alignItems']
  wrap?: CSSProperties['flexWrap']
  gap?: ResponsiveValue<ThemeSize | number | string>
}

export interface GridProps {
  columns?: ResponsiveValue<number | string>
  rows?: ResponsiveValue<number | string>
  gap?: ResponsiveValue<ThemeSize | number | string>
  areas?: string[][]
  autoFlow?: CSSProperties['gridAutoFlow']
}

export interface LayoutConfig {
  display?: 'flex' | 'grid' | 'block' | 'inline-block' | 'none'
  flex?: FlexProps
  grid?: GridProps
  spacing?: {
    padding?: ResponsiveValue<ThemeSize | number | string>
    margin?: ResponsiveValue<ThemeSize | number | string>
  }
  position?: CSSProperties['position']
  inset?: CSSProperties['inset']
  zIndex?: number
  overflow?: CSSProperties['overflow']
  width?: ResponsiveValue<number | string>
  height?: ResponsiveValue<number | string>
}

export interface LayoutProps extends Required<Pick<LayoutConfig, 'display' | 'position' | 'zIndex' | 'overflow'>> {
  flex: FlexProps
  grid: GridProps
  spacing: NonNullable<LayoutConfig['spacing']>
  toCSSProperties(): CSSProperties
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface DataProps<TData = unknown, TError = Error> {
  loadingState: LoadingState
  data: TData | null
  error: TError | null
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isEmpty: boolean
  timestamp: Date | null
  attempt: number
  refetch(): Promise<TData | null>
  reset(): void
  retry(maxAttempts?: number): Promise<TData | null>
  mutate(updater: TData | null | ((current: TData | null) => TData | null)): void
  cancel(): void
  skeleton: {
    lines: number
    isAnimated: boolean
    style: CSSProperties
  }
}

export type SlotName = 'header' | 'footer' | 'sidebar' | 'content' | 'overlay' | 'badge' | 'icon' | 'action'
export interface SlotProps {
  slots: Partial<Record<SlotName, ReactNode>>
  hasSlot(name: SlotName): boolean
  renderSlot(name: SlotName, fallback?: ReactNode): ReactNode
}

export interface EnhancedProps<TData = unknown, TError = Error> {
  theme: ThemeProps
  animation: AnimationProps
  responsive: ResponsiveProps
  interaction: InteractionProps
  layout: LayoutProps
  data: DataProps<TData, TError>
  slots: SlotProps
  enhancedClassName: string
  enhancedStyle: CSSProperties
}

export interface EnhancedConfig<TData = unknown, TError = Error> {
  theme?: Partial<Pick<ThemeProps, 'variant' | 'size' | 'isDark'>>
  animation?: Partial<Pick<AnimationProps, 'preset' | 'duration' | 'delay' | 'easing' | 'iteration' | 'direction' | 'fillMode'>> & {
    autoPlay?: boolean
  }
  interaction?: {
    longPressDelay?: number
    dragThreshold?: number
    rippleDuration?: number
  }
  layout?: LayoutConfig
  data?: {
    fetcher?: (signal: AbortSignal) => Promise<TData>
    initialData?: TData
    auto?: boolean
    retryDelayMs?: number
    isEmpty?: (data: TData | null) => boolean
    mapError?: (error: unknown) => TError
  }
  slots?: Partial<Record<SlotName, ReactNode>>
  a11y?: Partial<InteractionProps['a11y']>
  className?: string
  style?: CSSProperties
}
