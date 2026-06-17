// ============================================================
//  PatternLibrary — Bibliothèque de patterns
// ============================================================

import type { WeavePattern } from '../types'

interface PatternLibraryProps {
  patterns?: WeavePattern[]
  selected?: string
  onSelect?: (pattern: WeavePattern) => void
}

// TODO: Galerie de patterns
export function PatternLibrary(_props: PatternLibraryProps) {
  // TODO: Grid de patterns avec preview
  // TODO: Filtres par type
  // TODO: Recherche
  return null
}

export default PatternLibrary