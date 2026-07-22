import type { MaintenanceJobName, MaintenancePriority } from './types'

/**
 * Job Priority Weight Map
 * critical (4) > high (3) > medium (2) > low (1)
 */
export const JOB_PRIORITIES: Record<MaintenanceJobName, MaintenancePriority> = {
  financial_reconciliation: 'critical',
  expire_stale_holds: 'high',
  complete_finished_bookings: 'medium',
  dlq_recovery: 'medium',
  data_retention_purge: 'low',
}

/**
 * Job Dependencies Graph
 */
export const JOB_DEPENDENCIES: Partial<Record<MaintenanceJobName, MaintenanceJobName>> = {
  financial_reconciliation: 'complete_finished_bookings',
  data_retention_purge: 'dlq_recovery',
}

export class MaintenanceScheduler {
  static getJobPriority(jobName: MaintenanceJobName): MaintenancePriority {
    return JOB_PRIORITIES[jobName] || 'medium'
  }

  static canRunJob(jobName: MaintenanceJobName, completedJobs: Set<MaintenanceJobName>): boolean {
    const requiredDep = JOB_DEPENDENCIES[jobName]
    if (requiredDep && !completedJobs.has(requiredDep)) {
      return false // Dependency not completed!
    }
    return true
  }
}
