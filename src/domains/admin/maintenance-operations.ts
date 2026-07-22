import type { Payload } from 'payload'
import { MaintenanceService } from '../maintenance/service'
import type { MaintenanceJobName } from '../maintenance/types'

/**
 * Admin Maintenance Operations Sub-Service
 * Manual trigger for background maintenance jobs, DLQ replay, and health monitoring.
 */
export class AdminMaintenanceOperations {
  private maintenanceService: MaintenanceService

  constructor(payload: Payload) {
    this.maintenanceService = new MaintenanceService(payload)
  }

  async triggerMaintenanceJobByStaff(jobName: MaintenanceJobName): Promise<{ success: boolean; itemsProcessed: number }> {
    return this.maintenanceService.triggerAdminJob(jobName)
  }
}
