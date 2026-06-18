import { createWriteStream, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_DIR = resolve(__dirname, '../../logs')

try {
  mkdirSync(LOG_DIR, { recursive: true })
} catch {}

const LEVELS = Object.freeze({
  error: 0,
  warn:  1,
  info:  2,
  debug: 3,
})

const COLORS = Object.freeze({
  error: '\x1b[31m',
  warn:  '\x1b[33m',
  info:  '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
})

const ISO = () => new Date().toISOString()

function serialize(meta) {
  if (!meta || Object.keys(meta).length === 0) return ''
  try {
    return ' ' + JSON.stringify(meta)
  } catch {
    return ' [non-serializable]'
  }
}

class Logger {
  constructor(options = {}) {
    this.level     = LEVELS[options.level ?? process.env.LOG_LEVEL ?? 'info'] ?? 2
    this.prefix    = options.prefix ?? 'EtherAudit'
    this.toConsole = options.console !== false

    const filePath = resolve(LOG_DIR, options.file ?? 'server.log')
    this._stream   = createWriteStream(filePath, { flags: 'a' })
  }

  _write(level, message, meta = {}) {
    if (LEVELS[level] > this.level) return

    const timestamp = ISO()
    const metaStr   = serialize(meta)
    const line      = `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}] ${message}${metaStr}`

    this._stream.write(line + '\n')

    if (this.toConsole) {
      const color = COLORS[level] ?? ''
      console.log(`${color}${line}${COLORS.reset}`)
    }
  }

  error(message, meta = {}) { this._write('error', message, meta) }
  warn(message,  meta = {}) { this._write('warn',  message, meta) }
  info(message,  meta = {}) { this._write('info',  message, meta) }
  debug(message, meta = {}) { this._write('debug', message, meta) }

  child(prefix) {
    return new Logger({
      level:   Object.keys(LEVELS).find(k => LEVELS[k] === this.level),
      prefix:  `${this.prefix}:${prefix}`,
      console: this.toConsole,
      file:    `${prefix.toLowerCase()}.log`,
    })
  }

  dispose() {
    this._stream.end()
  }
}

export const logger = new Logger()
export default logger