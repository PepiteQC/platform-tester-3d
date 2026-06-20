// ============================================================
//  AUTONOMOUSLOOP.ts — Cervelet + Système Limbique
//  Boucle proactive : TroxT observe le monde et agit sans
//  être sollicité. Surveillance + déclencheurs + proactivité.
// ============================================================

import type { TroxTBrain } from './TroxTBrain'
import type { EpisodicMemory } from './memory/EpisodicMemory'

export interface TriggerRule {
  id: string
  name: string
  condition: (worldState: WorldSnapshot, history: EpisodicMemory) => boolean
  action: (brain: TroxTBrain) => Promise<void>
  cooldownMs: number
  lastFired: number
  enabled: boolean
}

export interface WorldSnapshot {
  playerCount: number
  platformCount: number
  serverStatus: string
  memoryPercent: number
  uptimeSeconds: number
  weather: string
  timeOfDay: number
  timestamp: number
}

export class AutonomousLoop {
  private brain: TroxTBrain
  private rules: TriggerRule[] = []
  private loopId: ReturnType<typeof setInterval> | null = null
  private snapshotIntervalMs: number
  private lastSnapshot: WorldSnapshot | null = null

  constructor(brain: TroxTBrain, intervalMs = 5000) {
    this.brain = brain
    this.snapshotIntervalMs = intervalMs
    this.bootstrapRules()
  }

  start(): void {
    if (this.loopId) return
    this.loopId = setInterval(() => this.tick(), this.snapshotIntervalMs)
    console.log('🔄 AutonomousLoop — Surveillance proactive démarrée')
  }

  stop(): void {
    if (this.loopId) { clearInterval(this.loopId); this.loopId = null }
  }

  addRule(rule: TriggerRule): void {
    this.rules.push(rule)
  }

  removeRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id)
    if (idx >= 0) { this.rules.splice(idx, 1); return true }
    return false
  }

  // ═══════════════════════════════════════════════════════════
  //  TICK PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  private async tick(): Promise<void> {
    try {
      const snap = await this.fetchSnapshot()
      this.lastSnapshot = snap

      for (const rule of this.rules) {
        if (!rule.enabled) continue
        if (Date.now() - rule.lastFired < rule.cooldownMs) continue

        if (rule.condition(snap, this.brain['episodic'])) { // accès interne via closure trusté
          rule.lastFired = Date.now()
          console.log(`[AutonomousLoop] 🔥 Trigger déclenché : ${rule.name}`)
          await rule.action(this.brain)
        }
      }
    } catch (e) {
      console.warn('[AutonomousLoop] Erreur tick:', e)
    }
  }

  private async fetchSnapshot(): Promise<WorldSnapshot> {
    try {
      const res = await fetch('/api/admin/metrics')
      const data = await res.json()
      const worldRes = await fetch('/api/admin/world')
      const worldData = await worldRes.json()

      return {
        playerCount: data.player_count || 0,
        platformCount: data.platform_count || 0,
        serverStatus: data.server_status || 'unknown',
        memoryPercent: data.memory?.percent || 0,
        uptimeSeconds: data.uptime_seconds || 0,
        weather: worldData.weather || 'sunny',
        timeOfDay: worldData.time_of_day || 12,
        timestamp: Date.now()
      }
    } catch {
      return this.lastSnapshot || {
        playerCount: 0, platformCount: 0, serverStatus: 'unknown',
        memoryPercent: 0, uptimeSeconds: 0, weather: 'sunny', timeOfDay: 12, timestamp: Date.now()
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RÈGLES NATIVES
  // ═══════════════════════════════════════════════════════════
  private bootstrapRules(): void {
    // Règle 1 : RAM critique → suggestion snapshot
    this.addRule({
      id: 'ram_alert',
      name: 'Alerte mémoire serveur',
      cooldownMs: 120000,
      lastFired: 0,
      enabled: true,
      condition: (snap) => snap.memoryPercent > 85,
      action: async (brain) => {
        const s = brain.getState();
        brain.perceive({
          source: 'autonomous',
          modality: 'system',
          payload: { type: 'memory_alert', message: `RAM serveur à ${s.cognitiveLoad}%` },
          timestamp: Date.now(),
          urgency: 0.9
        })
      }
    })

    // Règle 2 : Joueur seul depuis longtemps → message d'accueil
    this.addRule({
      id: 'loneliness_welcome',
      name: 'Bienvenue solitaire',
      cooldownMs: 300000,
      lastFired: 0,
      enabled: true,
      condition: (snap) => snap.playerCount === 1,
      action: async (brain) => {
        brain.perceive({
          source: 'autonomous',
          modality: 'social',
          payload: { type: 'proactive_greeting', message: 'Salut ! Tu es seul dans le monde. Je peux générer un monde plus animé si tu veux.' },
          timestamp: Date.now(),
          urgency: 0.3
        })
      }
    })

    // Règle 3 : Nuit tombée → proposition changement météo
    this.addRule({
      id: 'night_weather',
      name: 'Suggestion météo nocturne',
      cooldownMs: 600000,
      lastFired: 0,
      enabled: true,
      condition: (snap) => snap.timeOfDay < 6 || snap.timeOfDay > 20,
      action: async (brain) => {
        const last = this.lastSnapshot;
        if (last && last.weather === 'sunny') {
          brain.perceive({
            source: 'autonomous',
            modality: 'system',
            payload: { type: 'weather_suggestion', message: 'Il fait nuit, voulez-vous passer la météo à cloudy ou storm pour l\'ambiance ?' },
            timestamp: Date.now(),
            urgency: 0.2
          })
        }
      }
    })

    // Règle 4 : Trop de plateformes → suggestion cleanup
    this.addRule({
      id: 'platform_cleanup',
      name: 'Cleanup plateformes',
      cooldownMs: 600000,
      lastFired: 0,
      enabled: true,
      condition: (snap) => snap.platformCount > 200,
      action: async (brain) => {
        const last = this.lastSnapshot;
        brain.perceive({
          source: 'autonomous',
          modality: 'system',
          payload: { type: 'world_cleanup', message: `${last?.platformCount || '??'} plateformes actives. Je peux sauvegarder et régénérer un monde plus léger.` },
          timestamp: Date.now(),
          urgency: 0.5
        })
      }
    })

    // Règle 5 : Uptime long → félicitations admin
    this.addRule({
      id: 'uptime_celebration',
      name: 'Célébration uptime',
      cooldownMs: 3600000,
      lastFired: 0,
      enabled: true,
      condition: (snap) => snap.uptimeSeconds > 3600 && (snap.uptimeSeconds % 3600) < 60,
      action: async (brain) => {
        const last = this.lastSnapshot;
        const hours = last ? Math.floor(last.uptimeSeconds / 3600) : 0;
        brain.perceive({
          source: 'autonomous',
          modality: 'system',
          payload: { type: 'uptime_milestone', message: `🎉 Serveur en ligne depuis ${hours}h !` },
          timestamp: Date.now(),
          urgency: 0.1
        })
      }
    })
  }

  getRules(): TriggerRule[] {
    return this.rules.map(r => ({ ...r }))
  }

  toggleRule(id: string, enabled: boolean): boolean {
    const r = this.rules.find(x => x.id === id)
    if (r) { r.enabled = enabled; return true }
    return false
  }
}

export default AutonomousLoop
