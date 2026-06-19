import React, { useState, useEffect } from 'react'
import { useGetAntihackEvents, useGetRpPlayers, useGetRpFactions } from '@workspace/api-client-react'

const SEVERITY_CONFIG = {
  low:      { color: '#44ff88', bg: 'rgba(68,255,136,0.1)',  label: 'FAIBLE',    icon: '🟢' },
  medium:   { color: '#ffaa44', bg: 'rgba(255,170,68,0.1)',  label: 'MOYEN',     icon: '🟡' },
  high:     { color: '#ff6644', bg: 'rgba(255,102,68,0.15)', label: 'ÉLEVÉ',     icon: '🟠' },
  critical: { color: '#ff2244', bg: 'rgba(255,34,68,0.15)',  label: 'CRITIQUE',  icon: '🔴' },
}

const HACK_TYPES = [
  { id: 'speed',      label: 'Speed Hack',      icon: '⚡', desc: 'Vitesse de déplacement anormale' },
  { id: 'fly',        label: 'Fly Hack',         icon: '🦅', desc: 'Déplacement aérien non autorisé' },
  { id: 'noclip',     label: 'NoClip',           icon: '👻', desc: 'Passage au travers des murs' },
  { id: 'teleport',   label: 'Téléportation',    icon: '🌀', desc: 'Déplacement instantané suspect' },
  { id: 'god',        label: 'GodMode',          icon: '🛡️', desc: 'Invincibilité détectée' },
  { id: 'money',      label: 'Money Hack',       icon: '💰', desc: 'Modification des ressources' },
  { id: 'esp',        label: 'ESP / Wallhack',   icon: '👁️', desc: 'Vision à travers les obstacles' },
  { id: 'aimbot',     label: 'Aimbot',           icon: '🎯', desc: 'Précision anormale détectée' },
  { id: 'packet',     label: 'Packet Exploit',   icon: '📦', desc: 'Manipulation de paquets réseau' },
  { id: 'inject',     label: 'DLL Injection',    icon: '💉', desc: 'Code injecté dans le processus' },
]

const MONITORING_CHECKS = [
  { id: 'position',  label: 'Vérification position',  status: 'active' },
  { id: 'speed',     label: 'Analyse vitesse',         status: 'active' },
  { id: 'collision', label: 'Contrôle collisions',     status: 'active' },
  { id: 'memory',    label: 'Scan mémoire',            status: 'active' },
  { id: 'packets',   label: 'Analyse paquets',         status: 'active' },
  { id: 'signature', label: 'Base de signatures',      status: 'active' },
  { id: 'timing',    label: 'Timing attacks',          status: 'active' },
  { id: 'ai',        label: 'Détection IA comportement', status: 'active' },
]

type Panel = 'dashboard' | 'events' | 'players' | 'config'

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div style={{ flex: 1, padding: '14px', background: `${color}0a`, border: `1px solid ${color}22`, borderRadius: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

export const AntiHack: React.FC = () => {
  const [panel, setPanel] = useState<Panel>('dashboard')
  const [simulatePlayer, setSimulatePlayer] = useState('')
  const [simulateType, setSimulateType] = useState(HACK_TYPES[0])
  const [simulateSeverity, setSimulateSeverity] = useState<keyof typeof SEVERITY_CONFIG>('medium')
  const [localEvents, setLocalEvents] = useState<any[]>([])
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set())

  const { data: antihackData, refetch } = useGetAntihackEvents()
  const { data: rpPlayersData } = useGetRpPlayers()
  const { data: rpFactionsData } = useGetRpFactions()

  const serverEvents = antihackData?.events || []
  const allEvents = [...localEvents, ...serverEvents].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  const banned = allEvents.filter(e => e.severity === 'critical' && !e.resolved).length + bannedIds.size

  const simulateHack = () => {
    const playerId = simulatePlayer.trim() || `player_${Math.floor(Math.random() * 9000) + 1000}`
    const event = {
      id: Date.now(),
      player_id: playerId,
      type: simulateType.id,
      severity: simulateSeverity,
      timestamp: new Date().toISOString(),
      resolved: false,
    }
    setLocalEvents(prev => [event, ...prev.slice(0, 99)])
    if (simulateSeverity === 'critical') setBannedIds(prev => new Set([...prev, playerId]))
  }

  const resolveEvent = (id: number) => {
    setLocalEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
  }

  const banPlayer = (playerId: string) => {
    setBannedIds(prev => new Set([...prev, playerId]))
  }

  const PANELS: { id: Panel; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '🛡️', label: 'Dashboard' },
    { id: 'events',    icon: '⚠️',  label: 'Événements' },
    { id: 'players',   icon: '👥', label: 'Joueurs RP' },
    { id: 'config',    icon: '⚙️',  label: 'Config' },
  ]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#050810', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid rgba(255,68,68,0.15)', flexShrink: 0, background: 'rgba(255,34,68,0.04)' }}>
        <span style={{ fontSize: '24px' }}>🛡️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#ff2244' }}>EtherWorld Anti-Hack System</div>
          <div style={{ fontSize: '10px', color: '#555' }}>Surveillance temps réel · {MONITORING_CHECKS.length} modules actifs · {allEvents.filter(e => !e.resolved).length} alertes ouvertes</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(68,255,136,0.1)', border: '1px solid rgba(68,255,136,0.3)', borderRadius: '20px' }}>
          <span style={{ width: '8px', height: '8px', background: '#44ff88', borderRadius: '50%', boxShadow: '0 0 8px #44ff88', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '11px', color: '#44ff88', fontWeight: 700 }}>SYSTÈME ACTIF</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setPanel(p.id)}
            style={{ flex: 1, padding: '10px 0', background: panel === p.id ? 'rgba(255,34,68,0.06)' : 'transparent', border: 'none', borderBottom: panel === p.id ? '2px solid #ff2244' : '2px solid transparent', color: panel === p.id ? '#ff2244' : '#555', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

        {/* DASHBOARD */}
        {panel === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <StatCard icon="⚠️"  label="Alertes totales"     value={allEvents.length}                               color="#ffaa44" />
              <StatCard icon="🔴"  label="Non résolues"         value={allEvents.filter(e=>!e.resolved).length}        color="#ff2244" />
              <StatCard icon="🚫"  label="Joueurs bannis"       value={banned}                                         color="#ff4488" />
              <StatCard icon="✅"  label="Résolues"             value={allEvents.filter(e=>e.resolved).length}         color="#44ff88" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Monitoring modules */}
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>🔍 Modules de surveillance</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {MONITORING_CHECKS.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(68,255,136,0.04)', border: '1px solid rgba(68,255,136,0.12)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#bbb' }}>{c.label}</span>
                      <span style={{ fontSize: '9px', color: '#44ff88', background: 'rgba(68,255,136,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>ACTIF</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Types détectés */}
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>🎯 Types détectés</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {HACK_TYPES.map(t => {
                    const count = allEvents.filter(e => e.type === t.id).length
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: count > 0 ? 'rgba(255,34,68,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${count > 0 ? 'rgba(255,34,68,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '6px' }}>
                        <span style={{ fontSize: '11px', color: count > 0 ? '#ff6688' : '#555' }}>{t.icon} {t.label}</span>
                        {count > 0 && <span style={{ fontSize: '11px', color: '#ff2244', fontWeight: 800 }}>{count}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent alerts */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>🕐 Alertes récentes</div>
              {allEvents.slice(0, 5).map((e, i) => {
                const sev = SEVERITY_CONFIG[e.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low
                return (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px', background: sev.bg, border: `1px solid ${sev.color}22`, borderRadius: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <span>{sev.icon}</span>
                    <span style={{ color: sev.color, fontWeight: 700, fontSize: '11px', minWidth: '70px' }}>{sev.label}</span>
                    <span style={{ color: '#bbb', fontSize: '11px' }}>Joueur {e.player_id} — {HACK_TYPES.find(t => t.id === e.type)?.label || e.type}</span>
                    <span style={{ color: '#444', fontSize: '10px', marginLeft: 'auto' }}>{new Date(e.timestamp).toLocaleTimeString('fr')}</span>
                  </div>
                )
              })}
              {allEvents.length === 0 && <div style={{ color: '#555', fontSize: '11px', textAlign: 'center', padding: '20px' }}>✅ Aucune violation détectée</div>}
            </div>
          </div>
        )}

        {/* EVENTS */}
        {panel === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Simulate */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,34,68,0.2)', borderRadius: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#ff4466', marginBottom: '12px' }}>⚡ Simuler une violation (Test)</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input value={simulatePlayer} onChange={e => setSimulatePlayer(e.target.value)} placeholder="ID Joueur (vide = aléatoire)"
                  style={{ flex: 1, minWidth: '120px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px', outline: 'none' }} />
                <select value={simulateSeverity} onChange={e => setSimulateSeverity(e.target.value as any)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none' }}>
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {HACK_TYPES.map(t => (
                  <button key={t.id} onClick={() => setSimulateType(t)}
                    style={{ padding: '5px 10px', background: simulateType.id === t.id ? 'rgba(255,34,68,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${simulateType.id === t.id ? 'rgba(255,34,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', color: simulateType.id === t.id ? '#ff4466' : '#666', fontSize: '10px', cursor: 'pointer' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <button onClick={simulateHack}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,34,68,0.6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                🚨 Simuler Violation
              </button>
            </div>

            {/* Events list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allEvents.map((e, i) => {
                const sev = SEVERITY_CONFIG[e.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low
                const hackType = HACK_TYPES.find(t => t.id === e.type)
                return (
                  <div key={i} style={{ padding: '12px 14px', background: e.resolved ? 'rgba(255,255,255,0.02)' : sev.bg, border: `1px solid ${e.resolved ? 'rgba(255,255,255,0.05)' : sev.color + '33'}`, borderRadius: '10px', opacity: e.resolved ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px' }}>{sev.icon}</span>
                        <span style={{ color: sev.color, fontWeight: 700, fontSize: '11px' }}>{sev.label}</span>
                        <span style={{ color: '#bbb', fontSize: '12px', fontWeight: 600 }}>{hackType?.icon} {hackType?.label || e.type}</span>
                      </div>
                      <span style={{ color: '#444', fontSize: '10px' }}>{new Date(e.timestamp).toLocaleString('fr')}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                      Joueur: <span style={{ color: '#bbb', fontFamily: 'monospace' }}>{e.player_id}</span>
                      {hackType && <span style={{ color: '#555', marginLeft: '10px' }}>{hackType.desc}</span>}
                    </div>
                    {!e.resolved && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => resolveEvent(e.id)}
                          style={{ padding: '4px 12px', background: 'rgba(68,255,136,0.1)', border: '1px solid rgba(68,255,136,0.3)', borderRadius: '6px', color: '#44ff88', fontSize: '10px', cursor: 'pointer' }}>✅ Résoudre</button>
                        <button onClick={() => banPlayer(e.player_id)}
                          style={{ padding: '4px 12px', background: 'rgba(255,34,68,0.1)', border: '1px solid rgba(255,34,68,0.3)', borderRadius: '6px', color: '#ff4466', fontSize: '10px', cursor: 'pointer' }}>🚫 Bannir</button>
                        <button
                          style={{ padding: '4px 12px', background: 'rgba(255,170,68,0.1)', border: '1px solid rgba(255,170,68,0.3)', borderRadius: '6px', color: '#ffaa44', fontSize: '10px', cursor: 'pointer' }}>⚠️ Warn</button>
                      </div>
                    )}
                    {e.resolved && <span style={{ fontSize: '10px', color: '#44ff88' }}>✅ Résolu</span>}
                  </div>
                )
              })}
              {allEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontSize: '12px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛡️</div>
                  <div style={{ color: '#44ff88', fontWeight: 700, marginBottom: '4px' }}>Système propre</div>
                  Aucune violation détectée. Utilisez "Simuler" pour tester.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYERS RP */}
        {panel === 'players' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <StatCard icon="👥" label="Joueurs RP"     value={rpPlayersData?.players?.length ?? 0} color="#7b6fff" />
              <StatCard icon="🏴" label="Factions actives" value={rpFactionsData?.factions?.length ?? 0} color="#ffaa44" />
              <StatCard icon="🚫" label="Bannis"         value={bannedIds.size}                       color="#ff4444" />
            </div>

            {/* Factions */}
            {(rpFactionsData?.factions || []).length > 0 && (
              <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>🏴 Factions</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(rpFactionsData?.factions || []).map((f: any) => (
                    <div key={f.id} style={{ padding: '8px 14px', background: `${f.color}15`, border: `1px solid ${f.color}44`, borderRadius: '20px' }}>
                      <span style={{ color: f.color, fontWeight: 700, fontSize: '11px' }}>{f.name}</span>
                      <span style={{ color: '#555', fontSize: '10px', marginLeft: '8px' }}>{f.members} membres</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#555', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <span>Joueur</span><span>Faction</span><span>Argent</span><span>Niveau</span><span>Statut</span><span>Actions</span>
              </div>
              {(rpPlayersData?.players || []).length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '11px' }}>Aucun joueur RP enregistré</div>
              ) : (rpPlayersData?.players || []).map((p: any) => {
                const isBanned = bannedIds.has(String(p.id))
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', opacity: isBanned ? 0.5 : 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: isBanned ? '#ff4444' : '#ddd' }}>{isBanned ? '🚫 ' : ''}{p.name}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>{p.faction}</span>
                    <span style={{ fontSize: '11px', color: '#44ff88' }}>${p.money?.toLocaleString()}</span>
                    <span style={{ fontSize: '11px', color: '#ffaa44' }}>Lv.{p.level}</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', background: p.status === 'active' ? 'rgba(68,255,136,0.1)' : 'rgba(255,68,68,0.1)', color: p.status === 'active' ? '#44ff88' : '#ff6666', borderRadius: '10px', display: 'inline-block' }}>{p.status}</span>
                    {!isBanned && (
                      <button onClick={() => banPlayer(String(p.id))}
                        style={{ padding: '4px 10px', background: 'rgba(255,34,68,0.1)', border: '1px solid rgba(255,34,68,0.3)', borderRadius: '6px', color: '#ff4466', fontSize: '10px', cursor: 'pointer' }}>Bannir</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CONFIG */}
        {panel === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { title: '🔍 Détection', color: '#44ff88', options: [
                { label: 'Speed Hack detection', desc: 'Surveille la vélocité des joueurs', defaultOn: true },
                { label: 'Fly Hack detection', desc: 'Analyse les positions Y anormales', defaultOn: true },
                { label: 'NoClip detection', desc: 'Vérifie les collisions', defaultOn: true },
                { label: 'Teleport detection', desc: 'Delta de position par frame', defaultOn: true },
                { label: 'GodMode detection', desc: 'Surveille les HP/dégâts', defaultOn: false },
                { label: 'Memory scan', desc: 'Scan de la mémoire processus', defaultOn: false },
              ]},
              { title: '⚡ Actions automatiques', color: '#ffaa44', options: [
                { label: 'Auto-warn (FAIBLE)', desc: 'Envoie un avertissement automatique', defaultOn: true },
                { label: 'Auto-kick (MOYEN)', desc: 'Expulse après 3 violations', defaultOn: true },
                { label: 'Auto-ban (ÉLEVÉ)', desc: 'Bannissement 24h automatique', defaultOn: false },
                { label: 'Ban permanent (CRITIQUE)', desc: 'Bannissement définitif', defaultOn: false },
                { label: 'Report admin', desc: 'Notifie les admins en temps réel', defaultOn: true },
              ]},
              { title: '📊 Logs', color: '#7b6fff', options: [
                { label: 'Log toutes les actions', desc: 'Journal complet des mouvements', defaultOn: false },
                { label: 'Log violations uniquement', desc: 'Seulement les infractions', defaultOn: true },
                { label: 'Exporter vers Discord', desc: 'Webhook Discord des alertes', defaultOn: false },
                { label: 'Exporter CSV', desc: 'Rapport CSV quotidien', defaultOn: false },
              ]},
            ].map(section => (
              <div key={section.title} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${section.color}15`, borderRadius: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: section.color, marginBottom: '12px' }}>{section.title}</div>
                {section.options.map((opt, i) => (
                  <label key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < section.options.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#ccc' }}>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: '#555' }}>{opt.desc}</div>
                    </div>
                    <div style={{ position: 'relative', width: '36px', height: '20px', flexShrink: 0 }}>
                      <input type="checkbox" defaultChecked={opt.defaultOn} style={{ opacity: 0, width: 0, height: 0 }} id={`ahcfg_${i}_${section.title}`} />
                      <label htmlFor={`ahcfg_${i}_${section.title}`} style={{ position: 'absolute', inset: 0, background: opt.defaultOn ? section.color : '#333', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.3s', display: 'flex', alignItems: 'center', padding: '3px', justifyContent: opt.defaultOn ? 'flex-end' : 'flex-start' }}>
                        <span style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', display: 'block' }} />
                      </label>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AntiHack
