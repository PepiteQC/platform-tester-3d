// ============================================================
// ⚡ INSTANCE MANAGER — GPU Instancing ultra-performant
// 10 000 objets identiques = 1 seul draw call
// ============================================================

import * as THREE from 'three'
import type { ForgeInstance, ForgeTransform } from '../types/index.js'
import { FORGE_CONFIG } from '../config/index.js'

export class InstanceManager {
  private groups = new Map<string, ForgeInstance>()
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  // ──────────────────────────────────────────────
  // TROUVER OU CRÉER UN GROUPE D'INSTANCES
  // ──────────────────────────────────────────────
  getOrCreateGroup(
    geometryKey: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxCount: number = FORGE_CONFIG.maxInstances
  ): ForgeInstance {
    // Cherche un groupe existant avec de la place
    for (const [key, group] of this.groups) {
      if (key.startsWith(geometryKey) && group.count < group.maxCount) {
        return group
      }
    }

    // Crée un nouveau groupe
    const mesh = new THREE.InstancedMesh(geometry, material, maxCount)
    mesh.castShadow    = true
    mesh.receiveShadow = true
    mesh.frustumCulled = true
    mesh.count         = 0

    // Initialiser toutes les matrices à l'identité (invisible = scale 0)
    const dummy = new THREE.Object3D()
    dummy.scale.set(0, 0, 0)
    dummy.updateMatrix()

    for (let i = 0; i < maxCount; i++) {
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    this.scene.add(mesh)

    const group: ForgeInstance = {
      mesh,
      count: 0,
      dummy: new THREE.Object3D(),
      ids: new Set(),
      maxCount,
    }

    const groupKey = `${geometryKey}::group::${Date.now()}`
    this.groups.set(groupKey, group)

    return group
  }

  // ──────────────────────────────────────────────
  // AJOUTER UNE INSTANCE
  // ──────────────────────────────────────────────
  addInstance(
    group: ForgeInstance,
    id: string,
    transform: ForgeTransform
  ): number {
    if (group.ids.has(id)) {
      return this.getInstanceIndex(group, id)
    }

    if (group.count >= group.maxCount) {
      console.warn(`InstanceManager: groupe plein (${group.maxCount} instances)`)
      return -1
    }

    const idx = group.count
    this.applyTransform(group, idx, transform)

    group.ids.add(id)
    group.count++
    group.mesh.count = group.count

    return idx
  }

  // ──────────────────────────────────────────────
  // METTRE À JOUR UNE INSTANCE
  // ──────────────────────────────────────────────
  updateInstance(
    group: ForgeInstance,
    id: string,
    transform: ForgeTransform
  ): boolean {
    const idx = this.getInstanceIndex(group, id)
    if (idx === -1) return false

    this.applyTransform(group, idx, transform)
    return true
  }

  // ──────────────────────────────────────────────
  // SUPPRIMER UNE INSTANCE — Swap avec la dernière
  // ──────────────────────────────────────────────
  removeInstance(group: ForgeInstance, id: string): boolean {
    if (!group.ids.has(id)) return false

    const idx = this.getInstanceIndex(group, id)
    if (idx === -1) return false

    // Swap avec la dernière instance (plus rapide que décalage)
    const lastIdx = group.count - 1
    if (idx !== lastIdx) {
      const lastMatrix = new THREE.Matrix4()
      group.mesh.getMatrixAt(lastIdx, lastMatrix)
      group.mesh.setMatrixAt(idx, lastMatrix)
    }

    // Mettre la dernière à scale 0 (invisible)
    group.dummy.scale.set(0, 0, 0)
    group.dummy.updateMatrix()
    group.mesh.setMatrixAt(lastIdx, group.dummy.matrix)

    group.mesh.instanceMatrix.needsUpdate = true
    group.ids.delete(id)
    group.count--
    group.mesh.count = group.count

    return true
  }

  // ──────────────────────────────────────────────
  // APPLY TRANSFORM
  // ──────────────────────────────────────────────
  private applyTransform(
    group: ForgeInstance,
    idx: number,
    transform: ForgeTransform
  ): void {
    const d = group.dummy

    d.position.set(
      transform.position?.x ?? 0,
      transform.position?.y ?? 0,
      transform.position?.z ?? 0,
    )

    if (transform.quaternion) {
      d.quaternion.set(
        transform.quaternion.x,
        transform.quaternion.y,
        transform.quaternion.z,
        transform.quaternion.w,
      )
    } else {
      d.rotation.set(
        transform.rotation?.x ?? 0,
        transform.rotation?.y ?? 0,
        transform.rotation?.z ?? 0,
      )
    }

    d.scale.set(
      transform.scale?.x ?? 1,
      transform.scale?.y ?? 1,
      transform.scale?.z ?? 1,
    )

    d.updateMatrix()
    group.mesh.setMatrixAt(idx, d.matrix)
    group.mesh.instanceMatrix.needsUpdate = true
  }

  // ──────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────
  private getInstanceIndex(group: ForgeInstance, id: string): number {
    // Simple implémentation — pourrait être une Map<id, idx> pour O(1)
    let i = 0
    for (const existingId of group.ids) {
      if (existingId === id) return i
      i++
    }
    return -1
  }

  // ──────────────────────────────────────────────
  // DISPOSE
  // ──────────────────────────────────────────────
  dispose(): void {
    for (const [, group] of this.groups) {
      this.scene.remove(group.mesh)
      group.mesh.dispose()
    }
    this.groups.clear()
  }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────
  getStats() {
    let totalInstances = 0
    let totalCapacity  = 0

    for (const [, group] of this.groups) {
      totalInstances += group.count
      totalCapacity  += group.maxCount
    }

    return {
      groups:         this.groups.size,
      totalInstances,
      totalCapacity,
      fillRate: totalCapacity > 0
        ? ((totalInstances / totalCapacity) * 100).toFixed(1) + '%'
        : '0%',
    }
  }
}