// ============================================================
//  EtherLens — Composant Principal
//  Lentille d'analyse visuelle de TroxT
// ============================================================

import type { LensConfig } from './types'

interface EtherLensProps {
  config?: Partial<LensConfig>
  onReport?: (report: unknown) => void
}

// TODO: Interface d'analyse
export function EtherLens(_props: EtherLensProps) {
  // TODO: Viewport d'analyse
  // TODO: Overlays des détections
  // TODO: Panneau de mesures
  return null
}

export default EtherLens