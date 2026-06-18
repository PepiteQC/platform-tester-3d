// ============================================================
// 🔥 FORGE3D — TYPES CENTRALISÉS ULTRA-COMPLETS
// ============================================================

import type * as THREE from 'three'

// ─────────────────────────────────────────────
// GÉOMÉTRIES
// ─────────────────────────────────────────────
export type GeometryType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'plane'
  | 'torus'
  | 'ring'
  | 'cone'
  | 'capsule'
  | 'tetrahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'icosahedron'
  | 'extrude'
  | 'lathe'
  | 'custom'

export interface GeometryParams {
  // Box
  width?: number
  height?: number
  depth?: number
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
  // Sphere
  radius?: number
  phiStart?: number
  phiLength?: number
  thetaStart?: number
  thetaLength?: number
  // Cylinder / Cone
  radiusTop?: number
  radiusBottom?: number
  radialSegments?: number
  openEnded?: boolean
  // Torus
  tube?: number
  tubularSegments?: number
  arc?: number
  // Ring
  innerRadius?: number
  outerRadius?: number
  thetaSegments?: number
  phiSegments?: number
  // Capsule
  capSegments?: number
  // Custom
  vertices?: number[]
  indices?: number[]
  normals?: number[]
  uvs?: number[]
}

export interface ForgeGeometry {
  type: GeometryType
  params?: GeometryParams
}

// ─────────────────────────────────────────────
// MATÉRIAUX
// ─────────────────────────────────────────────
export type MaterialType =
  | 'standard'
  | 'phong'
  | 'basic'
  | 'matcap'
  | 'normal'
  | 'depth'
  | 'lambert'
  | 'toon'
  | 'physical'
  | 'shader'

export interface ForgeMaterial {
  type?: MaterialType
  color?: string | number
  metalness?: number
  roughness?: number
  map?: string
  normalMap?: string
  roughnessMap?: string
  metalnessMap?: string
  aoMap?: string
  envMap?: string
  emissive?: string | number
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  doubleSide?: boolean
  wireframe?: boolean
  specular?: string | number
  shininess?: number
  matcap?: string
  // Physical
  clearcoat?: number
  clearcoatRoughness?: number
  transmission?: number
  thickness?: number
  ior?: number
  // Shader custom
  vertexShader?: string
  fragmentShader?: string
  uniforms?: Record<string, { value: any }>
}

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
export interface ForgeVector3 {
  x?: number
  y?: number
  z?: number
}

export interface ForgeTransform {
  position?: ForgeVector3
  rotation?: ForgeVector3
  scale?: ForgeVector3
  quaternion?: { x: number; y: number; z: number; w: number }
}

// ─────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────
export type AnimationType =
  | 'rotate'
  | 'float'
  | 'pulse'
  | 'orbit'
  | 'path'
  | 'shake'
  | 'bounce'
  | 'wave'
  | 'spiral'
  | 'pendulum'

export interface AnimationPath {
  x: number
  y: number
  z: number
}

export interface ForgeAnimation {
  target: THREE.Object3D
  type: AnimationType
  speed?: number
  delay?: number
  amplitude?: number
  axis?: 'x' | 'y' | 'z' | 'all'
  paused?: boolean
  loop?: boolean
  duration?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  params?: {
    radius?: number
    path?: AnimationPath[]
    frequency?: number
    damping?: number
    [key: string]: any
  }
}

// ─────────────────────────────────────────────
// OBJET 3D
// ─────────────────────────────────────────────
export type ForgeObjectType =
  | 'mesh'
  | 'light'
  | 'group'
  | 'sprite'
  | 'points'
  | 'line'
  | 'helper'

export interface ForgeObject {
  id: string
  type: ForgeObjectType
  name?: string
  geometry: ForgeGeometry
  material: ForgeMaterial
  transform?: ForgeTransform
  animation?: Omit<ForgeAnimation, 'target'>
  castShadow?: boolean
  receiveShadow?: boolean
  visible?: boolean
  renderOrder?: number
  userData?: Record<string, any>
  children?: ForgeObject[]
  // Instancing
  instances?: ForgeTransform[]
  maxInstances?: number
}

// ─────────────────────────────────────────────
// SCÈNE
// ─────────────────────────────────────────────
export interface ForgeSceneFog {
  type?: 'exp' | 'linear'
  color?: string | number
  density?: number
  near?: number
  far?: number
}

export interface ForgeSceneEnvironment {
  hdri?: string
  preset?: 'sunset' | 'night' | 'dawn' | 'warehouse' | 'forest' | 'apartment'
  intensity?: number
}

export interface ForgeScene {
  id?: string
  name?: string
  objects: ForgeObject[]
  background?: string | number
  fog?: ForgeSceneFog
  environment?: ForgeSceneEnvironment
  gravity?: ForgeVector3
  ambientLight?: { color: string; intensity: number }
  camera?: {
    position?: ForgeVector3
    target?: ForgeVector3
    fov?: number
    near?: number
    far?: number
  }
}

// ─────────────────────────────────────────────
// ÉTHERMATERIALS
// ─────────────────────────────────────────────
export type EtherCategory =
  | 'architecture'
  | 'interior'
  | 'terrain'
  | 'nature'
  | 'glass'
  | 'light'
  | 'utility'

export interface EtherMaterialDef {
  id: string
  name: string
  category: EtherCategory
  color: string
  roughness: number
  metalness: number
  transparent?: boolean
  opacity?: number
  emissive?: string
  emissiveIntensity?: number
  normalScale?: number
  textureScale?: number
  tags?: string[]
  description?: string
}

// ─────────────────────────────────────────────
// PLATFORM TESTER
// ─────────────────────────────────────────────
export interface PlatformRecord {
  mesh: THREE.Mesh
  data?: {
    id: number
    type?: string
    material?: string
    color?: string
    position?: ForgeVector3
    [key: string]: any
  }
}

export interface GameInstance {
  scene: THREE.Scene
  platformMeshes?: Map<number, PlatformRecord>
  selectedPlatform?: number | null
  etherMaterials?: EtherMaterialsAPI
  applyMaterialToPlatform?: (target: string | number, materialId: string) => ApplyResult
  applyMaterialToAllPlatforms?: (materialId: string, filter?: string) => ApplyAllResult
}

export interface ApplyResult {
  success: boolean
  target?: string | number
  materialId?: string
  reason?: string
}

export interface ApplyAllResult {
  success: boolean
  count: number
  materialId?: string
  filter?: string
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────
export interface EtherMaterialsAPI {
  version: string
  list: () => EtherMaterialDef[]
  get: (id?: string) => EtherMaterialDef
  select: (id: string) => EtherMaterialDef
  apply: (target?: string | number, materialId?: string) => ApplyResult
  applyAll: (materialId?: string, filter?: string) => ApplyAllResult
  makeMaterial: (id: string) => THREE.MeshStandardMaterial
  status: () => EtherMaterialsStatus
}

export interface EtherMaterialsStatus {
  version: string
  selected: string
  materials: number
  attached: boolean
  cacheSize: number
  texturesCached: number
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
export interface ForgeStats {
  fps: number
  drawCalls: number
  triangles: number
  objects: number
  geometries: number
  textures: number
  memoryGeometry: number
  memoryTexture: number
  instanceGroups: number
}

// ─────────────────────────────────────────────
// CONFIG FORGE
// ─────────────────────────────────────────────
export interface ForgeConfig {
  antialias: boolean
  shadows: boolean
  shadowMapSize: number
  bloom: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  ssao: boolean
  ssaoKernelRadius: number
  pixelRatio: number
  maxInstances: number
  lodDistances: number[]
  fpsTarget: number
  autoDispose: boolean
  fogEnabled: boolean
  fogDensity: number
  fogColor: number
  toneMapping: string
  exposure: number
}

// ─────────────────────────────────────────────
// CACHE
// ─────────────────────────────────────────────
export interface CacheEntry {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  instances: Map<string, THREE.InstancedMesh>
  refCount: number
  createdAt: number
  lastUsed: number
}

export interface ForgeInstance {
  mesh: THREE.InstancedMesh
  count: number
  dummy: THREE.Object3D
  ids: Set<string>
  maxCount: number
}