// ============================================================
// 🔥 ETHER-FORGE — Index principal CORRIGÉ
// ============================================================

// ── Core moteur 3D ────────────────────────────────────────
export { Forge3DCore, forge3DCore }        from './core/forge3D.js'

// ── Pont unifié (connexion avec factory + brain) ──────────
export { forge3DLib }                      from './lib/forge3D.js'

// ── Geometry ──────────────────────────────────────────────
export { geometryCache }                   from './geometry/geometryCache.js'
export { GeometryFactory, geometryFactory } from './geometry/geometryFactory.js'
export { InstanceManager }                 from './geometry/instanceManager.js'

// ── Materials ─────────────────────────────────────────────
export { materialFactory }                 from './materials/materialFactory.js'
export { textureGenerator }                from './materials/textureGenerator.js'
export {
  ETHER_MATERIALS,
  MATERIALS_INDEX,
  CATEGORIES,
  CATALOG_STATS,
  getMaterialDef,
  getMaterialsByCategory,
  searchMaterials,
  getEmissiveMaterials,
  getTransparentMaterials,
}                                          from './materials/etherMaterials.js'

// ── Animation ─────────────────────────────────────────────
export { AnimationEngine, animationEngine } from './animation/animationEngine.js'

// ── Interaction ───────────────────────────────────────────
export { ForgeRaycaster }                  from './interaction/raycaster.js'

// ── Config ────────────────────────────────────────────────
export {
  FORGE_CONFIG,
  LIGHTING_CONFIG,
  CAMERA_CONFIG,
  CONTROLS_CONFIG,
}                                          from './config/index.js'

// ── Types ─────────────────────────────────────────────────
export type {
  ForgeObject,
  ForgeScene,
  ForgeMaterial,
  ForgeGeometry,
  ForgeAnimation,
  ForgeTransform,
  ForgeStats,
  ForgeConfig,
  EtherMaterialDef,
  EtherCategory,
  CacheEntry,
  ForgeInstance,
}                                          from './types/index.js'