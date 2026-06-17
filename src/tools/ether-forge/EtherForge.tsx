// ============================================================
//  EtherForge — Composant Principal
//  Atelier de création 3D contrôlé par TroxT
// ============================================================

import type { ForgeConfig, ForgeState } from './types'

interface EtherForgeProps {
  config?: Partial<ForgeConfig>
  onExport?: (data: unknown) => void
  onError?: (error: string) => void
}

// TODO: Implémenter le composant 3D
export function EtherForge(_props: EtherForgeProps) {
  // TODO: Initialiser le renderer Three.js
  // TODO: Monter la scène 3D
  // TODO: Connecter les contrôles
  return null
}

export default EtherForge