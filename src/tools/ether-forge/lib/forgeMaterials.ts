// ============================================================
//  forgeMaterials — Bibliothèque de matériaux EtherWorld
//  Inspirée Maison moderne Québec + Platform Tester 3D
// ============================================================

import * as THREE from 'three'
import type { ForgeMaterial } from '../types'

export interface EtherForgeMaterial extends ForgeMaterial {
  category?: 'architecture' | 'interior' | 'terrain' | 'glass' | 'light' | 'nature' | 'utility'
  description?: string
}

export const DEFAULT_MATERIALS: EtherForgeMaterial[] = [
  { id: 'ew-concrete-main', name: 'Béton Québec HD', type: 'standard', color: '#d9d6cd', roughness: 0.91, metalness: 0, category: 'architecture', description: 'Béton pâle moderne pour murs extérieurs.' },
  { id: 'ew-concrete-dark', name: 'Béton Nuit', type: 'standard', color: '#242a31', roughness: 0.86, metalness: 0.05, category: 'architecture', description: 'Béton foncé pour fondations, corniches et volumes modernes.' },
  { id: 'ew-stone-quebec', name: 'Pierre Québec', type: 'standard', color: '#958f84', roughness: 0.96, metalness: 0, category: 'architecture', description: 'Pierre texturée extérieure style maison moderne.' },
  { id: 'ew-wood-warm', name: 'Bois chaleureux', type: 'standard', color: '#8b5e3c', roughness: 0.43, metalness: 0, category: 'interior', description: 'Bois brun chaud pour portes, planchers et mobilier.' },
  { id: 'ew-metal-black', name: 'Métal noir architectural', type: 'physical', color: '#0b1118', roughness: 0.3, metalness: 0.82, category: 'architecture', description: 'Métal noir pour cadres et structure.' },
  { id: 'ew-brushed-steel', name: 'Acier brossé', type: 'physical', color: '#9ba3ad', roughness: 0.38, metalness: 0.94, category: 'utility', description: 'Acier brossé pour électroménagers et accessoires.' },
  { id: 'ew-glass-cyan', name: 'Verre cyan', type: 'physical', color: '#9beaff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.34, category: 'glass', description: 'Verre cyan transparent pour fenêtres.' },
  { id: 'ew-door-glass', name: 'Verre porte premium', type: 'physical', color: '#9beaff', roughness: 0.04, metalness: 0.12, transparent: true, opacity: 0.46, category: 'glass', description: 'Verre plus opaque pour portes et patio.' },
  { id: 'ew-grass-quebec', name: 'Gazon Québec', type: 'standard', color: '#294c2b', roughness: 1, metalness: 0, category: 'terrain', description: 'Terrain vert sombre.' },
  { id: 'ew-asphalt-night', name: 'Asphalte nuit', type: 'standard', color: '#1b1f25', roughness: 0.98, metalness: 0, category: 'terrain', description: 'Asphalte sombre pour rues et entrées.' },
  { id: 'ew-snow-fresh', name: 'Neige fraîche', type: 'standard', color: '#f8fdff', roughness: 0.88, metalness: 0, category: 'terrain', description: 'Neige blanche légèrement rugueuse.' },
  { id: 'ew-interior-wall', name: 'Mur intérieur chaud', type: 'standard', color: '#f3f0e8', roughness: 0.82, metalness: 0, category: 'interior', description: 'Mur intérieur clair et doux.' },
  { id: 'ew-hardwood-floor', name: 'Plancher bois luxe', type: 'standard', color: '#a87546', roughness: 0.38, metalness: 0, category: 'interior', description: 'Plancher de bois chaleureux.' },
  { id: 'ew-fabric-sofa', name: 'Tissu sofa graphite', type: 'standard', color: '#303843', roughness: 0.87, metalness: 0, category: 'interior', description: 'Tissu sombre pour meubles et coussins.' },
  { id: 'ew-fabric-rug', name: 'Tapis nuit', type: 'standard', color: '#171c24', roughness: 0.9, metalness: 0, category: 'interior', description: 'Tapis textile sombre.' },
  { id: 'ew-ceramic-white', name: 'Céramique blanche', type: 'physical', color: '#f6f7f3', roughness: 0.4, metalness: 0, category: 'interior', description: 'Céramique salle de bain/cuisine.' },
  { id: 'ew-screen-glow', name: 'Écran TroxT', type: 'standard', color: '#02101b', roughness: 0.18, metalness: 0.15, emissive: '#00e8ff', emissiveIntensity: 0.32, category: 'light', description: 'Écran sombre avec glow cyan.' },
  { id: 'ew-warm-light', name: 'Lumière chaude', type: 'standard', color: '#ffd39a', roughness: 0.2, metalness: 0.1, emissive: '#ffd39a', emissiveIntensity: 1.25, category: 'light', description: 'Matériau emissif chaud.' },
  { id: 'ew-neon-accent', name: 'Néon Ether', type: 'standard', color: '#00e8ff', roughness: 0.2, metalness: 0.15, emissive: '#00e8ff', emissiveIntensity: 1.3, category: 'light', description: 'Accent néon officiel EtherWorld.' },
  { id: 'ew-tree-trunk', name: 'Tronc naturel', type: 'standard', color: '#6b442c', roughness: 0.9, metalness: 0, category: 'nature', description: 'Bois brut pour arbres et poteaux.' },
  { id: 'ew-pine-dark', name: 'Pin sombre', type: 'standard', color: '#173d25', roughness: 0.95, metalness: 0, category: 'nature', description: 'Feuillage conifère.' },
  { id: 'ew-leaf-green', name: 'Feuillage vivant', type: 'standard', color: '#2f7a3d', roughness: 0.95, metalness: 0, category: 'nature', description: 'Feuillage vert plus lumineux.' },
  { id: 'ew-bin-green', name: 'Bac recyclage vert', type: 'standard', color: '#1f6f43', roughness: 0.8, metalness: 0, category: 'utility', description: 'Matériau utilitaire vert.' },
  { id: 'ew-bin-dark', name: 'Bac utilitaire sombre', type: 'standard', color: '#232832', roughness: 0.8, metalness: 0, category: 'utility', description: 'Plastique sombre utilitaire.' }
]

function createId(prefix = 'mat') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createTexture(material: EtherForgeMaterial): THREE.CanvasTexture | undefined {
  const textured = ['architecture', 'interior', 'terrain', 'nature'].includes(material.category || '')
  if (!textured) return undefined

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = material.color
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 4500; i++) {
    const v = Math.random() > 0.5 ? 255 : 0
    const alpha = material.category === 'terrain' ? 0.06 : 0.035
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }

  if (material.id.includes('wood') || material.id.includes('floor') || material.id.includes('trunk')) {
    for (let y = 0; y < 256; y += 8) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(0, y, 256, 1)
    }
  }

  if (material.id.includes('concrete') || material.id.includes('stone')) {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 0.7
    for (let i = 0; i < 18; i++) {
      ctx.beginPath()
      let x = Math.random() * 256
      let y = Math.random() * 256
      ctx.moveTo(x, y)
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 26
        y += (Math.random() - 0.5) * 26
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(material.category === 'terrain' ? 6 : 2, material.category === 'terrain' ? 6 : 2)
  texture.anisotropy = 8
  return texture
}

export class ForgeMaterials {
  private materials: Map<string, EtherForgeMaterial> = new Map(DEFAULT_MATERIALS.map(material => [material.id, material]))

  create(params: Partial<ForgeMaterial>): ForgeMaterial {
    const material: EtherForgeMaterial = {
      id: params.id || createId('forge-material'),
      name: params.name || 'Nouveau matériau',
      type: params.type || 'standard',
      color: params.color || '#8e939c',
      roughness: params.roughness ?? 0.7,
      metalness: params.metalness ?? 0.05,
      emissive: params.emissive,
      emissiveIntensity: params.emissiveIntensity,
      opacity: params.opacity,
      transparent: params.transparent
    }
    this.materials.set(material.id, material)
    return material
  }

  async loadFromUrl(url: string): Promise<ForgeMaterial | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      return this.create(data)
    } catch {
      return null
    }
  }

  toThreeMaterial(material: ForgeMaterial): THREE.MeshStandardMaterial {
    const ether = material as EtherForgeMaterial
    const map = createTexture(ether)
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(material.color),
      map,
      roughness: material.roughness,
      metalness: material.metalness,
      emissive: material.emissive ? new THREE.Color(material.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: material.emissiveIntensity || 0,
      transparent: Boolean(material.transparent || (material.opacity !== undefined && material.opacity < 1)),
      opacity: material.opacity ?? 1,
      depthWrite: !(material.transparent || (material.opacity !== undefined && material.opacity < 1))
    })
  }

  toJSON(material: ForgeMaterial): Record<string, unknown> {
    return { ...material }
  }

  getAll(): EtherForgeMaterial[] {
    return Array.from(this.materials.values())
  }

  getByCategory(category: EtherForgeMaterial['category']): EtherForgeMaterial[] {
    return this.getAll().filter(material => material.category === category)
  }

  get(id: string): EtherForgeMaterial | undefined {
    return this.materials.get(id)
  }
}

export const forgeMaterials = new ForgeMaterials()
export default ForgeMaterials
