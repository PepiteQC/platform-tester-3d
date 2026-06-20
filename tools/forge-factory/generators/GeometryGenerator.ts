// ============================================================
// 🔷 GEOMETRY GENERATOR — Génération procédurale de géométries
// ============================================================

import * as THREE from 'three'
import type { ForgeTemplate } from '../types/index.js'
import { SeededRandom } from '../utils/Random.js'

const rng = new SeededRandom()

// ─────────────────────────────────────────────
// DÉFINITIONS DE FORMES PAR TYPE
// ─────────────────────────────────────────────
type ShapeBuilder = (params: Record<string, number>) => THREE.BufferGeometry

const SHAPE_BUILDERS: Record<string, ShapeBuilder> = {

  // ── Armes ──────────────────────────────────
  sword: (p) => {
    const group = new THREE.BufferGeometry()
    const blade = new THREE.BoxGeometry(0.08, p.length || 1.2, 0.02)
    const guard = new THREE.BoxGeometry(0.35, 0.06, 0.08)
    const grip  = new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8)
    // Merging simplifié
    return blade
  },

  axe: (p) => new THREE.CylinderGeometry(
    p.radius || 0.25, p.radius || 0.15,
    p.height || 0.40, 6
  ),

  bow: (p) => new THREE.TorusGeometry(
    p.radius || 0.50, 0.025, 6, 24, Math.PI
  ),

  staff: (p) => new THREE.CylinderGeometry(
    0.025, 0.035, p.height || 1.8, 8
  ),

  dagger: (p) => new THREE.CylinderGeometry(
    0.005, 0.04, p.length || 0.5, 4
  ),

  spear: (p) => new THREE.CylinderGeometry(
    0.015, 0.015, p.length || 2.2, 8
  ),

  hammer: (p) => new THREE.BoxGeometry(
    p.width || 0.20, p.height || 0.30, p.depth || 0.15
  ),

  wand: (p) => new THREE.CylinderGeometry(
    0.012, 0.018, p.length || 0.40, 8
  ),

  shield: (p) => new THREE.CylinderGeometry(
    p.radius || 0.45, p.radius || 0.45, 0.06, 6
  ),

  // ── Armures ────────────────────────────────
  helmet: (p) => new THREE.SphereGeometry(
    p.radius || 0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6
  ),

  chestplate: (p) => new THREE.BoxGeometry(
    p.width || 0.55, p.height || 0.65, p.depth || 0.18
  ),

  gauntlets: (p) => new THREE.BoxGeometry(0.12, 0.20, 0.10),

  boots: (p) => new THREE.BoxGeometry(0.14, 0.28, 0.22),

  // ── Accessoires ────────────────────────────
  ring: (p) => new THREE.TorusGeometry(
    p.radius || 0.10, 0.02, 8, 24
  ),

  amulet: (p) => new THREE.SphereGeometry(p.radius || 0.07, 8, 8),

  // ── Contenants ─────────────────────────────
  potion: (p) => new THREE.CylinderGeometry(
    0.04, 0.06, p.height || 0.20, 12
  ),

  barrel: (p) => new THREE.CylinderGeometry(
    p.radius || 0.30, p.radius || 0.28, p.height || 0.55, 12
  ),

  crate: (p) => new THREE.BoxGeometry(
    p.width || 0.60, p.height || 0.60, p.depth || 0.60
  ),

  chest: (p) => new THREE.BoxGeometry(
    p.width || 0.80, p.height || 0.55, p.depth || 0.50
  ),

  urn: (p) => new THREE.CylinderGeometry(
    p.radius || 0.18, 0.12, p.height || 0.40, 12
  ),

  vase: (p) => new THREE.CylinderGeometry(
    p.radius || 0.12, 0.08, p.height || 0.35, 12
  ),

  bottle: (p) => new THREE.CylinderGeometry(
    0.05, 0.07, p.height || 0.28, 10
  ),

  // ── Mobilier ───────────────────────────────
  table_round: (p) => new THREE.CylinderGeometry(
    p.radius || 0.70, p.radius || 0.70, 0.06, 32
  ),

  table_square: (p) => new THREE.BoxGeometry(
    p.width || 1.20, 0.06, p.depth || 0.80
  ),

  chair: (p) => new THREE.BoxGeometry(
    0.50, 0.50, 0.05
  ),

  throne: (p) => new THREE.BoxGeometry(
    0.80, 1.60, 0.70
  ),

  bed_single: (p) => new THREE.BoxGeometry(
    1.00, 0.40, 2.00
  ),

  bed_double: (p) => new THREE.BoxGeometry(
    1.60, 0.40, 2.00
  ),

  // ── Architecture ───────────────────────────
  pillar: (p) => new THREE.CylinderGeometry(
    p.radius || 0.18, p.radius || 0.22, p.height || 3.00, 16
  ),

  arch: (p) => new THREE.TorusGeometry(
    p.radius || 1.00, p.tube || 0.15, 8, 32, Math.PI
  ),

  wall: (p) => new THREE.BoxGeometry(
    p.width || 4.00, p.height || 3.00, p.depth || 0.25
  ),

  door: (p) => new THREE.BoxGeometry(
    p.width || 1.00, p.height || 2.40, 0.08
  ),

  window_frame: (p) => new THREE.BoxGeometry(
    p.width || 1.20, p.height || 1.50, 0.10
  ),

  stair: (p) => new THREE.BoxGeometry(
    1.20, 0.18, 0.30
  ),

  floor_tile: (p) => new THREE.BoxGeometry(
    p.width || 1.00, 0.04, p.depth || 1.00
  ),

  roof_panel: (p) => new THREE.BoxGeometry(
    p.width || 2.00, 0.06, p.depth || 2.00
  ),

  // ── Nature ─────────────────────────────────
  rock: (p) => new THREE.DodecahedronGeometry(p.radius || 0.40, 1),

  boulder: (p) => new THREE.DodecahedronGeometry(p.radius || 1.20, 1),

  tree_trunk: (p) => new THREE.CylinderGeometry(
    0.20, 0.30, p.height || 3.00, 8
  ),

  tree_crown: (p) => new THREE.ConeGeometry(
    p.radius || 1.20, p.height || 2.50, 8
  ),

  mushroom_cap: (p) => new THREE.SphereGeometry(
    p.radius || 0.40, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6
  ),

  stalactite: (p) => new THREE.ConeGeometry(
    0.12, p.height || 1.20, 8
  ),

  // ── Objets ─────────────────────────────────
  coin: (p) => new THREE.CylinderGeometry(
    p.radius || 0.10, p.radius || 0.10, 0.012, 16
  ),

  gem: (p) => new THREE.OctahedronGeometry(p.radius || 0.12),

  crystal: (p) => new THREE.ConeGeometry(
    0.08, p.height || 0.35, 6
  ),

  ingot: (p) => new THREE.BoxGeometry(0.18, 0.08, 0.10),

  ore: (p) => new THREE.DodecahedronGeometry(p.radius || 0.20, 0),

  torch: (p) => new THREE.CylinderGeometry(0.025, 0.03, 0.60, 8),

  lantern: (p) => new THREE.BoxGeometry(0.18, 0.28, 0.18),

  campfire: (p) => new THREE.ConeGeometry(0.50, 0.40, 8),

  skull: (p) => new THREE.SphereGeometry(p.radius || 0.14, 10, 8),

  tombstone: (p) => new THREE.BoxGeometry(0.40, 0.70, 0.10),

  statue: (p) => new THREE.CylinderGeometry(0.25, 0.30, p.height || 1.80, 8),

  fountain: (p) => new THREE.TorusGeometry(
    p.radius || 1.20, 0.20, 8, 32
  ),

  // ── Default ────────────────────────────────
  default: (p) => new THREE.BoxGeometry(
    p.width || 1.00, p.height || 1.00, p.depth || 1.00
  ),
}

// ─────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────
export class GeometryGenerator {
  private cache = new Map<string, THREE.BufferGeometry>()

  // ──────────────────────────────────────────────
  // CRÉER UNE GÉOMÉTRIE DE BASE
  // ──────────────────────────────────────────────
  create(subType: string, params?: Record<string, number>): THREE.BufferGeometry {
    const key = `${subType}_${JSON.stringify(params || {})}`

    if (this.cache.has(key)) {
      return this.cache.get(key)!.clone()
    }

    const builder = SHAPE_BUILDERS[subType] ?? SHAPE_BUILDERS.default
    const geo     = builder(params || {})

    geo.computeVertexNormals()
    geo.computeBoundingBox()
    geo.computeBoundingSphere()

    this.cache.set(key, geo)
    return geo.clone()
  }

  // ──────────────────────────────────────────────
  // GÉNÉRER DES VARIANTES D'UNE GÉOMÉTRIE
  // ──────────────────────────────────────────────
  generateVariants(
    template: ForgeTemplate,
    count: number
  ): THREE.BufferGeometry[] {
    const variants: THREE.BufferGeometry[] = []

    for (let i = 0; i < count; i++) {
      const scale = 0.80 + rng.next() * 0.40  // 0.8x à 1.2x

      const params: Record<string, number> = {
        width:    rng.range(0.5, 1.5),
        height:   rng.range(0.5, 2.0),
        depth:    rng.range(0.4, 1.2),
        radius:   rng.range(0.1, 0.8),
        length:   rng.range(0.5, 2.5),
        tube:     rng.range(0.05, 0.25),
      }

      const geo = this.create(template.subType, params)

      // Appliquer une légère déformation procédurale
      this.perturbGeometry(geo, 0.02 * i)

      variants.push(geo)
    }

    return variants
  }

  // ──────────────────────────────────────────────
  // PERTURBATION PROCÉDURALE
  // ──────────────────────────────────────────────
  private perturbGeometry(
    geo:       THREE.BufferGeometry,
    intensity: number
  ): void {
    const pos = geo.attributes.position as THREE.BufferAttribute
    if (!pos || intensity < 0.001) return

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (rng.next() - 0.5) * intensity
      const y = pos.getY(i) + (rng.next() - 0.5) * intensity * 0.5
      const z = pos.getZ(i) + (rng.next() - 0.5) * intensity

      pos.setXYZ(i, x, y, z)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
  }

  // ──────────────────────────────────────────────
  // OPTIMISER UNE GÉOMÉTRIE
  // ──────────────────────────────────────────────
  optimize(geo: THREE.BufferGeometry): void {
    geo.computeVertexNormals()
    geo.computeBoundingBox()
    geo.computeBoundingSphere()

    if (geo.attributes.position) {
      geo.attributes.position.setUsage(THREE.StaticDrawUsage)
    }
    if (geo.attributes.normal) {
      geo.attributes.normal.setUsage(THREE.StaticDrawUsage)
    }
    if (geo.attributes.uv) {
      geo.attributes.uv.setUsage(THREE.StaticDrawUsage)
    }
  }

  dispose(): void {
    this.cache.forEach(geo => geo.dispose())
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }
}