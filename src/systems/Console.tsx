import React, { useState, useRef, useEffect, useCallback } from 'react'
import { eventBus } from '../core/eventBus'

export interface ConsoleEntry {
  id: string
  level: 'log' | 'warn' | 'error' | 'info' | 'success' | 'cmd'
  message: string
  timestamp: number
  source?: string
}

const COLORS: Record<string, string> = {
  log: '#ccc',
  info: '#4488ff',
  warn: '#ffaa44',
  error: '#ff4444',
  success: '#44ff88',
  cmd: '#7b6fff',
}

const CMD_HELP = `
Available commands:
  help              — Show this help
  clear             — Clear console
  ping              — Test connection
  metrics           — Fetch server metrics
  world             — Get world state
  weather <w>       — Set weather (sunny/storm/rainy/snowy/fog/cloudy)
  time <0-24>       — Set world time
  platforms         — List platforms
  genworld          — Generate random world
  rpplayers         — List RP players
  antihack          — Check anti-hack events
  saves             — List saves
  troxt <msg>       — Send message to TroxT brain
`.trim()

let globalConsole: ((entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void) | null = null

export function consoleLog(message: string, level: ConsoleEntry['level'] = 'log', source = 'system') {
  if (globalConsole) globalConsole({ level, message, source })
}

export const DevConsole: React.FC<{ onClose?: () => void; sendToTroxT?: (msg: string) => void }> = ({ onClose, sendToTroxT }) => {
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [filter, setFilter] = useState<'all' | ConsoleEntry['level']>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addEntry = useCallback((entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => {
    const full: ConsoleEntry = { ...entry, id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() }
    setEntries(prev => [...prev.slice(-500), full])
  }, [])

  useEffect(() => {
    globalConsole = addEntry

    // Intercept console
    const origLog = console.log
    const origWarn = console.warn
    const origError = console.error
    console.log = (...args) => { origLog(...args); addEntry({ level: 'log', message: args.map(String).join(' '), source: 'console' }) }
    console.warn = (...args) => { origWarn(...args); addEntry({ level: 'warn', message: args.map(String).join(' '), source: 'console' }) }
    console.error = (...args) => { origError(...args); addEntry({ level: 'error', message: args.map(String).join(' '), source: 'console' }) }

    // EventBus listener
    const unsub = eventBus.on('*', (evt) => {
      if (evt.type.startsWith('troxt.') || evt.type.startsWith('system.')) {
        addEntry({ level: 'info', message: `[${evt.type}] ${JSON.stringify(evt.payload).slice(0, 200)}`, source: evt.source })
      }
    })

    addEntry({ level: 'success', message: '🎮 EtherWorld DevConsole — Système actif', source: 'init' })
    addEntry({ level: 'info', message: 'Tapez "help" pour la liste des commandes disponibles.', source: 'init' })

    return () => {
      console.log = origLog; console.warn = origWarn; console.error = origError
      unsub()
      globalConsole = null
    }
  }, [addEntry])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [entries])

  const runCmd = async (cmd: string) => {
    addEntry({ level: 'cmd', message: `> ${cmd}`, source: 'user' })
    const parts = cmd.trim().split(/\s+/)
    const c = parts[0].toLowerCase()
    const args = parts.slice(1)

    try {
      switch (c) {
        case 'help': addEntry({ level: 'info', message: CMD_HELP, source: 'help' }); break
        case 'clear': setEntries([]); break
        case 'ping': addEntry({ level: 'success', message: `Pong! ${Date.now()}ms`, source: 'ping' }); break
        case 'metrics': {
          const r = await fetch('/api/admin/metrics'); const d = await r.json()
          addEntry({ level: 'success', message: JSON.stringify(d, null, 2), source: 'api' }); break
        }
        case 'world': {
          const r = await fetch('/api/admin/world'); const d = await r.json()
          addEntry({ level: 'success', message: JSON.stringify(d, null, 2), source: 'api' }); break
        }
        case 'weather': {
          const w = args[0] || 'sunny'
          const r = await fetch('/api/admin/world', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weather: w }) })
          const d = await r.json(); addEntry({ level: 'success', message: `Météo → ${w} | ${JSON.stringify(d)}`, source: 'api' }); break
        }
        case 'time': {
          const t = parseFloat(args[0]) || 12
          const r = await fetch('/api/admin/world', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time_of_day: t }) })
          const d = await r.json(); addEntry({ level: 'success', message: `Heure → ${t}h | ${JSON.stringify(d)}`, source: 'api' }); break
        }
        case 'platforms': {
          const r = await fetch('/api/platforms'); const d = await r.json()
          addEntry({ level: 'success', message: `${d.platforms?.length || 0} plateformes:\n${JSON.stringify(d.platforms?.slice(0, 5), null, 2)}`, source: 'api' }); break
        }
        case 'genworld': {
          const seed = Math.floor(Math.random() * 99999)
          const r = await fetch('/api/platforms/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed, count: 25 }) })
          const d = await r.json(); addEntry({ level: 'success', message: `Monde généré — seed: ${d.seed}, count: ${d.count}`, source: 'api' }); break
        }
        case 'rpplayers': {
          const r = await fetch('/api/rp/players'); const d = await r.json()
          addEntry({ level: 'success', message: `${d.players?.length || 0} joueurs RP:\n${JSON.stringify(d.players?.slice(0, 3), null, 2)}`, source: 'api' }); break
        }
        case 'antihack': {
          const r = await fetch('/api/rp/antihack/events'); const d = await r.json()
          addEntry({ level: d.events?.length > 0 ? 'warn' : 'success', message: `${d.events?.length || 0} violations, ${d.banned || 0} bans:\n${JSON.stringify(d.events?.slice(0, 5), null, 2)}`, source: 'security' }); break
        }
        case 'saves': {
          const r = await fetch('/api/saves'); const d = await r.json()
          addEntry({ level: 'success', message: `${d.saves?.length || 0} saves:\n${JSON.stringify(d.saves, null, 2)}`, source: 'api' }); break
        }
        case 'troxt': {
          const msg = args.join(' ')
          if (sendToTroxT && msg) { sendToTroxT(msg); addEntry({ level: 'info', message: `→ TroxT: ${msg}`, source: 'bridge' }) }
          else addEntry({ level: 'warn', message: 'Usage: troxt <message>', source: 'help' }); break
        }
        default: addEntry({ level: 'error', message: `Commande inconnue: ${c}. Tapez "help".`, source: 'error' })
      }
    } catch (e) {
      addEntry({ level: 'error', message: `Erreur: ${e}`, source: 'error' })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      setHistory(prev => [input, ...prev.slice(0, 49)])
      setHistIdx(-1)
      runCmd(input)
      setInput('')
    }
    if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      if (history[idx]) setInput(history[idx])
    }
    if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx < 0 ? '' : history[idx])
    }
    if (e.key === 'Escape' && onClose) onClose()
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter)
  const counts = { error: entries.filter(e => e.level === 'error').length, warn: entries.filter(e => e.level === 'warn').length }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#030508', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '12px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <span style={{ color: '#7b6fff', fontWeight: 700, fontSize: '13px' }}>⌨️ DevConsole</span>
        <div style={{ flex: 1 }} />
        {(['all', 'log', 'info', 'warn', 'error', 'success'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '3px 8px', background: filter === f ? COLORS[f === 'all' ? 'log' : f] + '22' : 'transparent', border: `1px solid ${filter === f ? COLORS[f === 'all' ? 'log' : f] + '66' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', color: COLORS[f === 'all' ? 'log' : f], cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}>
            {f}{f === 'error' && counts.error > 0 ? ` (${counts.error})` : ''}{f === 'warn' && counts.warn > 0 ? ` (${counts.warn})` : ''}
          </button>
        ))}
        <button onClick={() => setEntries([])} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#666', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}>Clear</button>
        {onClose && <button onClick={onClose} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#666', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>✕</button>}
      </div>

      {/* Entries */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {filtered.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: '8px', padding: '3px 6px', borderRadius: '4px', background: entry.level === 'error' ? 'rgba(255,68,68,0.05)' : entry.level === 'warn' ? 'rgba(255,170,68,0.04)' : 'transparent' }}>
            <span style={{ color: '#333', flexShrink: 0, fontSize: '10px', paddingTop: '1px' }}>{new Date(entry.timestamp).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            {entry.source && <span style={{ color: '#444', flexShrink: 0, minWidth: '60px', fontSize: '10px', paddingTop: '1px' }}>[{entry.source}]</span>}
            <pre style={{ color: COLORS[entry.level], margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.5 }}>{entry.message}</pre>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, alignItems: 'center' }}>
        <span style={{ color: '#7b6fff' }}>{'>'}</span>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Commande... (help pour l'aide)"
          autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#7b6fff', fontFamily: 'inherit', fontSize: '12px' }} />
      </div>
    </div>
  )
}

export default DevConsole
