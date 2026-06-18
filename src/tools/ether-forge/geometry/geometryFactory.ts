// ============================================================
// 🔷 GEOMETRY FACTORY — 14 types de géométries natifs
// ============================================================

import * as THREE from 'three'
import type { ForgeGeometry, GeometryParams } from '../types/index.js'
import { geometryCache } from './geometryCache.js'

export class GeometryFactory {

  // ──────────────────────────────────────────────
  // CRÉATION PRINCIPALE — Avec cache automatique
  // ──────────────────────────────────────────────
  create(geom: ForgeGeometry, material: THREE.Material): {
    geometry: THREE.BufferGeometry
    entry: ReturnType<typeof geometryCache.getOrCreate>
  } {
    const key = geometryCache.buildKey(geom)
    const entry = geometryCache.getOrCreate(
      key,
      () => this.build(geom),
      material
    )

    return { geometry: entry.geometry, entry }
  }

  // ──────────────────────────────────────────────
  // BUILD — Construction de la géométrie brute
  // ──────────────────────────────────────────────
  private build(geom: ForgeGeometry): THREE.BufferGeometry {
    const p = geom.params || {}

    switch (geom.type) {
      case 'box':
        return new THREE.BoxGeometry(
          p.width  ?? 1,
          p.height ?? 1,
          p.depth  ?? 1,
          p.widthSegments  ?? 1,
          p.heightSegments ?? 1,
          p.depthSegments  ?? 1
        )

      case 'sphere':
        return new THREE.SphereGeometry(
          p.radius        ?? 1,
          p.widthSegments  ?? 32,
          p.heightSegments ?? 32,
          p.phiStart      ?? 0,
          p.phiLength     ?? Math.PI * 2,
          p.thetaStart    ?? 0,
          p.thetaLength   ?? Math.PI
        )

      case 'cylinder':
        return new THREE.CylinderGeometry(
          p.radiusTop     ?? 1,
          p.radiusBottom  ?? 1,
          p.height        ?? 2,
          p.radialSegments ?? 32,
          p.heightSegments ?? 1,
          p.openEnded     ?? false
        )

      case 'plane':
        return new THREE.PlaneGeometry(
          p.width  ?? 1,
          p.height ?? 1,
          p.widthSegments  ?? 1,
          p.heightSegments ?? 1
        )

      case 'torus':
        return new THREE.TorusGeometry(
          p.radius         ?? 1,
          p.tube           ?? 0.4,
          p.radialSegments  ?? 16,
          p.tubularSegments ?? 64,
          p.arc            ?? Math.PI * 2
        )

      case 'ring':
        return new THREE.RingGeometry(
          p.innerRadius  ?? 0.3,
          p.outerRadius  ?? 1,
          p.thetaSegments ?? 64,
          p.phiSegments   ?? 8
        )

      case 'cone':
        return new THREE.ConeGeometry(
          p.radius        ?? 1,
          p.height        ?? 2,
          p.radialSegments ?? 32,
          p.heightSegments ?? 1,
          p.openEnded     ?? false
        )

      case 'capsule':
        return new THREE.CapsuleGeometry(
          p.radius      ?? 0.5,
          p.height      ?? 1,
          p.capSegments  ?? 8,
          p.radialSegments ?? 16
        )

      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(p.radius ?? 1, p.depthSegments ?? 0)

      case 'octahedron':
        return new THREE.OctahedronGeometry(p.radius ?? 1, p.depthSegments ?? 0)

      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(p.radius ?? 1, p.depthSegments ?? 0)

      case 'icosahedron':
        return new THREE.IcosahedronGeometry(p.radius ?? 1, p.depthSegments ?? 0)

      case 'custom':
        return this.buildCustom(p)

      default:
        console.warn(`GeometryFactory: type inconnu "${geom.type}" → BoxGeometry par défaut`)
        return new THREE.BoxGeometry(1, 1, 1)
    }
  }

  // ──────────────────────────────────────────────
  // CUSTOM — Géométrie depuis arrays bruts
  // ──────────────────────────────────────────────
  private buildCustom(p: GeometryParams): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry()

    if (p.vertices) {
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(p.vertices, 3)
      )
    }

    if (p.normals) {
      geo.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(p.normals, 3)
      )
    } else {
      geo.computeVertexNormals()
    }

    if (p.uvs) {
      geo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(p.uvs, 2)
      )
    }

    if (p.indices) {
      geo.setIndex(p.indices)
    }

    return geo
  }
}

export const geometryFactory = new GeometryFactory()