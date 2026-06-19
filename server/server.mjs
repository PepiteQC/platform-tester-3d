import express              from 'express'
import helmet               from 'helmet'
import cors                 from 'cors'
import rateLimit            from 'express-rate-limit'
import { createServer }     from 'http'
import { WebSocketServer }  from 'ws'
import { fileURLToPath }    from 'url'
import { dirname, join }    from 'path'
import 'express-async-errors'

import { config }           from './config.mjs'
import { logger }           from './utils/logger.mjs'
import { auditRouter }      from './routes/audit.routes.mjs'
import { errorHandler }     from './middleware/errorHandler.mjs'
import { requestLogger }    from './middleware/requestLogger.mjs'
import { setWebSocketServer } from './ws/hub.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      config.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ]
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS bloqué pour: ${origin}`))
    }
  },
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

const globalLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans une minute.' },
})

const auditLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: "Trop de requêtes d'audit. Maximum 10 par minute." },
})

const worldLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Trop de requêtes world. Maximum 200 par minute.' },
})

app.use(globalLimiter)
app.use(express.json({ limit: '512kb' }))
app.use(express.urlencoded({ extended: false, limit: '512kb' }))
app.use(express.static(join(__dirname, '..', 'public')))
app.use(requestLogger)

// ============================================================================
// WORLD STATE
// ============================================================================

const worldState = {
  props:     new Map(),
  entities:  new Map(),
  platforms: [],
  effects:   [],
  players:   new Map(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    version:   '2.0.0',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env:       config.NODE_ENV,
    world: {
      props:     worldState.props.size,
      entities:  worldState.entities.size,
      platforms: worldState.platforms.length,
      players:   worldState.players.size,
    },
  })
})

app.use('/api/audit', auditLimiter, auditRouter)

// ============================================================================
// PROPS
// ============================================================================

app.get('/api/props', worldLimiter, (req, res) => {
  const props = Array.from(worldState.props.values())
  res.json({ success: true, count: props.length, props })
})

app.get('/api/props/:id', (req, res) => {
  const prop = worldState.props.get(req.params.id)
  if (!prop) return res.status(404).json({ success: false, error: 'Prop not found' })
  res.json({ success: true, prop })
})

app.post('/api/props', worldLimiter, (req, res) => {
  const propData = {
    id:          req.body.id || `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type:        req.body.type        || 'physics_prop',
    category:    req.body.category    || 'basic',
    name:        req.body.name        || 'New Prop',
    position:    req.body.position    || { x: 0, y: 0, z: 0 },
    rotation:    req.body.rotation    || { x: 0, y: 0, z: 0, w: 1 },
    scale:       req.body.scale       ?? 1,
    mass:        req.body.mass        ?? 1,
    restitution: req.body.restitution ?? 0.3,
    friction:    req.body.friction    ?? 0.5,
    velocity:    req.body.velocity    || { x: 0, y: 0, z: 0 },
    metadata:    req.body.metadata    || {},
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
  }
  worldState.props.set(propData.id, propData)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'prop_created', payload: propData })
  logger.info('Prop créé', { id: propData.id, type: propData.type })
  res.status(201).json({ success: true, prop: propData })
})

app.put('/api/props/:id', (req, res) => {
  const prop = worldState.props.get(req.params.id)
  if (!prop) return res.status(404).json({ success: false, error: 'Prop not found' })
  const updates     = { ...req.body, id: prop.id, updatedAt: Date.now() }
  const updatedProp = { ...prop, ...updates }
  worldState.props.set(prop.id, updatedProp)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'prop_updated', payload: { id: prop.id, updates, prop: updatedProp } })
  res.json({ success: true, prop: updatedProp })
})

app.delete('/api/props/:id', (req, res) => {
  const prop = worldState.props.get(req.params.id)
  if (!prop) return res.status(404).json({ success: false, error: 'Prop not found' })
  worldState.props.delete(req.params.id)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'prop_deleted', payload: { id: req.params.id } })
  logger.info('Prop supprimé', { id: req.params.id })
  res.json({ success: true, deleted: prop })
})

app.delete('/api/props', (req, res) => {
  const count = worldState.props.size
  worldState.props.clear()
  worldState.updatedAt = Date.now()
  broadcast({ type: 'props_cleared' })
  res.json({ success: true, deletedCount: count })
})

// ============================================================================
// ENTITIES
// ============================================================================

app.get('/api/entities', worldLimiter, (req, res) => {
  const entities = Array.from(worldState.entities.values())
  res.json({ success: true, count: entities.length, entities })
})

app.get('/api/entities/:id', (req, res) => {
  const entity = worldState.entities.get(req.params.id)
  if (!entity) return res.status(404).json({ success: false, error: 'Entity not found' })
  res.json({ success: true, entity })
})

app.post('/api/entities', worldLimiter, (req, res) => {
  const entityData = {
    id:        req.body.id       || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type:      req.body.type     || 'base_entity',
    name:      req.body.name     || 'New Entity',
    position:  req.body.position || { x: 0, y: 0, z: 0 },
    rotation:  req.body.rotation || { x: 0, y: 0, z: 0, w: 1 },
    scale:     req.body.scale    ?? 1,
    active:    req.body.active   ?? true,
    visible:   req.body.visible  ?? true,
    tags:      req.body.tags     || [],
    metadata:  req.body.metadata || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  worldState.entities.set(entityData.id, entityData)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'entity_created', payload: entityData })
  logger.info('Entity créée', { id: entityData.id, type: entityData.type })
  res.status(201).json({ success: true, entity: entityData })
})

app.put('/api/entities/:id', (req, res) => {
  const entity = worldState.entities.get(req.params.id)
  if (!entity) return res.status(404).json({ success: false, error: 'Entity not found' })
  const updates       = { ...req.body, id: entity.id, updatedAt: Date.now() }
  const updatedEntity = { ...entity, ...updates }
  worldState.entities.set(entity.id, updatedEntity)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'entity_updated', payload: { id: entity.id, updates, entity: updatedEntity } })
  res.json({ success: true, entity: updatedEntity })
})

app.delete('/api/entities/:id', (req, res) => {
  const entity = worldState.entities.get(req.params.id)
  if (!entity) return res.status(404).json({ success: false, error: 'Entity not found' })
  worldState.entities.delete(req.params.id)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'entity_deleted', payload: { id: req.params.id } })
  res.json({ success: true, deleted: entity })
})

// ============================================================================
// PLATFORMS
// ============================================================================

app.get('/api/platforms', (req, res) => {
  res.json({ success: true, count: worldState.platforms.length, platforms: worldState.platforms })
})

app.post('/api/platforms', (req, res) => {
  const platform = { id: `platform_${Date.now()}`, ...req.body, createdAt: Date.now() }
  worldState.platforms.push(platform)
  worldState.updatedAt = Date.now()
  broadcast({ type: 'platform_created', payload: platform })
  res.status(201).json({ success: true, platform })
})

app.delete('/api/platforms/:id', (req, res) => {
  const index = worldState.platforms.findIndex(p => p.id === req.params.id)
  if (index === -1) return res.status(404).json({ success: false, error: 'Platform not found' })
  const deleted = worldState.platforms.splice(index, 1)[0]
  worldState.updatedAt = Date.now()
  broadcast({ type: 'platform_deleted', payload: { id: req.params.id } })
  res.json({ success: true, deleted })
})

// ============================================================================
// PLAYERS
// ============================================================================

app.get('/api/players', (req, res) => {
  const players = Array.from(worldState.players.values())
  res.json({ success: true, count: players.length, players })
})

// ============================================================================
// EFFECTS
// ============================================================================

app.get('/api/effects', (req, res) => {
  res.json({ success: true, count: worldState.effects.length, effects: worldState.effects })
})

app.post('/api/effects', (req, res) => {
  const effectData = {
    id:        `effect_${Date.now()}`,
    type:      req.body.type     || 'explosion',
    position:  req.body.position || { x: 0, y: 0, z: 0 },
    duration:  req.body.duration ?? 1,
    metadata:  req.body.metadata || {},
    createdAt: Date.now(),
  }
  worldState.effects.push(effectData)
  broadcast({ type: 'effect_triggered', payload: effectData })
  logger.info('Effet déclenché', { id: effectData.id, type: effectData.type })
  res.status(201).json({ success: true, effect: effectData })
  if (effectData.duration < 10) {
    setTimeout(() => {
      worldState.effects = worldState.effects.filter(e => e.id !== effectData.id)
      broadcast({ type: 'effect_ended', payload: { id: effectData.id } })
    }, effectData.duration * 1000)
  }
})

// ============================================================================
// WORLD STATE ROUTES
// ============================================================================

app.get('/api/world', (req, res) => {
  res.json({
    success: true,
    world: {
      props:     Array.from(worldState.props.values()),
      entities:  Array.from(worldState.entities.values()),
      platforms: worldState.platforms,
      effects:   worldState.effects,
      players:   Array.from(worldState.players.values()),
      createdAt: worldState.createdAt,
      updatedAt: worldState.updatedAt,
    },
  })
})

app.post('/api/world/save', (req, res) => {
  res.json({
    success: true,
    saved: {
      propsCount:     worldState.props.size,
      entitiesCount:  worldState.entities.size,
      platformsCount: worldState.platforms.length,
      timestamp:      Date.now(),
    },
  })
})

app.post('/api/world/load', (req, res) => {
  worldState.props.clear()
  worldState.entities.clear()
  worldState.platforms = []
  worldState.effects   = []
  if (req.body.props)     req.body.props.forEach(p => worldState.props.set(p.id, p))
  if (req.body.entities)  req.body.entities.forEach(e => worldState.entities.set(e.id, e))
  if (req.body.platforms) worldState.platforms = req.body.platforms
  worldState.updatedAt = Date.now()
  broadcast({
    type:    'world_loaded',
    payload: {
      props:     Array.from(worldState.props.values()),
      entities:  Array.from(worldState.entities.values()),
      platforms: worldState.platforms,
    },
  })
  logger.info('World chargé', {
    props:     worldState.props.size,
    entities:  worldState.entities.size,
    platforms: worldState.platforms.length,
  })
  res.json({
    success: true,
    loaded: {
      props:     worldState.props.size,
      entities:  worldState.entities.size,
      platforms: worldState.platforms.length,
    },
  })
})

app.post('/api/world/clear', (req, res) => {
  const counts = {
    props:     worldState.props.size,
    entities:  worldState.entities.size,
    platforms: worldState.platforms.length,
  }
  worldState.props.clear()
  worldState.entities.clear()
  worldState.platforms = []
  worldState.effects   = []
  worldState.updatedAt = Date.now()
  broadcast({ type: 'world_cleared' })
  logger.info('World réinitialisé', counts)
  res.json({ success: true, cleared: counts })
})

// ============================================================================
// ITEMS CATALOG
// ============================================================================

app.get('/api/items/catalog', (req, res) => {
  res.json({
    success: true,
    items: {
      props: [
        { type: 'explosive_barrel', name: 'Explosive Barrel', category: 'dangerous',    mass: 80,   description: 'Explodes on impact or when damaged' },
        { type: 'wooden_crate',     name: 'Wooden Crate',     category: 'destructible', mass: 50,   description: 'Destructible container' },
        { type: 'bomb',             name: 'Timed Bomb',       category: 'dangerous',    mass: 5,    description: 'Timer explosive device' },
        { type: 'sign_panel',       name: 'Sign Panel',       category: 'decorative',   mass: 15,   description: 'Decorative sign' },
        { type: 'chair',            name: 'Chair',            category: 'furniture',    mass: 10,   description: 'Interactive furniture' },
        { type: 'table',            name: 'Table',            category: 'furniture',    mass: 30,   description: 'Interactive furniture' },
        { type: 'lamp_post',        name: 'Lamp Post',        category: 'lighting',     mass: 30,   description: 'Emissive light source' },
        { type: 'wrecked_car',      name: 'Wrecked Car',      category: 'vehicle',      mass: 1200, description: 'Damaged vehicle prop' },
        { type: 'neon_sign',        name: 'Neon Sign',        category: 'decorative',   mass: 8,    description: 'Glowing sign' },
        { type: 'checkpoint',       name: 'Checkpoint',       category: 'interactive',  mass: 0,    description: 'Save/respawn point' },
        { type: 'trampoline',       name: 'Trampoline',       category: 'interactive',  mass: 0,    description: 'High bounce surface' },
        { type: 'land_mine',        name: 'Land Mine',        category: 'dangerous',    mass: 3,    description: 'Proximity explosive' },
        { type: 'portal',           name: 'Portal',           category: 'interactive',  mass: 0,    description: 'Teleportation device' },
        { type: 'shield',           name: 'Shield',           category: 'protective',   mass: 15,   description: 'Blocks projectiles' },
        { type: 'drivable_vehicle', name: 'Drivable Vehicle', category: 'vehicle',      mass: 900,  description: 'Physics-based vehicle' },
      ],
      entities: [
        { type: 'guard_npc',     name: 'Guard NPC',    category: 'enemy',    health: 200,  description: 'Patrols and attacks on sight' },
        { type: 'merchant_npc',  name: 'Merchant NPC', category: 'friendly', health: 50,   description: 'Dialogue and trading' },
        { type: 'boss_npc',      name: 'Boss NPC',     category: 'enemy',    health: 1000, description: 'Multi-phase enemy' },
        { type: 'turret',        name: 'Turret',       category: 'defense',               description: 'Auto-targeting defense' },
        { type: 'spawn_point',   name: 'Spawn Point',  category: 'system',                description: 'Player spawn location' },
        { type: 'vehicle_spawn', name: 'Vehicle Spawn',category: 'system',                description: 'Spawn and manage vehicles' },
        { type: 'effect_zone',   name: 'Effect Zone',  category: 'system',                description: 'Apply effects to entities' },
      ],
      tools: [
        { type: 'physics_gun', name: 'Physics Gun',  description: 'Attract/repulse props' },
        { type: 'gravity_gun', name: 'Gravity Gun',  description: 'Pick up and launch objects' },
        { type: 'weld_tool',   name: 'Weld Tool',    description: 'Connect two props together' },
        { type: 'thruster',    name: 'Thruster',     description: 'Propulse a prop' },
        { type: 'rope_tool',   name: 'Rope Tool',    description: 'Relie deux props' },
        { type: 'color_tool',  name: 'Color Tool',   description: 'Change prop color' },
        { type: 'delete_tool', name: 'Delete Tool',  description: 'Supprime prop' },
        { type: 'clone_tool',  name: 'Clone Tool',   description: 'Duplique prop' },
        { type: 'inflater',    name: 'Inflater',     description: 'Scale up/down a prop' },
        { type: 'freezer',     name: 'Freezer',      description: 'Fig/dgl la physique' },
        { type: 'spawner',     name: 'Spawner Tool', description: 'Spawn new props' },
      ],
      effects: [
        { type: 'explosion',        name: 'Explosion',        description: 'Radial force + particules' },
        { type: 'fire',             name: 'Fire',             description: 'Emissive flames + DOTS' },
        { type: 'water_pool',       name: 'Water Pool',       description: 'Slowdown zone' },
        { type: 'wind_zone',        name: 'Wind Zone',        description: 'Directional force' },
        { type: 'smoke',            name: 'Smoke',            description: 'Visibility reduction' },
        { type: 'lightning',        name: 'Lightning',        description: 'Flash + stun' },
        { type: 'antigravity_zone', name: 'Antigravity Zone', description: 'Reverse gravity' },
        { type: 'speed_zone',       name: 'Speed Zone',       description: 'Velocity multiplier' },
        { type: 'freeze_zone',      name: 'Freeze Zone',      description: 'Stop all physics' },
        { type: 'vortex',           name: 'Vortex',           description: 'Pull to center' },
      ],
    },
  })
})

app.post('/api/items/spawn', worldLimiter, (req, res) => {
  const { type, position, rotation, metadata } = req.body
  if (!type || !position) {
    return res.status(400).json({ success: false, error: 'Type and position required' })
  }
  const itemData = {
    id:        `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    position,
    rotation:  rotation || { x: 0, y: 0, z: 0, w: 1 },
    scale:     1,
    metadata:  metadata || {},
    createdAt: Date.now(),
  }
  const propTypes = [
    'explosive_barrel', 'wooden_crate', 'bomb', 'sign_panel', 'chair',
    'table', 'lamp_post', 'wrecked_car', 'neon_sign', 'checkpoint',
    'trampoline', 'land_mine', 'portal', 'shield', 'drivable_vehicle',
  ]
  if (propTypes.includes(type)) {
    worldState.props.set(itemData.id, itemData)
  } else {
    worldState.entities.set(itemData.id, itemData)
  }
  worldState.updatedAt = Date.now()
  broadcast({ type: 'item_spawned', payload: itemData })
  logger.info('Item spawné', { id: itemData.id, type: itemData.type })
  res.status(201).json({ success: true, item: itemData })
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable.' })
})

app.use(errorHandler)

// ============================================================================
// WEBSOCKET
// ============================================================================

const httpServer = createServer(app)

export const wss = new WebSocketServer({
  server: httpServer,
  path:   '/ws',
})

setWebSocketServer(wss) // ← FIX cycle circulaire

const clients         = new Map()
let   clientIdCounter = 1

function generateClientId() {
  return `client_${clientIdCounter++}`
}

function broadcast(message, excludeClient = null) {
  const data = JSON.stringify(message)
  clients.forEach((ws, clientId) => {
    if (excludeClient && clientId === excludeClient) return
    if (ws.readyState === 1) ws.send(data)
  })
}

function sendToClient(clientId, message) {
  const ws = clients.get(clientId)
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(message))
}

wss.on('connection', (socket, request) => {
  const clientId = generateClientId()
  const ip       = request.socket.remoteAddress ?? 'unknown'

  clients.set(clientId, socket)
  logger.info('WebSocket connecté', { clientId, ip })

  sendToClient(clientId, {
    type: 'CONNECTED',
    payload: {
      clientId,
      message:    'EtherWorld Platform Tester 3D WebSocket prêt.',
      timestamp:  Date.now(),
      worldState: {
        props:     Array.from(worldState.props.values()),
        entities:  Array.from(worldState.entities.values()),
        platforms: worldState.platforms,
      },
    },
  })

  worldState.players.set(clientId, {
    id:          clientId,
    ip,
    position:    { x: 0, y: 0, z: 0 },
    rotation:    { x: 0, y: 0, z: 0, w: 1 },
    connectedAt: Date.now(),
  })

  broadcast({ type: 'player_joined', payload: { clientId } }, clientId)

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString())
      logger.debug('WebSocket message reçu', { clientId, type: message.type })
      handleWebSocketMessage(clientId, message)
    } catch {
      socket.send(JSON.stringify({ type: 'ERROR', error: 'Message JSON invalide.' }))
    }
  })

  socket.on('close', (code, reason) => {
    logger.info('WebSocket déconnecté', { clientId, ip, code, reason: reason.toString() })
    clients.delete(clientId)
    worldState.players.delete(clientId)
    broadcast({ type: 'player_left', payload: { clientId } })
  })

  socket.on('error', (err) => {
    logger.error('WebSocket erreur', { clientId, ip, error: err.message })
  })
})

function handleWebSocketMessage(clientId, message) {
  const { type, payload } = message

  switch (type) {
    case 'PING':
      sendToClient(clientId, { type: 'PONG', timestamp: Date.now() })
      break

    case 'player_move': {
      const player = worldState.players.get(clientId)
      if (player && payload?.position) {
        player.position  = payload.position
        player.rotation  = payload.rotation || player.rotation
        player.updatedAt = Date.now()
        broadcast({
          type:    'player_moved',
          payload: { clientId, position: player.position, rotation: player.rotation },
        }, clientId)
      }
      break
    }

    case 'prop_grab':
      broadcast({ type: 'prop_grabbed', payload: { clientId, propId: payload?.propId } }, clientId)
      break

    case 'prop_release':
      broadcast({ type: 'prop_released', payload: { clientId, propId: payload?.propId } }, clientId)
      break

    case 'prop_update': {
      const prop = worldState.props.get(payload?.id)
      if (prop) {
        Object.assign(prop, payload.updates, { updatedAt: Date.now() })
        worldState.props.set(prop.id, prop)
        broadcast({ type: 'prop_updated', payload: { id: prop.id, updates: payload.updates, prop } }, clientId)
      }
      break
    }

    case 'tool_use':
      broadcast({
        type:    'tool_used',
        payload: { clientId, tool: payload?.tool, target: payload?.target, action: payload?.action },
      }, clientId)
      break

    case 'effect_trigger': {
      const effect = {
        id:        `effect_${Date.now()}`,
        type:      payload?.effectType,
        position:  payload?.position,
        metadata:  payload?.metadata || {},
        createdAt: Date.now(),
      }
      worldState.effects.push(effect)
      broadcast({ type: 'effect_triggered', payload: effect })
      break
    }

    case 'chat_message':
      broadcast({ type: 'chat', payload: { clientId, message: payload?.message, timestamp: Date.now() } })
      break

    case 'custom_event':
      broadcast({ type: payload?.eventType, payload: { ...payload?.data, sourceClient: clientId } }, clientId)
      break

    default:
      logger.debug('WebSocket type inconnu', { clientId, type })
  }
}

// ── Démarrage ─────────────────────────────────────────────────────────────────
httpServer.listen(config.PORT, () => {
  logger.info('Serveur démarré', {
    port:    config.PORT,
    env:     config.NODE_ENV,
    sandbox: config.SANDBOX_ENABLED,
    ws:      `ws://localhost:${config.PORT}/ws`,
    api:     `http://localhost:${config.PORT}/api/`,
  })
})

// ── Arrêt propre ──────────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Signal reçu: ${signal}. Arrêt propre...`)
  wss.clients.forEach(client => client.terminate())
  wss.close()
  httpServer.close(() => {
    logger.info('Serveur HTTP fermé.')
    process.exit(0)
  })
  setTimeout(() => {
    logger.warn('Arrêt forcé après timeout.')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', { reason: String(reason) })
})

process.on('uncaughtException', (err) => {
  logger.error('Exception non capturée', { error: err.message, stack: err.stack })
  process.exit(1)
})

export default app