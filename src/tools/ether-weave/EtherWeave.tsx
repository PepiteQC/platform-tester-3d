// ============================================================
//  EtherWeave — Composant Principal
//  Tisseur de textures procédurales
// ============================================================

import type { WeaveConfig } from './types'

interface EtherWeaveProps {
  config?: Partial<WeaveConfig>
  onExport?: (blob: Blob) => void
}

// TODO: Éditeur de textures procédurales
export function EtherWeave(_props: EtherWeaveProps) {
  // TODO: Canvas de dessin
  // TODO: Sélecteur de patterns
  // TODO: Contrôles de tiles
  return null
}

export default EtherWeave