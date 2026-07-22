import type { DashboardMetricsDTO } from './types'

/**
 * Dashboard Metrics & Observability Telemetry
 */
export class DashboardMetrics {
  static createMetrics(cacheHit: boolean, durationMs: number): DashboardMetricsDTO {
    return {
      cacheHit,
      aggregationDurationMs: Math.round(durationMs * 100) / 100,
      projectionVersion: 'v1.0.0',
      lastRefreshAt: new Date().toISOString(),
    }
  }
}
