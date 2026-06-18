import { timingSafeEqual, createHash } from 'crypto'
import { config }  from '../config.mjs'
import { logger }  from '../utils/logger.mjs'

/**
 * Middleware d'authentification admin — Bearer token
 * Utilise crypto.timingSafeEqual natif Node.js (résistant aux timing attacks)
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Accès admin sans token', { ip: req.ip, url: req.originalUrl })

    return res.status(401).json({
      success: false,
      error:   'Authentification requise.',
    })
  }

  const token    = authHeader.slice(7).trim()
  const expected = config.ADMIN_TOKEN

  const tokenHash    = createHash('sha256').update(token).digest()
  const expectedHash = createHash('sha256').update(expected).digest()

  if (!timingSafeEqual(tokenHash, expectedHash)) {
    logger.warn('Token admin invalide', { ip: req.ip })

    return res.status(403).json({
      success: false,
      error:   'Accès refusé.',
    })
  }

  next()
}