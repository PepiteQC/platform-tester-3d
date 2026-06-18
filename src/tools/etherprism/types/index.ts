// ============================================================
// 🔮 ETHERPRISM — TYPES COMPLETS
// ============================================================

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────
export interface BrainConfig {
  name?:           string
  intelligence:    number       // 0-1
  creativity:      number       // 0-1
  memory:          number       // 0-1
  learningRate:    number       // 0-1
  mutationRate:    number       // 0-1
  specialization:  BrainSpecialization
  depth:           number       // 1-10
  complexity:      number       // 1-10
  adaptability:    number       // 0-1
}

export type BrainSpecialization =
  | 'general'
  | 'analytical'
  | 'creative'
  | 'logical'
  | 'intuitive'
  | 'genesis'
  | 'tactical'
  | 'empathic'
  | 'mathematical'

// ─────────────────────────────────────────────
// GRAINE NEURONALE
// ─────────────────────────────────────────────
export interface NeuralSeedData {
  intelligence:   number
  creativity:     number
  memory:         number
  learningRate:   number
  mutationRate:   number
  specialization: BrainSpecialization
}

// ─────────────────────────────────────────────
// CONSCIENCE
// ─────────────────────────────────────────────
export interface ConsciousnessData {
  depth:         number
  complexity:    number
  adaptability:  number
  selfAwareness: number
  state:         'awakening' | 'aware' | 'transcendent'
}

// ─────────────────────────────────────────────
// CERVEAU
// ─────────────────────────────────────────────
export type BrainStatus = 'dormant' | 'thinking' | 'evolving' | 'archived'

export interface BrainInstance {
  id:            string
  name:          string
  generation:    number
  seed:          NeuralSeedData
  consciousness: ConsciousnessData
  memoryCrystal: any
  learningMatrix: any
  thoughtEngine: any
  metrics:       BrainMetrics
  createdAt:     number
  lastActiveAt:  number
  status:        BrainStatus
  parentIds?:    string[]
}

export interface BrainMetrics {
  iq:               number
  creativity:       number
  memoryCapacity:   number
  processingSpeed:  number
  adaptability:     number
  generation:       number
  thoughtsProcessed: number
  memoriesStored:   number
  patternsLearned:  number
  fitnessScore?:    number
}

// ─────────────────────────────────────────────
// PENSÉE
// ─────────────────────────────────────────────
export interface Thought {
  id:               string
  brainId:          string
  input:            string
  pattern:          NeuralPattern
  memoriesInvolved: number
  learningDelta:    number
  output:           string
  confidence:       number
  timestamp:        number
  processingTime:   number
}

// ─────────────────────────────────────────────
// MÉMOIRE
// ─────────────────────────────────────────────
export interface Memory {
  id:          string
  thoughtId:   string
  pattern:     NeuralPattern
  output:      string
  timestamp:   number
  importance:  number
  accessCount: number
  decayRate?:  number
}

// ─────────────────────────────────────────────
// PATTERN NEURONAL
// ─────────────────────────────────────────────
export interface NeuralPattern {
  id:           string
  input:        string
  tokens:       string[]
  uniqueTokens: string[]
  complexity:   number
  confidence:   number
  timestamp:    number
  associations?: string[]
}

// ─────────────────────────────────────────────
// FITNESS
// ─────────────────────────────────────────────
export interface FitnessResult {
  score:      number            // 0-1
  strengths:  string[]
  weaknesses: string[]
  metrics:    Record<string, number>
  grade:      'F' | 'D' | 'C' | 'B' | 'A' | 'S'
}

// ─────────────────────────────────────────────
// ÉVOLUTION
// ─────────────────────────────────────────────
export interface MutationResult {
  config:    Partial<BrainConfig>
  mutations: string[]
  delta:     number
}

export interface BreedingResult {
  childConfig: BrainConfig
  dominantParent: string
  traitsMixed: string[]
  hybridVigor: number
}

// ─────────────────────────────────────────────
// MÉTRIQUES GLOBALES
// ─────────────────────────────────────────────
export interface IntelligenceMetrics {
  totalBrains:       number
  activeBrains:      number
  archivedBrains:    number
  averageIQ:         number
  maxIQ:             number
  averageCreativity: number
  totalThoughts:     number
  totalMemories:     number
  generation:        number
  status:            string
  topBrains:         Array<{ id: string; name: string; iq: number }>
}

// ─────────────────────────────────────────────
// EXPORT / IMPORT
// ─────────────────────────────────────────────
export interface ConsciousnessDump {
  id:         string
  name:       string
  generation: number
  genome: {
    seed:          NeuralSeedData
    consciousness: ConsciousnessData
  }
  metrics:    BrainMetrics
  memories:   Memory[]
  patterns:   NeuralPattern[]
  signature:  EtherSignature
  exportedAt: number
  version:    string
}

// ─────────────────────────────────────────────
// SIGNATURE
// ─────────────────────────────────────────────
export interface EtherSignature {
  id:        string
  version:   string
  createdAt: number
  author:    string
  hash:      string
}

// ─────────────────────────────────────────────
// RÉSEAU
// ─────────────────────────────────────────────
export interface NetworkThought {
  brainId:    string
  brainName:  string
  thought:    Thought
  influence:  number
  consensus:  number
}

export interface CollectiveResult {
  input:          string
  participants:   number
  thoughts:       NetworkThought[]
  synthesis:      string
  confidence:     number
  consensus:      number
}