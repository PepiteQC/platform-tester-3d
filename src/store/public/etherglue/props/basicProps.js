// ============================================================
//  EtherGlue — Basic Props
// ============================================================

export function registerBasicProps(factory) {
  factory.register('crate', {
    label: 'Crate', icon: '▣', category: 'basic', geometry: 'box', size: [1, 1, 1], mass: 4,
    material: { color: '#8a5a2b', roughness: 0.82, metalness: 0.02 }, description: 'Caisse physique polyvalente'
  })
  factory.register('barrel', {
    label: 'Barrel', icon: '◉', category: 'basic', geometry: 'cylinder', radius: 0.42, height: 1.1, size: [0.84, 1.1, 0.84], mass: 3,
    material: { color: '#334155', roughness: 0.55, metalness: 0.35 }, description: 'Baril cylindrique'
  })
  factory.register('concrete-wall', {
    label: 'Concrete Wall', icon: '▤', category: 'construction', geometry: 'box', size: [3, 2, 0.28], mass: 0,
    material: { color: '#8e939c', roughness: 0.88, metalness: 0.03 }, description: 'Mur béton statique'
  })
  factory.register('ramp', {
    label: 'Ramp', icon: '◢', category: 'construction', geometry: 'box', size: [3, 0.25, 1.8], mass: 0, rotation: [-0.28, 0, 0],
    material: { color: '#4a5568', roughness: 0.72, metalness: 0.2 }, description: 'Rampe de construction'
  })
  factory.register('glass-panel', {
    label: 'Glass Panel', icon: '▥', category: 'architecture', geometry: 'box', size: [2.2, 1.6, 0.08], mass: 0,
    material: { color: '#7dd3fc', transparent: true, opacity: 0.34, roughness: 0.04, metalness: 0.1 }, description: 'Panneau de verre'
  })
  factory.register('lamp', {
    label: 'Lamp', icon: '✦', category: 'lighting', geometry: 'cylinder', radius: 0.12, height: 1.6, size: [0.24, 1.6, 0.24], mass: 0,
    material: { color: '#c9a84c', emissive: '#ffcc66', emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.85 }, description: 'Lampe décorative'
  })
  factory.register('spawn-pad', {
    label: 'Spawn Pad', icon: '⬡', category: 'gameplay', geometry: 'cylinder', radius: 0.9, height: 0.16, size: [1.8, 0.16, 1.8], mass: 0,
    material: { color: '#7b6fff', emissive: '#3322aa', emissiveIntensity: 0.6, roughness: 0.24, metalness: 0.35 }, description: 'Pad de spawn holographique'
  })
}

export default registerBasicProps
