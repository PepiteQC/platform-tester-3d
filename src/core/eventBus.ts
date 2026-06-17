// ============================================================
//  EventBus — Bus d'événements Etherworld
//  Communication décentralisée entre tous les modules
// ============================================================

export interface EtherEvent<T = unknown> {
  id: string
  type: string
  source: string
  payload: T
  timestamp: number
  propagate: boolean
}

export type EventHandler<T = unknown> = (event: EtherEvent<T>) => void | Promise<void>

// ─── EventBus ────────────────────────────────────────────────
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()
  private history: EtherEvent[] = []
  private maxHistory = 100

  // TODO: S'abonner à un événement
  on<T = unknown>(_type: string, _handler: EventHandler<T>): () => void {
    const existing = this.handlers.get(_type) || []
    existing.push(_handler as EventHandler)
    this.handlers.set(_type, existing)

    // Retourne une fonction de désabonnement
    return () => this.off(_type, _handler as EventHandler)
  }

  // TODO: S'abonner une seule fois
  once<T = unknown>(_type: string, _handler: EventHandler<T>): void {}

  // TODO: Se désabonner
  off(_type: string, _handler: EventHandler): void {
    const existing = this.handlers.get(_type) || []
    this.handlers.set(_type, existing.filter(h => h !== _handler))
  }

  // TODO: Émettre un événement
  emit<T = unknown>(_type: string, _source: string, _payload: T): void {}

  // TODO: Émettre de façon asynchrone
  async emitAsync<T = unknown>(_type: string, _source: string, _payload: T): Promise<void> {}

  // TODO: Émettre vers un module spécifique
  emitTo(_target: string, _type: string, _source: string, _payload: unknown): void {}

  // TODO: Vider tous les handlers
  clear(): void {
    this.handlers.clear()
  }

  // TODO: Obtenir l'historique
  getHistory(limit = 20): EtherEvent[] {
    return this.history.slice(0, limit)
  }

  // TODO: Obtenir les types d'événements actifs
  getActiveTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}

export const eventBus = new EventBus()
export default EventBus