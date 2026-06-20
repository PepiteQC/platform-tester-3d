import { CSSProperties, useMemo } from 'react'
import type { LayoutConfig, LayoutProps, ResponsiveProps, ThemeProps, ThemeSize } from '../types'

function cssValue(value: ThemeSize | number | string | undefined, theme: ThemeProps): string | number | undefined {
  if (value === undefined) return undefined
  return value in theme.tokens.spacing ? theme.tokens.spacing[value as ThemeSize] : value
}
function gridTrack(value: number | string | undefined) {
  if (typeof value === 'number') return `repeat(${Math.max(1, Math.floor(value))}, minmax(0, 1fr))`
  return value
}

export function useLayout(config: LayoutConfig = {}, responsive: ResponsiveProps, theme: ThemeProps): LayoutProps {
  return useMemo(() => {
    const display = config.display ?? (config.grid?.columns || config.grid?.rows ? 'grid' : 'flex')
    const flex = config.flex ?? {}
    const grid = config.grid ?? {}
    const spacing = config.spacing ?? {}
    const position = config.position ?? 'relative'
    const zIndex = config.zIndex ?? 0
    const overflow = config.overflow ?? 'visible'

    const toCSSProperties = (): CSSProperties => {
      const gap = display === 'grid' ? grid.gap : flex.gap
      return {
        display,
        position,
        inset: config.inset,
        zIndex,
        overflow,
        width: responsive.resolve(config.width ?? 'auto'),
        height: responsive.resolve(config.height ?? 'auto'),
        padding: cssValue(responsive.resolve(spacing.padding ?? 'md'), theme),
        margin: cssValue(responsive.resolve(spacing.margin ?? 0), theme),
        flexDirection: flex.direction,
        justifyContent: flex.justify,
        alignItems: flex.align,
        flexWrap: flex.wrap,
        gap: cssValue(gap === undefined ? undefined : responsive.resolve(gap), theme),
        gridTemplateColumns: gridTrack(grid.columns === undefined ? undefined : responsive.resolve(grid.columns)),
        gridTemplateRows: gridTrack(grid.rows === undefined ? undefined : responsive.resolve(grid.rows)),
        gridTemplateAreas: grid.areas?.map(row => `"${row.join(' ')}"`).join(' '),
        gridAutoFlow: grid.autoFlow,
      }
    }
    return { display, flex, grid, spacing, position, zIndex, overflow, toCSSProperties }
  }, [config, responsive, theme])
}
