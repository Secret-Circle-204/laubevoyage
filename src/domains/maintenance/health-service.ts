import type { SystemHealthMetrics } from './types'

/**
 * System Health Score Telemetry Service
 * Calculates real-time system health score (0-100%) based on DLQ depth, failed jobs, and financial discrepancies.
 */
export class SystemHealthService {
  static calculateHealthMetrics(params: {
    dlqDepth: number
    failedJobsCount: number
    financialDiscrepanciesCount: number
  }): SystemHealthMetrics {
    let score = 100

    // Deductions
    score -= params.dlqDepth * 2
    score -= params.failedJobsCount * 5
    score -= params.financialDiscrepanciesCount * 10

    const healthScore = Math.max(0, Math.min(100, score))
    const status = healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'degraded' : 'critical'

    return {
      healthScore,
      status,
      dlqDepth: params.dlqDepth,
      failedJobsCount: params.failedJobsCount,
      financialDiscrepanciesCount: params.financialDiscrepanciesCount,
      calculatedAt: new Date().toISOString(),
    }
  }
}
