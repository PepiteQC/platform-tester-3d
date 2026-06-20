// ============================================================
//  TroxT — Etherworld Neural Core
//  Cerveau central d'Etherworld Project
// ============================================================

export interface TroxTConfig {
  name: string
  version: string
  modules: string[]
}

export interface TroxTState {
  isActive: boolean
  currentModule: string | null
  memory: Record<string, unknown>
  eventLog: TroxTEvent[]
}

export interface TroxTEvent {
  id: string
  type: string
  source: string
  payload: unknown
  timestamp: number
}

// ─── TroxT Agent ─────────────────────────────────────────────
export class TroxT {
  private config: TroxTConfig
  private state: TroxTState
  private loadedModules: Set<string> = new Set()

  constructor(config: TroxTConfig) {
    this.config = config
    this.state = {
      isActive: false,
      currentModule: null,
      memory: {},
      eventLog: []
    }
  }

  // ────────────────────────────────────────────────────────────
  // Initialisation du Core
  // ────────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    this.log(`Initializing TroxT v${this.config.version}...`)
    this.state.isActive = true

    // Auto-load des modules déclarés
    for (const moduleId of this.config.modules) {
      await this.connectModule(moduleId)
    }

    this.log(`TroxT initialized with ${this.loadedModules.size} modules.`)
  }

  // ────────────────────────────────────────────────────────────
  // Connexion d'un module
  // ────────────────────────────────────────────────────────────
  async connectModule(moduleId: string): Promise<void> {
    if (this.loadedModules.has(moduleId)) {
      this.log(`Module '${moduleId}' already connected.`)
      return
    }

    // Validation simple
    if (!this.config.modules.includes(moduleId)) {
      this.log(`❌ Module '${moduleId}' is not declared in config.`)
      return
    }

    this.loadedModules.add(moduleId)
    this.log(`Module '${moduleId}' connected.`)
  }

  // ────────────────────────────────────────────────────────────
  // Traitement d'un événement
  // ────────────────────────────────────────────────────────────
  async processEvent(event: TroxTEvent): Promise<void> {
    if (!this.state.isActive) {
      this.log(`⚠️ TroxT inactive. Event ignored: ${event.type}`)
      return
    }

    this.state.eventLog.push(event)
    this.log(`Event processed: ${event.type} from ${event.source}`)

    // Broadcast automatique
    await this.broadcast(event)
  }

  // ────────────────────────────────────────────────────────────
  // Broadcast vers tous les modules
  // ────────────────────────────────────────────────────────────
  async broadcast(event: TroxTEvent): Promise<void> {
    for (const moduleId of this.loadedModules) {
      this.log(`Broadcast → ${moduleId}: ${event.type}`)
      // Ici tu pourras appeler le module réel (plugin system)
    }
  }

  // ────────────────────────────────────────────────────────────
  // Mémoire interne
  // ────────────────────────────────────────────────────────────
  getMemory<T = unknown>(key: string): T | undefined {
    return this.state.memory[key] as T
  }

  setMemory(key: string, value: unknown): void {
    this.state.memory[key] = value
    this.log(`Memory updated: ${key}`)
  }

  // ────────────────────────────────────────────────────────────
  // Logger interne
  // ────────────────────────────────────────────────────────────
  private log(message: string): void {
    console.log(`[TroxT] ${message}`)
  }

  // ────────────────────────────────────────────────────────────
  // Accès à l'état complet
  // ────────────────────────────────────────────────────────────
  getState(): TroxTState {
    return this.state
  }
}

export default TroxT
