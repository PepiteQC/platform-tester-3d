// ============================================================
// 🔥 FORGE3D LIB — Pont principal CORRIGÉ
// EtherForge ↔ ForgeFactory ↔ EtherPrism
// ============================================================

import { forge3DCore }     from '../core/forge3D.js'
import { factoryEngine }   from '../../forge-factory/engine/FactoryEngine.js'
import { etherPrism }      from '../../etherprism/genesis/EtherPrism.js'
import { animationEngine } from '../animation/animationEngine.js'
import {
  ETHER_MATERIALS,
  getMaterialsByCategory,
  searchMaterials,
  CATALOG_STATS,
  getMaterialDef,
}                          from '../materials/etherMaterials.js'
import type { ForgeConfig } from '../types/index.js'

// ─────────────────────────────────────────────
// INTERFACE UNIFIÉE
// ─────────────────────────────────────────────
class Forge3DLib {
  private initialized = false
  private brainId:    string | null = null

  // ──────────────────────────────────────────
  // INIT COMPLET
  // ──────────────────────────────────────────
  async init(
    canvas: HTMLCanvasElement,
    config?: Partial<ForgeConfig>
  ): Promise<void> {
    if (this.initialized) return

    console.log('🚀 Forge3D Lib — Initialisation...')

    // 1. Moteur 3D WebGL2
    await forge3DCore.init(canvas, config)

    // 2. Cerveau IA EtherPrism
    try {
      const brain = await etherPrism.createBrain({
        name:           'SceneBrain',
        intelligence:   0.88,
        creativity:     0.82,
        memory:         0.92,
        learningRate:   0.72,
        mutationRate:   0.08,
        specialization: 'analytical',
        depth:          6,
        complexity:     8,
        adaptability:   0.85,
      })
      this.brainId = brain.id
      console.log(`   🧠 Cerveau: ${brain.name} (IQ: ${brain.metrics.iq.toFixed(0)})`)
    } catch (err) {
      console.warn('   ⚠️ EtherPrism non disponible:', err)
    }

    this.initialized = true
    console.log('✅ Forge3D Lib opérationnel')
    console.log(`   🌍 Matériaux: ${ETHER_MATERIALS.length}`)
    console.log(`   🏭 Factory: prêt`)
  }

  // ──────────────────────────────────────────
  // IA — Analyser avec le cerveau
  // ──────────────────────────────────────────
  async analyzeWithBrain(input: string): Promise<string> {
    if (!this.brainId) return 'IA non initialisée'
    try {
      const thought = await etherPrism.think(this.brainId, input)
      return thought.output
    } catch {
      return 'Erreur IA'
    }
  }

  // ──────────────────────────────────────────
  // FACTORY — Générer des assets
  // ──────────────────────────────────────────
  async generateAssets(count = 50) {
    return factoryEngine.generatePack(count)
  }

  // ──────────────────────────────────────────
  // MATÉRIAUX — Recherche et filtres
  // ──────────────────────────────────────────
  findMaterials(query: string) {
    return searchMaterials(query)
  }

  getByCategory(cat: string) {
    return getMaterialsByCategory(cat)
  }

  getMaterial(id: string) {
    return getMaterialDef(id)
  }

  // ──────────────────────────────────────────
  // ACCÈS SOUS-SYSTÈMES
  // ──────────────────────────────────────────
  get engine()     { return forge3DCore    }
  get factory()    { return factoryEngine  }
  get brain()      { return etherPrism     }
  get materials()  { return ETHER_MATERIALS }
  get animations() { return animationEngine }

  // ──────────────────────────────────────────
  // STATS GLOBALES
  // ──────────────────────────────────────────
  getStats() {
    return {
      engine: forge3DCore.getStats(),
      factory: {
        generated: factoryEngine.getGeneratedCount(),
        running:   factoryEngine.isGenerating(),
      },
      brain:     etherPrism.getStats(),
      materials: {
        total:       ETHER_MATERIALS.length,
        categories:  CATALOG_STATS.categories,
        emissive:    CATALOG_STATS.emissive,
        transparent: CATALOG_STATS.transparent,
      },
      animations: animationEngine.getStats(),
      ready:      this.initialized,
    }
  }

  isReady():    boolean       { return this.initialized }
  getBrainId(): string | null { return this.brainId     }
}

export const forge3DLib = new Forge3DLib()
export default forge3DLib