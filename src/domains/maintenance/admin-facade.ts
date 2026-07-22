import type { MaintenanceJobName } from './types'
import type { MaintenanceWorkflowEngine } from './workflow'

/**
 * Maintenance Admin Facade
 * Provides administrative control facade for manual trigger by support staff.
 */
export class MaintenanceAdminFacade {
  private workflowEngine: MaintenanceWorkflowEngine

  constructor(workflowEngine: MaintenanceWorkflowEngine) {
    this.workflowEngine = workflowEngine
  }

  async triggerManualJob(jobName: MaintenanceJobName, workerId = 'admin_manual_worker'): Promise<{ success: boolean; itemsProcessed: number }> {
    console.log(`[MaintenanceAdminFacade] Manual administrative trigger initiated for job: ${jobName}`)
    return this.workflowEngine.executeJobWorkflow(jobName, 'manual_admin', workerId)
  }
}
