import { logger } from '../utils/logger.mjs'

/**
 * Middleware de logging de chaque requête HTTP
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint()
  let logged = false

  function writeLog(event) {
    if (logged) return
    logged = true

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000

    const level =
      res.statusCode >= 500
        ? 'error'
        : res.statusCode >= 400
          ? 'warn'
          : 'info'

    logger[level](`${req.method} ${req.originalUrl}`, {
      event, // "finish" ou "close"
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      ua: req.headers['user-agent']?.slice(0, 120),
      contentLength: res.getHeader('content-length') ?? null,
    })
  }

  res.on('finish', () => writeLog('finish'))
  res.on('close', () => writeLog('close'))

  next()
}