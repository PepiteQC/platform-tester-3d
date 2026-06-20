import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box, Sphere, Cylinder } from '@react-three/drei'

// ──────────────── CHARACTER CONFIG ────────────────

interface CharConfig {
  race: string
  bodyType: string
  skinColor: string
  hairStyle: string
  hairColor: string
  eyeColor: string
  outfit: string
  outfitColor: string
  outfitColor2: string
  equipment: string
  charName: string
  bio: string
}

const RACES = [
  { id: 'human',   label: 'Humain',   icon: '👤', desc: 'Polyvalent, équilibré',        scaleY: 1,    scaleX: 1 },
  { id: 'elf',     label: 'Elfe',     icon: '🧝', desc: 'Grand, mince, rapide',          scaleY: 1.12, scaleX: 0.88 },
  { id: 'android', label: 'Androïde', icon: '🤖', desc: 'Robuste, mécanique',            scaleY: 1.05, scaleX: 1.05 },
  { id: 'demon',   label: 'Démon',    icon: '😈', desc: 'Puissant, sombre',              scaleY: 1.08, scaleX: 1.1  },
  { id: 'ghost',   label: 'Fantôme',  icon: '👻', desc: 'Éthéré, semi-transparent',     scaleY: 1,    scaleX: 0.9  },
  { id: 'dwarf',   label: 'Nain',     icon: '⛏️',  desc: 'Court, très solide',            scaleY: 0.82, scaleX: 1.2  },
  { id: 'dragon',  label: 'Dragon-Né',icon: '🐉', desc: 'Imposant, écailles',            scaleY: 1.1,  scaleX: 1.15 },
  { id: 'ai',      label: 'Synthétique',icon:'⚡', desc: 'Corps numérique lumineux',    scaleY: 1,    scaleX: 1    },
]

const BODY_TYPES = [
  { id: 'slim',      label: 'Élancé',   scaleX: 0.85, scaleZ: 0.85 },
  { id: 'average',   label: 'Standard', scaleX: 1,    scaleZ: 1    },
  { id: 'athletic',  label: 'Athlétique',scaleX: 1.1, scaleZ: 1.05 },
  { id: 'stocky',    label: 'Trapu',    scaleX: 1.25, scaleZ: 1.2  },
]

const HAIR_STYLES = ['Aucun', 'Court', 'Long', 'Mohawk', 'Tresses', 'Bouclés', 'Ondulé', 'Rasé']

const OUTFITS = [
  { id: 'casual',    label: 'Casual',     icon: '👕', desc: 'Tenue décontractée' },
  { id: 'military',  label: 'Militaire',  icon: '🪖', desc: 'Tenue de combat' },
  { id: 'police',    label: 'Police',     icon: '👮', desc: 'Uniforme forces de l\'ordre' },
  { id: 'mage',      label: 'Mage',       icon: '🧙', desc: 'Robes arcanes' },
  { id: 'ninja',     label: 'Ninja',      icon: '🥷', desc: 'Tenue furtive noire' },
  { id: 'medical',   label: 'Médecin',    icon: '🩺', desc: 'Blouse médicale' },
  { id: 'robot',     label: 'Robot',      icon: '🦾', desc: 'Armure mécanique' },
  { id: 'dragon',    label: 'Dragon',     icon: '🐉', desc: 'Armure d\'écailles' },
  { id: 'space',     label: 'Spatial',    icon: '🚀', desc: 'Combinaison spatiale' },
  { id: 'assassin',  label: 'Assassin',   icon: '🗡️', desc: 'Habit sombre' },
]

const EQUIPMENTS = [
  { id: 'none',    label: 'Aucun',   icon: '✋' },
  { id: 'sword',   label: 'Épée',    icon: '⚔️' },
  { id: 'gun',     label: 'Pistolet',icon: '🔫' },
  { id: 'bow',     label: 'Arc',     icon: '🏹' },
  { id: 'staff',   label: 'Bâton',   icon: '🪄' },
  { id: 'shield',  label: 'Bouclier',icon: '🛡️' },
  { id: 'lance',   label: 'Lance',   icon: '🗡️' },
  { id: 'bomb',    label: 'Bombe',   icon: '💣' },
]

const SKIN_PRESETS = ['#fcd5b0','#e8b58a','#c68642','#8d5524','#4a2811','#f0e0c0','#ffe0bd','#ffcc99','#d4a76a','#b07040','#7a4a28','#ffffff']
const HAIR_COLORS  = ['#1a1a1a','#444444','#8b6914','#c19a6b','#ff6600','#ff0080','#4488ff','#44ff88','#aaaaaa','#ffffff','#660000','#cc3300']
const EYE_COLORS   = ['#1a5276','#196f3d','#7d6608','#784212','#922b21','#6c3483','#2e86c1','#0e6655','#00aaff','#ff4400','#ffffff','#00ff88']
const OUTFIT_COLORS = ['#2c3e50','#1a5276','#1e8449','#7d6608','#922b21','#6c3483','#1abc9c','#e74c3c','#e67e22','#f39c12','#95a5a6','#2c2c2c','#ffffff','#ff4488']

// ──────────────── 3D CHARACTER PREVIEW ────────────────

function Character3D({ cfg }: { cfg: CharConfig }) {
  const groupRef = useRef<THREE.Group>(null)
  const race = RACES.find(r => r.id === cfg.race) || RACES[0]
  const body = BODY_TYPES.find(b => b.id === cfg.bodyType) || BODY_TYPES[1]
  const isGhost = cfg.race === 'ghost'
  const isAndroid = cfg.race === 'android' || cfg.race === 'ai'
  const isRobot = cfg.outfit === 'robot'

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.6
  })

  const skin = cfg.skinColor
  const hair = cfg.hairColor
  const eye  = cfg.eyeColor
  const out1 = cfg.outfitColor
  const out2 = cfg.outfitColor2

  const torsoW = 0.7 * body.scaleX * race.scaleX
  const torsoH = 0.9
  const torsoD = 0.4 * body.scaleZ
  const legW   = 0.28 * body.scaleX
  const armW   = 0.22 * body.scaleX
  const totalH = race.scaleY

  const mkMat = (color: string, emissive = false, transparent = false, opacity = 1, metalness = 0, roughness = 0.8) => (
    <meshStandardMaterial color={color} emissive={emissive ? color : '#000'} emissiveIntensity={emissive ? 0.25 : 0} transparent={transparent} opacity={opacity} metalness={metalness} roughness={roughness} />
  )

  return (
    <group ref={groupRef} scale={[1, totalH, 1]} position={[0, -0.5, 0]}>
      {/* Legs */}
      <Box args={[legW, 0.9, legW * 1.1]} position={[0.19, 0.18, 0]} castShadow>
        {mkMat(out1, false, isGhost, isGhost ? 0.7 : 1)}
      </Box>
      <Box args={[legW, 0.9, legW * 1.1]} position={[-0.19, 0.18, 0]} castShadow>
        {mkMat(out1, false, isGhost, isGhost ? 0.7 : 1)}
      </Box>
      {/* Feet */}
      <Box args={[legW + 0.04, 0.12, legW * 1.4]} position={[0.19, -0.28, 0.05]} castShadow>
        {mkMat(out2 || '#1a1a1a')}
      </Box>
      <Box args={[legW + 0.04, 0.12, legW * 1.4]} position={[-0.19, -0.28, 0.05]} castShadow>
        {mkMat(out2 || '#1a1a1a')}
      </Box>

      {/* Torso */}
      <Box args={[torsoW, torsoH, torsoD]} position={[0, 1.08, 0]} castShadow>
        {mkMat(out1, cfg.race === 'ai', isGhost, isGhost ? 0.65 : 1, isRobot || isAndroid ? 0.6 : 0, isRobot || isAndroid ? 0.3 : 0.8)}
      </Box>
      {/* Chest detail */}
      {(isRobot || isAndroid) && (
        <Box args={[torsoW * 0.5, torsoH * 0.4, torsoD + 0.01]} position={[0, 1.1, 0]}>
          {mkMat(out2 || '#00aaff', true, false, 1, 0.8, 0.1)}
        </Box>
      )}

      {/* Belt */}
      <Box args={[torsoW + 0.02, 0.12, torsoD + 0.02]} position={[0, 0.64, 0]}>
        {mkMat(out2 || '#111111')}
      </Box>

      {/* Arms */}
      <Box args={[armW, 0.78, armW * 1.1]} position={[torsoW / 2 + armW / 2 + 0.04, 1.06, 0]} castShadow>
        {mkMat(out1, false, isGhost, isGhost ? 0.6 : 1, isRobot || isAndroid ? 0.5 : 0)}
      </Box>
      <Box args={[armW, 0.78, armW * 1.1]} position={[-(torsoW / 2 + armW / 2 + 0.04), 1.06, 0]} castShadow>
        {mkMat(out1, false, isGhost, isGhost ? 0.6 : 1, isRobot || isAndroid ? 0.5 : 0)}
      </Box>
      {/* Hands */}
      <Box args={[armW + 0.02, 0.22, armW + 0.02]} position={[torsoW / 2 + armW / 2 + 0.04, 0.67, 0]}>
        {mkMat(skin)}
      </Box>
      <Box args={[armW + 0.02, 0.22, armW + 0.02]} position={[-(torsoW / 2 + armW / 2 + 0.04), 0.67, 0]}>
        {mkMat(skin)}
      </Box>

      {/* Neck */}
      <Box args={[0.2, 0.18, 0.2]} position={[0, 1.58, 0]}>{mkMat(skin)}</Box>

      {/* Head */}
      <Box args={[0.55 * race.scaleX, 0.58, 0.52]} position={[0, 1.94, 0]} castShadow>
        {mkMat(skin, false, isGhost, isGhost ? 0.6 : 1)}
      </Box>
      {/* Face detail */}
      <Box args={[0.42 * race.scaleX, 0.28, 0.01]} position={[0, 1.94, 0.265]}>
        {mkMat(isAndroid ? '#002244' : cfg.race === 'demon' ? '#440000' : '#' + skin.slice(1).split('').map((c, i) => { const n = parseInt(c, 16); return Math.max(0, n - 2).toString(16) }).join(''))}
      </Box>
      {/* Eyes */}
      <Box args={[0.1, 0.08, 0.03]} position={[0.12 * race.scaleX, 1.97, 0.27]}>
        {mkMat(eye, cfg.race === 'ai' || cfg.race === 'android', false, 1, 0, 0.1)}
      </Box>
      <Box args={[0.1, 0.08, 0.03]} position={[-0.12 * race.scaleX, 1.97, 0.27]}>
        {mkMat(eye, cfg.race === 'ai' || cfg.race === 'android', false, 1, 0, 0.1)}
      </Box>
      {/* Mouth */}
      <Box args={[0.16, 0.04, 0.02]} position={[0, 1.86, 0.27]}>
        {mkMat('#bb7755')}
      </Box>

      {/* Hair */}
      {cfg.hairStyle !== 'Aucun' && cfg.hairStyle !== 'Rasé' && (
        <>
          {cfg.hairStyle === 'Mohawk' ? (
            <Box args={[0.1 * race.scaleX, 0.45, 0.5]} position={[0, 2.38, 0]}>{mkMat(hair)}</Box>
          ) : cfg.hairStyle === 'Long' ? (
            <>
              <Box args={[0.57 * race.scaleX, 0.12, 0.52]} position={[0, 2.27, 0]}>{mkMat(hair)}</Box>
              <Box args={[0.12, 0.6, 0.1]} position={[0.26 * race.scaleX, 1.9, -0.2]}>{mkMat(hair)}</Box>
              <Box args={[0.12, 0.6, 0.1]} position={[-0.26 * race.scaleX, 1.9, -0.2]}>{mkMat(hair)}</Box>
              <Box args={[0.52 * race.scaleX, 0.6, 0.08]} position={[0, 1.9, -0.28]}>{mkMat(hair)}</Box>
            </>
          ) : cfg.hairStyle === 'Tresses' ? (
            <>
              <Box args={[0.57 * race.scaleX, 0.12, 0.52]} position={[0, 2.27, 0]}>{mkMat(hair)}</Box>
              <Cylinder args={[0.07, 0.05, 0.7, 6]} position={[0.24 * race.scaleX, 1.75, 0]}>{mkMat(hair)}</Cylinder>
              <Cylinder args={[0.07, 0.05, 0.7, 6]} position={[-0.24 * race.scaleX, 1.75, 0]}>{mkMat(hair)}</Cylinder>
            </>
          ) : cfg.hairStyle === 'Bouclés' ? (
            <>
              <Box args={[0.62 * race.scaleX, 0.18, 0.58]} position={[0, 2.28, 0]}>{mkMat(hair)}</Box>
              <Box args={[0.62 * race.scaleX, 0.18, 0.1]} position={[0, 2.16, -0.2]}>{mkMat(hair)}</Box>
              <Box args={[0.1, 0.18, 0.5]} position={[0.3 * race.scaleX, 2.17, 0]}>{mkMat(hair)}</Box>
              <Box args={[0.1, 0.18, 0.5]} position={[-0.3 * race.scaleX, 2.17, 0]}>{mkMat(hair)}</Box>
            </>
          ) : (
            <Box args={[0.58 * race.scaleX, 0.13, 0.53]} position={[0, 2.27, 0]}>{mkMat(hair)}</Box>
          )}
        </>
      )}
      {/* Demon horns */}
      {cfg.race === 'demon' && (
        <>
          <Cylinder args={[0.04, 0.09, 0.35, 6]} position={[0.2 * race.scaleX, 2.42, 0]} rotation={[0, 0, 0.3]}>{mkMat('#660022')}</Cylinder>
          <Cylinder args={[0.04, 0.09, 0.35, 6]} position={[-0.2 * race.scaleX, 2.42, 0]} rotation={[0, 0, -0.3]}>{mkMat('#660022')}</Cylinder>
        </>
      )}
      {/* AI glow ring */}
      {cfg.race === 'ai' && (
        <Cylinder args={[0.38, 0.38, 0.05, 32, 1, true]} position={[0, 2.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {mkMat(eye, true, false, 1, 0, 0)}
        </Cylinder>
      )}

      {/* Equipment */}
      {cfg.equipment === 'sword' && (
        <group position={[torsoW / 2 + armW + 0.12, 0.85, 0]}>
          <Box args={[0.06, 0.9, 0.06]}><meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} /></Box>
          <Box args={[0.3, 0.06, 0.06]} position={[0, 0.05, 0]}><meshStandardMaterial color="#885533" /></Box>
        </group>
      )}
      {cfg.equipment === 'shield' && (
        <Box args={[0.06, 0.65, 0.55]} position={[-(torsoW / 2 + armW + 0.15), 0.9, 0]}>
          <meshStandardMaterial color={out2 || '#2244aa'} metalness={0.6} roughness={0.3} />
        </Box>
      )}
      {cfg.equipment === 'staff' && (
        <group position={[torsoW / 2 + armW + 0.1, 0.6, 0]}>
          <Cylinder args={[0.04, 0.04, 1.5, 8]}><meshStandardMaterial color="#774433" roughness={0.9} /></Cylinder>
          <Sphere args={[0.12, 12, 12]} position={[0, 0.85, 0]}><meshStandardMaterial color={eye} emissive={eye} emissiveIntensity={0.6} /></Sphere>
        </group>
      )}
      {cfg.equipment === 'gun' && (
        <Box args={[0.1, 0.2, 0.45]} position={[torsoW / 2 + armW + 0.1, 0.72, 0.1]}>
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
        </Box>
      )}
      {cfg.equipment === 'lance' && (
        <group position={[torsoW / 2 + armW + 0.1, 0.5, 0]}>
          <Cylinder args={[0.03, 0.03, 2.2, 8]}><meshStandardMaterial color="#888888" metalness={0.7} roughness={0.2} /></Cylinder>
          <Cylinder args={[0.01, 0.07, 0.3, 6]} position={[0, 1.1, 0]}><meshStandardMaterial color="#dddddd" metalness={0.9} roughness={0.1} /></Cylinder>
        </group>
      )}
      {cfg.equipment === 'bomb' && (
        <group position={[torsoW / 2 + armW + 0.1, 0.72, 0]}>
          <Sphere args={[0.15, 12, 12]}><meshStandardMaterial color="#222222" roughness={0.7} /></Sphere>
          <Cylinder args={[0.02, 0.02, 0.15, 6]} position={[0, 0.19, 0]}><meshStandardMaterial color="#888888" /></Cylinder>
        </group>
      )}
    </group>
  )
}

// ──────────────── SAVED CHARACTERS ────────────────

function getSavedChars(): CharConfig[] {
  try { return JSON.parse(localStorage.getItem('etherworld_chars') || '[]') } catch { return [] }
}
function saveChar(cfg: CharConfig) {
  const chars = getSavedChars().filter(c => c.charName !== cfg.charName)
  localStorage.setItem('etherworld_chars', JSON.stringify([cfg, ...chars].slice(0, 20)))
}

// ──────────────── MAIN COMPONENT ────────────────

const DEFAULT_CFG: CharConfig = {
  race: 'human', bodyType: 'average', skinColor: '#e8b58a', hairStyle: 'Court', hairColor: '#1a1a1a',
  eyeColor: '#1a5276', outfit: 'casual', outfitColor: '#2c3e50', outfitColor2: '#1a1a1a',
  equipment: 'none', charName: 'Mon Personnage', bio: '',
}

type CTab = 'race' | 'corps' | 'visage' | 'tenue' | 'equipement' | 'sauvegarde'
const CTAB_ICONS: Record<CTab, string> = { race: '🌍', corps: '💪', visage: '😊', tenue: '👕', equipement: '⚔️', sauvegarde: '💾' }

export const CharacterCreator: React.FC = () => {
  const [cfg, setCfg] = useState<CharConfig>(DEFAULT_CFG)
  const [tab, setTab] = useState<CTab>('race')
  const [savedChars, setSavedChars] = useState<CharConfig[]>(getSavedChars)
  const [saveMsg, setSaveMsg] = useState('')

  const set = (partial: Partial<CharConfig>) => setCfg(c => ({ ...c, ...partial }))

  const handleSave = () => {
    if (!cfg.charName.trim()) return
    saveChar(cfg)
    setSavedChars(getSavedChars())
    setSaveMsg('✅ Sauvegardé !')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const loadChar = (c: CharConfig) => { setCfg(c); setSaveMsg('') }
  const deleteChar = (name: string) => {
    const updated = getSavedChars().filter(c => c.charName !== name)
    localStorage.setItem('etherworld_chars', JSON.stringify(updated))
    setSavedChars(updated)
  }

  const S = { fontSize: '10px', fontWeight: 700 as const }
  const TABS: CTab[] = ['race', 'corps', 'visage', 'tenue', 'equipement', 'sauvegarde']

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#030609', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ─── LEFT: CUSTOMIZATION ─── */}
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#060912', flexShrink: 0 }}>

        <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ color: '#aa55ff', fontWeight: 800, fontSize: '13px' }}>🧬 CRÉATEUR DE PERSONNAGE</div>
          <div style={{ color: '#333', fontSize: '10px', marginTop: '1px' }}>Personnalise et sauvegarde ton avatar</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px 0', background: tab === t ? 'rgba(170,85,255,0.1)' : 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #aa55ff' : '2px solid transparent', color: tab === t ? '#aa55ff' : '#444', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span>{CTAB_ICONS[t]}</span>
              <span style={{ fontSize: '8px', fontWeight: 700 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '11px' }}>

          {/* RACE */}
          {tab === 'race' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {RACES.map(r => (
                <button key={r.id} onClick={() => set({ race: r.id })}
                  style={{ padding: '10px 12px', background: cfg.race === r.id ? 'rgba(170,85,255,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.race === r.id ? 'rgba(170,85,255,0.45)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>{r.icon}</span>
                  <div>
                    <div style={{ ...S, fontSize: '11px', color: cfg.race === r.id ? '#cc88ff' : '#bbb' }}>{r.label}</div>
                    <div style={{ fontSize: '9px', color: '#444', marginTop: '1px' }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* CORPS */}
          {tab === 'corps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>TYPE DE CORPS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {BODY_TYPES.map(bt => (
                    <button key={bt.id} onClick={() => set({ bodyType: bt.id })}
                      style={{ padding: '10px 8px', background: cfg.bodyType === bt.id ? 'rgba(170,85,255,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.bodyType === bt.id ? 'rgba(170,85,255,0.45)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '9px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.12s' }}>
                      <div style={{ width: `${30 * bt.scaleX}px`, height: `${50}px`, background: cfg.bodyType === bt.id ? '#aa55ff' : '#334', borderRadius: '4px' }} />
                      <div style={{ ...S, fontSize: '9px', color: cfg.bodyType === bt.id ? '#cc88ff' : '#777' }}>{bt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR DE PEAU</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '7px' }}>
                  {SKIN_PRESETS.map(c => (
                    <button key={c} onClick={() => set({ skinColor: c })}
                      style={{ width: '26px', height: '26px', background: c, border: `2px solid ${cfg.skinColor === c ? '#fff' : 'transparent'}`, borderRadius: '6px', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={cfg.skinColor} onChange={e => set({ skinColor: e.target.value })}
                  style={{ width: '100%', height: '28px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
              </div>
            </div>
          )}

          {/* VISAGE */}
          {tab === 'visage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>STYLE DE CHEVEUX</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {HAIR_STYLES.map(hs => (
                    <button key={hs} onClick={() => set({ hairStyle: hs })}
                      style={{ padding: '5px 10px', background: cfg.hairStyle === hs ? 'rgba(170,85,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.hairStyle === hs ? 'rgba(170,85,255,0.45)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', color: cfg.hairStyle === hs ? '#cc88ff' : '#555', ...S, fontSize: '9px', cursor: 'pointer' }}>
                      {hs}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR DE CHEVEUX</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '7px' }}>
                  {HAIR_COLORS.map(c => (
                    <button key={c} onClick={() => set({ hairColor: c })}
                      style={{ width: '24px', height: '24px', background: c, border: `2px solid ${cfg.hairColor === c ? '#fff' : 'rgba(255,255,255,0.15)'}`, borderRadius: '5px', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={cfg.hairColor} onChange={e => set({ hairColor: e.target.value })}
                  style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR DES YEUX</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '7px' }}>
                  {EYE_COLORS.map(c => (
                    <button key={c} onClick={() => set({ eyeColor: c })}
                      style={{ width: '24px', height: '24px', background: c, border: `2px solid ${cfg.eyeColor === c ? '#fff' : 'rgba(255,255,255,0.15)'}`, borderRadius: '50%', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={cfg.eyeColor} onChange={e => set({ eyeColor: e.target.value })}
                  style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
              </div>
            </div>
          )}

          {/* TENUE */}
          {tab === 'tenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>TYPE DE TENUE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {OUTFITS.map(o => (
                    <button key={o.id} onClick={() => set({ outfit: o.id })}
                      style={{ padding: '8px 6px', background: cfg.outfit === o.id ? 'rgba(170,85,255,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.outfit === o.id ? 'rgba(170,85,255,0.45)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.12s' }}>
                      <span style={{ fontSize: '18px' }}>{o.icon}</span>
                      <span style={{ ...S, fontSize: '9px', color: cfg.outfit === o.id ? '#cc88ff' : '#666' }}>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR PRINCIPALE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                  {OUTFIT_COLORS.map(c => (
                    <button key={c} onClick={() => set({ outfitColor: c })}
                      style={{ width: '22px', height: '22px', background: c, border: `2px solid ${cfg.outfitColor === c ? '#fff' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={cfg.outfitColor} onChange={e => set({ outfitColor: e.target.value })}
                  style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '7px' }}>COULEUR SECONDAIRE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                  {OUTFIT_COLORS.map(c => (
                    <button key={c} onClick={() => set({ outfitColor2: c })}
                      style={{ width: '22px', height: '22px', background: c, border: `2px solid ${cfg.outfitColor2 === c ? '#fff' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={cfg.outfitColor2} onChange={e => set({ outfitColor2: e.target.value })}
                  style={{ width: '100%', height: '26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', padding: '2px' }} />
              </div>
            </div>
          )}

          {/* EQUIPEMENT */}
          {tab === 'equipement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '3px' }}>ARME / ÉQUIPEMENT</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {EQUIPMENTS.map(eq => (
                  <button key={eq.id} onClick={() => set({ equipment: eq.id })}
                    style={{ padding: '12px 8px', background: cfg.equipment === eq.id ? 'rgba(170,85,255,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.equipment === eq.id ? 'rgba(170,85,255,0.45)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '9px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.12s' }}>
                    <span style={{ fontSize: '22px' }}>{eq.icon}</span>
                    <span style={{ ...S, fontSize: '9px', color: cfg.equipment === eq.id ? '#cc88ff' : '#666' }}>{eq.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SAUVEGARDE */}
          {tab === 'sauvegarde' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '5px' }}>NOM DU PERSONNAGE</div>
                <input value={cfg.charName} onChange={e => set({ charName: e.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '8px 10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '5px' }}>BIO (optionnel)</div>
                <textarea value={cfg.bio} onChange={e => set({ bio: e.target.value })} rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '8px 10px', color: '#ccc', fontSize: '11px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <button onClick={handleSave}
                style={{ padding: '10px', background: 'rgba(170,85,255,0.2)', border: '1px solid rgba(170,85,255,0.4)', borderRadius: '9px', color: '#cc88ff', ...S, fontSize: '11px', cursor: 'pointer' }}>
                💾 Sauvegarder le personnage
              </button>
              {saveMsg && <div style={{ color: '#44ff88', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}>{saveMsg}</div>}

              <button onClick={() => { if (confirm('Nouveau personnage ?')) setCfg(DEFAULT_CFG) }}
                style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#555', ...S, fontSize: '10px', cursor: 'pointer' }}>
                ✨ Nouveau personnage
              </button>

              {savedChars.length > 0 && (
                <div>
                  <div style={{ color: '#444', ...S, fontSize: '9px', marginBottom: '6px' }}>PERSONNAGES SAUVEGARDÉS ({savedChars.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {savedChars.map(c => (
                      <div key={c.charName} style={{ display: 'flex', gap: '6px', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', alignItems: 'center' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.skinColor, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#ccc' }}>{c.charName}</div>
                          <div style={{ fontSize: '9px', color: '#444' }}>{RACES.find(r => r.id === c.race)?.label} · {OUTFITS.find(o => o.id === c.outfit)?.label}</div>
                        </div>
                        <button onClick={() => loadChar(c)} style={{ background: 'rgba(170,85,255,0.15)', border: '1px solid rgba(170,85,255,0.3)', borderRadius: '5px', color: '#aa55ff', fontSize: '9px', fontWeight: 700, cursor: 'pointer', padding: '3px 7px' }}>Charger</button>
                        <button onClick={() => deleteChar(c.charName)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: 3D PREVIEW ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Character info bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060912', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ fontSize: '28px' }}>{RACES.find(r => r.id === cfg.race)?.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#e8e8f0' }}>{cfg.charName || 'Personnage sans nom'}</div>
            <div style={{ fontSize: '11px', color: '#555', display: 'flex', gap: '10px', marginTop: '2px' }}>
              <span>{RACES.find(r => r.id === cfg.race)?.label}</span>
              <span>·</span>
              <span>{BODY_TYPES.find(b => b.id === cfg.bodyType)?.label}</span>
              <span>·</span>
              <span>{OUTFITS.find(o => o.id === cfg.outfit)?.label}</span>
              <span>·</span>
              <span>{EQUIPMENTS.find(e => e.id === cfg.equipment)?.label}</span>
            </div>
            {cfg.bio && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', fontStyle: 'italic' }}>{cfg.bio.slice(0, 80)}{cfg.bio.length > 80 ? '...' : ''}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: cfg.hairStyle, color: cfg.hairColor },
              { label: 'Yeux', color: cfg.eyeColor },
              { label: 'Tenue', color: cfg.outfitColor },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: `${color}22`, border: `1px solid ${color}44`, borderRadius: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '10px', color: '#888' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }} style={{ width: '100%', height: '100%' }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
            <directionalLight position={[-5, 3, -3]} intensity={0.3} />
            <pointLight position={[0, 3, 2]} intensity={0.5} color="#aa55ff" />

            {/* Platform */}
            <mesh position={[0, -1.05, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[2.5, 64]} />
              <meshStandardMaterial color="#0a0e1a" roughness={0.9} />
            </mesh>
            <mesh position={[0, -1.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.3, 2.6, 64]} />
              <meshStandardMaterial color={cfg.outfitColor} transparent opacity={0.25} />
            </mesh>

            <Character3D cfg={cfg} />
            <OrbitControls target={[0, 0.5, 0]} maxDistance={8} minDistance={1.5} enablePan={false} />
          </Canvas>

          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(3,6,9,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', padding: '5px 14px', fontSize: '9px', color: '#444', whiteSpace: 'nowrap' }}>
              🖱️ Clic droit drag = orbiter · Molette = zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterCreator
