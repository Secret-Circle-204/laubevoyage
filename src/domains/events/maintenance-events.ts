export interface MaintenanceJobExecutedEvent {
  type: 'MAINTENANCE_JOB_EXECUTED'
  eventVersion: 'v1'
  executionId: string
  jobName: string
  itemsProcessed: number
  status: 'success' | 'failed'
  timestamp: string
}

export interface FinancialDiscrepancyDetectedEvent {
  type: 'FINANCIAL_DISCREPANCY_DETECTED'
  eventVersion: 'v1'
  paymentId: string
  expectedAmount: number
  actualAmount: number
  status: string
  timestamp: string
}

export type MaintenanceDomainEvent =
  | MaintenanceJobExecutedEvent
  | FinancialDiscrepancyDetectedEvent
