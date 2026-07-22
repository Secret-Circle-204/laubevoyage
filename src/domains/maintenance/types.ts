export type MaintenancePriority = 'critical' | 'high' | 'medium' | 'low'

export type MaintenanceJobName =
  | 'complete_finished_bookings'
  | 'expire_stale_holds'
  | 'financial_reconciliation'
  | 'dlq_recovery'
  | 'data_retention_purge'

export type ReconciliationStatus =
  | 'matched'
  | 'orphaned_gateway'
  | 'orphaned_internal'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'duplicate_gateway'
  | 'duplicate_internal'

export interface MaintenanceLeaseEntity {
  jobName: string
  workerId: string
  leaseExpiresAt: string
}

export interface MaintenanceCheckpoint {
  jobName: string
  lastProcessedId: string
  processedCount: number
  updatedAt: string
}

export interface FinancialDiscrepancyItem {
  paymentId: string
  bookingId?: number
  expectedAmount: number
  actualAmount: number
  currency: string
  status: ReconciliationStatus
  detectedAt: string
}

export interface SystemHealthMetrics {
  healthScore: number // 0 - 100%
  status: 'healthy' | 'degraded' | 'critical'
  dlqDepth: number
  failedJobsCount: number
  financialDiscrepanciesCount: number
  calculatedAt: string
}

export interface MaintenanceLogEntity {
  logId: string
  executionId: string
  correlationId: string
  jobName: MaintenanceJobName
  priority: MaintenancePriority
  startedBy: 'scheduler' | 'manual_admin' | 'api'
  status: 'running' | 'success' | 'failed' | 'partial_success'
  itemsProcessed: number
  itemsFailed: number
  durationMs: number
  jobVersion: string
  engineVersion: string
  errorDetails?: string
  executedAt: string
}

export interface MaintenancePolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
