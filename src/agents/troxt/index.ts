// ============================================================
//  TroxT — Exports
// ============================================================

export { TroxT } from './TroxT'
export type { TroxTConfig, TroxTState, TroxTEvent } from './TroxT'

// Instance singleton globale
import { TroxT } from './TroxT'

export const troxt = new TroxT({
  name: 'TroxT',
  version: '1.0.0',
  modules: [
    'ether-prism',
    'ether-forge',
    'ether-weave',
    'ether-lens'
  ]
})