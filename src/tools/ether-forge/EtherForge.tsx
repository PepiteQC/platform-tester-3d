// ============================================================
// 🔥 ETHERFORGE — Interface React principale
// Connecte tout : 3D + IA + Factory + Matériaux
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { forge3DLib }  from './lib/forge3D.js'
import { etherPrism }  from '../etherprism/genesis/EtherPrism.js'
import { factoryEngine } from '../forge-factory/engine/FactoryEngine.js'
import {
  ETHER_MATERIALS,
  getMaterialsByCategory,
  searchMaterials,
  CATALOG_STATS,
} from './materials/etherMaterials.js'
import type { EtherMaterialDef } from './types/index.js'
import './ether-forge.css'

// ─────────────────────────────────────────────
// ÉTAT
// ─────────────────────────────────────────────
interface ForgeState {
  selectedMat:   EtherMaterialDef | null
  filterCat:     string
  search:        string
  tab:           'materials' | 'factory' | 'brain' | 'stats'
  brainThought:  string
  brainInput:    string
  generating:    boolean
  generatedCount: number
  brainId:       string | null
  statsData:     any
  isReady:       boolean
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────
export function EtherForge() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [state, setState] = useState<ForgeState>({
    selectedMat:    ETHER_MATERIALS[0],
    filterCat:      'all',
    search:         '',
    tab:            'materials',
    brainThought:   '',
    brainInput:     '',
    generating:     false,
    generatedCount: 0,
    brainId:        null,
    statsData:      null,
    isReady:        false,
  })

  // ──────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return

    forge3DLib.init(canvasRef.current).then(() => {
      // Créer un cerveau IA
      etherPrism.createBrain({
        name:           'ForgeAI',
        intelligence:   0.90,
        creativity:     0.85,
        memory:         0.95,
        learningRate:   0.75,
        mutationRate:   0.08,
        specialization: 'creative',
        depth:          7,
        complexity:     9,
        adaptability:   0.90,
      }).then(brain => {
        setState(s => ({ ...s, brainId: brain.id, isReady: true }))
        console.log(`🧠 ForgeAI prêt — IQ: ${brain.metrics.iq.toFixed(0)}`)
      })
    })

    return () => { forge3DLib.engine.dispose() }
  }, [])

  // ──────────────────────────────────────────────
  // FILTRAGE MATÉRIAUX
  // ──────────────────────────────────────────────
  const filteredMats = React.useMemo(() => {
    let list = ETHER_MATERIALS

    if (state.filterCat !== 'all') {
      list = getMaterialsByCategory(state.filterCat)
    }

    if (state.search.trim()) {
      list = searchMaterials(state.search)
    }

    return list
  }, [state.filterCat, state.search])

  const categories = React.useMemo(() => [
    'all',
    ...new Set(ETHER_MATERIALS.map(m => m.category))
  ], [])

  // ──────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────
  const handleThink = useCallback(async () => {
    if (!state.brainId || !state.brainInput.trim()) return

    const thought = await etherPrism.think(state.brainId, state.brainInput)

    setState(s => ({
      ...s,
      brainThought: thought.output,
      brainInput:   '',
    }))
  }, [state.brainId, state.brainInput])

  const handleGenerate = useCallback(async () => {
    setState(s => ({ ...s, generating: true }))

    try {
      const manifest = await factoryEngine.generatePack(100)
      setState(s => ({
        ...s,
        generating:     false,
        generatedCount: manifest.assets.length,
      }))
    } catch {
      setState(s => ({ ...s, generating: false }))
    }
  }, [])

  const handleRefreshStats = useCallback(() => {
    setState(s => ({ ...s, statsData: forge3DLib.getStats() }))
  }, [])

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="etherforge">

      {/* Canvas 3D */}
      <canvas
        ref={canvasRef}
        className="etherforge__canvas"
      />

      {/* Panneau latéral */}
      <aside className="etherforge__panel">

        {/* Header */}
        <header className="ef-header">
          <span className="ef-title">⚡ EtherForge</span>
          <span className="ef-badge">
            {state.isReady ? '🟢 Ready' : '🟡 Init...'}
          </span>
        </header>

        {/* Tabs */}
        <nav className="ef-tabs">
          {(['materials', 'factory', 'brain', 'stats'] as const).map(tab => (
            <button
              key={tab}
              className={`ef-tab ${state.tab === tab ? 'active' : ''}`}
              onClick={() => setState(s => ({ ...s, tab }))}
            >
              {{ materials: '🎨', factory: '🏭', brain: '🧠', stats: '📊' }[tab]}
              {' '}{tab}
            </button>
          ))}
        </nav>

        {/* ── TAB MATÉRIAUX ── */}
        {state.tab === 'materials' && (
          <div className="ef-body">
            {/* Recherche */}
            <input
              className="ef-search"
              placeholder={`🔍 Rechercher parmi ${ETHER_MATERIALS.length} matériaux...`}
              value={state.search}
              onChange={e => setState(s => ({ ...s, search: e.target.value }))}
            />

            {/* Catégories */}
            <div className="ef-cats">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`ef-cat ${state.filterCat === cat ? 'active' : ''}`}
                  onClick={() => setState(s => ({ ...s, filterCat: cat, search: '' }))}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Compteur */}
            <div className="ef-count">
              {filteredMats.length} matériaux
              {state.filterCat !== 'all' && ` · ${state.filterCat}`}
            </div>

            {/* Grille */}
            <div className="ef-grid">
              {filteredMats.map(mat => (
                <button
                  key={mat.id}
                  className={`ef-mat ${state.selectedMat?.id === mat.id ? 'active' : ''}`}
                  onClick={() => setState(s => ({ ...s, selectedMat: mat }))}
                  title={mat.description ?? mat.name}
                >
                  <div
                    className="ef-swatch"
                    style={{
                      background: mat.color,
                      boxShadow: mat.emissive
                        ? `0 0 8px ${mat.emissive}88`
                        : 'none',
                    }}
                  />
                  <span className="ef-mat-name">{mat.name}</span>
                  <span className="ef-mat-cat">{mat.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB FACTORY ── */}
        {state.tab === 'factory' && (
          <div className="ef-body">
            <div className="ef-section">
              <h3 className="ef-section-title">🏭 Forge Factory</h3>
              <p className="ef-text">
                Génération procédurale d'assets 3D.<br />
                Géométries · Matériaux · Variantes
              </p>
              <button
                className="ef-btn primary"
                onClick={handleGenerate}
                disabled={state.generating}
              >
                {state.generating ? '⏳ Génération...' : '⚡ Générer 100 assets'}
              </button>
              {state.generatedCount > 0 && (
                <div className="ef-result">
                  ✅ {state.generatedCount} assets générés
                </div>
              )}
            </div>

            <div className="ef-section">
              <h3 className="ef-section-title">📦 Catalogue</h3>
              <div className="ef-stats-grid">
                {[
                  ['Entités',       '20 templates'],
                  ['Objets',        '42 templates'],
                  ['Props',         '41 templates'],
                  ['Mobilier',      '30 templates'],
                  ['Architecture',  '40 templates'],
                ].map(([k, v]) => (
                  <div key={k} className="ef-stat-row">
                    <span>{k}</span>
                    <span className="ef-stat-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB BRAIN ── */}
        {state.tab === 'brain' && (
          <div className="ef-body">
            <div className="ef-section">
              <h3 className="ef-section-title">🔮 EtherPrism IA</h3>
              <p className="ef-text">
                Cerveau intelligent auto-évolutif.<br />
                Posez une question ou donnez une instruction.
              </p>

              <div className="ef-brain-stats">
                {state.brainId && (() => {
                  const brain = etherPrism.getBrain(state.brainId)
                  return brain ? (
                    <>
                      <div className="ef-stat-row">
                        <span>IQ</span>
                        <span className="ef-stat-val ef-cyan">
                          {brain.metrics.iq.toFixed(0)}
                        </span>
                      </div>
                      <div className="ef-stat-row">
                        <span>Spécialisation</span>
                        <span className="ef-stat-val">
                          {brain.seed.specialization}
                        </span>
                      </div>
                      <div className="ef-stat-row">
                        <span>Pensées</span>
                        <span className="ef-stat-val">
                          {brain.metrics.thoughtsProcessed}
                        </span>
                      </div>
                      <div className="ef-stat-row">
                        <span>Mémoires</span>
                        <span className="ef-stat-val">
                          {brain.metrics.memoriesStored}
                        </span>
                      </div>
                    </>
                  ) : null
                })()}
              </div>

              <div className="ef-brain-input-row">
                <input
                  className="ef-search"
                  placeholder="Posez une question à l'IA..."
                  value={state.brainInput}
                  onChange={e => setState(s => ({ ...s, brainInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleThink()}
                />
                <button
                  className="ef-btn primary"
                  onClick={handleThink}
                  disabled={!state.isReady || !state.brainInput.trim()}
                >
                  💭
                </button>
              </div>

              {state.brainThought && (
                <div className="ef-thought-bubble">
                  <span className="ef-thought-label">Réponse IA:</span>
                  <p className="ef-thought-text">{state.brainThought}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB STATS ── */}
        {state.tab === 'stats' && (
          <div className="ef-body">
            <div className="ef-section">
              <h3 className="ef-section-title">📊 Statistiques</h3>
              <button
                className="ef-btn"
                onClick={handleRefreshStats}
              >
                🔄 Rafraîchir
              </button>

              <div className="ef-stats-grid">
                <div className="ef-stat-row">
                  <span>Matériaux</span>
                  <span className="ef-stat-val ef-cyan">{CATALOG_STATS.total}</span>
                </div>
                <div className="ef-stat-row">
                  <span>Catégories</span>
                  <span className="ef-stat-val">{CATALOG_STATS.categories}</span>
                </div>
                <div className="ef-stat-row">
                  <span>Émissifs</span>
                  <span className="ef-stat-val">{CATALOG_STATS.emissive}</span>
                </div>
                <div className="ef-stat-row">
                  <span>Transparents</span>
                  <span className="ef-stat-val">{CATALOG_STATS.transparent}</span>
                </div>
              </div>

              {state.statsData && (
                <div className="ef-stats-grid">
                  <div className="ef-stat-row">
                    <span>FPS</span>
                    <span className="ef-stat-val ef-cyan">
                      {state.statsData.engine?.fps ?? 0}
                    </span>
                  </div>
                  <div className="ef-stat-row">
                    <span>Draw Calls</span>
                    <span className="ef-stat-val">
                      {state.statsData.engine?.drawCalls ?? 0}
                    </span>
                  </div>
                  <div className="ef-stat-row">
                    <span>Assets générés</span>
                    <span className="ef-stat-val">
                      {state.statsData.factory?.generated ?? 0}
                    </span>
                  </div>
                  <div className="ef-stat-row">
                    <span>Cerveaux IA</span>
                    <span className="ef-stat-val">
                      {state.statsData.brain?.totalBrains ?? 0}
                    </span>
                  </div>
                  <div className="ef-stat-row">
                    <span>IQ Moyen</span>
                    <span className="ef-stat-val ef-cyan">
                      {state.statsData.brain?.averageIQ ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="ef-footer">
          EtherForge v1.0 · {ETHER_MATERIALS.length} matériaux · EtherPrism IA
        </footer>
      </aside>
    </div>
  )
}

export default EtherForge