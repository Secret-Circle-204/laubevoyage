export interface LogContext {
  requestId?: string
  correlationId?: string
  userId?: string | number
  bookingId?: string | number
  transactionId?: string
  durationMs?: number
  path?: string
  [key: string]: any
}

export interface ILogger {
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error | unknown, context?: LogContext): void
  debug(message: string, context?: LogContext): void
}

export class ConsoleLogger implements ILogger {
  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '')
  }

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '')
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, context ? JSON.stringify(context) : '')
  }

  debug(message: string, context?: LogContext): void {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '')
  }
}

export class PinoLogger implements ILogger {
  info(message: string, context?: LogContext): void {
    const payload = { level: 'info', time: new Date().toISOString(), message, ...context }
    console.log(JSON.stringify(payload))
  }

  warn(message: string, context?: LogContext): void {
    const payload = { level: 'warn', time: new Date().toISOString(), message, ...context }
    console.warn(JSON.stringify(payload))
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errMessage = error instanceof Error ? error.message : String(error || '')
    const errStack = error instanceof Error ? error.stack : undefined
    const payload = { level: 'error', time: new Date().toISOString(), message, errorMessage: errMessage, errorStack: errStack, ...context }
    console.error(JSON.stringify(payload))
  }

  debug(message: string, context?: LogContext): void {
    const payload = { level: 'debug', time: new Date().toISOString(), message, ...context }
    console.debug(JSON.stringify(payload))
  }
}

export class LoggerFactory {
  private static instance: ILogger = new ConsoleLogger()

  static getLogger(): ILogger {
    return this.instance
  }

  static setLogger(logger: ILogger): void {
    this.instance = logger
  }
}
