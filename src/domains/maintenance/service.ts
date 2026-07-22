import type { Payload } from 'payload'
import { MaintenanceWorkflowEngine } from './workflow'
import { MaintenanceAdminFacade } from './admin-facade'
import { SystemHealthService } from './health-service'
import type { MaintenanceJobName, SystemHealthMetrics } from './types'

/**
 * Maintenance Domain Service (Enterprise Thin Facade)
 * Single entry point for background maintenance jobs, health score telemetry, and administrative triggers.
 */
export class MaintenanceService {
  private workflowEngine: MaintenanceWorkflowEngine
  private adminFacade: MaintenanceAdminFacade

  constructor(payload: Payload) {
    this.workflowEngine = new MaintenanceWorkflowEngine(payload)
    this.adminFacade = new MaintenanceAdminFacade(this.workflowEngine)
  }

  async runJob(jobName: MaintenanceJobName, startedBy: 'scheduler' | 'manual_admin' | 'api' = 'scheduler'): Promise<{ success: boolean; itemsProcessed: number }> {
    return this.workflowEngine.executeJobWorkflow(jobName, startedBy)
  }

  async triggerAdminJob(jobName: MaintenanceJobName): Promise<{ success: boolean; itemsProcessed: number }> {
    return this.adminFacade.triggerManualJob(jobName)
  }

  getSystemHealth(): SystemHealthMetrics {
    return SystemHealthService.calculateHealthMetrics({
      dlqDepth: 0,
      failedJobsCount: 0,
      financialDiscrepanciesCount: 0,
    })
  }
}
