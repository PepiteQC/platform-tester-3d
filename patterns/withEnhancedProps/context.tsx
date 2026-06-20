import React, { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import type { EnhancedConfig } from './types'

const EnhancedConfigContext = createContext<EnhancedConfig>({})

export function EnhancedPropsProvider({ config, children }: PropsWithChildren<{ config: EnhancedConfig }>) {
  const parent = useContext(EnhancedConfigContext)
  const value = useMemo<EnhancedConfig>(() => ({
    ...parent,
    ...config,
    theme: { ...parent.theme, ...config.theme },
    animation: { ...parent.animation, ...config.animation },
    interaction: { ...parent.interaction, ...config.interaction },
    layout: {
      ...parent.layout,
      ...config.layout,
      flex: { ...parent.layout?.flex, ...config.layout?.flex },
      grid: { ...parent.layout?.grid, ...config.layout?.grid },
      spacing: { ...parent.layout?.spacing, ...config.layout?.spacing },
    },
    data: { ...parent.data, ...config.data },
    slots: { ...parent.slots, ...config.slots },
    a11y: { ...parent.a11y, ...config.a11y },
    style: { ...parent.style, ...config.style },
  }), [parent, config])
  return <EnhancedConfigContext.Provider value={value}>{children}</EnhancedConfigContext.Provider>
}

export function useEnhancedConfig<TData = unknown, TError = Error>() {
  return useContext(EnhancedConfigContext) as EnhancedConfig<TData, TError>
}
