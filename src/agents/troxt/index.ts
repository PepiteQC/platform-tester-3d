// ============================================================
//  TroxT — Exports
// ============================================================

// Exports publics
export { TroxT } from './TroxT'
export type { TroxTConfig, TroxTState, TroxTEvent } from './TroxT'

// ============================================================
//  Instance Singleton Globale
// ============================================================

import { TroxT } from './TroxT'

// Liste des modules autorisés (optionnel mais propre)
const VALID_MODULES = [
  'ether-prism',
  'ether-forge',
  'ether-weave',
  'ether-lens'
] as const

// Fonction utilitaire pour valider les modules
function validateModules(modules: string[]) {
  return modules.filter(m => VALID_MODULES.includes(m as any))
}

// Création du singleton
export const troxt = new TroxT({
  name: 'TroxT',
  version: '1.0.0',
  modules: validateModules([
    'ether-prism',
    'ether-forge',
    'ether-weave',
    'ether-lens'
  ])
})
