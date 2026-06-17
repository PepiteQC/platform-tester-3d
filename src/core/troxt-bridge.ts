// ============================================================
//  TroxT Bridge — Pont entre TroxT et tous les outils
//  Point de connexion central Etherworld
// ============================================================

import type { TroxTEvent } from '../agents/troxt/TroxT'

export type ModuleId =
  | 'ether-prism'
  | 'ether-forge'
  | 'ether-weave'
  | 'ether-lens'

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

// ─── TroxT Bridge ────────────────────────────────────────────
export class TroxTBridge {
  private channels: Map<ModuleId, BridgeChannel> = new Map()
  private messageQueue: BridgeMessage[] = []
  private listeners: Map<string, ((msg: BridgeMessage) => void)[]> = new Map()

  // TODO: Connecter un module au bridge
  connect(_moduleId: ModuleId): BridgeChannel {
    const channel: BridgeChannel = {
      moduleId: _moduleId,
      isConnected: true,
      lastSync: Date.now(),
      messageCount: 0
    }
    this.channels.set(_moduleId, channel)
    return channel
  }

  // TODO: Déconnecter un module
  disconnect(_moduleId: ModuleId): void {
    const ch = this.channels.get(_moduleId)
    if (ch) ch.isConnected = false
  }

  // TODO: Envoyer un message d'un module à un autre
  send(_message: Omit<BridgeMessage, 'id' | 'timestamp'>): void {}

  // TODO: Broadcast à tous les modules
  broadcast(_from: ModuleId | 'troxt', _type: string, _payload: unknown): void {}

  // TODO: Écouter les messages
  on(_type: string, _callback: (msg: BridgeMessage) => void): void {
    const existing = this.listeners.get(_type) || []
    existing.push(_callback)
    this.listeners.set(_type, existing)
  }

  // TODO: Retirer un listener
  off(_type: string, _callback: (msg: BridgeMessage) => void): void {}

  // TODO: Convertir un événement TroxT en message Bridge
  fromTroxTEvent(_event: TroxTEvent): BridgeMessage {
    return {} as BridgeMessage
  }

  // TODO: Obtenir l'état de tous les canaux
  getChannels(): BridgeChannel[] {
    return Array.from(this.channels.values())
  }

  // TODO: Vider la queue
  flushQueue(): BridgeMessage[] {
    const messages = [...this.messageQueue]
    this.messageQueue = []
    return messages
  }
}

export const troxTBridge = new TroxTBridge()
export default TroxTBridge