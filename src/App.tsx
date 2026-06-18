// ============================================================
//  App — Application principale EtherWorld
//  Dashboard React + navigation modules + état serveur live
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TroxTShell } from './agents/troxt/TroxTShell'
import { TroxTAgent } from './agents/troxt/TroxTAgent'
import { TroxTAvatar3D } from './agents/troxt/TroxTAvatar3D'
import { useTroxT } from './agents/troxt/TroxTContext'

import { PlatformTester3D } from './components/etherforge/PlatformTester3D'
import { eventBus } from './core/eventBus'
import { memory } from './core/memory'

// ─── Modules disponibles ─────────────────────────────────────
type ModuleTab = 'dashboard' | 'game' | 'forge' | 'prism' | 'lens' | 'weave' | 'troxt'

type ModuleStatus = 'live' | 'dev'

interface ModuleDef {
  id: ModuleTab
  label: string
  icon: string
  desc: string
  color: string
  angleDeg: number
  status: ModuleStatus
}

interface ServerStats {
  players: number
  platforms: number
  uptime: string
  memory: string
  status: string
  snapshots: number
  lastUpdated: number | null
}

const MODULES: ModuleDef[] = [
  { id: 'game', label: 'EtherWorld', icon: '🎮', desc: 'Platform Tester 3D — Jeu original', color: '#44cc88', angleDeg: 0, status: 'live' },
  { id: 'forge', label: 'EtherForge', icon: '⚒️', desc: 'Éditeur 3D & meubles', color: '#ff8844', angleDeg: 72, status: 'live' },
  { id: 'prism', label: 'EtherPrism', icon: '🗄️', desc: 'Base de données RP', color: '#4488ff', angleDeg: 144, status: 'dev' },
  { id: 'lens', label: 'EtherLens', icon: '🔬', desc: 'Analyse & OCR', color: '#ff4488', angleDeg: 216, status: 'dev' },
  { id: 'weave', label: 'EtherWeave', icon: '🧵', desc: 'Textures procédurales', color: '#dd44ff', angleDeg: 288, status: 'dev' },
]

const DEFAULT_STATS: ServerStats = {
  players: 0,
  platforms: 0,
  uptime: '0s',
  memory: '0%',
  status: 'unknown',
  snapshots: 0,
  lastUpdated: null
}

const RADIUS = 140
const METRICS_REFRESH_MS = 5000

function normalizeStats(data: any): ServerStats {
  return {
    players: Number(data?.player_count || 0),
    platforms: Number(data?.platform_count || 0),
    uptime: String(data?.uptime_formatted || '0s'),
    memory: `${Number(data?.memory?.percent || 0)}%`,
    status: String(data?.server_status || 'unknown'),
    snapshots: Number(data?.snapshot_count || 0),
    lastUpdated: Date.now()
  }
}

function useServerStats() {
  const [stats, setStats] = useState<ServerStats>(DEFAULT_STATS)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    let alive = true
    let controller: AbortController | null = null

    const fetchStats = async () => {
      if (document.hidden) return
      controller?.abort()
      controller = new AbortController()

      try {
        const res = await fetch('/api/admin/metrics', {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return
        const nextStats = normalizeStats(data)
        setStats(nextStats)
        setIsOnline(true)
        memory.set('dashboard.metrics', nextStats, { source: 'App', tags: ['dashboard', 'metrics'], ttl: METRICS_REFRESH_MS * 2 })
      } catch (error) {
        if (!alive || (error instanceof DOMException && error.name === 'AbortError')) return
        setIsOnline(false)
      }
    }

    fetchStats()
    const intervalId = window.setInterval(fetchStats, METRICS_REFRESH_MS)
    const onVisibility = () => { if (!document.hidden) fetchStats() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      controller?.abort()
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { stats, isOnline }
}

export function App() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('dashboard')
  const [showWelcome, setShowWelcome] = useState(true)
  const { stats, isOnline } = useServerStats()

  const activeModule = useMemo(
    () => MODULES.find(module => module.id === activeTab) || null,
    [activeTab]
  )

  const selectTab = useCallback((id: ModuleTab) => {
    setActiveTab(id)
    setShowWelcome(false)
  }, [])

  useEffect(() => {
    const payload = {
      activeTab,
      activeModule,
      timestamp: Date.now()
    }

    memory.set('app.activeTab', payload, { source: 'App', tags: ['app', 'navigation'] })
    eventBus.emit('app.tab_changed', 'App', payload)
    window.dispatchEvent(new CustomEvent('etherworld:app:tab', { detail: payload }))
  }, [activeTab, activeModule])

  return (
    <TroxTShell>
      <div style={{ width: '100vw', height: '100vh', background: '#050810', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
        <Header stats={stats} isOnline={isOnline} />

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }} aria-label="EtherWorld module actif">
          {activeTab === 'dashboard' && <DashboardView stats={stats} onSelect={selectTab} />}

          {activeTab === 'game' && (
            <FrameModule
              title="EtherWorld Game"
              src="/game.html"
              color="#44cc88"
              fallbackLabel="Mode React intégré"
              fallback={<PlatformTester3D />}
            />
          )}

          {activeTab === 'forge' && (
            <FrameModule title="EtherForge" src="/etherforge.html" color="#ff8844" />
          )}

          {activeTab === 'prism' && <ModulePlaceholder icon="🗄️" name="EtherPrism" desc="Base de données RP — Players, vehicles, houses, shops, jobs, factions." color="#4488ff" />}
          {activeTab === 'lens' && <ModulePlaceholder icon="🔬" name="EtherLens" desc="Analyse visuelle — OCR, détection d'objets, mesures précises." color="#ff4488" />}
          {activeTab === 'weave' && <ModulePlaceholder icon="🧵" name="EtherWeave" desc="Textures procédurales — Noise, Voronoi, tiling seamless." color="#dd44ff" />}
          {activeTab === 'troxt' && <TroxTAgent />}

          {showWelcome && activeTab === 'dashboard' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, rgba(5,8,16,0.95) 0%, #050810 100%)', zIndex: 50
            }}>
              <PentagonNav onSelect={selectTab} />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </TroxTShell>
  )
}

function Header({ stats, isOnline }: { stats: ServerStats; isOnline: boolean }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: '48px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(12px)',
      flexShrink: 0, zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>🌌</span>
        <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px', color: '#7b6fff' }}>
          EtherWorld
        </span>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#444', alignItems: 'center' }} aria-live="polite">
        <span><span style={{ color: isOnline ? '#44ff88' : '#ff4444' }}>●</span> Serveur</span>
        <span>👥 {stats.players}</span>
        <span>📐 {stats.platforms}</span>
        <span>💾 {stats.snapshots}</span>
        <span>⏱️ {stats.uptime}</span>
        <span>🧠 {stats.memory}</span>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px', height: '28px', borderTop: '1px solid rgba(255,255,255,0.04)',
      fontSize: '11px', color: '#333', flexShrink: 0, background: 'rgba(5,8,16,0.95)',
      gap: '20px'
    }}>
      <span style={{ color: '#444' }}>EtherWorld — TroxT Cerveau v3.0</span>
      <span style={{ color: '#333' }}>·</span>
      <span style={{ color: '#444' }}>25 Skills</span>
      <span style={{ color: '#333' }}>·</span>
      <span style={{ color: '#444' }}>ReAct + CoT</span>
      <span style={{ color: '#333' }}>·</span>
      <span style={{ color: '#444' }}>Autonomie 5Hz</span>
    </footer>
  )
}

function FrameModule({ title, src, color, fallback, fallbackLabel = 'Mode intégré' }: { title: string; src: string; color: string; fallback?: React.ReactNode; fallbackLabel?: string }) {
  const [mode, setMode] = useState<'frame' | 'fallback'>('frame')

  if (mode === 'fallback' && fallback) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <button
          onClick={() => setMode('frame')}
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, background: 'rgba(5,8,16,0.85)', border: `1px solid ${color}66`, color, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}
        >
          Retour iframe
        </button>
        {fallback}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {fallback && (
        <button
          onClick={() => setMode('fallback')}
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, background: 'rgba(5,8,16,0.85)', border: `1px solid ${color}66`, color, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}
        >
          {fallbackLabel}
        </button>
      )}
      <iframe src={src} style={{ width: '100%', height: '100%', border: 'none' }} title={title} />
    </div>
  )
}

// ─── Pentagone Navigation ─────────────────────────────────────
function PentagonNav({ onSelect }: { onSelect: (id: ModuleTab) => void }) {
  const [hovered, setHovered] = useState<ModuleTab | null>(null)
  const troxt = useTroxT()

  return (
    <div style={{ position: 'relative', width: '360px', height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(123,111,255,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', border: '1px solid rgba(123,111,255,0.05)', pointerEvents: 'none' }} />

      <svg style={{ position: 'absolute', width: '360px', height: '360px', pointerEvents: 'none' }}>
        {MODULES.map((m, i) => {
          const next = MODULES[(i + 1) % MODULES.length]
          const a1 = ((m.angleDeg - 90) * Math.PI) / 180
          const a2 = ((next.angleDeg - 90) * Math.PI) / 180
          const x1 = 180 + RADIUS * Math.cos(a1)
          const y1 = 180 + RADIUS * Math.sin(a1)
          const x2 = 180 + RADIUS * Math.cos(a2)
          const y2 = 180 + RADIUS * Math.sin(a2)
          return <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(123,111,255,0.12)" strokeWidth="1" />
        })}
      </svg>

      {MODULES.map(m => {
        const angle = ((m.angleDeg - 90) * Math.PI) / 180
        const x = RADIUS * Math.cos(angle)
        const y = RADIUS * Math.sin(angle)
        const isHover = hovered === m.id

        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'absolute', left: `calc(50% + ${x}px - 40px)`, top: `calc(50% + ${y}px - 40px)`,
              width: '80px', height: '80px', borderRadius: '50%', border: `2px solid ${isHover ? m.color : `${m.color}44`}`,
              background: isHover ? `${m.color}22` : 'rgba(10,12,24,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: isHover ? `0 0 30px ${m.color}44` : '0 4px 12px rgba(0,0,0,0.3)',
              transform: isHover ? 'scale(1.15)' : 'scale(1)', zIndex: 10, color: 'inherit', fontFamily: 'inherit', padding: 0
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: 1, marginBottom: '4px' }}>{m.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: isHover ? m.color : '#888', letterSpacing: '0.5px' }}>{m.label}</span>
            {m.status === 'dev' && <span style={{ fontSize: '8px', color: '#ffaa44', marginTop: '2px' }}>dev</span>}
          </button>
        )
      })}

      <div style={{ position: 'absolute', left: 'calc(50% - 70px)', top: 'calc(50% - 70px)', zIndex: 20 }} onMouseEnter={() => setHovered('troxt')} onMouseLeave={() => setHovered(null)}>
        <TroxTAvatar3D isThinking={troxt.isThinking} consciousnessLevel={troxt.consciousnessLevel} isOnline={troxt.isOnline} onClick={() => onSelect('troxt')} />
      </div>

      {hovered && hovered !== 'troxt' && (
        <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,12,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 16px', fontSize: '12px', color: '#aaa', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {MODULES.find(m => m.id === hovered)?.desc}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────
function DashboardView({ stats, onSelect }: { stats: ServerStats; onSelect: (id: ModuleTab) => void }) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard label="Joueurs en ligne" value={String(stats.players)} color="#44ff88" icon="👥" />
        <StatCard label="Plateformes 3D" value={String(stats.platforms)} color="#7b6fff" icon="📐" />
        <StatCard label="Snapshots" value={String(stats.snapshots)} color="#44ccff" icon="💾" />
        <StatCard label="Uptime serveur" value={stats.uptime} color="#ffaa44" icon="⏱️" />
        <StatCard label="Mémoire RAM" value={stats.memory} color="#ff4488" icon="🧠" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {MODULES.map(m => <ModuleCard key={m.id} module={m} onSelect={onSelect} />)}
        <button
          onClick={() => onSelect('troxt')}
          style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.2)', borderRadius: '14px', padding: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', color: 'inherit', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(123,111,255,0.5)'; e.currentTarget.style.background = 'rgba(123,111,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(123,111,255,0.2)'; e.currentTarget.style.background = 'rgba(123,111,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧠</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#7b6fff', marginBottom: '6px' }}>TroxT Agent</div>
          <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>Cerveau neural — Chat, raisonnement ReAct, mémoire épisodique, boucle autonome, 25 skills.</div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>Status: <span style={{ color: '#44ff88' }}>Neural Core Online</span></div>
        </button>
      </div>
    </div>
  )
}

function ModuleCard({ module, onSelect }: { module: ModuleDef; onSelect: (id: ModuleTab) => void }) {
  return (
    <button
      onClick={() => onSelect(module.id)}
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${module.color}22`, borderRadius: '14px', padding: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', color: 'inherit', fontFamily: 'inherit' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${module.color}66`; e.currentTarget.style.background = `${module.color}08`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${module.color}22`; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{module.icon}</div>
      <div style={{ fontWeight: 700, fontSize: '16px', color: module.color, marginBottom: '6px' }}>{module.label}</div>
      <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{module.desc}</div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>
        Status: <span style={{ color: module.status === 'live' ? '#44ff88' : '#ffaa44' }}>{module.status === 'live' ? 'Live' : 'In Development'}</span>
      </div>
    </button>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>{label}</div>
    </div>
  )
}

function ModulePlaceholder({ icon, name, desc, color }: { icon: string; name: string; desc: string; color: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{icon}</div>
        <h2 style={{ color, fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>{name}</h2>
        <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>{desc}</p>
        <div style={{ display: 'inline-block', padding: '8px 16px', background: `${color}15`, border: `1px solid ${color}44`, borderRadius: '8px', fontSize: '12px', color }}>
          🚧 En développement — Intégration TroxT en cours
        </div>
      </div>
    </div>
  )
}

export default App
