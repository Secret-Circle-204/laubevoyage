import type { Payload } from 'payload'
import { MaintenanceEngine } from './engine'
import { FinancialReconciliationService } from './reconciliation'
import { DLQRecoveryService } from './dlq-recovery'
import { DataRetentionService } from './retention'
import { MaintenanceRepository } from './repository'
import { MaintenanceLeaseService } from './lease-service'
import { MaintenancePolicy } from './policy'
import { MaintenanceScheduler } from './scheduler'
import type { MaintenanceJobName, MaintenanceLogEntity } from './types'

/**
 * Maintenance Workflow Engine
 * Central orchestrator handling distributed lease locking, batched execution, and structured audit logging.
 */
export class MaintenanceWorkflowEngine {
  public engine: MaintenanceEngine
  public reconciliationService: FinancialReconciliationService
  public dlqRecoveryService: DLQRecoveryService
  public retentionService: DataRetentionService
  public repository: MaintenanceRepository

  constructor(payload: Payload) {
    this.engine = new MaintenanceEngine(payload)
    this.reconciliationService = new FinancialReconciliationService()
    this.dlqRecoveryService = new DLQRecoveryService()
    this.retentionService = new DataRetentionService()
    this.repository = new MaintenanceRepository(payload)
  }

  async executeJobWorkflow(
    jobName: MaintenanceJobName,
    startedBy: 'scheduler' | 'manual_admin' | 'api' = 'scheduler',
    workerId = 'worker_node_1',
  ): Promise<{ success: boolean; itemsProcessed: number }> {
    const startTime = performance.now()
    const activeLease = MaintenanceLeaseService.getActiveLease(jobName)

    // Policy check for lease lock
    const policyResult = MaintenancePolicy.canExecuteJob(jobName, activeLease?.workerId)
    if (!policyResult.allowed) {
      console.warn(`[MaintenanceWorkflowEngine] Skipping execution: ${policyResult.reason}`)
      return { success: false, itemsProcessed: 0 }
    }

    // Acquire distributed lock
    const acquired = MaintenanceLeaseService.acquireLease(jobName, workerId)
    if (!acquired) {
      console.warn(`[MaintenanceWorkflowEngine] Could not acquire lease lock for job: ${jobName}`)
      return { success: false, itemsProcessed: 0 }
    }

    let itemsProcessed = 0
    let status: 'success' | 'failed' = 'success'
    let errorDetails: string | undefined

    try {
      if (jobName === 'complete_finished_bookings') {
        const res = await this.engine.completeFinishedBookings()
        itemsProcessed = res.processedCount
      } else if (jobName === 'expire_stale_holds') {
        const res = await this.engine.expireStaleDraftHolds()
        itemsProcessed = res.processedCount
      } else if (jobName === 'financial_reconciliation') {
        const res = await this.reconciliationService.reconcileTransactions()
        itemsProcessed = res.discrepancies.length
      } else if (jobName === 'dlq_recovery') {
        const res = await this.dlqRecoveryService.processDLQRecovery()
        itemsProcessed = res.recoveredCount
      } else if (jobName === 'data_retention_purge') {
        const res = await this.retentionService.purgeExpiredHoldsAndSessions()
        itemsProcessed = res.purgedCount
      }
    } catch (err: any) {
      status = 'failed'
      errorDetails = err.message
    } finally {
      MaintenanceLeaseService.releaseLease(jobName, workerId)
    }

    const durationMs = performance.now() - startTime
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const logEntry: MaintenanceLogEntity = {
      logId: `log_${Date.now()}`,
      executionId,
      correlationId: `corr_${jobName}`,
      jobName,
      priority: MaintenanceScheduler.getJobPriority(jobName),
      startedBy,
      status,
      itemsProcessed,
      itemsFailed: status === 'failed' ? 1 : 0,
      durationMs: Math.round(durationMs * 100) / 100,
      jobVersion: '1.0.0',
      engineVersion: '1.0.0',
      errorDetails,
      executedAt: new Date().toISOString(),
    }

    await this.repository.saveLog(logEntry)

    return { success: status === 'success', itemsProcessed }
  }
}
