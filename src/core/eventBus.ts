export interface EtherEvent<T = unknown> {
  id: string
  type: string
  source: string
  payload: T
  timestamp: number
  propagate: boolean
}

export type EventHandler<T = unknown> = (event: EtherEvent<T>) => void | Promise<void>

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()
  private history: EtherEvent[] = []
  private maxHistory = 200

  on<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    const existing = this.handlers.get(type) || []
    existing.push(handler as EventHandler)
    this.handlers.set(type, existing)
    return () => this.off(type, handler as EventHandler)
  }

  once<T = unknown>(type: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler<T> = (evt) => {
      handler(evt)
      this.off(type, wrapper as EventHandler)
    }
    this.on(type, wrapper)
  }

  off(type: string, handler: EventHandler): void {
    const existing = this.handlers.get(type) || []
    this.handlers.set(type, existing.filter(h => h !== handler))
  }

  emit<T = unknown>(type: string, source: string, payload: T): void {
    const event: EtherEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      source,
      payload,
      timestamp: Date.now(),
      propagate: true
    }
    this.history.unshift(event as EtherEvent)
    if (this.history.length > this.maxHistory) this.history.pop()

    const handlers = this.handlers.get(type) || []
    const wildcards = this.handlers.get('*') || []
    ;[...handlers, ...wildcards].forEach(h => {
      try { h(event as EtherEvent) } catch (e) { console.warn('[EventBus] Handler error:', e) }
    })
  }

  async emitAsync<T = unknown>(type: string, source: string, payload: T): Promise<void> {
    const event: EtherEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type, source, payload, timestamp: Date.now(), propagate: true
    }
    this.history.unshift(event as EtherEvent)
    if (this.history.length > this.maxHistory) this.history.pop()

    const handlers = [...(this.handlers.get(type) || []), ...(this.handlers.get('*') || [])]
    await Promise.allSettled(handlers.map(h => Promise.resolve(h(event as EtherEvent))))
  }

  emitTo(target: string, type: string, source: string, payload: unknown): void {
    this.emit(`${target}:${type}`, source, payload)
  }

  clear(): void { this.handlers.clear() }

  getHistory(limit = 50): EtherEvent[] { return this.history.slice(0, limit) }

  getActiveTypes(): string[] { return Array.from(this.handlers.keys()) }
}

export const eventBus = new EventBus()
export default EventBus
