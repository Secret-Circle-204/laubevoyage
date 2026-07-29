/**
 * Production Operational Telemetry Module
 * Emits structured operational telemetry for background workers, outbox publishers, and system recoverability.
 */
export interface TelemetryMetricEvent {
  component: string
  action: string
  status: 'success' | 'failure' | 'info' | 'warning'
  details?: Record<string, any>
  durationMs?: number
  correlationId?: string
}

export class OperationalTelemetry {
  public static emit(event: TelemetryMetricEvent): void {
    const logPayload = {
      timestamp: new Date().toISOString(),
      level: event.status === 'failure' ? 'ERROR' : event.status === 'warning' ? 'WARN' : 'INFO',
      component: event.component,
      action: event.action,
      status: event.status,
      durationMs: event.durationMs,
      correlationId: event.correlationId,
      ...event.details,
    }

    if (process.env.NODE_ENV === 'test') return

    if (event.status === 'failure') {
      console.error(`[Telemetry::${event.component}] ${event.action} FAILED`, JSON.stringify(logPayload))
    } else {
      console.log(`[Telemetry::${event.component}] ${event.action}`, JSON.stringify(logPayload))
    }
  }
}
