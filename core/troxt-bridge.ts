export type ModuleId = 'ether-prism' | 'ether-forge' | 'ether-weave' | 'ether-lens'

export interface BridgeChannel {
  moduleId: ModuleId
  isConnected: boolean
  lastSync: number
  messageCount: number
}

export interface BridgeMessage {
  id: string
  from: ModuleId | 'troxt'
  to: ModuleId | 'troxt' | 'broadcast'
  type: string
  payload: unknown
  timestamp: number
}

export class TroxTBridge {
  private channels: Map<ModuleId, BridgeChannel> = new Map()
  private messageQueue: BridgeMessage[] = []
  private listeners: Map<string, ((msg: BridgeMessage) => void)[]> = new Map()

  connect(moduleId: ModuleId): BridgeChannel {
    const channel: BridgeChannel = {
      moduleId,
      isConnected: true,
      lastSync: Date.now(),
      messageCount: 0
    }
    this.channels.set(moduleId, channel)
    return channel
  }

  disconnect(moduleId: ModuleId): void {
    const ch = this.channels.get(moduleId)
    if (ch) ch.isConnected = false
  }

  send(message: Omit<BridgeMessage, 'id' | 'timestamp'>): void {
    const full: BridgeMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    }
    this.messageQueue.push(full)
    const ch = this.channels.get(message.from as ModuleId)
    if (ch) ch.messageCount++
    const handlers = this.listeners.get(message.type) || []
    const wildcards = this.listeners.get('message') || []
    ;[...handlers, ...wildcards].forEach(h => { try { h(full) } catch {} })
  }

  broadcast(from: ModuleId | 'troxt', type: string, payload: unknown): void {
    const msg: BridgeMessage = {
      id: `bcast_${Date.now()}`,
      from,
      to: 'broadcast',
      type,
      payload,
      timestamp: Date.now()
    }
    this.messageQueue.push(msg)
    const handlers = this.listeners.get(type) || []
    const wildcards = this.listeners.get('message') || []
    ;[...handlers, ...wildcards].forEach(h => { try { h(msg) } catch {} })
  }

  on(type: string, callback: (msg: BridgeMessage) => void): void {
    const existing = this.listeners.get(type) || []
    existing.push(callback)
    this.listeners.set(type, existing)
  }

  off(type: string, callback: (msg: BridgeMessage) => void): void {
    const existing = this.listeners.get(type) || []
    this.listeners.set(type, existing.filter(h => h !== callback))
  }

  getChannels(): BridgeChannel[] { return Array.from(this.channels.values()) }

  flushQueue(): BridgeMessage[] {
    const messages = [...this.messageQueue]
    this.messageQueue = []
    return messages
  }
}

export const troxTBridge = new TroxTBridge()
export default TroxTBridge
