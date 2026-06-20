import { eventBus } from '../../core/eventBus'
import { AutonomousLoop } from './AutonomousLoop'
import { TroxTBrain } from './TroxTBrain'
import { registerAllEtherSkills } from './skills/EtherSkills'
import type { SkillRegistry } from './skills/SkillRegistry'

export class TroxTRuntime {
  readonly brain: TroxTBrain
  readonly loop: AutonomousLoop
  private retainCount = 0
  private initializePromise: Promise<void> | null = null
  private initialized = false
  private unsubscribe: Array<() => void> = []

  constructor() {
    this.brain = new TroxTBrain({
      name: 'TroxT Cerveau',
      version: '4.0.0-intellectus',
      modules: ['ether-prism', 'ether-forge', 'ether-weave', 'ether-lens'],
      personality: { curiosity:0.86, prudence:0.82, creativity:0.88, verbosity:0.68, empathy:0.72 },
      maxCognitiveLoad: 85,
      proactiveThreshold: 0.45,
      autoSaveIntervalMs: 30_000,
    })

    // Pont de migration localisé. À terme, expose getSkillRegistry() publiquement dans TroxTBrain.
    const registry = (this.brain as unknown as { skills: SkillRegistry }).skills
    registerAllEtherSkills(registry)
    this.loop = new AutonomousLoop(this.brain, 5_000)
  }

  async retain(): Promise<TroxTBrain> {
    this.retainCount += 1
    if (!this.initializePromise) this.initializePromise = this.initialize()
    await this.initializePromise
    return this.brain
  }

  async release(): Promise<void> {
    this.retainCount = Math.max(0, this.retainCount - 1)
    if (this.retainCount > 0 || !this.initialized) return
    this.loop.stop()
    this.unsubscribe.splice(0).forEach(unsubscribe => unsubscribe())
    await this.brain.shutdown()
    this.initialized = false
    this.initializePromise = null
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return
    await this.brain.initialize()
    this.loop.start()
    this.unsubscribe.push(
      eventBus.on('system.bootstrap', event => this.brain.perceive({
        source:event.source, modality:'system', payload:event.payload,
        timestamp:event.timestamp, urgency:0.3,
      })),
      eventBus.on('app.tab_changed', event => this.brain.perceive({
        source:event.source, modality:'system', payload:{ type:'module_changed', ...event.payload as object },
        timestamp:event.timestamp, urgency:0.2,
      })),
    )
    this.initialized = true
  }
}

export const troxTRuntime = new TroxTRuntime()
