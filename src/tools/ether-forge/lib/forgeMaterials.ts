// ============================================================
//  forgeMaterials — Bibliothèque de matériaux
// ============================================================

import type { ForgeMaterial } from '../types'

export const DEFAULT_MATERIALS: ForgeMaterial[] = [
  // TODO: Ajouter les matériaux par défaut
]

export class ForgeMaterials {
  private materials: Map<string, ForgeMaterial> = new Map()

  // TODO: Créer un matériau
  create(_params: Partial<ForgeMaterial>): ForgeMaterial {
    return {} as ForgeMaterial
  }

  // TODO: Charger depuis une URL
  async loadFromUrl(_url: string): Promise<ForgeMaterial | null> { return null }

  // TODO: Convertir en Three.js Material
  toThreeMaterial(_material: ForgeMaterial): unknown { return null }

  // TODO: Exporter en JSON
  toJSON(_material: ForgeMaterial): Record<string, unknown> { return {} }

  getAll(): ForgeMaterial[] {
    return Array.from(this.materials.values())
  }
}

export const forgeMaterials = new ForgeMaterials()
export default ForgeMaterials