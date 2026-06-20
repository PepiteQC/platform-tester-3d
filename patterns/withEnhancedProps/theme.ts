import type { ColorScale, ThemeSize, ThemeTokens, ThemeVariant } from './types'

export const COLOR_SCALES: Record<ThemeVariant, ColorScale> = {
  primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
  secondary: { 50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87' },
  success: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' },
  warning: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f' },
  danger: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337' },
  info: { 50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490',800:'#155e75',900:'#164e63' },
  neutral: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' },
}

const sizes = <T>(values: [T,T,T,T,T,T]): Record<ThemeSize,T> => ({
  xs: values[0], sm: values[1], md: values[2], lg: values[3], xl: values[4], '2xl': values[5],
})

export const THEME_TOKENS: ThemeTokens = {
  spacing: sizes(['0.25rem','0.5rem','1rem','1.5rem','2rem','3rem']),
  fontSize: sizes(['0.75rem','0.875rem','1rem','1.125rem','1.25rem','1.5rem']),
  borderRadius: sizes(['0.125rem','0.25rem','0.375rem','0.5rem','0.75rem','1rem']),
  shadow: {
    none: 'none', sm: '0 1px 2px rgb(0 0 0 / .05)',
    md: '0 4px 8px rgb(0 0 0 / .12)', lg: '0 12px 24px rgb(0 0 0 / .16)',
    xl: '0 24px 48px rgb(0 0 0 / .22)',
  },
  duration: { instant: 0, fast: 120, normal: 240, slow: 480 },
  zIndex: { base: 0, dropdown: 1000, sticky: 1100, overlay: 1200, modal: 1300, toast: 1400 },
}
