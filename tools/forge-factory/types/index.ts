// ============================================================
// 🏭 FORGE FACTORY — TYPES CENTRALISÉS
// ============================================================

import type * as THREE from 'three'

// ─────────────────────────────────────────────
// ASSET
// ─────────────────────────────────────────────
export interface ForgeAsset {
  id:          string
  name:        string
  category:    string
  type:        string
  subType:     string
  mesh:        THREE.Mesh
  geometry:    THREE.BufferGeometry
  material:    THREE.Material
  size:        number
  boundingBox: THREE.Box3
  tags:        string[]
  metadata: {
    vertices:      number
    triangles:     number
    materialType:  string
    generatedAt:   number
    variantOf?:    string
    generation:    number
  }
}

// ─────────────────────────────────────────────
// CATALOGUE
// ─────────────────────────────────────────────
export interface ForgeCategory {
  name:     string
  count:    number
  priority: number
}

export interface ForgeTemplate {
  name:          string
  type:          string
  subType:       string
  materialStyle: MaterialStyle
  tags:          string[]
  geometryType?: string
  lod?:          number
  variants?:     number
}

export type MaterialStyle =
  | 'metallic'
  | 'organic'
  | 'stone'
  | 'wooden'
  | 'fabric'
  | 'emissive'
  | 'translucent'
  | 'bone'
  | 'magical'
  | 'paper'
  | 'heavy'
  | 'scaly'
  | 'fur'
  | 'gemstone'

// ─────────────────────────────────────────────
// GÉNÉRATION
// ─────────────────────────────────────────────
export interface GeneratorConfig {
  batchSize?:    number
  concurrency?:  number
  memoryLimit?:  number
  compression?:  'none' | 'draco' | 'meshopt'
  lod?:          boolean
  variants?:     number
  outputFormat?: 'glb' | 'gltf' | 'obj'
}

export interface GenerationPlan {
  categories:   ForgeCategory[]
  variantCount: number
  totalTarget:  number
  batchSize:    number
  compression:  string
}

export interface GenerationResult {
  total:       number
  byCategory:  Record<string, number>
  duration:    number
  memoryUsed:  number
  exportPath?: string
}

// ─────────────────────────────────────────────
// MANIFEST
// ─────────────────────────────────────────────
export interface AssetManifest {
  assets:       ForgeAsset[]
  totalSize:    number
  categories:   Record<string, number>
  exportPath?:  string
  generatedAt?: number
  version:      string
  stats: {
    totalVertices:   number
    totalTriangles:  number
    averageSize:     number
    categoryBreakdown: Record<string, number>
  }
}

// ─────────────────────────────────────────────
// BATCH
// ─────────────────────────────────────────────
export interface BatchConfig {
  batchSize:   number
  concurrency: number
  memoryLimit: number
  retries?:    number
  timeout?:    number
}

export interface BatchResult<T> {
  results:  T[]
  errors:   Error[]
  duration: number
  processed: number
  failed:   number
}

// ─────────────────────────────────────────────
// POOL MÉMOIRE
// ─────────────────────────────────────────────
export interface PoolConfig {
  maxSize:      number
  gcThreshold?: number
  strategy?:    'lru' | 'lfu' | 'fifo'
}

export interface PoolStats {
  allocated:  number
  freed:      number
  current:    number
  maxReached: number
  gcRuns:     number
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
export interface ExportConfig {
  path:            string
  format:          'glb' | 'gltf' | 'obj'
  compression:     'none' | 'draco' | 'meshopt'
  includeMetadata: boolean
  batchSize:       number
  optimize?:       boolean
}

export interface ExportResult {
  files:     string[]
  totalSize: number
  duration:  number
  manifest:  string
}

// ─────────────────────────────────────────────
// VARIANTES
// ─────────────────────────────────────────────
export interface VariantConfig {
  colorVariants:   number
  sizeVariants:    number
  shapeVariants:   number
  materialVariants: number
  maxCombinations: number
}

export interface VariantResult {
  base:     ForgeAsset
  variants: ForgeAsset[]
  count:    number
}