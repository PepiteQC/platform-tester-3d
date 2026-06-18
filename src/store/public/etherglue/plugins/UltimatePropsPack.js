// ============================================================
//  EtherGlue — Ultimate Props Pack 500
//  GMod/Sandbox + EtherWorld RP officiel TroxT
// ============================================================

const VERSION = '1.0.0'
const TARGET_COUNT = 500

const CATEGORIES = [
  {
    key: 'gmod-sandbox',
    prefix: 'ewgmod',
    label: 'GMod Sandbox',
    count: 110,
    icon: '▣',
    mass: [1, 12],
    colors: ['#8a5a2b', '#334155', '#64748b', '#4b5563', '#1f2937', '#7f5539'],
    base: ['crate', 'barrel', 'plank', 'pipe', 'sheet-metal', 'cinder-block', 'pallet', 'wheel', 'tank', 'wood-box', 'metal-box', 'sandbag', 'traffic-drum', 'tool-case', 'junk-panel'],
    geometry: ['box', 'cylinder', 'box', 'cylinder', 'box', 'box', 'box', 'cylinder', 'cylinder', 'box']
  },
  {
    key: 'construction',
    prefix: 'ewbuild',
    label: 'Construction',
    count: 110,
    icon: '▤',
    mass: [0, 4],
    colors: ['#8e939c', '#596272', '#2f3a4d', '#c9a84c', '#4a5568', '#a1a1aa'],
    base: ['wall', 'floor', 'roof', 'beam', 'column', 'stair', 'ramp', 'truss', 'railing', 'door-frame', 'window-frame', 'foundation', 'catwalk', 'scaffold', 'glass-wall'],
    geometry: ['box', 'box', 'box', 'box', 'cylinder', 'box', 'box', 'box', 'box', 'box', 'box', 'box']
  },
  {
    key: 'etherworld-rp',
    prefix: 'ewrp',
    label: 'EtherWorld RP',
    count: 100,
    icon: '⬡',
    mass: [0, 3],
    colors: ['#7dd3fc', '#c9a84c', '#111827', '#1a3a6b', '#8b1a1a', '#2d1f0e'],
    base: ['apartment-keypad', 'security-gate', 'lobby-terminal', 'shop-display', 'cash-register', 'rp-document', 'bank-terminal', 'police-crate', 'ems-kit', 'mechanic-lift', 'taxi-meter', 'concierge-desk', 'mailbox', 'elevator-panel', 'wardrobe'],
    geometry: ['box', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'box']
  },
  {
    key: 'urban-street',
    prefix: 'ewstreet',
    label: 'Urban Street',
    count: 70,
    icon: '▭',
    mass: [0, 6],
    colors: ['#151820', '#8f939a', '#ff7a1a', '#ffb020', '#334155', '#1d4ed8'],
    base: ['road-segment', 'sidewalk', 'curb', 'street-light', 'bollard', 'bench', 'trash-bin', 'planter', 'bus-stop', 'hydrant', 'road-sign', 'traffic-cone', 'barrier', 'manhole', 'parking-meter'],
    geometry: ['box', 'box', 'box', 'cylinder', 'cylinder', 'box', 'cylinder', 'box', 'box', 'cylinder']
  },
  {
    key: 'interior-luxury',
    prefix: 'ewhome',
    label: 'Interior Luxury',
    count: 70,
    icon: '▰',
    mass: [0, 3],
    colors: ['#2d1f0e', '#d6c5aa', '#111827', '#c9a84c', '#7dd3fc', '#1d3557'],
    base: ['sofa', 'chair', 'coffee-table', 'bed', 'wardrobe', 'mirror', 'kitchen-counter', 'lamp', 'rug', 'plant', 'shelf', 'tv-panel', 'fridge', 'bath-sink', 'office-desk'],
    geometry: ['box', 'box', 'box', 'box', 'box', 'box', 'box', 'cylinder', 'box', 'cylinder']
  },
  {
    key: 'troxt-scifi',
    prefix: 'ewtroxt',
    label: 'TroxT Sci-Fi',
    count: 40,
    icon: '◈',
    mass: [0, 2],
    colors: ['#7b6fff', '#7dd3fc', '#44cc88', '#ff4488', '#c9a84c', '#0f172a'],
    base: ['neural-node', 'holo-cube', 'energy-core', 'shield-panel', 'laser-strip', 'troxt-relay', 'memory-orb', 'portal-ring', 'ai-console', 'quantum-cell', 'scanner-pillar', 'data-crate'],
    geometry: ['sphere', 'box', 'sphere', 'box', 'box', 'cylinder', 'sphere', 'cylinder', 'box', 'sphere']
  }
]

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function seeded(index, salt = 1) {
  const x = Math.sin(index * 92821.17 + salt * 131.77) * 43758.5453
  return x - Math.floor(x)
}

function pick(list, index, salt = 1) {
  return list[Math.floor(seeded(index, salt) * list.length) % list.length]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function sizeFor(category, baseName, geometry, index) {
  const r = seeded(index, 9)
  if (geometry === 'sphere') {
    const radius = lerp(0.35, 0.95, r)
    return { size: [radius * 2, radius * 2, radius * 2], radius }
  }
  if (geometry === 'cylinder') {
    const radius = lerp(0.12, category.key === 'urban-street' ? 0.45 : 0.7, r)
    const height = baseName.includes('light') || baseName.includes('pillar') || baseName.includes('column') ? lerp(2.2, 5.4, r) : lerp(0.65, 1.8, seeded(index, 11))
    return { size: [radius * 2, height, radius * 2], radius, height }
  }

  let sx = lerp(0.45, 2.8, r)
  let sy = lerp(0.18, 2.1, seeded(index, 12))
  let sz = lerp(0.18, 2.4, seeded(index, 13))

  if (baseName.includes('wall')) { sx = lerp(2.0, 4.2, r); sy = lerp(1.2, 3.2, seeded(index, 12)); sz = 0.16 }
  if (baseName.includes('floor') || baseName.includes('road') || baseName.includes('sidewalk')) { sx = lerp(2.2, 5.0, r); sy = 0.1; sz = lerp(1.2, 3.2, seeded(index, 13)) }
  if (baseName.includes('beam') || baseName.includes('strip') || baseName.includes('plank') || baseName.includes('pipe')) { sx = lerp(2.4, 5.2, r); sy = lerp(0.08, 0.32, seeded(index, 12)); sz = lerp(0.08, 0.42, seeded(index, 13)) }
  if (baseName.includes('desk') || baseName.includes('counter') || baseName.includes('table')) { sx = lerp(1.2, 3.2, r); sy = lerp(0.55, 1.1, seeded(index, 12)); sz = lerp(0.6, 1.3, seeded(index, 13)) }
  if (baseName.includes('sofa') || baseName.includes('bed')) { sx = lerp(1.5, 2.8, r); sy = lerp(0.45, 0.85, seeded(index, 12)); sz = lerp(0.8, 1.8, seeded(index, 13)) }

  return { size: [Number(sx.toFixed(2)), Number(sy.toFixed(2)), Number(sz.toFixed(2))] }
}

function materialFor(category, baseName, index) {
  const color = pick(category.colors, index, 2)
  const emissive = category.key === 'troxt-scifi' || baseName.includes('neon') || baseName.includes('laser') || baseName.includes('energy') || baseName.includes('holo')
  const glass = baseName.includes('glass') || baseName.includes('mirror') || baseName.includes('shield') || baseName.includes('holo')
  const metal = baseName.includes('steel') || baseName.includes('beam') || baseName.includes('column') || baseName.includes('terminal') || baseName.includes('console') || baseName.includes('gate')
  return {
    color,
    roughness: glass ? 0.05 : metal ? lerp(0.18, 0.42, seeded(index, 3)) : lerp(0.55, 0.92, seeded(index, 4)),
    metalness: glass ? 0.12 : metal ? lerp(0.55, 0.95, seeded(index, 5)) : lerp(0.02, 0.18, seeded(index, 6)),
    transparent: glass,
    opacity: glass ? lerp(0.28, 0.58, seeded(index, 7)) : 1,
    emissive: emissive ? color : undefined,
    emissiveIntensity: emissive ? lerp(0.35, 1.45, seeded(index, 8)) : 0
  }
}

function buildDefinition(category, localIndex, globalIndex) {
  const baseName = category.base[localIndex % category.base.length]
  const geometry = category.geometry[localIndex % category.geometry.length]
  const variant = String(localIndex + 1).padStart(3, '0')
  const id = `${category.prefix}-${slug(baseName)}-${variant}`
  const sizing = sizeFor(category, baseName, geometry, globalIndex)
  const mass = Math.round(lerp(category.mass[0], category.mass[1], seeded(globalIndex, 20)) * 10) / 10
  const label = `${category.label} ${baseName.replace(/-/g, ' ')} ${variant}`

  return {
    id,
    definition: {
      label,
      icon: category.icon,
      category: category.key,
      geometry,
      physicsShape: geometry === 'cone' ? 'box' : geometry,
      size: sizing.size,
      radius: sizing.radius,
      height: sizing.height,
      mass,
      material: materialFor(category, baseName, globalIndex),
      description: `TroxT EtherWorld Ultimate Prop — ${label}`,
      metadata: {
        pack: 'ultimate-props-500',
        official: true,
        family: category.label,
        variant: localIndex + 1
      }
    }
  }
}

export function UltimatePropsPackPlugin(game) {
  const factory = game.propFactory
  const registered = []
  let globalIndex = 0

  for (const category of CATEGORIES) {
    const ids = []
    for (let i = 0; i < category.count; i++) {
      const { id, definition } = buildDefinition(category, i, globalIndex++)
      factory.register(id, definition)
      ids.push(id)
      registered.push(id)
    }
    game.ui?.registerGroup?.(`Ultimate/${category.label}`, ids)
  }

  const total = registered.length
  if (total !== TARGET_COUNT) {
    console.warn(`[UltimatePropsPack] Expected ${TARGET_COUNT}, got ${total}`)
  }

  game.emit('ultimateprops.ready', {
    pack: 'ultimate-props-500',
    version: VERSION,
    total,
    categories: CATEGORIES.map(category => ({ key: category.key, label: category.label, count: category.count }))
  })

  return {
    id: 'ultimate-props-500',
    name: 'TroxT EtherWorld Ultimate Props 500',
    version: VERSION,
    description: '500 props GMod/Sandbox + EtherWorld RP générés procéduralement, optimisés pour EtherGlue',
    total,
    categories: CATEGORIES.map(category => category.key)
  }
}

export default UltimatePropsPackPlugin
