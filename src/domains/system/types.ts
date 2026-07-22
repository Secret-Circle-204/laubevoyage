export interface ProblemDetailsDTO {
  type: string
  title: string
  status: number
  detail: string
  code: string
  timestamp: string
  instance?: string
}

export interface DomainHealthCheckDTO {
  domain: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  metrics?: Record<string, unknown>
}

export interface SystemHealthReportDTO {
  overallHealthScore: number // 0 - 100%
  status: 'optimal' | 'degraded' | 'critical'
  domainChecks: DomainHealthCheckDTO[]
  timestamp: string
}

export interface ProductionReadinessDTO {
  certified: boolean
  passedChecksCount: number
  totalChecksCount: number
  checkResults: { checkName: string; passed: boolean; message: string }[]
  timestamp: string
}
