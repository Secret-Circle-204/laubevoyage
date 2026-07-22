import type { MaintenanceLeaseEntity } from './types'

/**
 * Distributed Maintenance Lease Service
 * Prevents race conditions across multi-replica deployments (Replica A vs Replica B). Only 1 worker holds active lease.
 */
export class MaintenanceLeaseService {
  private static leases: Map<string, MaintenanceLeaseEntity> = new Map()

  static acquireLease(jobName: string, workerId: string, ttlMs = 60000): boolean {
    const now = new Date()
    const existing = this.leases.get(jobName)

    if (existing && new Date(existing.leaseExpiresAt) > now) {
      if (existing.workerId !== workerId) {
        return false // Lock held by another worker!
      }
    }

    const leaseExpiresAt = new Date(now.getTime() + ttlMs).toISOString()
    this.leases.set(jobName, { jobName, workerId, leaseExpiresAt })
    return true
  }

  static renewLease(jobName: string, workerId: string, ttlMs = 60000): boolean {
    return this.acquireLease(jobName, workerId, ttlMs)
  }

  static releaseLease(jobName: string, workerId: string): void {
    const existing = this.leases.get(jobName)
    if (existing && existing.workerId === workerId) {
      this.leases.delete(jobName)
    }
  }

  static getActiveLease(jobName: string): MaintenanceLeaseEntity | undefined {
    const now = new Date()
    const existing = this.leases.get(jobName)
    if (existing && new Date(existing.leaseExpiresAt) > now) {
      return existing
    }
    return undefined
  }
}
