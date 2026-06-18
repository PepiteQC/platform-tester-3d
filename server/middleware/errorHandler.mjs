import { logger } from '../utils/logger.mjs'
import { config }  from '../config.mjs'

/**
 * Gestionnaire d'erreurs global Express
 * Doit être le dernier middleware enregistré
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = resolveStatusCode(err)
  const isDev      = config.NODE_ENV === 'development'

  logger.error('Erreur serveur', {
    message:    err.message,
    statusCode,
    method:     req.method,
    url:        req.originalUrl,
    ip:         req.ip,
    stack:      isDev ? err.stack : undefined,
  })

  const body = {
    success: false,
    error:   sanitizeMessage(err, isDev),
  }

  if (err.details) {
    body.details = err.details
  }

  if (isDev && err.stack) {
    body.stack = err.stack
  }

  res.status(statusCode).json(body)
}

function resolveStatusCode(err) {
  if (err.statusCode && Number.isInteger(err.statusCode)) {
    return err.statusCode
  }

  if (err.status && Number.isInteger(err.status)) {
    return err.status
  }

  if (err.name === 'ValidationError') return 400
  if (err.name === 'UnauthorizedError') return 401
  if (err.name === 'ForbiddenError') return 403
  if (err.name === 'NotFoundError') return 404
  if (err.name === 'CompilerError') return 422

  return 500
}

function sanitizeMessage(err, isDev) {
  if (isDev) return err.message

  const safe = [
    'Validation échouée',
    'Authentification requise.',
    'Accès refusé.',
    'Route introuvable.',
    'Trop de requêtes.',
  ]

  if (err.statusCode < 500) return err.message
  if (safe.some(msg => err.message?.includes(msg))) return err.message

  return 'Une erreur interne est survenue.'
}