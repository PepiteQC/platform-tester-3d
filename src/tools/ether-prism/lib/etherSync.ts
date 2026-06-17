// ============================================================
//  etherSync — Sync mémoire TroxT
//  Synchronise EtherPrism avec la mémoire de TroxT
// ============================================================

import type { PrismOutput } from '../types'

export interface SyncPayload {
  module: 'ether-prism'
  action: string
  data: unknown
  timestamp: number
}

export class EtherSync {
  private syncQueue: SyncPayload[] = []

  // TODO: Envoyer des données à TroxT
  async push(_payload: SyncPayload): Promise<void> {}

  // TODO: Recevoir des données de TroxT
  async pull(_key: string): Promise<unknown> {
    return null
  }

  // TODO: Synchroniser les résultats
  async syncResults(_results: PrismOutput[]): Promise<void> {}

  // TODO: Écouter les updates TroxT
  onUpdate(_callback: (payload: SyncPayload) => void): void {}

  // TODO: Se déconnecter
  disconnect(): void {
    this.syncQueue = []
  }
}

export const etherSync = new EtherSync()
export default EtherSync