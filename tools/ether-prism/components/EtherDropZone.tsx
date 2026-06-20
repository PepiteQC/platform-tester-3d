// ============================================================
//  EtherDropZone — Drag & Drop
// ============================================================

import type { PrismInput } from '../types'

interface EtherDropZoneProps {
  onDrop?: (input: PrismInput) => void
  accept?: string[]
  maxSize?: number
  multiple?: boolean
}

// TODO: Implémenter le drag & drop
export function EtherDropZone(_props: EtherDropZoneProps) {
  // TODO: Gérer le drag & drop
  // TODO: Valider les fichiers
  // TODO: Créer PrismInput depuis les fichiers droppés
  return null
}

export default EtherDropZone