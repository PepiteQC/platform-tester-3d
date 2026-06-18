// ============================================================
//  App — Application principale Etherworld
// ============================================================

// TODO: Importer React
import React, { useState, useEffect } from 'react'

// TODO: Importer les modules Etherworld
import { TroxTShell } from './agents/troxt/TroxTShell'
import { TroxTAgent } from './agents/troxt/TroxTAgent'
import { TroxTAvatar3D } from './agents/troxt/TroxTAvatar3D'
import { useTroxT } from './agents/troxt/TroxTContext'

// TODO: Importer les outils
import { PlatformTester3D } from './components/etherforge/PlatformTester3D'

// ─── Modules disponibles ─────────────────────────────────────
type ModuleTab = 'dashboard' | 'game' | 'forge' | 'prism' | 'lens' | 'weave' | 'troxt'

interface ModuleDef {
  id: ModuleTab
  label: string
  icon: string
  desc: string
  color: string
  angleDeg: number   // position sur le cercle (0 = haut, 72 = haut-droite, etc.)
  status: 'live' | 'dev'
}

// 5 points sur un cercle : 4 modules + TroxT au centre
const MODULES: ModuleDef[] = [
  { id: 'game', label: 'EtherWorld', icon: '🎮', desc: 'Platform Tester 3D — Jeu original', color: '#44cc88', angleDeg: 0, status: 'live' },
  { id: 'forge', label: 'EtherForge', icon: '⚒️', desc: 'Éditeur 3D & meubles', color: '#ff8844', angleDeg: 72, status: 'live' },
  { id: 'prism', label: 'EtherPrism', icon: '🗄️', desc: 'Base de données RP', color: '#4488ff', angleDeg: 144, status: 'dev' },
  { id: 'lens', label: 'EtherLens', icon: '🔬', desc: 'Analyse & OCR', color: '#ff4488', angleDeg: 216, status: 'dev' },
  { id: 'weave', label: 'EtherWeave', icon: '🧵', desc: 'Textures procédurales', color: '#dd44ff', angleDeg: 288, status: 'dev' },
]

const RADIUS = 140  // distance centre→point en px

export function App() {
  // TODO: Initialiser TroxT au démarrage (géré par TroxTShell)
  // TODO: Connecter tous les modules au bridge (géré par TroxTShell)
  // TODO: Démarrer le bus d'événements (géré par TroxTShell)
  // TODO: Restaurer la mémoire depuis le localStorage (géré par TroxTBrain.initialize)
  // TODO: Render

  const [activeTab, setActiveTab] = useState<ModuleTab>('dashboard')
  const [showWelcome, setShowWelcome] = useState(true)
  const [stats, setStats] = useState({ players: 0, platforms: 0, uptime: '0s', memory: '0%' })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/metrics')
        const data = await res.json()
        setStats({
          players: data.player_count || 0,
          platforms: data.platform_count || 0,
          uptime: data.uptime_formatted || '0s',
          memory: `${data.memory?.percent || 0}%`
        })
      } catch {}
    }
    fetchStats()
    const id = setInterval(fetchStats, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <TroxTShell>
      <div style={{ width: '100vw', height: '100vh', background: '#050810', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>

        {/* Header compact */}
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
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#444' }}>
            <span><span style={{ color: '#44ff88' }}>●</span> Serveur</span>
            <span>👥 {stats.players}</span>
            <span>📐 {stats.platforms}</span>
            <span>⏱️ {stats.uptime}</span>
            <span>🧠 {stats.memory}</span>
          </div>
        </header>

        {/* Content Area */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeTab === 'dashboard' && <DashboardView stats={stats} onSelect={setActiveTab} />}
          {activeTab === 'game' && (
            <div style={{ width: '100%', height: '100%' }}>
              <iframe src="/game.html" style={{ width: '100%', height: '100%', border: 'none' }} title="EtherWorld Game" />
            </div>
          )}
          {activeTab === 'forge' && (
            <div style={{ width: '100%', height: '100%' }}>
              <iframe src="/etherforge.html" style={{ width: '100%', height: '100%', border: 'none' }} title="EtherForge" />
            </div>
          )}
          {activeTab === 'prism' && <ModulePlaceholder icon="🗄️" name="EtherPrism" desc="Base de données RP — Players, vehicles, houses, shops, jobs, factions." color="#4488ff" />}
          {activeTab === 'lens' && <ModulePlaceholder icon="🔬" name="EtherLens" desc="Analyse visuelle — OCR, détection d'objets, mesures précises." color="#ff4488" />}
          {activeTab === 'weave' && <ModulePlaceholder icon="🧵" name="EtherWeave" desc="Textures procédurales — Noise, Voronoi, tiling seamless." color="#dd44ff" />}
          {activeTab === 'troxt' && <TroxTAgent />}

          {/* Welcome overlay avec Pentagone */}
          {showWelcome && activeTab === 'dashboard' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, rgba(5,8,16,0.95) 0%, #050810 100%)', zIndex: 50
            }}>
              <PentagonNav onSelect={(id) => { setActiveTab(id); setShowWelcome(false) }} />
            </div>
          )}
        </main>

        {/* Footer */}
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
      </div>
    </TroxTShell>
  )
}

// ─── Pentagone Navigation ─────────────────────────────────────
function PentagonNav({ onSelect }: { onSelect: (id: ModuleTab) => void }) {
  const [hovered, setHovered] = useState<ModuleTab | null>(null)
  const troxt = useTroxT()

  return (
    <div style={{ position: 'relative', width: '360px', height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Cercle de fond */}
      <div style={{
        position: 'absolute', width: '320px', height: '320px', borderRadius: '50%',
        border: '1px solid rgba(123,111,255,0.08)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: '280px', height: '280px', borderRadius: '50%',
        border: '1px solid rgba(123,111,255,0.05)', pointerEvents: 'none'
      }} />

      {/* Lignes entre les points */}
      <svg style={{ position: 'absolute', width: '360px', height: '360px', pointerEvents: 'none' }}>
        {MODULES.map((m, i) => {
          const next = MODULES[(i + 1) % MODULES.length]
          const a1 = ((m.angleDeg - 90) * Math.PI) / 180
          const a2 = ((next.angleDeg - 90) * Math.PI) / 180
          const x1 = 180 + RADIUS * Math.cos(a1)
          const y1 = 180 + RADIUS * Math.sin(a1)
          const x2 = 180 + RADIUS * Math.cos(a2)
          const y2 = 180 + RADIUS * Math.sin(a2)
          return (
            <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(123,111,255,0.12)" strokeWidth="1" />
          )
        })}
      </svg>

      {/* Points des modules sur le cercle */}
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
              position: 'absolute',
              left: `calc(50% + ${x}px - 40px)`,
              top: `calc(50% + ${y}px - 40px)`,
              width: '80px', height: '80px',
              borderRadius: '50%',
              border: `2px solid ${isHover ? m.color : `${m.color}44`}`,
              background: isHover ? `${m.color}22` : 'rgba(10,12,24,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.3s ease',
              boxShadow: isHover ? `0 0 30px ${m.color}44` : '0 4px 12px rgba(0,0,0,0.3)',
              transform: isHover ? 'scale(1.15)' : 'scale(1)',
              zIndex: 10, color: 'inherit', fontFamily: 'inherit', padding: 0
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: 1, marginBottom: '4px' }}>{m.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: isHover ? m.color : '#888', letterSpacing: '0.5px' }}>
              {m.label}
            </span>
            {m.status === 'dev' && (
              <span style={{ fontSize: '8px', color: '#ffaa44', marginTop: '2px' }}>dev</span>
            )}
          </button>
        )
      })}

      {/* TROXT AU CENTRE — Avatar 3D Neural */}
      <div
        style={{ position: 'absolute', left: 'calc(50% - 70px)', top: 'calc(50% - 70px)', zIndex: 20 }}
        onMouseEnter={() => setHovered('troxt')}
        onMouseLeave={() => setHovered(null)}
      >
        <TroxTAvatar3D
          isThinking={troxt.isThinking}
          consciousnessLevel={troxt.consciousnessLevel}
          isOnline={troxt.isOnline}
          onClick={() => onSelect('troxt')}
        />
      </div>

      {/* Hover info panel */}
      {hovered && hovered !== 'troxt' && (
        <div style={{
          position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,12,24,0.95)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', padding: '10px 16px', fontSize: '12px', color: '#aaa',
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {MODULES.find(m => m.id === hovered)?.desc}
        </div>
      )}

    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────
function DashboardView({ stats, onSelect }: { stats: { players: number; platforms: number; uptime: string; memory: string }; onSelect: (id: ModuleTab) => void }) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard label="Joueurs en ligne" value={String(stats.players)} color="#44ff88" icon="👥" />
        <StatCard label="Plateformes 3D" value={String(stats.platforms)} color="#7b6fff" icon="📐" />
        <StatCard label="Uptime serveur" value={stats.uptime} color="#ffaa44" icon="⏱️" />
        <StatCard label="Mémoire RAM" value={stats.memory} color="#ff4488" icon="🧠" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {MODULES.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.color}22`,
              borderRadius: '14px', padding: '20px', textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.2s', color: 'inherit', fontFamily: 'inherit'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${m.color}66`; e.currentTarget.style.background = `${m.color}08`; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${m.color}22`; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{m.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: m.color, marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{m.desc}</div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>
              Status: <span style={{ color: m.status === 'live' ? '#44ff88' : '#ffaa44' }}>
                {m.status === 'live' ? 'Live' : 'In Development'}
              </span>
            </div>
          </button>
        ))}

        {/* TroxT Card */}
        <button
          onClick={() => onSelect('troxt')}
          style={{
            background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.2)',
            borderRadius: '14px', padding: '20px', textAlign: 'left', cursor: 'pointer',
            transition: 'all 0.2s', color: 'inherit', fontFamily: 'inherit'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(123,111,255,0.5)'; e.currentTarget.style.background = 'rgba(123,111,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(123,111,255,0.2)'; e.currentTarget.style.background = 'rgba(123,111,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧠</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#7b6fff', marginBottom: '6px' }}>TroxT Agent</div>
          <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
            Cerveau neural — Chat, raisonnement ReAct, mémoire épisodique, boucle autonome, 25 skills.
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>
            Status: <span style={{ color: '#44ff88' }}>Neural Core Online</span>
          </div>
        </button>
      </div>
    </div>
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
