import type { MaintenancePolicyResult, MaintenanceJobName } from './types'

/**
 * Pure Maintenance Policy
 * Single source of truth for background execution predicates and concurrency limits.
 */
export class MaintenancePolicy {
  static canExecuteJob(jobName: MaintenanceJobName, activeLeaseWorkerId?: string): MaintenancePolicyResult {
    if (activeLeaseWorkerId) {
      return {
        allowed: false,
        code: 'JOB_LEASE_LOCKED',
        reason: `Job ${jobName} is currently locked by active lease worker: ${activeLeaseWorkerId}`,
      }
    }

    return { allowed: true }
  }
}
