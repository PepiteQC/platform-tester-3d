// ============================================================
// 🎨 TEXTURE GENERATOR — Procédural HD sans fichiers externes
// Béton, bois, pierre, asphalte, néon... tout généré en RAM
// ============================================================

import * as THREE from 'three'
import type { EtherMaterialDef, EtherCategory } from '../types/index.js'

const TEXTURE_SIZE = 256

// ─────────────────────────────────────────────
// REGISTRE DES GÉNÉRATEURS PAR CATÉGORIE
// ─────────────────────────────────────────────
type TextureGenerator = (
  ctx: CanvasRenderingContext2D,
  def: EtherMaterialDef
) => void

const GENERATORS: Partial<Record<EtherCategory | string, TextureGenerator>> = {

  // ── ARCHITECTURE ──────────────────────────────────────────
  architecture: (ctx, def) => {
    // Base couleur
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Micro-grain (béton / pierre)
    for (let i = 0; i < 5000; i++) {
      const v = Math.random() > 0.5 ? 255 : 0
      const a = 0.04 + Math.random() * 0.04
      ctx.fillStyle = `rgba(${v},${v},${v},${a})`
      const s = 1 + Math.random() * 2
      ctx.fillRect(
        Math.random() * TEXTURE_SIZE,
        Math.random() * TEXTURE_SIZE,
        s, s
      )
    }

    // Craquelures
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 0.6
    for (let i = 0; i < 20; i++) {
      ctx.beginPath()
      let x = Math.random() * TEXTURE_SIZE
      let y = Math.random() * TEXTURE_SIZE
      ctx.moveTo(x, y)
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 28
        y += (Math.random() - 0.5) * 28
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },

  // ── INTERIOR — BOIS ───────────────────────────────────────
  interior: (ctx, def) => {
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Grain de bois (si c'est du bois)
    if (def.id.includes('wood') || def.id.includes('floor') || def.id.includes('hardwood')) {
      // Veines du bois
      for (let y = 0; y < TEXTURE_SIZE; y += 6 + Math.random() * 4) {
        const alpha = 0.06 + Math.random() * 0.08
        ctx.fillStyle = `rgba(0,0,0,${alpha})`
        ctx.fillRect(0, y, TEXTURE_SIZE, 1 + Math.random())
      }

      // Noeuds de bois
      for (let n = 0; n < 2; n++) {
        const cx = Math.random() * TEXTURE_SIZE
        const cy = Math.random() * TEXTURE_SIZE
        for (let r = 20; r > 0; r -= 3) {
          ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.ellipse(cx, cy, r, r * 0.6, Math.random(), 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // Micro-grain général
    for (let i = 0; i < 2000; i++) {
      const v = Math.random() > 0.5 ? 255 : 0
      ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.025})`
      ctx.fillRect(Math.random() * TEXTURE_SIZE, Math.random() * TEXTURE_SIZE, 1, 1)
    }
  },

  // ── TERRAIN ───────────────────────────────────────────────
  terrain: (ctx, def) => {
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Texture dense pour terrain
    for (let i = 0; i < 8000; i++) {
      const v = Math.random() > 0.5 ? 255 : 0
      const a = 0.04 + Math.random() * 0.08
      ctx.fillStyle = `rgba(${v},${v},${v},${a})`
      const s = Math.random() * 3
      ctx.fillRect(
        Math.random() * TEXTURE_SIZE,
        Math.random() * TEXTURE_SIZE,
        s, s
      )
    }

    // Lignes asphalte
    if (def.id.includes('asphalt')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth   = 0.5
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * TEXTURE_SIZE, 0)
        ctx.lineTo(Math.random() * TEXTURE_SIZE, TEXTURE_SIZE)
        ctx.stroke()
      }
    }

    // Neige — effet doux
    if (def.id.includes('snow')) {
      for (let i = 0; i < 600; i++) {
        const r = 1 + Math.random() * 3
        const a = 0.1 + Math.random() * 0.2
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath()
        ctx.arc(
          Math.random() * TEXTURE_SIZE,
          Math.random() * TEXTURE_SIZE,
          r, 0, Math.PI * 2
        )
        ctx.fill()
      }
    }
  },

  // ── NATURE ────────────────────────────────────────────────
  nature: (ctx, def) => {
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Texture organique
    for (let i = 0; i < 4000; i++) {
      const hue  = Math.random() > 0.5 ? '80,120,60' : '40,25,10'
      const a    = 0.03 + Math.random() * 0.06
      ctx.fillStyle = `rgba(${hue},${a})`
      const s = 1 + Math.random() * 4
      ctx.fillRect(
        Math.random() * TEXTURE_SIZE,
        Math.random() * TEXTURE_SIZE,
        s, s
      )
    }

    // Veines tronc
    if (def.id.includes('trunk') || def.id.includes('tree')) {
      for (let y = 0; y < TEXTURE_SIZE; y += 10 + Math.random() * 8) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.07})`
        ctx.fillRect(0, y, TEXTURE_SIZE, 1)
      }
    }
  },

  // ── GLASS — Pas de texture (transparent)
  glass: (ctx, def) => {
    // Reflet subtil
    const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
    gradient.addColorStop(0, 'rgba(255,255,255,0.08)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.02)')
    gradient.addColorStop(1, 'rgba(255,255,255,0.06)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  },

  // ── LIGHT ─────────────────────────────────────────────────
  light: (ctx, def) => {
    // Couleur de base sombre
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Halo lumineux central
    if (def.emissive) {
      const gradient = ctx.createRadialGradient(
        TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, 0,
        TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2
      )
      gradient.addColorStop(0, def.emissive + 'cc')
      gradient.addColorStop(0.6, def.emissive + '44')
      gradient.addColorStop(1, def.emissive + '00')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
    }
  },

  // ── UTILITY ───────────────────────────────────────────────
  utility: (ctx, def) => {
    ctx.fillStyle = def.color
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    // Stries métal brossé
    if (def.id.includes('steel') || def.id.includes('metal')) {
      for (let y = 0; y < TEXTURE_SIZE; y += 3) {
        const a = 0.02 + Math.random() * 0.05
        const bright = Math.random() > 0.5
        ctx.fillStyle = bright
          ? `rgba(255,255,255,${a})`
          : `rgba(0,0,0,${a})`
        ctx.fillRect(0, y, TEXTURE_SIZE, 1 + Math.random())
      }
    }
  },
}

// ─────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────
class TextureGenerator {
  private cache = new Map<string, THREE.Texture>()
  private textureLoader = new THREE.TextureLoader()

  // ──────────────────────────────────────────────
  // GÉNÉRER UNE TEXTURE PROCÉDURALE
  // ──────────────────────────────────────────────
  generate(def: EtherMaterialDef): THREE.Texture | undefined {
    // Verre et lumière : texture optionnelle
    if (def.category === 'glass') return undefined

    const cacheKey = `proc::${def.id}`
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!

    const canvas = document.createElement('canvas')
    canvas.width  = TEXTURE_SIZE
    canvas.height = TEXTURE_SIZE

    const ctx = canvas.getContext('2d')!

    // Appel du générateur de la catégorie
    const generator = GENERATORS[def.category] || GENERATORS.architecture!
    generator(ctx, def)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS      = THREE.RepeatWrapping
    texture.wrapT      = THREE.RepeatWrapping

    const scale = def.textureScale ?? (def.category === 'terrain' ? 6 : 2)
    texture.repeat.set(scale, scale)
    texture.anisotropy = 8
    texture.needsUpdate = true

    this.cache.set(cacheKey, texture)
    return texture
  }

  // ──────────────────────────────────────────────
  // CHARGER UNE TEXTURE EXTERNE — Avec cache
  // ──────────────────────────────────────────────
  loadExternal(url: string): THREE.Texture {
    const cacheKey = `ext::${url}`
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!

    const texture = this.textureLoader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
    })

    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8

    this.cache.set(cacheKey, texture)
    return texture
  }

  // ──────────────────────────────────────────────
  // DISPOSE
  // ──────────────────────────────────────────────
  dispose(): void {
    this.cache.forEach(t => t.dispose())
    this.cache.clear()
  }

  getStats() {
    return {
      cached: this.cache.size,
      keys: [...this.cache.keys()],
    }
  }
}

export const textureGenerator = new TextureGenerator()