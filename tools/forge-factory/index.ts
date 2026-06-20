// ============================================================
// 🏭 FORGE FACTORY — Index
// ============================================================

export { FactoryEngine, factoryEngine } from './engine/FactoryEngine.js'
export { BatchProcessor }               from './logistics/BatchProcessor.js'
export { MemoryPool }                   from './logistics/MemoryPool.js'
export { GeometryGenerator }            from './generators/GeometryGenerator.js'
export { MaterialGenerator }            from './generators/MaterialGenerator.js'
export { VariantGenerator }             from './generators/VariantGenerator.js'
export { SeededRandom, rng }            from './utils/Random.js'
export { createLogger }                 from './utils/Logger.js'

export type {
  ForgeAsset, ForgeCategory, ForgeTemplate,
  GeneratorConfig, GenerationPlan, GenerationResult,
  AssetManifest, BatchConfig, BatchResult,
  PoolConfig, PoolStats, ExportConfig,
  MaterialStyle, VariantConfig,
} from './types/index.js'