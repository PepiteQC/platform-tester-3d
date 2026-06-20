// ============================================================
// 🔮 ETHERPRISM — Index des exports
// ============================================================

export { EtherPrism, etherPrism }     from './genesis/EtherPrism.js'
export { NeuralSeed }                  from './genesis/NeuralSeed.js'
export { ConsciousnessFactory }        from './genesis/ConsciousnessFactory.js'
export { ThoughtEngine }               from './cognition/ThoughtEngine.js'
export { MemoryCrystal }               from './cognition/MemoryCrystal.js'
export { LearningMatrix }              from './cognition/LearningMatrix.js'
export { FitnessEvaluator }            from './evolution/FitnessEvaluator.js'
export { SelfMutation }                from './evolution/SelfMutation.js'
export { GenerationBreeder }           from './evolution/GenerationBreeder.js'

export type {
  BrainConfig, BrainInstance, BrainMetrics, BrainStatus,
  BrainSpecialization, NeuralSeedData, ConsciousnessData,
  Thought, Memory, NeuralPattern, FitnessResult,
  MutationResult, BreedingResult, IntelligenceMetrics,
  ConsciousnessDump, EtherSignature, CollectiveResult,
} from './types/index.js'