// ============================================================
// 🎨 MATERIAL GENERATOR — Génération de palettes PBR
// ============================================================

import * as THREE from 'three'
import type { MaterialStyle } from '../types/index.js'
import { SeededRandom } from '../utils/Random.js'

const rng = new SeededRandom()

// ─────────────────────────────────────────────
// PALETTES PAR STYLE
// ─────────────────────────────────────────────
const PALETTES: Record<MaterialStyle, {
  colors:    string[]
  roughness: [number, number]
  metalness: [number, number]
  emissive?: string
}> = {
  metallic: {
    colors:    ['#8a9098', '#b0b8c0', '#c8ccd0', '#6a7078', '#9aa0a8', '#d4d8dc'],
    roughness: [0.10, 0.45],
    metalness: [0.70, 0.98],
  },
  organic: {
    colors:    ['#6b4a2c', '#8b6040', '#5a8040', '#a07848', '#3a5830', '#c09070'],
    roughness: [0.75, 0.98],
    metalness: [0.00, 0.02],
  },
  stone: {
    colors:    ['#8a8480', '#9a9590', '#7a7878', '#c8c4bc', '#6a6860', '#b0a898'],
    roughness: [0.85, 0.98],
    metalness: [0.00, 0.05],
  },
  wooden: {
    colors:    ['#a87546', '#8b5e3c', '#c8a070', '#6a4828', '#b09060', '#d4a870'],
    roughness: [0.50, 0.82],
    metalness: [0.00, 0.00],
  },
  fabric: {
    colors:    ['#303843', '#c8b898', '#4a5058', '#8090a0', '#1a2848', '#d0c8b0'],
    roughness: [0.82, 0.95],
    metalness: [0.00, 0.00],
  },
  emissive: {
    colors:    ['#00e8ff', '#ff6000', '#00ff40', '#ff0080', '#8800ff', '#ffcc00'],
    roughness: [0.15, 0.30],
    metalness: [0.10, 0.20],
    emissive:  '#00e8ff',
  },
  translucent: {
    colors:    ['#60a0ff', '#8040ff', '#20ff80', '#ff4040', '#9beaff', '#c0e8f0'],
    roughness: [0.03, 0.12],
    metalness: [0.05, 0.20],
  },
  bone: {
    colors:    ['#e8dcc8', '#d4c8a8', '#c8b890', '#f0e8d0', '#b8a888', '#dcd0b8'],
    roughness: [0.75, 0.90],
    metalness: [0.00, 0.02],
  },
  magical: {
    colors:    ['#3a1860', '#1a4080', '#2a6040', '#601820', '#4a3800', '#180840'],
    roughness: [0.20, 0.50],
    metalness: [0.15, 0.40],
    emissive:  '#8800ff',
  },
  paper: {
    colors:    ['#f4f0e4', '#e8e0cc', '#d8d0b8', '#f0e8d8', '#ece4cc', '#e0d8c0'],
    roughness: [0.85, 0.95],
    metalness: [0.00, 0.00],
  },
  heavy: {
    colors:    ['#4a4c50', '#5a5c60', '#3a3c40', '#6a6c70', '#2a2c30', '#7a7c80'],
    roughness: [0.55, 0.78],
    metalness: [0.40, 0.70],
  },
  scaly: {
    colors:    ['#2a4020', '#1a3028', '#3a2818', '#4a3828', '#1a2818', '#302818'],
    roughness: [0.60, 0.82],
    metalness: [0.05, 0.15],
  },
  fur: {
    colors:    ['#5a4030', '#8a6848', '#2a2018', '#3a3028', '#7a5840', '#a08060'],
    roughness: [0.88, 0.98],
    metalness: [0.00, 0.00],
  },
  gemstone: {
    colors:    ['#c01828', '#1a8040', '#1a40a0', '#c09830', '#8040c0', '#c04080'],
    roughness: [0.02, 0.08],
    metalness: [0.05, 0.20],
  },
}

// ─────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────
export class MaterialGenerator {
  private cache = new Map<string, THREE.Material>()

  // ──────────────────────────────────────────────
  // CRÉER UN MATÉRIAU D'UN STYLE
  // ──────────────────────────────────────────────
  create(style: MaterialStyle, index = 0): THREE.Material {
    const palette  = PALETTES[style] ?? PALETTES.organic
    const colorHex = palette.colors[index % palette.colors.length]
    const roughness = rng.range(...palette.roughness)
    const metalness = rng.range(...palette.metalness)

    const mat = new THREE.MeshStandardMaterial({
      color:             new THREE.Color(colorHex),
      roughness,
      metalness,
      emissive:          palette.emissive
                           ? new THREE.Color(palette.emissive)
                           : undefined,
      emissiveIntensity: palette.emissive ? 0.5 + rng.next() * 0.8 : 0,
      transparent:       style === 'translucent',
      opacity:           style === 'translucent' ? 0.3 + rng.next() * 0.5 : 1,
      depthWrite:        style !== 'translucent',
    })

    return mat
  }

  // ──────────────────────────────────────────────
  // GÉNÉRER UNE PALETTE — N matériaux du même style
  // ──────────────────────────────────────────────
  generatePalette(style: MaterialStyle, count: number): THREE.Material[] {
    const palette = PALETTES[style] ?? PALETTES.organic
    const mats:   THREE.Material[] = []

    for (let i = 0; i < count; i++) {
      const colorHex  = palette.colors[i % palette.colors.length]
      const colorVar  = this.variantColor(colorHex, 25)
      const roughness = rng.range(...palette.roughness)
      const metalness = rng.range(...palette.metalness)

      const mat = new THREE.MeshStandardMaterial({
        color:             new THREE.Color(colorVar),
        roughness,
        metalness,
        emissive:          palette.emissive
                             ? new THREE.Color(palette.emissive)
                             : undefined,
        emissiveIntensity: palette.emissive ? 0.3 + rng.next() * 1.0 : 0,
        transparent:       style === 'translucent',
        opacity:           style === 'translucent' ? 0.30 + rng.next() * 0.55 : 1,
        depthWrite:        style !== 'translucent',
      })

      mats.push(mat)
    }

    return mats
  }

  // ──────────────────────────────────────────────
  // VARIANTE COULEUR
  // ──────────────────────────────────────────────
  private variantColor(hex: string, variance: number): string {
    const parse = (s: string) => parseInt(s, 16)
    const clamp = (v: number) => Math.max(0, Math.min(255, v))
    const delta = () => Math.floor((rng.next() - 0.5) * variance * 2)

    const r = clamp(parse(hex.slice(1, 3)) + delta())
    const g = clamp(parse(hex.slice(3, 5)) + delta())
    const b = clamp(parse(hex.slice(5, 7)) + delta())

    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }

  dispose(): void {
    this.cache.forEach(m => m.dispose())
    this.cache.clear()
  }
}