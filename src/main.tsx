// ============================================================
//  Main — Point d'entrée Etherworld
// ============================================================

// TODO: Import React + ReactDOM
// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import { App } from './App'

// TODO: Importer le core
import { troxt } from './agents/troxt'
import { troxTBridge } from './core/troxt-bridge'
import { eventBus } from './core/eventBus'
import { memory } from './core/memory'

// ─── Bootstrap Etherworld ────────────────────────────────────
async function bootstrap() {
  console.log('🌌 EtherWorld — Initialisation...')

  // TODO: Initialiser TroxT
  await troxt.initialize()
  console.log('🧠 TroxT — Online')

  // TODO: Connecter les modules au bridge
  troxTBridge.connect('ether-prism')
  troxTBridge.connect('ether-forge')
  troxTBridge.connect('ether-weave')
  troxTBridge.connect('ether-lens')
  console.log('🔗 Bridge — Modules connectés')

  // TODO: Démarrer le bus d'événements
  eventBus.emit('system', 'main', { event: 'bootstrap' })
  console.log('📡 EventBus — Actif')

  // TODO: Initialiser la mémoire
  memory.set('system.boot', Date.now(), { source: 'main', tags: ['system'] })
  console.log('💾 Memory — Initialisée')

  // TODO: Monter l'app React
  // const root = ReactDOM.createRoot(document.getElementById('root')!)
  // root.render(<App />)

  console.log('✅ EtherWorld — Prêt')
}

bootstrap().catch(console.error)