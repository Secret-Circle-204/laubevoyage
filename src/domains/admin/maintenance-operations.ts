import { MaintenanceService } from '../maintenance/service'
import type { MaintenanceJobName } from '../maintenance/types'

/**
 * Admin Maintenance Operations Sub-Service
 * Manual trigger for background maintenance jobs, DLQ replay, and health monitoring.
 */
export class AdminMaintenanceOperations {
  private maintenanceService?: MaintenanceService

  constructor(maintenanceService?: MaintenanceService) {
    this.maintenanceService = maintenanceService
  }

  async triggerMaintenanceJobByStaff(jobName: MaintenanceJobName): Promise<{ success: boolean; itemsProcessed: number }> {
    if (this.maintenanceService) {
      return this.maintenanceService.triggerJob(jobName, 'manual_admin', 'admin_staff_manual_worker')
    }
    return { success: true, itemsProcessed: 0 }
  }
}
