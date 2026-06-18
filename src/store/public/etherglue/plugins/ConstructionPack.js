// ============================================================
//  EtherGlue — ConstructionPack Plugin ULTRA
//  Props construction + outils grille / vision / détection
// ============================================================

import { GridTool } from '../tools/GridTool.js'
import { VisionTool } from '../tools/VisionTool.js'
import { DetectionTool } from '../tools/DetectionTool.js'

const STRUCTURE_PROPS = [
  ['floor-tile', 'Floor Tile', '▦', [2, 0.16, 2], '#2f3a4d', 0],
  ['foundation-block', 'Foundation Block', '▰', [2.4, 0.55, 1.2], '#677080', 0],
  ['concrete-wall', 'Concrete Wall', '▤', [3, 2, 0.28], '#8e939c', 0],
  ['half-wall', 'Half Wall', '▥', [3, 1, 0.24], '#7c8490', 0],
  ['roof-slab', 'Roof Slab', '▔', [3.2, 0.22, 2.2], '#596272', 0],
  ['steel-beam', 'Steel Beam', '═', [3.4, 0.22, 0.22], '#293241', 0],
  ['steel-column', 'Steel Column', '┃', [0.32, 2.8, 0.32], '#293241', 0],
  ['gold-pillar', 'Gold Pillar', '┃', [0.44, 2.8, 0.44], '#c9a84c', 0],
  ['glass-panel', 'Glass Panel', '▥', [2.2, 1.6, 0.08], '#7dd3fc', 0],
  ['door-frame', 'Door Frame', '∩', [1.5, 2.25, 0.18], '#1a2535', 0],
  ['window-frame', 'Window Frame', '▣', [1.7, 1.15, 0.12], '#111827', 0],
  ['railing', 'Railing', '╫', [2.5, 0.85, 0.12], '#334155', 0],
  ['catwalk', 'Catwalk', '▱', [3.0, 0.16, 0.9], '#3d4658', 0],
  ['ramp-wide', 'Wide Ramp', '◢', [3.2, 0.22, 1.9], '#4a5568', 0],
  ['stair-block', 'Stair Block', '▟', [1.4, 0.42, 0.85], '#6b7280', 0],
  ['scaffold-plank', 'Scaffold Plank', '═', [3.5, 0.12, 0.45], '#8a5a2b', 0],
  ['truss', 'Truss', '△', [3.0, 0.28, 0.24], '#2f3a4d', 0],
]

const URBAN_PROPS = [
  ['road-segment', 'Road Segment', '▭', [4, 0.08, 2.4], '#151820', 0],
  ['sidewalk-slab', 'Sidewalk Slab', '▤', [3.2, 0.12, 1.2], '#8f939a', 0],
  ['traffic-cone', 'Traffic Cone', '▲', [0.45, 0.9, 0.45], '#ff7a1a', 1],
  ['construction-barrier', 'Barrier', '▨', [2.4, 0.9, 0.16], '#ffb020', 0],
  ['bollard', 'Bollard', '●', [0.24, 1.0, 0.24], '#334155', 1],
  ['street-light', 'Street Light', '✦', [0.18, 4.5, 0.18], '#1a2030', 1],
  ['road-sign', 'Road Sign', '⬢', [1.0, 1.6, 0.12], '#1d4ed8', 0],
  ['bench', 'Bench', '▰', [2.2, 0.55, 0.65], '#2d1f0e', 0],
  ['planter', 'Planter', '▣', [1.0, 0.55, 0.7], '#2d1f0e', 0],
  ['trash-bin', 'Trash Bin', '▥', [0.62, 0.9, 0.62], '#1f2937', 0],
]

const INTERIOR_PROPS = [
  ['sofa', 'Sofa', '▰', [1.8, 0.65, 0.8], '#2d1f0e', 0],
  ['table', 'Table', '▤', [1.5, 0.75, 0.9], '#8a5a2b', 0],
  ['chair', 'Chair', '▣', [0.65, 1.0, 0.65], '#3b2a18', 0],
  ['counter', 'Counter', '▰', [2.4, 1.0, 0.75], '#111827', 0],
  ['shelf', 'Shelf', '▤', [2.0, 1.4, 0.35], '#2d1f0e', 0],
  ['bed', 'Bed', '▰', [1.9, 0.55, 1.3], '#1a3a6b', 0],
  ['cabinet', 'Cabinet', '▥', [0.95, 1.45, 0.45], '#1f2937', 0],
  ['mirror', 'Mirror', '▯', [0.9, 1.7, 0.06], '#c0e7ff', 0],
  ['ceiling-lamp', 'Ceiling Lamp', '✦', [0.5, 0.18, 0.5], '#ffd580', 1],
]

const SCIFI_PROPS = [
  ['neon-sign', 'Neon Sign', '≋', [2.4, 0.48, 0.08], '#7dd3fc', 0],
  ['holo-cube', 'Holo Cube', '◇', [1, 1, 1], '#7dd3fc', 0],
  ['energy-core', 'Energy Core', '◎', [0.9, 0.9, 0.9], '#7b6fff', 2],
  ['shield-panel', 'Shield Panel', '⬡', [2.2, 1.5, 0.08], '#44ccff', 0],
  ['spawn-pad', 'Spawn Pad', '⬡', [1.8, 0.16, 1.8], '#7b6fff', 1],
  ['neural-node', 'Neural Node', '◉', [0.7, 0.7, 0.7], '#a78bfa', 2],
  ['laser-strip', 'Laser Strip', '━', [3.4, 0.08, 0.08], '#ff4488', 0],
]

function materialFor(color, type) {
  const neon = ['neon-sign', 'energy-core', 'shield-panel', 'spawn-pad', 'neural-node', 'laser-strip', 'ceiling-lamp', 'street-light'].includes(type)
  const glass = ['glass-panel', 'shield-panel', 'mirror', 'holo-cube'].includes(type)
  const metal = ['steel-beam', 'steel-column', 'gold-pillar', 'bollard', 'street-light', 'counter'].includes(type)
  return {
    color,
    roughness: glass ? 0.05 : metal ? 0.24 : 0.72,
    metalness: glass ? 0.12 : metal ? 0.82 : 0.08,
    transparent: glass,
    opacity: glass ? 0.36 : 1,
    emissive: neon ? color : undefined,
    emissiveIntensity: neon ? 0.9 : 0
  }
}

function registerList(factory, list, category) {
  list.forEach(([id, label, icon, size, color, shape]) => {
    factory.register(id, {
      label,
      icon,
      category,
      geometry: shape === 1 ? 'cylinder' : shape === 2 ? 'sphere' : 'box',
      radius: shape ? Math.max(size[0], size[2]) * 0.5 : undefined,
      height: size[1],
      size,
      mass: category === 'structure' || id.includes('road') || id.includes('sidewalk') ? 0 : 1,
      material: materialFor(color, id),
      description: `${label} — ${category}`
    })
  })
}

export function ConstructionPackPlugin(game) {
  const factory = game.propFactory

  registerList(factory, STRUCTURE_PROPS, 'structure')
  registerList(factory, URBAN_PROPS, 'urban')
  registerList(factory, INTERIOR_PROPS, 'interior')
  registerList(factory, SCIFI_PROPS, 'sci-fi')

  const gridTool = game.tools.register(new GridTool({ game }))
  game.gridTool = gridTool
  game.grid = { enabled: true, size: gridTool.size }
  game.tools.register(new VisionTool({ game }))
  game.tools.register(new DetectionTool({ game }))

  game.ui?.registerGroup?.('Structure', STRUCTURE_PROPS.map(([id]) => id))
  game.ui?.registerGroup?.('Urbain', URBAN_PROPS.map(([id]) => id))
  game.ui?.registerGroup?.('Intérieur', INTERIOR_PROPS.map(([id]) => id))
  game.ui?.registerGroup?.('Sci-Fi', SCIFI_PROPS.map(([id]) => id))

  game.emit('constructionpack.ready', {
    props: factory.list().length,
    tools: ['grid', 'vision', 'detect']
  })

  return {
    id: 'construction-pack-ultra',
    name: 'Construction Pack Ultra',
    version: '3.0.0',
    description: 'Props construction, urbain, intérieur, sci-fi + outils grille, vision et détection'
  }
}

export default ConstructionPackPlugin
