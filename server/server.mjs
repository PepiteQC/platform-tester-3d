import express              from 'express'
import helmet               from 'helmet'
import cors                 from 'cors'
import rateLimit            from 'express-rate-limit'
import { createServer }     from 'http'
import { WebSocketServer }  from 'ws'
import 'express-async-errors'

import { config }           from './config.mjs'
import { logger }           from './utils/logger.mjs'
import { auditRouter }      from './routes/audit.routes.mjs'
import { errorHandler }     from './middleware/errorHandler.mjs'
import { requestLogger }    from './middleware/requestLogger.mjs'

// ─── Application Express ────────────────────────────────────────────────────
const app = express()

// ── Sécurité ────────────────────────────────────────────────────────────────
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
  methods:     ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}))

// ── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Trop de requêtes. Réessayez dans une minute.',
  },
})

const auditLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Trop de requêtes d\'audit. Maximum 10 par minute.',
  },
})

app.use(globalLimiter)

// ── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '512kb' }))
app.use(express.urlencoded({ extended: false, limit: '512kb' }))

// ── Logging des requêtes ─────────────────────────────────────────────────────
app.use(requestLogger)

// ── Santé ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    version:   '2.0.0',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env:       config.NODE_ENV,
  })
})

// ── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/audit', auditLimiter, auditRouter)

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error:   'Route introuvable.',
  })
})

// ── Gestionnaire d'erreurs global ────────────────────────────────────────────
app.use(errorHandler)

// ─── Serveur HTTP + WebSocket ────────────────────────────────────────────────
const httpServer = createServer(app)

export const wss = new WebSocketServer({
  server: httpServer,
  path:   '/ws',
})

wss.on('connection', (socket, request) => {
  const ip = request.socket.remoteAddress ?? 'unknown'
  logger.info('WebSocket connecté', { ip })

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString())
      logger.debug('WebSocket message reçu', { type: message.type })

      if (message.type === 'PING') {
        socket.send(JSON.stringify({
          type:      'PONG',
          timestamp: Date.now(),
        }))
      }
    } catch {
      socket.send(JSON.stringify({
        type:  'ERROR',
        error: 'Message JSON invalide.',
      }))
    }
  })

  socket.on('close', (code, reason) => {
    logger.info('WebSocket déconnecté', {
      ip,
      code,
      reason: reason.toString(),
    })
  })

  socket.on('error', (err) => {
    logger.error('WebSocket erreur', { ip, error: err.message })
  })

  socket.send(JSON.stringify({
    type:      'CONNECTED',
    message:   'EtherAudit WebSocket prêt.',
    timestamp: Date.now(),
  }))
})

// ── Démarrage ────────────────────────────────────────────────────────────────
httpServer.listen(config.PORT, () => {
  logger.info(`Serveur démarré`, {
    port:    config.PORT,
    env:     config.NODE_ENV,
    sandbox: config.SANDBOX_ENABLED,
    ws:      `ws://localhost:${config.PORT}/ws`,
  })
})

// ── Arrêt propre ─────────────────────────────────────────────────────────────
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
  logger.error('Promesse rejetée non gérée', {
    reason: String(reason),
  })
})

process.on('uncaughtException', (err) => {
  logger.error('Exception non capturée', { error: err.message, stack: err.stack })
  process.exit(1)
})

export default app