// ============================================================
//  ETHERWORLD CITY BUILDINGS — APARTMENTS + BOUTIQUE STREET
//  Additif uniquement : ne modifie pas public/game.js
// ============================================================
import * as THREE from 'three'

const VERSION = '1.1.0'
const GROUP_NAME = 'EtherWorld_City_Block'
const POLL_MS = 300
const MAX_POLL_TRIES = 80

const CITY_DATA = Object.freeze({
  district: 'EtherPrism / Platform Tester 3D',
  street: 'Rue Éther QC',
  buildings: [
    {
      id: 'residence-ether-montreal',
      type: 'apartment_building',
      name: 'Résidence Éther — Bloc Montréal',
      floors: 6,
      unitsPerFloor: 4,
      tags: ['residential', 'elevator', 'lobby', 'windows', 'interior', 'cutaway', 'quebec']
    },
    {
      id: 'boutique-ether-quebec',
      type: 'clothing_store',
      name: 'Boutique Éther — Québec',
      tags: ['retail', 'clothing', 'brands', 'showcase', 'quebec']
    }
  ]
})

const PALETTE = Object.freeze({
  sky: 0x050810,
  asphalt: 0x151820,
  sidewalk: 0x8f939a,
  concrete: 0x777f8e,
  concreteDark: 0x394150,
  concreteLight: 0xa8afba,
  glass: 0x7dd3fc,
  frame: 0x111a28,
  gold: 0xc9a84c,
  warm: 0xffd580,
  sign: 0x090d16,
  boutiqueAccent: 0xa78bfa,
  wood: 0x2d1f0e,
  clothRed: 0xcc2222,
  clothBlue: 0x1a3a6b,
  clothBrown: 0x5c3317,
  clothGreen: 0x1f4d2c
})

const state = {
  group: null,
  game: null,
  scene: null,
  textures: null,
  materials: null,
  windows: [],
  lights: [],
  pollTimer: null,
  tries: 0,
  patchedAdmin: false,
  autoAdded: false
}

function log(message, level = 'info') {
  const prefix = '[EtherCity]'
  if (level === 'error') console.error(prefix, message)
  else if (level === 'warning') console.warn(prefix, message)
  else console.log(prefix, message)

  if (window.troxtAdmin?.log) {
    try { window.troxtAdmin.log(`City: ${message}`, level) } catch {}
  }
}

function emit(type, payload = {}) {
  const detail = {
    source: 'ether-city-buildings',
    version: VERSION,
    type,
    timestamp: Date.now(),
    payload
  }
  window.dispatchEvent(new CustomEvent('etherworld:city:event', { detail }))
  window.dispatchEvent(new CustomEvent('troxt:city:event', { detail }))
  return detail
}

function makeCanvas(size = 256, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  return canvas
}

function noise(ctx, size, count, alpha, light = true) {
  for (let i = 0; i < count; i++) {
    const v = Math.floor(light ? 180 + Math.random() * 70 : Math.random() * 80)
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }
}

function textureFromCanvas(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 8
  return texture
}

function getTextures() {
  if (state.textures) return state.textures

  const concrete = textureFromCanvas(makeCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#747b87'
    ctx.fillRect(0, 0, size, size)
    noise(ctx, size, 7200, 0.045, true)
    noise(ctx, size, 3600, 0.05, false)
    ctx.strokeStyle = 'rgba(0,0,0,.16)'
    ctx.lineWidth = 1
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }
    for (let i = 0; i < 28; i++) {
      ctx.beginPath()
      let x = Math.random() * size
      let y = Math.random() * size
      ctx.moveTo(x, y)
      for (let s = 0; s < 8; s++) {
        x += (Math.random() - 0.5) * 26
        y += (Math.random() - 0.5) * 26
        ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`
      ctx.lineWidth = 0.5 + Math.random() * 0.8
      ctx.stroke()
    }
  }), 4, 4)

  const asphalt = textureFromCanvas(makeCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#151820'
    ctx.fillRect(0, 0, size, size)
    noise(ctx, size, 9000, 0.08, true)
    noise(ctx, size, 5000, 0.08, false)
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const r = 0.5 + Math.random() * 2.5
      ctx.fillStyle = `rgba(80,78,72,${0.12 + Math.random() * 0.2})`
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
  }), 10, 4)

  const marble = textureFromCanvas(makeCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#c9b995'
    ctx.fillRect(0, 0, size, size)
    noise(ctx, size, 2400, 0.05, true)
    ctx.lineCap = 'round'
    for (let i = 0; i < 45; i++) {
      ctx.beginPath()
      let x = Math.random() * size
      let y = Math.random() * size
      ctx.moveTo(x, y)
      for (let s = 0; s < 12; s++) {
        x += (Math.random() - 0.35) * 34
        y += (Math.random() - 0.5) * 18
        ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(70,50,30,${0.04 + Math.random() * 0.12})`
      ctx.lineWidth = 0.5 + Math.random() * 1.8
      ctx.stroke()
    }
  }), 3, 2)

  const storeWall = textureFromCanvas(makeCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#1a1f2e'
    ctx.fillRect(0, 0, size, size)
    noise(ctx, size, 4200, 0.04, true)
    noise(ctx, size, 2200, 0.04, false)
  }), 2, 2)

  const wood = textureFromCanvas(makeCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#2d1f0e'
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 6) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`
      ctx.fillRect(0, y, size, 1 + Math.random() * 2)
    }
    for (let i = 0; i < 20; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * size, 0)
      ctx.bezierCurveTo(Math.random() * size, size * 0.3, Math.random() * size, size * 0.7, Math.random() * size, size)
      ctx.strokeStyle = `rgba(201,168,76,${0.05 + Math.random() * 0.08})`
      ctx.stroke()
    }
  }), 2, 2)

  state.textures = { concrete, asphalt, marble, storeWall, wood }
  return state.textures
}

function mat(key, params) {
  const materials = getMaterials()
  if (!materials[key]) materials[key] = new THREE.MeshStandardMaterial(params)
  return materials[key]
}

function getMaterials() {
  if (state.materials) return state.materials
  const t = getTextures()
  state.materials = {
    asphalt: new THREE.MeshStandardMaterial({ map: t.asphalt, color: PALETTE.asphalt, roughness: 0.96 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: t.concrete, color: PALETTE.sidewalk, roughness: 0.86 }),
    concrete: new THREE.MeshStandardMaterial({ map: t.concrete, color: PALETTE.concrete, roughness: 0.86, metalness: 0.03 }),
    concreteDark: new THREE.MeshStandardMaterial({ map: t.concrete, color: PALETTE.concreteDark, roughness: 0.9 }),
    concreteLight: new THREE.MeshStandardMaterial({ map: t.concrete, color: PALETTE.concreteLight, roughness: 0.82 }),
    marble: new THREE.MeshStandardMaterial({ map: t.marble, color: 0xe2cfa8, roughness: 0.18, metalness: 0.12 }),
    storeWall: new THREE.MeshStandardMaterial({ map: t.storeWall, color: 0x222a3c, roughness: 0.75 }),
    wood: new THREE.MeshStandardMaterial({ map: t.wood, color: PALETTE.wood, roughness: 0.55 }),
    frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.18, metalness: 0.84 }),
    glass: new THREE.MeshStandardMaterial({ color: PALETTE.glass, transparent: true, opacity: 0.26, roughness: 0.03, metalness: 0.08, depthWrite: false }),
    gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.14, metalness: 0.9 }),
    sign: new THREE.MeshStandardMaterial({ color: PALETTE.sign, roughness: 0.18, metalness: 0.4 }),
    neon: new THREE.MeshStandardMaterial({ color: PALETTE.boutiqueAccent, emissive: PALETTE.boutiqueAccent, emissiveIntensity: 0.8, roughness: 0.3 }),
    warmLight: new THREE.MeshStandardMaterial({ color: PALETTE.warm, emissive: PALETTE.warm, emissiveIntensity: 1.1, roughness: 0.22 }),
    redCloth: new THREE.MeshStandardMaterial({ color: PALETTE.clothRed, roughness: 0.82 }),
    blueCloth: new THREE.MeshStandardMaterial({ color: PALETTE.clothBlue, roughness: 0.82 }),
    brownCloth: new THREE.MeshStandardMaterial({ color: PALETTE.clothBrown, roughness: 0.82 }),
    greenCloth: new THREE.MeshStandardMaterial({ color: PALETTE.clothGreen, roughness: 0.82 })
  }
  return state.materials
}

function box(group, material, size, position, options = {}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2], options.ws || 1, options.hs || 1, options.ds || 1)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (options.rotation) mesh.rotation.set(options.rotation[0] || 0, options.rotation[1] || 0, options.rotation[2] || 0)
  mesh.castShadow = options.castShadow !== false
  mesh.receiveShadow = options.receiveShadow !== false
  if (options.name) mesh.name = options.name
  if (options.userData) mesh.userData = { ...options.userData }
  group.add(mesh)
  return mesh
}

function cyl(group, material, radius, height, position, options = {}) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, options.segments || 12, options.heightSegments || 1)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (options.rotation) mesh.rotation.set(options.rotation[0] || 0, options.rotation[1] || 0, options.rotation[2] || 0)
  mesh.castShadow = options.castShadow !== false
  mesh.receiveShadow = options.receiveShadow !== false
  group.add(mesh)
  return mesh
}

function addTextSprite(group, text, position, options = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = options.background || 'rgba(9,13,22,.86)'
  ctx.roundRect?.(16, 20, 480, 88, 18)
  if (ctx.roundRect) ctx.fill()
  else ctx.fillRect(16, 20, 480, 88)
  ctx.strokeStyle = options.border || 'rgba(201,168,76,.55)'
  ctx.lineWidth = 3
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(16, 20, 480, 88, 18); ctx.stroke() }
  ctx.fillStyle = options.color || '#c9a84c'
  ctx.font = `700 ${options.size || 34}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(position[0], position[1], position[2])
  sprite.scale.set(options.scaleX || 5.8, options.scaleY || 1.45, 1)
  sprite.userData.__cityDisposableTexture = texture
  group.add(sprite)
  return sprite
}

function createStreet(group) {
  const M = getMaterials()
  box(group, M.asphalt, [78, 0.08, 16], [0, 0.01, 34], { name: 'Rue Éther QC' })
  box(group, M.sidewalk, [78, 0.12, 5], [0, 0.08, 24.5])
  box(group, M.sidewalk, [78, 0.12, 5], [0, 0.08, 43.5])

  const lineMat = mat('streetLine', { color: 0xffd060, emissive: 0xffd060, emissiveIntensity: 0.25, roughness: 0.55 })
  for (let x = -34; x <= 34; x += 7) {
    box(group, lineMat, [3.2, 0.025, 0.18], [x, 0.12, 34])
  }

  const lampPost = mat('lampPost', { color: 0x141b28, roughness: 0.24, metalness: 0.85 })
  const lampBulb = getMaterials().warmLight
  for (const x of [-30, -18, -6, 6, 18, 30]) {
    for (const z of [25.8, 42.2]) {
      cyl(group, lampPost, 0.08, 5.2, [x, 2.6, z], { segments: 10 })
      box(group, lampPost, [1.25, 0.08, 0.08], [x + 0.58, 5.1, z])
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lampBulb)
      bulb.position.set(x + 1.18, 4.95, z)
      bulb.castShadow = true
      group.add(bulb)
      const light = new THREE.PointLight(PALETTE.warm, 0.75, 9)
      light.position.copy(bulb.position)
      group.add(light)
    }
  }
}

function createApartmentBuilding(group, origin = [-18, 0, 18]) {
  const M = getMaterials()
  const floors = 6
  const apts = 4
  const floorH = 3.45
  const width = 22
  const depth = 12
  const aptW = width / apts
  const totalH = floors * floorH + 1.35
  const ox = origin[0]
  const oy = origin[1]
  const oz = origin[2]

  const bGroup = new THREE.Group()
  bGroup.name = 'Résidence Éther — Bloc Montréal'
  bGroup.userData = { ...CITY_DATA.buildings[0], etherPrismEntity: true, hasFullInterior: true }
  bGroup.position.set(ox, oy, oz)
  group.add(bGroup)

  const interiorWall = mat('residenceInteriorWall', { color: 0xd8d2c4, roughness: 0.72, metalness: 0.02 })
  const warmWall = mat('residenceWarmWall', { color: 0xb9aa91, roughness: 0.78, metalness: 0.01 })
  const floorWood = mat('residenceFloorWood', { map: getTextures().wood, color: 0x7a5630, roughness: 0.58, metalness: 0.04 })
  const rugBlue = mat('residenceRugBlue', { color: 0x1d3557, roughness: 0.95 })
  const rugRed = mat('residenceRugRed', { color: 0x6f1d1b, roughness: 0.95 })
  const fabricCream = mat('residenceFabricCream', { color: 0xd6c5aa, roughness: 0.9 })
  const fabricDark = mat('residenceFabricDark', { color: 0x1a2030, roughness: 0.88 })
  const plantLeaf = mat('residencePlantLeaf', { color: 0x1f4d2c, roughness: 0.85 })
  const plantPot = mat('residencePlantPot', { color: 0x2d1f0e, roughness: 0.7, metalness: 0.08 })
  const artMat = mat('residenceWallArt', { color: 0x0f172a, roughness: 0.45, metalness: 0.12 })
  const lampMat = mat('residenceLampGlow', { color: PALETTE.warm, emissive: PALETTE.warm, emissiveIntensity: 1.2, roughness: 0.24 })
  const elevatorGlass = mat('residenceElevatorGlass', { color: PALETTE.glass, transparent: true, opacity: 0.22, roughness: 0.03, metalness: 0.1, depthWrite: false })

  function addPlant(parent, x, y, z, scale = 1) {
    cyl(parent, plantPot, 0.16 * scale, 0.28 * scale, [x, y + 0.14 * scale, z], { segments: 12 })
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const leaf = box(parent, plantLeaf, [0.045 * scale, 0.55 * scale, 0.045 * scale], [x + Math.cos(a) * 0.08 * scale, y + 0.5 * scale, z + Math.sin(a) * 0.08 * scale])
      leaf.rotation.x = (Math.random() - 0.5) * 0.7
      leaf.rotation.z = Math.sin(a) * 0.45
    }
  }

  function addPendant(parent, x, y, z, lit = true) {
    cyl(parent, M.gold, 0.018, 0.55, [x, y, z], { segments: 8 })
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), lampMat)
    bulb.position.set(x, y - 0.32, z)
    bulb.castShadow = true
    parent.add(bulb)
    const light = new THREE.PointLight(PALETTE.warm, lit ? 0.35 : 0, 3.6)
    light.position.copy(bulb.position)
    parent.add(light)
    return light
  }

  function addWallArt(parent, x, y, z, tone = 0) {
    const panel = box(parent, artMat, [0.7, 0.46, 0.035], [x, y, z])
    panel.userData.decorative = true
    const accent = mat(`artAccent${tone}`, { color: [0xc9a84c, 0x7dd3fc, 0xa78bfa, 0xffd580][tone % 4], emissive: [0x332000, 0x001926, 0x190026, 0x332000][tone % 4], emissiveIntensity: 0.18, roughness: 0.42 })
    box(parent, accent, [0.48, 0.045, 0.045], [x, y + 0.08, z + 0.025])
    box(parent, accent, [0.32, 0.045, 0.045], [x, y - 0.08, z + 0.025])
  }

  function addSofa(parent, x, y, z, material, rotation = 0) {
    const sofa = new THREE.Group()
    sofa.position.set(x, y, z)
    sofa.rotation.y = rotation
    parent.add(sofa)
    box(sofa, material, [1.15, 0.34, 0.54], [0, 0.32, 0])
    box(sofa, material, [1.15, 0.55, 0.12], [0, 0.55, -0.28])
    box(sofa, material, [0.14, 0.42, 0.55], [-0.65, 0.39, 0])
    box(sofa, material, [0.14, 0.42, 0.55], [0.65, 0.39, 0])
    box(sofa, fabricCream, [0.46, 0.08, 0.34], [-0.29, 0.55, 0.05])
    box(sofa, fabricCream, [0.46, 0.08, 0.34], [0.29, 0.55, 0.05])
  }

  function addBed(parent, x, y, z, accent, rotation = 0) {
    const bed = new THREE.Group()
    bed.position.set(x, y, z)
    bed.rotation.y = rotation
    parent.add(bed)
    box(bed, M.wood, [1.32, 0.22, 0.95], [0, 0.28, 0])
    box(bed, fabricCream, [1.2, 0.14, 0.82], [0, 0.48, 0.03])
    box(bed, accent, [1.2, 0.05, 0.38], [0, 0.59, 0.22])
    box(bed, fabricCream, [0.38, 0.09, 0.2], [-0.28, 0.64, -0.28])
    box(bed, fabricCream, [0.38, 0.09, 0.2], [0.28, 0.64, -0.28])
    box(bed, M.wood, [1.42, 0.64, 0.1], [0, 0.55, -0.52])
  }

  function addKitchen(parent, x, y, z, rotation = 0) {
    const kitchen = new THREE.Group()
    kitchen.position.set(x, y, z)
    kitchen.rotation.y = rotation
    parent.add(kitchen)
    box(kitchen, M.frame, [1.5, 0.6, 0.34], [0, 0.38, 0])
    box(kitchen, M.marble, [1.6, 0.08, 0.42], [0, 0.72, 0])
    box(kitchen, M.gold, [0.28, 0.04, 0.18], [-0.45, 0.78, 0.12])
    box(kitchen, mat('fridgeSteel', { color: 0xaab3c2, metalness: 0.7, roughness: 0.25 }), [0.42, 1.05, 0.34], [0.88, 0.64, 0])
    box(kitchen, mat('ovenBlack', { color: 0x080b10, metalness: 0.55, roughness: 0.18 }), [0.34, 0.3, 0.04], [0.15, 0.43, 0.21])
  }

  function addApartment(parent, f, a, x, y, lit) {
    const unit = new THREE.Group()
    unit.name = `Appartement Éther ${f}-${a}`
    unit.position.set(x, y - 1.18, 0.15)
    unit.userData = { type: 'apartment_interior', floor: f, apt: a }
    parent.add(unit)

    const roomW = aptW - 0.5
    const roomD = depth - 2.3
    const wallZ = -depth / 2 + 1.0
    const frontZ = depth / 2 - 0.85

    box(unit, floorWood, [roomW, 0.08, roomD], [0, 0.08, -0.3], { receiveShadow: true })
    box(unit, interiorWall, [roomW, floorH - 0.55, 0.08], [0, (floorH - 0.55) / 2, wallZ])
    box(unit, warmWall, [0.08, floorH - 0.7, roomD], [-roomW / 2, (floorH - 0.7) / 2, -0.25])
    box(unit, warmWall, [0.08, floorH - 0.7, roomD], [roomW / 2, (floorH - 0.7) / 2, -0.25])
    box(unit, M.concreteLight, [roomW, 0.08, roomD], [0, floorH - 0.32, -0.3])

    const accent = [rugBlue, rugRed, M.blueCloth, M.greenCloth][(f + a) % 4]
    box(unit, accent, [1.55, 0.035, 1.05], [-0.85, 0.14, frontZ - 1.1])
    addSofa(unit, -0.9, 0.02, frontZ - 1.45, (f + a) % 2 ? fabricDark : M.blueCloth, 0)
    addBed(unit, 1.1, 0.02, wallZ + 0.82, accent, Math.PI)
    addKitchen(unit, -1.35, 0.02, wallZ + 0.52, 0)
    box(unit, M.wood, [0.78, 0.06, 0.5], [-0.85, 0.5, frontZ - 0.78])
    cyl(unit, M.gold, 0.035, 0.48, [-1.15, 0.28, frontZ - 0.78], { segments: 8 })
    cyl(unit, M.gold, 0.035, 0.48, [-0.55, 0.28, frontZ - 0.78], { segments: 8 })
    addWallArt(unit, 0, floorH - 1.3, wallZ + 0.06, f * 4 + a)
    addPlant(unit, roomW / 2 - 0.45, 0.1, frontZ - 0.55, 0.75)
    addPendant(unit, 0, floorH - 0.62, -0.2, lit)

    // Corridor side with apartment door and lit signage.
    box(unit, M.frame, [0.8, 1.45, 0.08], [roomW / 2 - 0.52, 0.95, wallZ + 0.14])
    box(unit, M.gold, [0.18, 0.08, 0.055], [roomW / 2 - 0.22, 1.1, wallZ + 0.2])
  }

  // Structural shell built as walls/slabs instead of a solid box so the interior exists for real.
  box(bGroup, M.concreteDark, [width + 1.0, 0.48, depth + 1.0], [0, 0.24, 0])
  box(bGroup, M.concrete, [width + 0.55, totalH, 0.42], [0, totalH / 2, -depth / 2 - 0.05], { ws: 5, hs: 10, ds: 1 })
  box(bGroup, M.concrete, [0.42, totalH, depth + 0.35], [-width / 2 - 0.08, totalH / 2, 0], { hs: 10, ds: 3 })
  box(bGroup, M.concrete, [0.42, totalH, depth + 0.35], [width / 2 + 0.08, totalH / 2, 0], { hs: 10, ds: 3 })

  for (let f = 0; f <= floors; f++) {
    box(bGroup, M.concreteDark, [width + 0.7, 0.16, depth + 0.45], [0, f * floorH + 0.08, 0], { ws: 5, ds: 3 })
  }

  // Elegant vertical ribs and façade grid.
  for (let r = -2; r <= 2; r++) {
    const x = r * (width / 4)
    box(bGroup, M.concreteLight, [0.42, totalH + 0.35, 0.48], [x, totalH / 2, depth / 2 + 0.22], { hs: 10 })
  }
  box(bGroup, M.concreteDark, [width + 0.9, 0.42, depth + 0.9], [0, totalH + 0.18, 0])

  const glassBase = new THREE.Color(PALETTE.warm)
  for (let f = 0; f < floors; f++) {
    const y = f * floorH + floorH * 0.56
    for (let a = 0; a < apts; a++) {
      const x = -width / 2 + aptW * (a + 0.5)
      const lit = Math.random() > 0.32
      addApartment(bGroup, f, a, x, y, lit)

      box(bGroup, M.concretePanel || M.concrete, [aptW - 0.45, 0.34, 0.22], [x, y - 1.0, depth / 2 + 0.12])
      box(bGroup, M.concretePanel || M.concrete, [aptW - 0.45, 0.22, 0.22], [x, y + 1.0, depth / 2 + 0.12])

      const material = new THREE.MeshStandardMaterial({
        color: lit ? 0xffe3a0 : 0x172030,
        emissive: lit ? glassBase : new THREE.Color(0x05070d),
        emissiveIntensity: lit ? 0.62 : 0,
        transparent: true,
        opacity: 0.76,
        roughness: 0.05,
        metalness: 0.1,
        depthWrite: false
      })
      const win = box(bGroup, material, [3.72, 1.55, 0.1], [x, y, depth / 2 + 0.42], {
        name: `Apartment ${f}-${a}`,
        userData: { type: 'city_window', floor: f, apt: a, lit }
      })
      state.windows.push(win)
      box(bGroup, M.frame, [3.98, 0.08, 0.15], [x, y + 0.83, depth / 2 + 0.5])
      box(bGroup, M.frame, [3.98, 0.08, 0.15], [x, y - 0.83, depth / 2 + 0.5])
      box(bGroup, M.frame, [0.08, 1.7, 0.15], [x - 2.0, y, depth / 2 + 0.5])
      box(bGroup, M.frame, [0.08, 1.7, 0.15], [x + 2.0, y, depth / 2 + 0.5])
      box(bGroup, M.frame, [0.06, 1.58, 0.12], [x, y, depth / 2 + 0.52])
      box(bGroup, M.frame, [3.8, 0.05, 0.12], [x, y, depth / 2 + 0.52])

      const light = new THREE.PointLight(PALETTE.warm, lit ? 0.62 : 0, 7)
      light.position.set(x, y, depth / 2 - 1.35)
      bGroup.add(light)
      state.lights.push(light)
    }
  }

  // Luxe lobby with visible interior at street level.
  const lobbyZ = depth / 2 + 2.85
  box(bGroup, M.marble, [width * 0.92, 0.18, 4.5], [0, 0.12, lobbyZ])
  box(bGroup, M.glass, [width * 0.86, 3.35, 0.12], [0, 1.78, depth / 2 + 5.05])
  box(bGroup, M.frame, [width * 0.92, 0.2, 0.22], [0, 3.48, depth / 2 + 5.12])
  for (const x of [-width * 0.42, -width * 0.18, 0, width * 0.18, width * 0.42]) {
    box(bGroup, M.frame, [0.12, 3.35, 0.18], [x, 1.78, depth / 2 + 5.12])
  }
  box(bGroup, M.wood, [5.8, 0.95, 0.78], [-3.1, 0.6, lobbyZ - 1.05])
  box(bGroup, M.marble, [5.95, 0.08, 0.88], [-3.1, 1.11, lobbyZ - 1.05])
  for (let i = 0; i < 6; i++) box(bGroup, M.gold, [0.055, 0.82, 0.08], [-5.35 + i * 0.82, 0.62, lobbyZ - 0.62])
  addSofa(bGroup, 3.0, 0.03, lobbyZ - 0.85, fabricDark, 0)
  addSofa(bGroup, 3.0, 0.03, lobbyZ + 1.05, fabricDark, Math.PI)
  box(bGroup, rugRed, [4.0, 0.035, 2.15], [3.0, 0.19, lobbyZ + 0.08])
  addPlant(bGroup, -9.2, 0.12, lobbyZ + 1.45, 1.0)
  addPlant(bGroup, 9.2, 0.12, lobbyZ + 1.45, 1.0)

  const chandelierY = 3.42
  cyl(bGroup, M.gold, 0.025, 0.9, [0, chandelierY, lobbyZ], { segments: 8 })
  const chandelier = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), lampMat)
  chandelier.position.set(0, chandelierY - 0.62, lobbyZ)
  bGroup.add(chandelier)
  const lobbyLight = new THREE.PointLight(PALETTE.warm, 2.2, 13)
  lobbyLight.position.copy(chandelier.position)
  bGroup.add(lobbyLight)

  const elevatorX = width / 2 - 2.2
  box(bGroup, M.frame, [2.35, totalH + 2.0, 2.25], [elevatorX, (totalH + 2.0) / 2, depth / 2 + 2.2])
  box(bGroup, elevatorGlass, [1.55, 2.05, 0.08], [elevatorX, 1.45, depth / 2 + 1.08])
  box(bGroup, M.gold, [1.85, 0.12, 0.12], [elevatorX, totalH + 0.9, depth / 2 + 1.05])
  const elevatorCar = new THREE.Group()
  elevatorCar.name = 'Ascenseur panoramique Résidence Éther'
  elevatorCar.position.set(elevatorX, floorH * 2.2, depth / 2 + 2.22)
  bGroup.add(elevatorCar)
  box(elevatorCar, elevatorGlass, [1.5, 2.0, 1.45], [0, 0, 0])
  box(elevatorCar, M.gold, [1.65, 0.08, 1.55], [0, 1.04, 0])
  box(elevatorCar, M.gold, [1.65, 0.08, 1.55], [0, -1.04, 0])
  addPendant(elevatorCar, 0, 0.72, 0, true)

  // Rooftop details and luxury amenities.
  const roofY = totalH + 0.65
  box(bGroup, M.concreteDark, [width + 1.55, 1.0, depth + 1.55], [0, roofY, 0])
  box(bGroup, M.concrete, [width + 1.75, 1.15, 0.48], [0, roofY + 0.65, depth / 2 + 0.85])
  box(bGroup, M.concrete, [width + 1.75, 1.15, 0.48], [0, roofY + 0.65, -depth / 2 - 0.85])
  box(bGroup, M.concrete, [0.48, 1.15, depth + 1.75], [width / 2 + 0.85, roofY + 0.65, 0])
  box(bGroup, M.concrete, [0.48, 1.15, depth + 1.75], [-width / 2 - 0.85, roofY + 0.65, 0])
  box(bGroup, M.concreteLight, [5.4, 2.4, 3.8], [-3.2, roofY + 1.65, -1.1])
  cyl(bGroup, M.concreteDark, 0.72, 2.25, [-width / 2 + 2.4, roofY + 1.45, -depth / 2 + 2.0], { segments: 18 })
  box(bGroup, M.frame, [2.3, 0.82, 1.55], [4.5, roofY + 0.75, 1.8])
  box(bGroup, M.frame, [2.3, 0.82, 1.55], [7.3, roofY + 0.75, -1.8])
  for (const x of [-8, 8]) {
    addPlant(bGroup, x, roofY + 0.12, depth / 2 - 1.5, 1.1)
    box(bGroup, M.wood, [2.2, 0.16, 0.65], [x * 0.92, roofY + 0.24, 0.7])
  }

  addTextSprite(bGroup, 'RÉSIDENCE ÉTHER', [0, 4.55, depth / 2 + 5.25], { scaleX: 5.6, scaleY: 1.1, size: 30 })
  addTextSprite(bGroup, 'INTÉRIEURS COMPLETS', [0, totalH + 2.35, depth / 2 + 1.05], { scaleX: 4.8, scaleY: 0.95, size: 26, background: 'rgba(9,13,22,.74)' })
  return bGroup
}

function createClothesRack(group, x, z, rotation = 0) {
  const M = getMaterials()
  const rack = new THREE.Group()
  rack.position.set(x, 0, z)
  rack.rotation.y = rotation
  group.add(rack)

  cyl(rack, M.frame, 0.035, 1.45, [-1.2, 0.8, 0], { segments: 8 })
  cyl(rack, M.frame, 0.035, 1.45, [1.2, 0.8, 0], { segments: 8 })
  const bar = cyl(rack, M.frame, 0.035, 2.4, [0, 1.52, 0], { rotation: [0, 0, Math.PI / 2], segments: 8 })
  bar.castShadow = true

  const clothMats = [M.redCloth, M.blueCloth, M.brownCloth, M.greenCloth]
  for (let i = 0; i < 9; i++) {
    const gx = -1.0 + i * 0.25
    box(rack, clothMats[i % clothMats.length], [0.18, 0.52, 0.05], [gx, 1.18, 0.02])
    cyl(rack, M.gold, 0.012, 0.28, [gx, 1.46, 0], { rotation: [Math.PI / 2, 0, 0], segments: 6 })
  }
}

function createMannequin(group, x, z, colorMat, brand) {
  const M = getMaterials()
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  group.add(g)
  cyl(g, M.frame, 0.035, 1.2, [0, 0.65, 0], { segments: 8 })
  cyl(g, M.frame, 0.2, 0.05, [0, 0.03, 0], { segments: 16 })
  box(g, colorMat, [0.42, 0.55, 0.18], [0, 1.2, 0])
  box(g, colorMat, [0.34, 0.28, 0.16], [0, 0.86, 0])
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), mat('mannequinSkin', { color: 0xd5c7b4, roughness: 0.72 }))
  head.position.set(0, 1.68, 0)
  head.castShadow = true
  g.add(head)
  addTextSprite(g, brand, [0, 0.48, 0.28], { scaleX: 1.3, scaleY: 0.38, size: 42, background: 'rgba(9,13,22,.7)' })
}

function createBoutique(group, origin = [18, 0, 19]) {
  const M = getMaterials()
  const width = 19
  const depth = 11
  const height = 4.6
  const ox = origin[0]
  const oy = origin[1]
  const oz = origin[2]

  const bGroup = new THREE.Group()
  bGroup.name = 'Boutique Éther — Québec'
  bGroup.userData = { ...CITY_DATA.buildings[1], etherPrismEntity: true }
  bGroup.position.set(ox, oy, oz)
  group.add(bGroup)

  box(bGroup, M.storeWall, [width, height, depth], [0, height / 2, 0], { ws: 5, hs: 3, ds: 3 })
  box(bGroup, M.frame, [width + 0.4, 0.22, depth + 0.4], [0, height + 0.11, 0])
  box(bGroup, M.marble, [width, 0.14, depth], [0, 0.08, 0])

  // Glass facade and entrance facing the street.
  box(bGroup, M.frame, [width, height * 0.86, 0.18], [0, height * 0.48, depth / 2 + 0.1])
  box(bGroup, M.glass, [5.0, height * 0.72, 0.08], [-6.3, height * 0.43, depth / 2 + 0.22])
  box(bGroup, M.glass, [5.0, height * 0.72, 0.08], [6.3, height * 0.43, depth / 2 + 0.22])
  box(bGroup, M.glass, [2.2, height * 0.72, 0.08], [-1.25, height * 0.43, depth / 2 + 0.25])
  box(bGroup, M.glass, [2.2, height * 0.72, 0.08], [1.25, height * 0.43, depth / 2 + 0.25])
  box(bGroup, M.gold, [0.08, 0.55, 0.08], [-0.45, height * 0.42, depth / 2 + 0.34])
  box(bGroup, M.gold, [0.08, 0.55, 0.08], [0.45, height * 0.42, depth / 2 + 0.34])

  // Interior boutique details.
  createClothesRack(bGroup, -6.4, -3.4, 0)
  createClothesRack(bGroup, 0, -3.4, 0)
  createClothesRack(bGroup, 6.4, -3.4, 0)
  createClothesRack(bGroup, -5.2, 0.7, 0)
  createClothesRack(bGroup, 5.2, 0.7, 0)

  for (let x of [-3.5, 3.5]) {
    box(bGroup, M.wood, [2.4, 0.12, 1.25], [x, 0.85, 0.6])
    for (let i = 0; i < 6; i++) {
      const matList = [M.redCloth, M.blueCloth, M.brownCloth, M.greenCloth]
      box(bGroup, matList[i % matList.length], [0.42, 0.06, 0.34], [x - 0.72 + (i % 3) * 0.72, 0.95 + Math.floor(i / 3) * 0.08, 0.48 + Math.floor(i / 3) * 0.34])
    }
  }

  createMannequin(bGroup, -7.1, depth / 2 - 1.2, M.redCloth, 'NIKE')
  createMannequin(bGroup, -5.2, depth / 2 - 1.2, M.blueCloth, "LEVI'S")
  createMannequin(bGroup, 5.2, depth / 2 - 1.2, M.brownCloth, 'ROOTS')
  createMannequin(bGroup, 7.1, depth / 2 - 1.2, M.greenCloth, 'CG')

  // Checkout / caisse.
  box(bGroup, M.frame, [3.2, 1.0, 0.9], [-5.6, 0.55, -depth / 2 + 0.8])
  box(bGroup, M.gold, [3.3, 0.08, 1.0], [-5.6, 1.08, -depth / 2 + 0.8])
  box(bGroup, M.sign, [0.55, 0.34, 0.34], [-4.85, 1.3, -depth / 2 + 1.0])
  box(bGroup, mat('screenBlue', { color: 0x1a3a6b, emissive: 0x1a3a6b, emissiveIntensity: 0.65 }), [0.42, 0.22, 0.04], [-4.85, 1.38, -depth / 2 + 1.2])

  // Cabines stylisées.
  for (let i = 0; i < 3; i++) {
    const z = -2.4 + i * 2.0
    box(bGroup, M.storeWall, [1.35, 2.8, 0.13], [width / 2 - 1.05, 1.4, z])
    box(bGroup, M.storeWall, [0.13, 2.8, 1.55], [width / 2 - 1.72, 1.4, z + 0.65])
    box(bGroup, mat('curtain', { color: 0x180f2b, roughness: 0.96 }), [1.05, 1.75, 0.06], [width / 2 - 1.05, 1.35, z + 1.35])
  }

  // Sign and neon.
  box(bGroup, M.sign, [8.8, 0.75, 0.08], [0, height + 0.55, depth / 2 + 0.28])
  addTextSprite(bGroup, 'BOUTIQUE ÉTHER — QUÉBEC', [0, height + 0.58, depth / 2 + 0.48], {
    scaleX: 7.8,
    scaleY: 1.3,
    color: '#f0ede8',
    border: 'rgba(167,139,250,.7)',
    background: 'rgba(10,12,20,.9)',
    size: 30
  })

  const neon = new THREE.PointLight(PALETTE.boutiqueAccent, 1.8, 12)
  neon.position.set(0, height + 0.4, depth / 2 + 1.0)
  bGroup.add(neon)

  for (const x of [-6, -2, 2, 6]) {
    const light = new THREE.PointLight(0xfff1d0, 0.75, 7)
    light.position.set(x, height - 0.6, -0.8)
    bGroup.add(light)
    box(bGroup, M.warmLight, [0.38, 0.05, 0.38], [x, height - 0.18, -0.8])
  }

  return bGroup
}

function createCityBlock(scene) {
  if (state.group) return state.group
  const group = new THREE.Group()
  group.name = GROUP_NAME
  group.userData = { version: VERSION, cityData: CITY_DATA, additive: true }

  createStreet(group)
  createApartmentBuilding(group, [-18, 0, 19])
  createBoutique(group, [18, 0, 20])

  // Keep the city as a background street behind the playable platform area.
  group.position.set(0, 0, 0)
  scene.add(group)
  state.group = group

  // Ambient moon fill for the street block.
  const moon = new THREE.DirectionalLight(0xc0d0ff, 0.24)
  moon.position.set(-20, 35, 25)
  moon.castShadow = false
  group.add(moon)

  emit('city.added', { buildings: CITY_DATA.buildings.map((b) => b.id), street: CITY_DATA.street })
  log('Rue avec Résidence Éther + Boutique Éther ajoutée à la scène')
  return group
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (material.map && child.userData.__cityDisposableTexture) material.map.dispose()
        material.dispose()
      })
    }
    if (child.userData.__cityDisposableTexture) child.userData.__cityDisposableTexture.dispose()
  })
}

function removeCityBlock() {
  if (!state.group || !state.scene) return false
  state.scene.remove(state.group)
  disposeObject(state.group)
  state.group = null
  state.windows = []
  state.lights = []
  state.materials = null
  state.textures = null
  emit('city.removed')
  log('Rue EtherWorld retirée')
  return true
}

function toggleApartmentLights(force) {
  let litCount = 0
  state.windows.forEach((windowMesh, index) => {
    const light = state.lights[index]
    const current = Boolean(windowMesh.userData.lit)
    const next = typeof force === 'boolean' ? force : !current
    windowMesh.userData.lit = next
    if (windowMesh.material) {
      windowMesh.material.emissive.setHex(next ? PALETTE.warm : 0x05070d)
      windowMesh.material.emissiveIntensity = next ? 0.62 : 0
      windowMesh.material.color.setHex(next ? 0xffe3a0 : 0x172030)
    }
    if (light) light.intensity = next ? 0.55 : 0
    if (next) litCount++
  })
  emit('city.lights', { litCount, total: state.windows.length })
  return { litCount, total: state.windows.length }
}

function patchGame(game) {
  if (!game || state.game === game) return
  state.game = game
  state.scene = game.scene
  game.cityBuildings = api
  game.addCityBuildings = () => addToGame()
  game.removeCityBuildings = () => removeCityBlock()
  game.toggleCityLights = (force) => toggleApartmentLights(force)
  log('API city attachée à window.game')
}

function addToGame() {
  const game = window.game
  if (!game?.scene) return false
  patchGame(game)
  createCityBlock(game.scene)
  return true
}

function pollForGame() {
  if (addToGame()) {
    state.autoAdded = true
    clearInterval(state.pollTimer)
    state.pollTimer = null
    return
  }
  state.tries++
  if (state.tries >= MAX_POLL_TRIES) {
    clearInterval(state.pollTimer)
    state.pollTimer = null
    log('window.game non disponible pour ajouter la rue', 'warning')
  }
}

function patchTroxTAdmin() {
  const bridge = window.troxtAdmin || window.EtherWorldAdminBridge
  if (!bridge || state.patchedAdmin) return
  const originalExecute = typeof bridge.execute === 'function' ? bridge.execute.bind(bridge) : null
  bridge.execute = (command, payload) => {
    const text = String(command || '').trim()
    const first = text.split(/\s+/)[0]?.toLowerCase()
    if (['city', 'street', 'buildings', 'building'].includes(first)) {
      return executeCityCommand(text, payload)
    }
    return originalExecute ? originalExecute(command, payload) : null
  }
  bridge.city = api
  state.patchedAdmin = true
  log('Commandes city branchées au bridge TroxT/Admin')
}

function executeCityCommand(command, payload = {}) {
  const parts = String(command || '').trim().split(/\s+/).filter(Boolean)
  const action = (parts[1] || 'status').toLowerCase()
  if (action === 'add' || action === 'show') return { success: addToGame(), status: api.status() }
  if (action === 'remove' || action === 'hide') return { success: removeCityBlock(), status: api.status() }
  if (action === 'lights') {
    const mode = (parts[2] || '').toLowerCase()
    const force = mode === 'on' ? true : mode === 'off' ? false : undefined
    return { success: true, lights: toggleApartmentLights(force), status: api.status() }
  }
  if (action === 'list') return { success: true, data: CITY_DATA }
  return { success: true, status: api.status(), commands: ['city add', 'city remove', 'city lights on/off/toggle', 'city list'] }
}

function start() {
  if (state.pollTimer) return
  state.pollTimer = setInterval(() => {
    pollForGame()
    patchTroxTAdmin()
  }, POLL_MS)
  pollForGame()
  patchTroxTAdmin()
}

const api = {
  version: VERSION,
  data: CITY_DATA,
  add: addToGame,
  remove: removeCityBlock,
  toggleLights: toggleApartmentLights,
  status() {
    return {
      version: VERSION,
      added: Boolean(state.group),
      autoAdded: state.autoAdded,
      sceneReady: Boolean(window.game?.scene),
      buildingCount: CITY_DATA.buildings.length,
      windows: state.windows.length,
      activeLights: state.lights.filter((light) => light.intensity > 0).length
    }
  },
  command: executeCityCommand
}

window.EtherWorldCityBuildings = api
window.EtherPrismCityBuildings = CITY_DATA
window.addEventListener('troxt:city:command', (event) => executeCityCommand(event.detail?.command || 'city status', event.detail?.payload || {}))
window.addEventListener('etherworld:city:add', () => addToGame())
window.addEventListener('etherworld:city:remove', () => removeCityBlock())

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
