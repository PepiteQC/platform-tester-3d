// ============================================================
// 🎨 MATERIAL FACTORY — Création matériaux PBR centralisée
// ============================================================

import * as THREE from 'three'
import type { ForgeMaterial } from '../types/index.js'
import { textureGenerator } from './textureGenerator.js'

class MaterialFactory {
  private cache = new Map<string, THREE.Material>()

  create(mat: ForgeMaterial): THREE.Material {
    const key = JSON.stringify(mat)
    if (this.cache.has(key)) return this.cache.get(key)!

    const material = this.build(mat)
    this.cache.set(key, material)
    return material
  }

  private build(mat: ForgeMaterial): THREE.Material {
    const color = new THREE.Color(mat.color ?? '#ffffff')

    switch (mat.type ?? 'standard') {

      case 'standard':
      case 'physical': {
        const m = new THREE.MeshStandardMaterial({
          color,
          metalness:         mat.metalness         ?? 0.1,
          roughness:         mat.roughness          ?? 0.8,
          emissive:          mat.emissive ? new THREE.Color(mat.emissive) : undefined,
          emissiveIntensity: mat.emissiveIntensity  ?? 0,
          transparent:       mat.transparent        ?? false,
          opacity:           mat.opacity            ?? 1,
          wireframe:         mat.wireframe          ?? false,
          side:              mat.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          depthWrite:        !(mat.transparent ?? false),
        })
        if (mat.map)        m.map        = textureGenerator.loadExternal(mat.map)
        if (mat.normalMap)  m.normalMap  = textureGenerator.loadExternal(mat.normalMap)
        return m
      }

      case 'phong': {
        const m = new THREE.MeshPhongMaterial({
          color,
          specular:   mat.specular ? new THREE.Color(mat.specular) : new THREE.Color(0x111111),
          shininess:  mat.shininess ?? 30,
        })
        if (mat.map) m.map = textureGenerator.loadExternal(mat.map)
        return m
      }

      case 'basic': {
        const m = new THREE.MeshBasicMaterial({ color, wireframe: mat.wireframe ?? false })
        if (mat.map) m.map = textureGenerator.loadExternal(mat.map)
        return m
      }

      case 'matcap': {
        const m = new THREE.MeshMatcapMaterial({ color })
        if (mat.matcap) m.matcap = textureGenerator.loadExternal(mat.matcap)
        return m
      }

      case 'lambert':
        return new THREE.MeshLambertMaterial({ color })

      case 'toon':
        return new THREE.MeshToonMaterial({ color })

      case 'normal':
        return new THREE.MeshNormalMaterial()

      case 'depth':
        return new THREE.MeshDepthMaterial()

      default:
        return new THREE.MeshStandardMaterial({ color })
    }
  }

  dispose(): void {
    this.cache.forEach(m => m.dispose())
    this.cache.clear()
  }

  getStats() {
    return { cached: this.cache.size }
  }
}

export const materialFactory = new MaterialFactory()