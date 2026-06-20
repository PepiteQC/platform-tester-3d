// ============================================================
//  MaterialEditor — Éditeur de matériaux
// ============================================================

import type { ForgeMaterial } from '../types'

interface MaterialEditorProps {
  material?: ForgeMaterial
  onChange?: (material: ForgeMaterial) => void
  onApply?: (material: ForgeMaterial) => void
}

// TODO: Éditeur de matériaux PBR
export function MaterialEditor(_props: MaterialEditorProps) {
  // TODO: Sliders roughness / metalness
  // TODO: Sélecteur de couleur
  // TODO: Upload de textures
  return null
}

export default MaterialEditor