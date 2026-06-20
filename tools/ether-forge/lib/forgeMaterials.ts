// ============================================================
// 🎨 FORGE MATERIALS — Pont vers EtherMaterials
// Rend DEFAULT_MATERIALS accessible aux composants
// ============================================================

export {
  ETHER_MATERIALS as DEFAULT_MATERIALS,
  getMaterialDef,
  getMaterialsByCategory,
  searchMaterials,
  CATALOG_STATS,
  MATERIALS_INDEX,
} from '../materials/etherMaterials.js'

export type { EtherMaterialDef } from '../types/index.js'