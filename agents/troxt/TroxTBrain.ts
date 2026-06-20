// ============================================================
//  TROXTBRAIN.ts — Cerveau Neural Central v3.0
//  Implémentation complète du noyau pensant.
//  Remplace les TODOs de TroxT.ts par une architecture ReAct+CoT.
// ============================================================

import { eventBus, EtherEvent } from '../../core/eventBus'
import { memory, Memory } from '../../core/memory'
import { troxTBridge, BridgeMessage, ModuleId } from '../../core/troxt-bridge'
import { ReasoningEngine, ThoughtChain, PlanStep } from './ReasoningEngine'
import { SkillRegistry, SkillResult } from './skills/SkillRegistry'
import { EpisodicMemory, Episode } from './memory/EpisodicMemory'

export interface TroxTBrainConfig {
  name: string
  version: string
  modules: ModuleId[]
  personality: PersonalityProfile
  llmEndpoint?: string
  llmModel?: string
  autoSaveIntervalMs?: number
  maxCognitiveLoad: number
  proactiveThreshold: number
}

export interface PersonalityProfile {
  curiosity: number      // 0-1 : tendance à explorer
  prudence: number       // 0-1 : validation avant action
  creativity: number     // 0-1 : génération d'alternatives
  verbosity: number      // 0-1 : richesse des réponses
  empathy: number       // 0-1 : adaptation au ton utilisateur
}

export interface CognitiveState {
  isActive: boolean
  currentModule: ModuleId | null
  consciousnessLevel: number  // 1-10
  cognitiveLoad: number       // 0-100
  emotionalState: { valence: number; arousal: number }
  lastActivity: number
  activePlan: PlanStep[] | null
  contextWindow: string[]
}

export interface PerceptionFrame {
  source: string
  modality: 'text' | 'visual' | 'spatial' | 'system' | 'social'
  payload: unknown
  timestamp: number
  urgency: number
}

export interface ActionFrame {
  skillId: string
  params: Record<string, unknown>
  reason: string
  confidence: number
  requiresConfirmation: boolean
}

export class TroxTBrain {
  private config: TroxTBrainConfig
  private state: CognitiveState
  private reasoning: ReasoningEngine
  private skills: SkillRegistry
  private episodic: EpisodicMemory
  private memory: Memory
  private loopId: ReturnType<typeof setInterval> | null = null
  private perceptionQueue: PerceptionFrame[] = []
  private isProcessing = false

  constructor(config: TroxTBrainConfig) {
    this.config = config
    this.memory = memory
    this.episodic = new EpisodicMemory()
    this.reasoning = new ReasoningEngine(config.personality)
    this.skills = new SkillRegistry()

    this.state = {
      isActive: false,
      currentModule: null,
      consciousnessLevel: 5,
      cognitiveLoad: 0,
      emotionalState: { valence: 0.5, arousal: 0.3 },
      lastActivity: Date.now(),
      activePlan: null,
      contextWindow: []
    }

    this.bindBridge()
    this.bindEventBus()
    this.bootstrapSkills()
  }

  // ═══════════════════════════════════════════════════════════
  //  INITIALISATION
  // ═══════════════════════════════════════════════════════════
  async initialize(): Promise<void> {
    this.state.isActive = true
    this.state.lastActivity = Date.now()

    // Restaurer mémoire depuis localStorage si dispo
    const saved = localStorage.getItem('troxt.memory.snapshot')
    if (saved) {
      try { this.memory.restore(JSON.parse(saved), 'localStorage') } catch (e) {}
    }

    const savedEpisodes = localStorage.getItem('troxt.episodic.memory')
    if (savedEpisodes) {
      try { this.episodic.hydrate(JSON.parse(savedEpisodes)) } catch (e) {}
    }

    // Auto-save périodique
    const interval = this.config.autoSaveIntervalMs || 30000
    setInterval(() => this.saveMemory(), interval)

    // Start perception loop
    this.loopId = setInterval(() => this.perceptionTick(), 200)

    this.emit('troxt.status', { status: 'online', consciousness: this.state.consciousnessLevel })
    console.log(`🧠 TroxTBrain ${this.config.version} — Cortex Online`)
  }

  async shutdown(): Promise<void> {
    this.state.isActive = false
    if (this.loopId) clearInterval(this.loopId)
    this.saveMemory()
    this.emit('troxt.status', { status: 'offline' })
  }

  // ═══════════════════════════════════════════════════════════
  //  PERCEPTION — Système sensoriel
  // ═══════════════════════════════════════════════════════════
  perceive(frame: PerceptionFrame): void {
    this.perceptionQueue.push(frame)
    // Triage par urgence
    this.perceptionQueue.sort((a, b) => b.urgency - a.urgency)
  }

  private async perceptionTick(): Promise<void> {
    if (!this.state.isActive || this.isProcessing) return
    if (this.perceptionQueue.length === 0) return

    const frame = this.perceptionQueue.shift()!
    this.isProcessing = true
    this.state.cognitiveLoad = Math.min(100, this.state.cognitiveLoad + 10)

    try {
      await this.processPerception(frame)
    } catch (e) {
      this.emit('troxt.error', { phase: 'perception', error: String(e) })
    } finally {
      this.isProcessing = false
      this.state.cognitiveLoad = Math.max(0, this.state.cognitiveLoad - 10)
      this.state.lastActivity = Date.now()
    }
  }

  private async processPerception(frame: PerceptionFrame): Promise<void> {
    // 1. Mémoriser l'observation
    const episodeId = this.episodic.record({
      type: frame.modality,
      source: frame.source,
      content: typeof frame.payload === 'string'
        ? frame.payload
        : JSON.stringify(frame.payload, null, 2) ?? String(frame.payload),
      timestamp: frame.timestamp,
      valence: this.estimateValence(frame),
      importance: frame.urgency
    })

    // 2. Si texte utilisateur → Chaîne de raisonnement
    if (frame.modality === 'text' && frame.source === 'user') {
      await this.handleUserText(frame.payload as string, episodeId)
      return
    }

    // 3. Si système (alerte, métrique) → réaction réflexe ou planification
    if (frame.modality === 'system') {
      await this.handleSystemSignal(frame.payload as Record<string, unknown>)
      return
    }

    // 4. Spatial / Social → mise à jour du monde interne
    if (frame.modality === 'spatial' || frame.modality === 'social') {
      this.memory.set(`world.${frame.modality}.${frame.source}`, frame.payload, {
        source: frame.source,
        tags: [frame.modality, 'perception'],
        ttl: 300000 // 5 min TTL
      })
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RAISONNEMENT — Chaîne de pensée explicite
  // ═══════════════════════════════════════════════════════════
  private async handleUserText(text: string, episodeId: string): Promise<void> {
    const context = this.buildContext(text)
    const chain = await this.reasoning.think({
      input: text,
      context,
      personality: this.config.personality,
      availableSkills: this.skills.listAvailable(),
      memorySnapshot: this.episodic.retrieveRelevant(text, 5)
    })

    // Logguer la pensée
    this.emit('troxt.thought', { chain, episodeId })

    // Exécuter le plan
    const response = await this.executeChain(chain)

    // Répondre
    this.emit('troxt.response', {
      text: response,
      thoughtChain: chain,
      episodeId,
      cognitiveLoad: this.state.cognitiveLoad
    })
  }

  private async executeChain(chain: ThoughtChain): Promise<string> {
    const results: string[] = []

    for (const step of chain.steps) {
      if (step.type === 'skill_call') {
        const result = await this.executeSkill(step.skill!, step.params || {})
        results.push(`[${step.skill}] ${result.summary}`)
      }
      if (step.type === 'thought') {
        results.push(`💭 ${step.content}`)
      }
      if (step.type === 'final_answer') {
        results.push(step.content)
      }
    }

    return results.join('\n')
  }

  private async executeSkill(skillId: string, params: Record<string, unknown>): Promise<SkillResult> {
    const skill = this.skills.get(skillId)
    if (!skill) return { success: false, summary: `Skill ${skillId} inconnu`, detail: null }

    // Vérification prudence
    if (skill.dangerous && this.config.personality.prudence > 0.5) {
      this.emit('troxt.confirmation_required', { skillId, params, reason: 'Action destructive détectée' })
      return { success: false, summary: 'En attente de confirmation utilisateur', detail: null }
    }

    try {
      const result = await skill.handler(params, {
        bridge: troxTBridge,
        memory: this.memory,
        episodic: this.episodic,
        emit: (t, p) => this.emit(t, p)
      })
      return result
    } catch (err) {
      return { success: false, summary: `Erreur: ${err}`, detail: null }
    }
  }

  private async handleSystemSignal(signal: Record<string, unknown>): Promise<void> {
    const type = signal.type as string

    if (type === 'memory_alert' && this.config.personality.curiosity > 0.3) {
      this.emit('troxt.proactive', {
        message: `⚠️ Alert système : ${signal.message}. Je suggère un snapshot.`,
        suggestedSkill: 'admin_create_snapshot',
        params: { reason: signal.message }
      })
    }

    if (type === 'player_join') {
      this.episodic.record({
        type: 'social',
        source: 'server',
        content: `Joueur ${signal.playerId} connecté`,
        timestamp: Date.now(),
        valence: 0.6,
        importance: 0.3
      })
    }

    if (type === 'world_state_changed') {
      this.memory.set('world.state', signal, { source: 'system', tags: ['world'], ttl: 60000 })
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CONTEXTE — Construction de la fenêtre cognitive
  // ═══════════════════════════════════════════════════════════
  private buildContext(userInput: string): string {
    const worldState = this.memory.get('world.state') || {}
    const playerCount = this.memory.get('world.playerCount') || 0
    const lastModule = this.state.currentModule || 'none'
    const recentEpisodes = this.episodic.retrieveRelevant(userInput, 3)

    return `
[ÉTAT DU MONDE]
- Module actif : ${lastModule}
- Joueurs en ligne : ${playerCount}
- Météo : ${(worldState as any).weather || 'inconnue'}
- Heure monde : ${(worldState as any).time_of_day || 'inconnue'}

[MÉMOIRE RÉCENTE]
${recentEpisodes.map(e => `- ${e.content}`).join('\n')}

[UTILISATEUR DIT]
${userInput}
`.trim()
  }

  private estimateValence(frame: PerceptionFrame): number {
    if (frame.modality === 'system') {
      const m = String(frame.payload).toLowerCase()
      if (m.includes('error') || m.includes('fail') || m.includes('alert')) return -0.7
      if (m.includes('success') || m.includes('join')) return 0.5
    }
    if (frame.modality === 'text') {
      const t = String(frame.payload).toLowerCase()
      if (t.includes('merci') || t.includes('bravo') || t.includes('génial')) return 0.8
      if (t.includes('bug') || t.includes('problème') || t.includes('aide')) return -0.3
    }
    return 0.0
  }

  // ═══════════════════════════════════════════════════════════
  //  COMMUNICATION — Émission événements
  // ═══════════════════════════════════════════════════════════
  private emit(type: string, payload: unknown): void {
    eventBus.emit(type, 'troxt-brain', payload)
    troxTBridge.broadcast('troxt', type, payload)
  }

  // ═══════════════════════════════════════════════════════════
  //  BRIDGE & EVENTBUS BINDINGS
  // ═══════════════════════════════════════════════════════════
  private bindBridge(): void {
    this.config.modules.forEach(m => troxTBridge.connect(m))

    troxTBridge.on('message', (msg: BridgeMessage) => {
      this.perceive({
        source: msg.from,
        modality: msg.type === 'visual' ? 'visual' : 'system',
        payload: msg.payload,
        timestamp: msg.timestamp,
        urgency: 0.5
      })
    })
  }

  private bindEventBus(): void {
    eventBus.on('system.bootstrap', (evt: EtherEvent) => {
      this.perceive({
        source: evt.source,
        modality: 'system',
        payload: evt.payload,
        timestamp: evt.timestamp,
        urgency: 0.2
      })
    })
  }

  // ═══════════════════════════════════════════════════════════
  //  SKILLS — Enregistrement natif
  // ═══════════════════════════════════════════════════════════
  private bootstrapSkills(): void {
    // Auto-déclaration des skills critiques
    this.skills.register({
      id: 'self_introspect',
      name: 'Introspection',
      description: 'Analyser son propre état cognitif',
      params: {},
      dangerous: false,
      handler: async (_, ctx) => {
        const state = this.state
        return {
          success: true,
          summary: `Conscience ${state.consciousnessLevel}/10, Load ${state.cognitiveLoad}%, Dernière activité il y a ${Date.now() - state.lastActivity}ms`,
          detail: state
        }
      }
    })

    this.skills.register({
      id: 'memory_search',
      name: 'Recherche mémoire',
      description: 'Chercher dans la mémoire episodique ou sémantique',
      params: { query: 'string', limit: 'number' },
      dangerous: false,
      handler: async (params, ctx) => {
        const episodes = ctx.episodic.retrieveRelevant(params.query as string, (params.limit as number) || 5)
        return { success: true, summary: `${episodes.length} souvenirs trouvés`, detail: episodes }
      }
    })
  }

  // ═══════════════════════════════════════════════════════════
  //  PERSISTANCE
  // ═══════════════════════════════════════════════════════════
  private saveMemory(): void {
    try {
      localStorage.setItem('troxt.memory.snapshot', JSON.stringify(this.memory.snapshot()))
      localStorage.setItem('troxt.episodic.memory', JSON.stringify(this.episodic.serialize()))
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════
  //  API PUBLIQUE
  // ═══════════════════════════════════════════════════════════
  getState(): CognitiveState {
    return { ...this.state }
  }

  setConsciousnessLevel(level: number): void {
    this.state.consciousnessLevel = Math.max(1, Math.min(10, level))
  }

  async chat(text: string): Promise<string> {
    return new Promise((resolve) => {
      const unsub = eventBus.on('troxt.response', (evt: EtherEvent) => {
        const p = evt.payload as any
        if (p.episodeId) {
          resolve(p.text)
          unsub()
        }
      })
      this.perceive({
        source: 'user',
        modality: 'text',
        payload: text,
        timestamp: Date.now(),
        urgency: 1.0
      })
      // Fallback si timeout
      setTimeout(() => { resolve('⏳ TroxT réfléchit... réessayez dans un instant.'); unsub() }, 10000)
    })
  }

  async runSkill(skillId: string, params: Record<string, unknown>): Promise<SkillResult> {
    return this.executeSkill(skillId, params)
  }
}

export default TroxTBrain


