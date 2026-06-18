// ============================================================
// 🔀 VARIANT GENERATOR — Combinaisons et variantes
// ============================================================

import * as THREE from 'three'
import type { ForgeAsset, VariantConfig } from '../types/index.js'
import { GeometryGenerator } from './GeometryGenerator.js'
import { MaterialGenerator } from './MaterialGenerator.js'
import { SeededRandom } from '../utils/Random.js'

const rng = new SeededRandom()

export class VariantGenerator {
  private geoGen = new GeometryGenerator()
  private matGen = new MaterialGenerator()

  private defaultConfig: VariantConfig = {
    colorVariants:    3,
    sizeVariants:     2,
    shapeVariants:    2,
    materialVariants: 3,
    maxCombinations:  50,
  }

  // ──────────────────────────────────────────────
  // GÉNÉRER DES VARIANTES DEPUIS UNE BASE
  // ──────────────────────────────────────────────
  async generateFromBase(
    baseAssets: ForgeAsset[],
    count:      number,
    config?:    Partial<VariantConfig>
  ): Promise<ForgeAsset[]> {
    const cfg      = { ...this.defaultConfig, ...config }
    const variants: ForgeAsset[] = []
    let   generated = 0

    for (const base of baseAssets) {
      if (generated >= count) break

      const assetVariants = this.createVariants(base, cfg)

      for (const variant of assetVariants) {
        if (generated >= count) break
        variants.push(variant)
        generated++
      }
    }

    return variants
  }

  // ──────────────────────────────────────────────
  // CRÉER LES VARIANTES D'UN ASSET
  // ──────────────────────────────────────────────
  private createVariants(
    base:   ForgeAsset,
    config: VariantConfig
  ): ForgeAsset[] {
    const variants: ForgeAsset[] = []
    const limit = Math.min(config.maxCombinations, config.colorVariants * config.sizeVariants)

    for (let c = 0; c < config.colorVariants && variants.length < limit; c++) {
      for (let s = 0; s < config.sizeVariants && variants.length < limit; s++) {

        const geo = base.geometry.clone()
        const mat = (base.material as THREE.MeshStandardMaterial).clone()

        // Variante couleur
        const color = new THREE.Color(mat.color)
        color.r = Math.max(0, Math.min(1, color.r + (rng.next() - 0.5) * 0.3))
        color.g = Math.max(0, Math.min(1, color.g + (rng.next() - 0.5) * 0.3))
        color.b = Math.max(0, Math.min(1, color.b + (rng.next() - 0.5) * 0.3))
        mat.color = color
        mat.roughness = Math.max(0, Math.min(1, mat.roughness + (rng.next() - 0.5) * 0.2))

        // Variante taille
        const scale = 0.75 + s * 0.25
        const mesh  = new THREE.Mesh(geo, mat)
        mesh.scale.setScalar(scale)
        mesh.updateMatrix()

        const variant: ForgeAsset = {
          id:       `${base.id}_var_${c}_${s}`,
          name:     `${base.name}_v${c}s${s}`,
          category: base.category,
          type:     base.type,
          subType:  base.subType,
          mesh,
          geometry: geo,
          material: mat,
          size:     base.size * (scale * scale * scale),
          boundingBox: new THREE.Box3().setFromObject(mesh),
          tags:     [...base.tags, 'variant'],
          metadata: {
            ...base.metadata,
            variantOf:  base.id,
            generatedAt: Date.now(),
            generation: (base.metadata.generation || 0) + 1,
          },
        }

        variants.push(variant)
      }
    }

    return variants
  }
}