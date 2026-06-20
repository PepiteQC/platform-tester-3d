// ============================================================
//  TROXTMSN.tsx — Interface Messagerie TroxT
//  Chat flottant universel accessible via Ctrl+T ou bouton orb.
//  Inclut : slash commands, status typing, mémoire, 3D avatar,
//  export conversation, et intégration complète au contexte.
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTroxT, ChatMessage } from './TroxTContext'

const AVATAR_TROXT = '🧠'
const AVATAR_USER = '👤'
const AVATAR_SYSTEM = '⚙️'
const AVATAR_THOUGHT = '💭'

const SUGGESTIONS = [
  'Crée une plateforme rouge à [0, 3, 0]',
  'Génère un monde aléatoire',
  'Quels joueurs sont en ligne ?',
  'Sauvegarde ce niveau',
  'Règle la météo sur storm',
  'Montre-moi les stats DB',
  'Exporte le monde en GLTF',
  'Crée un snapshot',
  'Introspection',
  'Aide'
]

const SLASH_COMMANDS = [
  { cmd: '/forge', desc: 'Passer en mode Forge (3D)' },
  { cmd: '/prism', desc: 'Passer en mode Prism (DB)' },
  { cmd: '/lens', desc: 'Passer en mode Lens (Analyse)' },
  { cmd: '/weave', desc: 'Passer en mode Weave (Textures)' },
  { cmd: '/mode auto', desc: 'Activer le mode autonome' },
  { cmd: '/mode sleep', desc: 'Désactiver proactivité' },
  { cmd: '/snapshot', desc: 'Créer un snapshot du monde' },
  { cmd: '/memory', desc: 'Voir la mémoire récente' },
  { cmd: '/introspect', desc: 'État cognitif de TroxT' },
  { cmd: '/clear', desc: 'Effacer la conversation' },
  { cmd: '/export', desc: 'Exporter la conversation' },
  { cmd: '/help', desc: 'Aide des commandes' }
]

export const TroxTMSN: React.FC = () => {
  const troxt = useTroxT()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pulse, setPulse] = useState(0)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [troxt.messages, troxt.isThinking])

  // Keyboard shortcut Ctrl+T
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Pulse animation quand TroxT pense
  useEffect(() => {
    if (!troxt.isThinking) return
    const id = setInterval(() => setPulse(p => (p + 1) % 4), 500)
    return () => clearInterval(id)
  }, [troxt.isThinking])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return

    // Slash commands
    if (text.startsWith('/')) {
      handleSlash(text)
      setInput('')
      return
    }

    setInput('')
    setShowSuggestions(false)
    await troxt.sendMessage(text)
  }, [input, troxt])

  const handleSlash = (text: string) => {
    const cmd = text.split(' ')[0]
    const rest = text.slice(cmd.length).trim()

    switch (cmd) {
      case '/clear':
        troxt.clearChat()
        break
      case '/export':
        const blob = new Blob([troxt.exportMemory()], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `troxt-conversation-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        break
      case '/introspect':
        troxt.sendMessage('introspect')
        break
      case '/memory':
        troxt.sendMessage('memory recent')
        break
      case '/snapshot':
        troxt.runSkill('admin_create_snapshot', { description: 'Snapshot via TroxTMSN' })
        break
      case '/mode':
        if (rest.includes('auto')) troxt.setConsciousnessLevel(8)
        if (rest.includes('sleep')) troxt.setConsciousnessLevel(2)
        break
      case '/help':
        // nothing, handled by rendering
        break
      default:
        // Forward to brain as raw text (it might be a skill name)
        troxt.sendMessage(text)
    }
  }

  const onInputChange = (val: string) => {
    setInput(val)
    if (val === '/') {
      setShowSlashMenu(true)
      setSlashFilter('')
    } else if (val.startsWith('/')) {
      setShowSlashMenu(true)
      setSlashFilter(val.slice(1))
    } else {
      setShowSlashMenu(false)
    }
  }

  const filteredSlash = SLASH_COMMANDS.filter(c =>
    c.cmd.includes(slashFilter.toLowerCase()) ||
    c.desc.toLowerCase().includes(slashFilter.toLowerCase())
  )

  const consciousnessColor =
    troxt.consciousnessLevel >= 8 ? '#ff6b6b' :
    troxt.consciousnessLevel >= 5 ? '#ffd166' :
    '#06d6a0'

  return (
    <>
      {/* Orb flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="TroxT Messenger (Ctrl+T)"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: `2px solid ${consciousnessColor}`,
            background: 'rgba(10,12,24,0.95)',
            color: consciousnessColor,
            fontSize: '26px',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${consciousnessColor}44`,
            transition: 'all 0.3s ease',
            animation: troxt.isThinking ? 'pulseOrb 1s infinite' : 'none'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 30px ${consciousnessColor}88`
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${consciousnessColor}44`
          }}
        >
          {AVATAR_TROXT}
          {troxt.messages.length > 0 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#ff4444', fontSize: '10px', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #0a0c18'
            }}>
              {troxt.messages.length > 99 ? '99+' : troxt.messages.length}
            </span>
          )}
        </button>
      )}

      {/* Panneau Messenger */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '420px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10,12,24,0.97)',
          border: `1px solid ${consciousnessColor}44`,
          borderRadius: '16px',
          zIndex: 9999,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${consciousnessColor}22`
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: `1px solid ${consciousnessColor}22`,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>{AVATAR_TROXT}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', letterSpacing: '0.3px' }}>
                  TroxT MSN
                </div>
                <div style={{ fontSize: '11px', color: troxt.isOnline ? '#44ff88' : '#ff4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: troxt.isOnline ? '#44ff88' : '#ff4444',
                    boxShadow: troxt.isOnline ? '0 0 6px #44ff88' : '0 0 6px #ff4444'
                  }} />
                  {troxt.isOnline ? 'En ligne' : 'Hors ligne'} · C:{troxt.consciousnessLevel}/10 · Load:{troxt.state?.cognitiveLoad ?? 0}%
                  {troxt.isThinking && ' · Réflexion...'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => troxt.setConsciousnessLevel(troxt.consciousnessLevel >= 10 ? 1 : troxt.consciousnessLevel + 1)}
                title="Niveau de conscience"
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: consciousnessColor, fontSize: '12px',
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'monospace'
                }}
              >
                C:{troxt.consciousnessLevel}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none', color: '#888', fontSize: '18px',
                  cursor: 'pointer', padding: '4px 8px', borderRadius: '6px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
              flexDirection: 'column', gap: '10px', minHeight: '300px'
            }}
          >
            {troxt.messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#555', padding: '30px 10px', fontSize: '13px', lineHeight: 1.6 }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧠</div>
                <strong style={{ color: '#aaa' }}>Bienvenue dans TroxT MSN</strong>
                <p>Je suis le cerveau d'EtherWorld. Je peux :</p>
                <ul style={{ textAlign: 'left', display: 'inline-block', margin: '8px 0', paddingLeft: '18px' }}>
                  <li>Contrôler la 3D (Forge)</li>
                  <li>Gérer la DB RP (Prism)</li>
                  <li>Surveiller le serveur</li>
                  <li>Créer des textures (Weave)</li>
                  <li>Analyser des images (Lens)</li>
                </ul>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                  Raccourci : <kbd style={{ background: '#222', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+T</kbd> · Tape <kbd style={{ background: '#222', padding: '2px 6px', borderRadius: '4px' }}>/</kbd> pour les commandes
                </p>
              </div>
            )}

            {troxt.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {troxt.isThinking && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{AVATAR_TROXT}</span>
                <div style={{
                  background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.25)',
                  borderRadius: '14px 14px 14px 4px', padding: '10px 14px', color: '#bbaaff', fontSize: '13px'
                }}>
                  Réflexion en cours{'.'.repeat(pulse + 1)}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions chips */}
          {showSuggestions && !troxt.isThinking && (
            <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setShowSuggestions(false); inputRef.current?.focus() }}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px', color: '#aaa', fontSize: '11px', padding: '5px 12px',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = consciousnessColor; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#aaa' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Slash commands menu */}
          {showSlashMenu && (
            <div style={{
              maxHeight: '160px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              {filteredSlash.map(c => (
                <button
                  key={c.cmd}
                  onClick={() => { setInput(c.cmd + ' '); setShowSlashMenu(false); inputRef.current?.focus() }}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left', color: '#ddd',
                    fontSize: '12px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <span style={{ fontFamily: 'monospace', color: '#7b6fff' }}>{c.cmd}</span>
                  <span style={{ color: '#888', fontSize: '11px' }}>{c.desc}</span>
                </button>
              ))}
              {filteredSlash.length === 0 && (
                <div style={{ color: '#666', fontSize: '11px', padding: '4px' }}>Aucune commande trouvée</div>
              )}
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                if (e.key === 'Escape') { setShowSlashMenu(false); setShowSuggestions(false) }
              }}
              onFocus={() => setShowSuggestions(troxt.messages.length === 0)}
              placeholder="Parle à TroxT... (Ctrl+T pour fermer)"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '10px 14px',
                outline: 'none', fontFamily: 'inherit'
              }}
              autoFocus
            />
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              title="Suggestions"
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#888', fontSize: '18px', width: '38px', height: '38px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✨
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || troxt.isThinking}
              style={{
                background: input.trim() ? consciousnessColor : 'rgba(255,255,255,0.06)',
                border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                padding: '0 16px', height: '38px', cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600, transition: 'all 0.2s', opacity: input.trim() ? 1 : 0.4
              }}
            >
              Envoyer
            </button>
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
            fontSize: '10px', color: '#444', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexShrink: 0
          }}>
            <span>TroxT v3.0 · EtherWorld Neural Core</span>
            <span>{troxt.messages.filter(m => m.role === 'user').length} messages</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseOrb {
          0%, 100% { box-shadow: 0 0 20px ${consciousnessColor}44; }
          50% { box-shadow: 0 0 40px ${consciousnessColor}88; }
        }
      `}</style>
    </>
  )
}

// ─── Message Bubble ────────────────────────────────────────
const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const isThought = msg.role === 'thought'

  const avatar = isUser ? AVATAR_USER : isSystem ? AVATAR_SYSTEM : isThought ? AVATAR_THOUGHT : AVATAR_TROXT
  const bg = isUser ? 'rgba(60,120,255,0.15)' : isSystem ? 'rgba(255,160,60,0.12)' : isThought ? 'rgba(100,100,100,0.1)' : 'rgba(123,111,255,0.12)'
  const border = isUser ? 'rgba(60,120,255,0.3)' : isSystem ? 'rgba(255,160,60,0.25)' : isThought ? 'rgba(255,255,255,0.08)' : 'rgba(123,111,255,0.25)'
  const color = isUser ? '#aaddff' : isSystem ? '#ffcc88' : isThought ? '#999' : '#ddccff'
  const align = isUser ? 'flex-end' : 'flex-start'
  const radius = isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: align, maxWidth: '100%' }}>
      {!isUser && <span style={{ fontSize: '18px', flexShrink: 0 }}>{avatar}</span>}
      <div style={{ maxWidth: '80%' }}>
        <div style={{
          background: bg, border: `1px solid ${border}`, borderRadius: radius,
          padding: '10px 14px', color, fontSize: '13px', lineHeight: 1.5,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap'
        }}>
          {msg.text}
        </div>
        {msg.meta && (
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', padding: '0 4px', display: 'flex', gap: '8px' }}>
            {msg.meta.latencyMs && <span>{msg.meta.latencyMs}ms</span>}
            {msg.meta.skillId && <span style={{ color: '#7b6fff' }}>@{msg.meta.skillId}</span>}
            {msg.meta.confidence && <span>conf: {Math.round(msg.meta.confidence * 100)}%</span>}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', padding: '0 4px' }}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {isUser && <span style={{ fontSize: '18px', flexShrink: 0 }}>{avatar}</span>}
    </div>
  )
}

export default TroxTMSN
