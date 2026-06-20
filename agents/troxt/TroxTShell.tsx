// ============================================================
//  TROXTSHELL.tsx — Composant Racine d'Intégration
//  Fournit le Provider TroxTContext. L'affichage est géré par App.
//  TroxTAgent est monté comme page par App.tsx, plus en overlay.
// ============================================================

import React, { useEffect } from 'react'
import { TroxTProvider } from './TroxTContext'
import { TroxTBrain } from './TroxTBrain'
import { registerAllEtherSkills } from './skills/EtherSkills'
import { AutonomousLoop } from './AutonomousLoop'
import { eventBus } from '../../core/eventBus'

export const TroxTShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const brain = React.useMemo(() => {
    const b = new TroxTBrain({
      name: 'TroxT Cerveau',
      version: '3.0.0',
      modules: ['ether-prism', 'ether-forge', 'ether-weave', 'ether-lens'],
      personality: {
        curiosity: 0.8,
        prudence: 0.7,
        creativity: 0.75,
        verbosity: 0.6,
        empathy: 0.65
      },
      maxCognitiveLoad: 85,
      proactiveThreshold: 0.4,
      autoSaveIntervalMs: 30000
    })

    registerAllEtherSkills(b['skills'])

    const loop = new AutonomousLoop(b, 5000)
    loop.start()

    eventBus.on('system.bootstrap', (evt) => {
      b.perceive({
        source: evt.source,
        modality: 'system',
        payload: evt.payload,
        timestamp: evt.timestamp,
        urgency: 0.3
      })
    })

    eventBus.on('troxt.proactive', (evt) => {
      const payload = evt.payload as any
      if (payload.message) console.log('[TroxT Proactive]', payload.message)
    })

    return b
  }, [])

  useEffect(() => {
    console.log('%c🧠 TroxTShell monté — Cerveau actif', 'color:#7b6fff;font-size:14px;font-weight:700')
    console.log('%cTroxT est le noyau neural d\'EtherWorld.', 'color:#aaa;font-size:11px')
    return () => {
      console.log('%c🧠 TroxTShell démonté', 'color:#ff4444;font-size:12px')
    }
  }, [])

  return (
    <TroxTProvider brain={brain}>
      {/* Pas d'overlay flottant ici — TroxTAgent est monté comme page par App.tsx */}
      {children}
    </TroxTProvider>
  )
}

export default TroxTShell
