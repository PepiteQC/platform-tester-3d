import { logger } from '../utils/logger.mjs'

/**
 * Middleware de logging de chaque requête HTTP
 */
export function requestLogger(req, res, next) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const level    = res.statusCode >= 500
      ? 'error'
      : res.statusCode >= 400
        ? 'warn'
        : 'info'

    logger[level](`${req.method} ${req.originalUrl}`, {
      status:   res.statusCode,
      duration: `${duration}ms`,
      ip:       req.ip,
      ua:       req.headers['user-agent']?.slice(0, 80),
    })
  })

  next()
}