import { useMemo } from 'react'
import { COLOR_SCALES, THEME_TOKENS } from '../theme'
import type { ThemeProps, ThemeSize, ThemeVariant } from '../types'

export function useTheme(
  variant: ThemeVariant = 'primary',
  size: ThemeSize = 'md',
  isDark = false,
): ThemeProps {
  return useMemo(() => {
    const colorScale = COLOR_SCALES[variant]
    const cssVars = Object.fromEntries([
      ...Object.entries(colorScale).map(([tone, value]) => [`--enhanced-${variant}-${tone}`, value]),
      ['--enhanced-foreground', isDark ? colorScale[50] : colorScale[900]],
      ['--enhanced-background', isDark ? colorScale[900] : colorScale[50]],
      ['--enhanced-accent', colorScale[500]],
    ]) as Record<`--${string}`, string>
    return { variant, size, colorScale, isDark, cssVars, tokens: THEME_TOKENS }
  }, [variant, size, isDark])
}
