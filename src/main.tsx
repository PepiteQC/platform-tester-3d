// ============================================================
//  Main — Point d'entrée EtherWorld
//  Bootstrap robuste React + TroxT + Bridge + EventBus + Memory
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

import { troxt } from './agents/troxt'
import { troxTBridge } from './core/troxt-bridge'
import type { BridgeChannel, ModuleId } from './core/troxt-bridge'
import { eventBus } from './core/eventBus'
import { memory } from './core/memory'

const ETHERWORLD_VERSION = '2.0.0'
const BOOT_SOURCE = 'main'
const MODULES: ModuleId[] = ['ether-prism', 'ether-forge', 'ether-weave', 'ether-lens']

declare global {
  interface Window {
    __ETHERWORLD_BOOTSTRAPPED__?: boolean
    EtherWorldRuntime?: {
      version: string
      bootId: string
      startedAt: number
      modules: ModuleId[]
      channels: BridgeChannel[]
      getSnapshot: () => Record<string, unknown>
    }
  }
}

interface BootSnapshot {
  bootId: string
  version: string
  startedAt: number
  modules: ModuleId[]
  channels: BridgeChannel[]
  userAgent: string
}

function createId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${prefix}-${id}`
}

function mark(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`etherworld:${name}`)
  }
}

function measure(name: string, start: string, end: string) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(`etherworld:${name}`, `etherworld:${start}`, `etherworld:${end}`)
    } catch {
      // Les marks peuvent être absents si le navigateur purge les mesures.
    }
  }
}

function renderFatalError(error: unknown) {
  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050810;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
      <div style="max-width:560px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,80,80,0.35);border-radius:16px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,0.45);">
        <div style="color:#ff8080;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">EtherWorld Bootstrap Error</div>
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 10px;">Impossible d'initialiser EtherWorld.</h1>
        <p style="color:#aaa;line-height:1.55;margin:0 0 14px;">Le runtime React, TroxT ou le bridge n'a pas pu démarrer correctement.</p>
        <pre style="white-space:pre-wrap;word-break:break-word;color:#ffd0d0;background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;font-size:12px;">${String(error)}</pre>
      </div>
    </div>
  `
}

async function initializeTroxT() {
  console.log('🧠 TroxT — Initialisation...')
  await troxt.initialize()
  console.log('🧠 TroxT — Online')
}

function connectModules() {
  const channels = MODULES.map(moduleId => troxTBridge.connect(moduleId))
  console.log(`🔗 Bridge — Modules connectés: ${channels.map(channel => channel.moduleId).join(', ')}`)
  return channels
}

function initializeMemory(channels: BridgeChannel[]): BootSnapshot {
  const snapshot: BootSnapshot = {
    bootId: createId('boot'),
    version: ETHERWORLD_VERSION,
    startedAt: Date.now(),
    modules: [...MODULES],
    channels,
    userAgent: navigator.userAgent
  }

  memory.set('system.boot', snapshot, { source: BOOT_SOURCE, tags: ['system', 'boot', 'troxt'] })
  memory.set('system.modules', MODULES, { source: BOOT_SOURCE, tags: ['system', 'modules'] })
  troxt.setMemory('system.boot', snapshot)

  console.log('💾 Memory — Initialisée')
  return snapshot
}

async function emitBootstrap(snapshot: BootSnapshot) {
  const payload = {
    event: 'bootstrap',
    bootId: snapshot.bootId,
    version: snapshot.version,
    modules: snapshot.modules,
    channelCount: snapshot.channels.length,
    startedAt: snapshot.startedAt
  }

  eventBus.emit('system', BOOT_SOURCE, payload)
  await troxt.processEvent({
    id: createId('event'),
    type: 'system.bootstrap',
    source: BOOT_SOURCE,
    payload,
    timestamp: Date.now()
  })

  console.log('📡 EventBus — Bootstrap émis')
}

function publishRuntime(snapshot: BootSnapshot) {
  window.EtherWorldRuntime = {
    version: snapshot.version,
    bootId: snapshot.bootId,
    startedAt: snapshot.startedAt,
    modules: [...snapshot.modules],
    channels: snapshot.channels,
    getSnapshot: () => ({
      boot: snapshot,
      memory: memory.snapshot(),
      bridgeChannels: troxTBridge.getChannels(),
      troxtState: troxt.getState()
    })
  }
}

function mountReactApp() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Element #root introuvable. Vérifie index.html.')
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  console.log('✅ React monté — EtherWorld — Prêt')
}

async function bootstrap() {
  if (window.__ETHERWORLD_BOOTSTRAPPED__) {
    console.warn('⚠️ EtherWorld — Bootstrap déjà exécuté, initialisation ignorée.')
    return
  }

  window.__ETHERWORLD_BOOTSTRAPPED__ = true
  mark('bootstrap:start')
  console.log('🌌 EtherWorld — Initialisation...')

  try {
    await initializeTroxT()
    const channels = connectModules()
    const snapshot = initializeMemory(channels)
    await emitBootstrap(snapshot)
    publishRuntime(snapshot)
    mountReactApp()

    mark('bootstrap:ready')
    measure('bootstrap', 'bootstrap:start', 'bootstrap:ready')
  } catch (error) {
    window.__ETHERWORLD_BOOTSTRAPPED__ = false
    console.error('❌ EtherWorld — Erreur bootstrap:', error)
    renderFatalError(error)
  }
}

void bootstrap()
