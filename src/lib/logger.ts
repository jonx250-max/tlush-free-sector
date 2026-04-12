type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
}

const currentLevel: LogLevel = import.meta.env.PROD ? 'warn' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const logger = {
  debug(msg: string, data?: unknown) {
    if (shouldLog('debug')) console.debug(`[DEBUG] ${msg}`, data ?? '')
  },
  info(msg: string, data?: unknown) {
    if (shouldLog('info')) console.info(`[INFO] ${msg}`, data ?? '')
  },
  warn(msg: string, data?: unknown) {
    if (shouldLog('warn')) console.warn(`[WARN] ${msg}`, data ?? '')
  },
  error(msg: string, data?: unknown) {
    if (shouldLog('error')) console.error(`[ERROR] ${msg}`, data ?? '')
  },
  perf(label: string): () => void {
    const start = performance.now()
    return () => {
      const elapsed = performance.now() - start
      logger.debug(`${label}: ${elapsed.toFixed(1)}ms`)
    }
  },
}
