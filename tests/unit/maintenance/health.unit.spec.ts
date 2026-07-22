import { describe, it, expect } from 'vitest'
import { SystemHealthService } from '@/domains/maintenance/health-service'

describe('Maintenance Domain: System Health Telemetry Unit Tests', () => {
  it('should calculate health score (100% healthy vs degraded/critical)', () => {
    const healthy = SystemHealthService.calculateHealthMetrics({ dlqDepth: 0, failedJobsCount: 0, financialDiscrepanciesCount: 0 })
    expect(healthy.healthScore).toBe(100)
    expect(healthy.status).toBe('healthy')

    const degraded = SystemHealthService.calculateHealthMetrics({ dlqDepth: 5, failedJobsCount: 2, financialDiscrepanciesCount: 1 })
    expect(degraded.healthScore).toBe(70)
    expect(degraded.status).toBe('degraded')
  })
})
