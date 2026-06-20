import React, { ComponentType, ForwardedRef, forwardRef, useCallback, useMemo } from 'react'
import { useEnhancedConfig } from './context'
import { useAnimation } from './hooks/useAnimation'
import { useData } from './hooks/useData'
import { useInteraction } from './hooks/useInteraction'
import { useLayout } from './hooks/useLayout'
import { useResponsive } from './hooks/useResponsive'
import { useTheme } from './hooks/useTheme'
import type { EnhancedConfig, EnhancedProps, SlotName, SlotProps } from './types'

export type WithoutEnhanced<P> = Omit<P, keyof EnhancedProps>

function mergeConfig<TData,TError>(parent: EnhancedConfig<TData,TError>, local: EnhancedConfig<TData,TError>): EnhancedConfig<TData,TError> {
  return {
    ...parent, ...local,
    theme:{...parent.theme,...local.theme}, animation:{...parent.animation,...local.animation},
    interaction:{...parent.interaction,...local.interaction}, data:{...parent.data,...local.data},
    layout:{...parent.layout,...local.layout,flex:{...parent.layout?.flex,...local.layout?.flex},grid:{...parent.layout?.grid,...local.layout?.grid},spacing:{...parent.layout?.spacing,...local.layout?.spacing}},
    slots:{...parent.slots,...local.slots}, a11y:{...parent.a11y,...local.a11y}, style:{...parent.style,...local.style},
  }
}

export function useEnhancedProps<TData = unknown, TError = Error>(local: EnhancedConfig<TData,TError> = {}): EnhancedProps<TData,TError> {
  const parent = useEnhancedConfig<TData,TError>()
  const config = useMemo(() => mergeConfig(parent, local), [parent, local])
  const responsive = useResponsive()
  const theme = useTheme(config.theme?.variant, config.theme?.size, config.theme?.isDark ?? responsive.prefersDarkMode)
  const animation = useAnimation({ ...config.animation, reducedMotion:responsive.prefersReducedMotion })
  const interaction = useInteraction({ ...config.interaction, a11y:config.a11y })
  const layout = useLayout(config.layout, responsive, theme)
  const data = useData<TData,TError>(config.data)
  const slots = useMemo<SlotProps>(() => {
    const values = config.slots ?? {}
    return {
      slots:values,
      hasSlot:(name:SlotName) => values[name] != null,
      renderSlot:(name:SlotName,fallback?:React.ReactNode) => values[name] ?? fallback ?? null,
    }
  }, [config.slots])

  const enhancedClassName = useMemo(() => [
    'enhanced', `enhanced--${theme.variant}`, `enhanced--${theme.size}`, `enhanced--${responsive.breakpoint}`,
    theme.isDark?'enhanced--dark':'enhanced--light', interaction.state.isHovered&&'is-hovered',
    interaction.state.isFocused&&'is-focused', interaction.state.isPressed&&'is-pressed',
    interaction.state.isDragging&&'is-dragging', data.isLoading&&'is-loading', data.isError&&'is-error', config.className,
  ].filter(Boolean).join(' '), [theme,responsive.breakpoint,interaction.state,data.isLoading,data.isError,config.className])

  const enhancedStyle = useMemo(() => ({
    ...layout.toCSSProperties(), ...theme.cssVars, ...animation.style, ...config.style,
  }), [layout,theme.cssVars,animation.style,config.style])

  return { theme,animation,responsive,interaction,layout,data,slots,enhancedClassName,enhancedStyle }
}

export function withEnhancedProps<
  TProps extends EnhancedProps<TData,TError>, TData = unknown, TError = Error,
>(Wrapped: ComponentType<TProps>, localConfig: EnhancedConfig<TData,TError> = {}) {
  type ExternalProps = WithoutEnhanced<TProps>
  const Enhanced = forwardRef<unknown, ExternalProps>((props, ref) => {
    const enhanced = useEnhancedProps<TData,TError>(localConfig)
    const allProps = { ...props, ...enhanced, ref } as unknown as TProps
    return <Wrapped {...allProps} />
  })
  Enhanced.displayName = `withEnhancedProps(${Wrapped.displayName ?? Wrapped.name ?? 'Component'})`
  return Enhanced
}

export function EnhancedPropsConsumer<TData = unknown,TError = Error>({
  config = {}, children,
}: {
  config?: EnhancedConfig<TData,TError>
  children:(props:EnhancedProps<TData,TError>)=>React.ReactNode
}) {
  return <>{children(useEnhancedProps(config))}</>
}
