// ============================================================
// 📋 FORGE FACTORY LOGGER
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

const ICONS: Record<LogLevel, string> = {
  debug:   '🔍',
  info:    '📌',
  warn:    '⚠️ ',
  error:   '❌',
  success: '✅',
}

const COLORS: Record<LogLevel, string> = {
  debug:   '\x1b[36m',
  info:    '\x1b[34m',
  warn:    '\x1b[33m',
  error:   '\x1b[31m',
  success: '\x1b[32m',
}

const RESET = '\x1b[0m'

class FactoryLogger {
  private module: string
  private startTime = Date.now()

  constructor(module: string) {
    this.module = module
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const elapsed  = ((Date.now() - this.startTime) / 1000).toFixed(2)
    const color    = COLORS[level]
    const icon     = ICONS[level]
    const prefix   = `${color}${icon} [${this.module}] +${elapsed}s${RESET}`
    return `${prefix} ${message}`
  }

  debug(msg: string, data?: any): void {
    console.log(this.format('debug', msg))
    if (data) console.log('  └─', data)
  }

  info(msg: string, data?: any): void {
    console.log(this.format('info', msg))
    if (data) console.log('  └─', JSON.stringify(data))
  }

  warn(msg: string, data?: any): void {
    console.warn(this.format('warn', msg))
  }

  error(msg: string, err?: any): void {
    console.error(this.format('error', msg))
    if (err) console.error('  └─', err)
  }

  success(msg: string, data?: any): void {
    console.log(this.format('success', msg))
    if (data) console.log('  └─', JSON.stringify(data))
  }

  progress(current: number, total: number, label?: string): void {
    const pct  = ((current / total) * 100).toFixed(1)
    const bar  = '█'.repeat(Math.floor(Number(pct) / 5)) + '░'.repeat(20 - Math.floor(Number(pct) / 5))
    const line = `  [${bar}] ${pct}% ${label ? `— ${label}` : ''}`
    process.stdout.write(`\r${line}`)
    if (current >= total) process.stdout.write('\n')
  }
}

export function createLogger(module: string): FactoryLogger {
  return new FactoryLogger(module)
}