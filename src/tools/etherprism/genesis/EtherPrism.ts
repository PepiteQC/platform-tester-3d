// ============================================================
// 🔮 ETHERPRISM — Cerveau intelligent auto-générateur
// "Aussi brillant que moi, mais dans le code"
// ============================================================

import { NeuralSeed }           from './NeuralSeed.js'
import { ConsciousnessFactory } from './ConsciousnessFactory.js'
import { ThoughtEngine }        from '../cognition/ThoughtEngine.js'
import { MemoryCrystal }        from '../cognition/MemoryCrystal.js'
import { LearningMatrix }       from '../cognition/LearningMatrix.js'
import { SelfMutation }         from '../evolution/SelfMutation.js'
import { GenerationBreeder }    from '../evolution/GenerationBreeder.js'
import { FitnessEvaluator }     from '../evolution/FitnessEvaluator.js'

import type {
  BrainConfig, BrainInstance, Thought, Memory,
  ConsciousnessDump, IntelligenceMetrics,
  EtherSignature, CollectiveResult, BrainMetrics,
} from '../types/index.js'

// ─────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────
let _instance: EtherPrism | null = null

export class EtherPrism {
  private brains:      Map<string, BrainInstance>  = new Map()
  private factory:     ConsciousnessFactory
  private mutator:     SelfMutation
  private breeder:     GenerationBreeder
  private evaluator:   FitnessEvaluator

  private generation       = 0
  private totalGenerated   = 0
  private isEvolving       = false
  private evolutionTimer:  ReturnType<typeof setTimeout> | null = null
  private signature:       EtherSignature

  private constructor() {
    this.factory   = new ConsciousnessFactory()
    this.mutator   = new SelfMutation()
    this.breeder   = new GenerationBreeder()
    this.evaluator = new FitnessEvaluator()
    this.signature = this.buildSignature()

    console.log('🔮 EtherPrism v1.0 — Prêt à générer des intelligences')
  }

  static getInstance(): EtherPrism {
    if (!_instance) _instance = new EtherPrism()
    return _instance
  }

  // ──────────────────────────────────────────────
  // CRÉER UN CERVEAU
  // ──────────────────────────────────────────────
  async createBrain(config: BrainConfig): Promise<BrainInstance> {
    const seed = new NeuralSeed({
      intelligence:   config.intelligence,
      creativity:     config.creativity,
      memory:         config.memory,
      learningRate:   config.learningRate,
      mutationRate:   config.mutationRate,
      specialization: config.specialization,
    })

    const consciousness = await this.factory.develop(seed, {
      depth:        config.depth,
      complexity:   config.complexity,
      adaptability: config.adaptability,
    })

    const brain: BrainInstance = {
      id:   `brain_${Date.now()}_${this.totalGenerated}`,
      name: config.name ?? `EtherBrain_${this.totalGenerated}`,
      generation:    this.generation,
      seed:          seed.toData(),
      consciousness,
      thoughtEngine:  new ThoughtEngine(),
      memoryCrystal:  new MemoryCrystal(),
      learningMatrix: new LearningMatrix(config.learningRate),
      metrics: {
        iq:               this.calcIQ(seed, consciousness),
        creativity:       seed.creativity,
        memoryCapacity:   seed.memory,
        processingSpeed:  seed.processingSpeed,
        adaptability:     consciousness.adaptability,
        generation:       this.generation,
        thoughtsProcessed: 0,
        memoriesStored:   0,
        patternsLearned:  0,
      },
      createdAt:   Date.now(),
      lastActiveAt: Date.now(),
      status:      'dormant',
    }

    this.brains.set(brain.id, brain)
    this.totalGenerated++

    console.log(
      `🧠 Cerveau créé: "${brain.name}" ` +
      `(IQ: ${brain.metrics.iq.toFixed(0)}, ` +
      `Spé: ${brain.seed.specialization}, ` +
      `Gen: #${brain.generation})`
    )

    return brain
  }

  // ──────────────────────────────────────────────
  // FAIRE PENSER
  // ──────────────────────────────────────────────
  async think(brainId: string, input: string): Promise<Thought> {
    const brain = this.getBrain(brainId)
    brain.status      = 'thinking'
    brain.lastActiveAt = Date.now()

    const t0      = Date.now()
    const pattern  = await brain.thoughtEngine.process(input)
    const memories = brain.memoryCrystal.recall(pattern)
    const learned  = brain.learningMatrix.learn(pattern, memories)

    const confidence = pattern.confidence * (1 + memories.length * 0.05)

    const output = this.synthesize(pattern, memories, learned, brain.seed)

    const thought: Thought = {
      id:               `thought_${Date.now()}`,
      brainId,
      input,
      pattern,
      memoriesInvolved: memories.length,
      learningDelta:    learned.delta,
      output,
      confidence:       Math.min(1, confidence),
      timestamp:        Date.now(),
      processingTime:   Date.now() - t0,
    }

    brain.memoryCrystal.store(thought)

    // Mettre à jour métriques
    brain.metrics.thoughtsProcessed++
    brain.metrics.memoriesStored   = brain.memoryCrystal.size()
    brain.metrics.patternsLearned  += learned.newPatterns ? 1 : 0
    brain.status = 'dormant'

    return thought
  }

  // ──────────────────────────────────────────────
  // ÉVOLUER
  // ──────────────────────────────────────────────
  async evolve(brainId: string): Promise<BrainInstance> {
    const brain   = this.getBrain(brainId)
    brain.status  = 'evolving'

    const fitness = this.evaluator.evaluate(brain)
    console.log(
      `🧬 Évolution "${brain.name}" — ` +
      `Fitness: ${(fitness.score * 100).toFixed(0)}% (${fitness.grade})`
    )

    if (fitness.score < 0.35) {
      console.log('  ⚠️ Fitness trop faible pour évoluer')
      brain.status = 'dormant'
      return brain
    }

    const mutation = this.mutator.mutate(
      new NeuralSeed(brain.seed),
      fitness
    )

    const evolved = await this.createBrain({
      name: `${brain.name}_v${brain.generation + 1}`,
      intelligence:   mutation.config.intelligence   ?? brain.seed.intelligence,
      creativity:     mutation.config.creativity     ?? brain.seed.creativity,
      memory:         mutation.config.memory         ?? brain.seed.memory,
      learningRate:   mutation.config.learningRate   ?? brain.seed.learningRate,
      mutationRate:   mutation.config.mutationRate   ?? brain.seed.mutationRate,
      specialization: mutation.config.specialization ?? brain.seed.specialization,
      depth:          brain.consciousness.depth,
      complexity:     brain.consciousness.complexity,
      adaptability:   brain.consciousness.adaptability,
    })

    // Héritage de mémoire et apprentissage
    evolved.memoryCrystal.inheritFrom(brain.memoryCrystal, 0.70)
    evolved.learningMatrix.inheritFrom(brain.learningMatrix, 0.60)
    evolved.generation  = brain.generation + 1
    evolved.parentIds   = [brain.id, ...(brain.parentIds ?? [])]
    evolved.metrics.generation = evolved.generation

    // Archiver le parent
    brain.status = 'archived'

    console.log(
      `✨ Évolution: ${brain.name} → ${evolved.name}` +
      ` (mutations: ${mutation.mutations.join(', ')})`
    )

    return evolved
  }

  // ──────────────────────────────────────────────
  // REPRODUCTION
  // ──────────────────────────────────────────────
  async breed(id1: string, id2: string): Promise<BrainInstance> {
    const brain1 = this.getBrain(id1)
    const brain2 = this.getBrain(id2)

    const seed1 = new NeuralSeed(brain1.seed)
    const seed2 = new NeuralSeed(brain2.seed)

    const compat = seed1.compatibilityWith(seed2)
    console.log(
      `🧬 Reproduction: "${brain1.name}" × "${brain2.name}" ` +
      `(compatibilité: ${(compat * 100).toFixed(0)}%)`
    )

    const result = this.breeder.cross(seed1, seed2, {
      dominance:      0.5,
      mutationChance: (brain1.seed.mutationRate + brain2.seed.mutationRate) / 2,
      hybridVigor:    compat > 0.6,
    })

    const child = await this.createBrain({
      ...result.childConfig,
      name: `${brain1.name.split('_')[0]}_${brain2.name.split('_')[0]}_child`,
    })

    child.memoryCrystal.inheritFrom(brain1.memoryCrystal, 0.50)
    child.memoryCrystal.inheritFrom(brain2.memoryCrystal, 0.50)
    child.learningMatrix.inheritFrom(brain1.learningMatrix, 0.50)
    child.learningMatrix.inheritFrom(brain2.learningMatrix, 0.50)
    child.parentIds   = [id1, id2]
    child.generation  = Math.max(brain1.generation, brain2.generation) + 1

    console.log(
      `👶 Enfant: "${child.name}" (IQ: ${child.metrics.iq.toFixed(0)}, ` +
      `hybridVigor: ${result.hybridVigor.toFixed(2)})`
    )

    return child
  }

  // ──────────────────────────────────────────────
  // POPULATION
  // ──────────────────────────────────────────────
  async generatePopulation(
    count:      number,
    baseConfig?: Partial<BrainConfig>
  ): Promise<BrainInstance[]> {
    console.log(`🌍 Génération d'une population de ${count} cerveaux...`)

    const results: BrainInstance[] = []
    const batch   = 10

    for (let i = 0; i < count; i += batch) {
      const size    = Math.min(batch, count - i)
      const promises = Array.from({ length: size }, (_, j) => {
        const v = (j / size)
        return this.createBrain({
          name:           `Pop_${i + j}`,
          intelligence:   baseConfig?.intelligence   ?? 0.3 + Math.random() * 0.7,
          creativity:     baseConfig?.creativity     ?? 0.2 + Math.random() * 0.8,
          memory:         baseConfig?.memory         ?? 0.3 + Math.random() * 0.7,
          learningRate:   baseConfig?.learningRate   ?? 0.2 + Math.random() * 0.6,
          mutationRate:   0.05 + Math.random() * 0.20,
          specialization: NeuralSeed.random().specialization,
          depth:          baseConfig?.depth          ?? 2 + Math.floor(Math.random() * 5),
          complexity:     baseConfig?.complexity     ?? 3 + Math.floor(Math.random() * 6),
          adaptability:   baseConfig?.adaptability   ?? 0.3 + Math.random() * 0.7,
        })
      })

      results.push(...await Promise.all(promises))
    }

    console.log(`✅ Population de ${results.length} cerveaux créée`)
    return results
  }

  // ──────────────────────────────────────────────
  // PENSÉE COLLECTIVE
  // ──────────────────────────────────────────────
  async collectiveThought(
    brainIds: string[],
    input:    string
  ): Promise<CollectiveResult> {
    const thoughts = await Promise.all(
      brainIds.map(id => this.think(id, input))
    )

    // Trier par confiance
    const sorted = thoughts.sort((a, b) => b.confidence - a.confidence)

    // Calcul du consensus
    const avgConf   = sorted.reduce((s, t) => s + t.confidence, 0) / sorted.length
    const consensus = sorted.filter(t => t.confidence >= avgConf).length / sorted.length

    // Synthèse du meilleur
    const best      = sorted[0]

    return {
      input,
      participants: brainIds.length,
      thoughts:     sorted.map((t, i) => ({
        brainId:   t.brainId,
        brainName: this.brains.get(t.brainId)?.name ?? 'unknown',
        thought:   t,
        influence: (sorted.length - i) / sorted.length,
        consensus,
      })),
      synthesis:   best.output,
      confidence:  best.confidence,
      consensus,
    }
  }

  // ──────────────────────────────────────────────
  // EXPORT / IMPORT
  // ──────────────────────────────────────────────
  export(brainId: string): ConsciousnessDump {
    const brain = this.getBrain(brainId)

    return {
      id:         brain.id,
      name:       brain.name,
      generation: brain.generation,
      genome: {
        seed:          brain.seed,
        consciousness: brain.consciousness,
      },
      metrics:    brain.metrics,
      memories:   brain.memoryCrystal.dump(),
      patterns:   brain.learningMatrix.dump(),
      signature:  this.signature,
      exportedAt: Date.now(),
      version:    '1.0.0',
    }
  }

  async import(dump: ConsciousnessDump): Promise<BrainInstance> {
    console.log(`📥 Import du cerveau: "${dump.name}"`)

    const brain = await this.createBrain({
      name:           `${dump.name}_imported`,
      intelligence:   dump.genome.seed.intelligence,
      creativity:     dump.genome.seed.creativity,
      memory:         dump.genome.seed.memory,
      learningRate:   dump.genome.seed.learningRate,
      mutationRate:   dump.genome.seed.mutationRate,
      specialization: dump.genome.seed.specialization,
      depth:          dump.genome.consciousness.depth,
      complexity:     dump.genome.consciousness.complexity,
      adaptability:   dump.genome.consciousness.adaptability,
    })

    brain.memoryCrystal.import(dump.memories)
    brain.learningMatrix.import(dump.patterns)
    brain.metrics    = { ...dump.metrics }
    brain.generation = dump.generation

    return brain
  }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────
  getStats(): IntelligenceMetrics {
    const all      = [...this.brains.values()]
    const active   = all.filter(b => b.status !== 'archived')
    const archived = all.filter(b => b.status === 'archived')

    const avgIQ = active.length > 0
      ? active.reduce((s, b) => s + b.metrics.iq, 0) / active.length
      : 0

    const maxIQ  = active.length > 0
      ? Math.max(...active.map(b => b.metrics.iq))
      : 0

    const topBrains = [...active]
      .sort((a, b) => b.metrics.iq - a.metrics.iq)
      .slice(0, 5)
      .map(b => ({ id: b.id, name: b.name, iq: Math.round(b.metrics.iq) }))

    return {
      totalBrains:       all.length,
      activeBrains:      active.length,
      archivedBrains:    archived.length,
      averageIQ:         Math.round(avgIQ),
      maxIQ:             Math.round(maxIQ),
      averageCreativity: active.reduce((s, b) => s + b.metrics.creativity, 0) / (active.length || 1),
      totalThoughts:     active.reduce((s, b) => s + b.metrics.thoughtsProcessed, 0),
      totalMemories:     active.reduce((s, b) => s + b.metrics.memoriesStored, 0),
      generation:        this.generation,
      status:            this.isEvolving ? '🔄 Évolution active' : '✅ Stable',
      topBrains,
    }
  }

  // ──────────────────────────────────────────────
  // PRIVÉS
  // ──────────────────────────────────────────────
  private getBrain(id: string): BrainInstance {
    const brain = this.brains.get(id)
    if (!brain) throw new Error(`Cerveau "${id}" introuvable`)
    return brain
  }

  private calcIQ(seed: NeuralSeed, c: any): number {
    return Math.min(200,
      seed.intelligence * 80 +
      seed.creativity   * 30 +
      seed.memory       * 20 +
      c.depth           * 5  +
      c.adaptability    * 15
    )
  }

  private synthesize(
    pattern:  any,
    memories: Memory[],
    learned:  any,
    seed:     any
  ): string {
    const memStr  = memories.length > 0
      ? `${memories.length} souvenirs activés.`
      : 'Pattern nouveau.'

    const learnStr = learned.newPatterns
      ? 'Nouveau pattern enregistré.'
      : learned.reinforced
        ? 'Pattern renforcé.'
        : ''

    const confStr = pattern.confidence > 0.8
      ? 'Haute confiance.'
      : pattern.confidence > 0.5
        ? 'Confiance modérée.'
        : 'Exploration.'

    const specStr: Record<string, string> = {
      analytical:    'Analyse logique effectuée.',
      creative:      'Approche créative générée.',
      logical:       'Déduction formelle complète.',
      intuitive:     'Intuition activée.',
      mathematical:  'Modèle mathématique appliqué.',
      tactical:      'Stratégie tactique calculée.',
      empathic:      'Résonance empathique détectée.',
      genesis:       'Synthèse primordiale accomplie.',
      general:       'Traitement général complété.',
    }

    return [confStr, memStr, learnStr, specStr[seed.specialization] ?? '']
      .filter(Boolean)
      .join(' ')
  }

  private buildSignature(): EtherSignature {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let   raw   = ''
    for (let i = 0; i < 20; i++) raw += chars[Math.floor(Math.random() * chars.length)]

    return {
      id:        `ETH-${raw}`,
      version:   '1.0.0',
      createdAt: Date.now(),
      author:    'EtherPrism Genesis Engine',
      hash:      btoa(raw).slice(0, 12),
    }
  }

  // ──────────────────────────────────────────────
  // API PUBLIQUE
  // ──────────────────────────────────────────────
  getBrains():      Map<string, BrainInstance> { return this.brains }
  getBrain(id: string): BrainInstance | undefined { return this.brains.get(id) }
  getGeneration():  number          { return this.generation }
  getTotalGenerated(): number       { return this.totalGenerated }
  getSignature():   EtherSignature  { return this.signature }

  stopEvolution(): void {
    this.isEvolving = false
    if (this.evolutionTimer) clearTimeout(this.evolutionTimer)
    console.log('⏹️ Évolution arrêtée')
  }
}

export const etherPrism = EtherPrism.getInstance()