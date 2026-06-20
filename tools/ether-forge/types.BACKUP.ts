// ============================================================
//  EtherForge — Types
//  Forge 3D d'Etherworld
// ============================================================

export interface ForgeConfig {
  id: string
  name: string
  renderer: 'three' | 'babylon' | 'webgpu'
  quality: 'low' | 'medium' | 'high' | 'ultra'
}

export type ForgeObjectType =
  | 'mesh'
  | 'material'
  | 'texture'
  | 'light'
  | 'camera'
  | 'scene'

export interface ForgeObject {
  id: string
  type: ForgeObjectType
  name: string
  data: unknown
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface ForgeMaterial {
  id: string
  name: string
  type: 'standard' | 'physical' | 'shader' | 'toon'
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
  map?: string
  normalMap?: string
  roughnessMap?: string
  metalnessMap?: string
  opacity?: number
  transparent?: boolean
}

export interface ForgeScene {
  id: string
  name: string
  objects: ForgeObject[]
  lights: unknown[]
  camera: unknown
  environment: string
}

export interface ForgeExportOptions {
  format: 'gltf' | 'glb' | 'obj' | 'fbx' | 'usd'
  includeTextures: boolean
  includeMaterials: boolean
  compress: boolean
}

export interface ForgeState {
  scene: ForgeScene | null
  selectedObject: ForgeObject | null
  isLoading: boolean
  error: string | null
  history: ForgeObject[][]
}