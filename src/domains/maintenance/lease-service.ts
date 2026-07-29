import type { Payload } from 'payload'
import type { MaintenanceLeaseEntity } from './types'

/**
 * Distributed Maintenance Lease Service
 * Prevents race conditions across multi-replica/process deployments using database-backed leases,
 * while maintaining backward compatibility with in-memory fallbacks for unit testing.
 */
export class MaintenanceLeaseService {
  private static leases: Map<string, MaintenanceLeaseEntity> = new Map()

  static async acquireLease(
    payloadOrJob: any,
    jobOrWorker?: string,
    workerOrTtl?: string | number,
    ttlMs = 60000
  ): Promise<boolean> {
    let payload: Payload | undefined
    let jobName: string
    let workerId: string
    let ttl = ttlMs

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
      workerId = jobOrWorker as string
      ttl = typeof workerOrTtl === 'number' ? workerOrTtl : ttlMs
    } else {
      payload = payloadOrJob
      jobName = jobOrWorker as string
      workerId = workerOrTtl as string
      ttl = typeof ttlMs === 'number' ? ttlMs : 60000
    }

    if (!payload) {
      // Fallback for unit tests (in-memory lock)
      const now = new Date()
      const existing = this.leases.get(jobName)
      if (existing && new Date(existing.leaseExpiresAt) > now) {
        if (existing.workerId !== workerId) {
          return false
        }
      }
      const leaseExpiresAt = new Date(now.getTime() + ttl).toISOString()
      this.leases.set(jobName, { jobName, workerId, leaseExpiresAt })
      return true
    }

    const pool = (payload.db as any).pool
    if (!pool || typeof pool.query !== 'function') {
      return true
    }

    const leaseExpiresAt = new Date(Date.now() + ttl).toISOString()

    try {
      const query = `
        INSERT INTO maintenance_leases (job_name, worker_id, lease_expires_at, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (job_name) DO UPDATE
        SET worker_id = EXCLUDED.worker_id,
            lease_expires_at = EXCLUDED.lease_expires_at,
            updated_at = NOW()
        WHERE maintenance_leases.lease_expires_at <= NOW()
           OR maintenance_leases.worker_id = EXCLUDED.worker_id
        RETURNING *;
      `
      const res = await pool.query(query, [jobName, workerId, leaseExpiresAt])
      return res.rows.length > 0
    } catch (error: unknown) {
      console.error(`[MaintenanceLeaseService] acquireLease failed for job ${jobName}:`, error)
      return false
    }
  }

  static async renewLease(
    payloadOrJob: any,
    jobOrWorker?: string,
    workerOrTtl?: string | number,
    ttlMs = 60000
  ): Promise<boolean> {
    return this.acquireLease(payloadOrJob, jobOrWorker, workerOrTtl, ttlMs)
  }

  static async releaseLease(
    payloadOrJob: any,
    jobOrWorker?: string,
    workerIdArg?: string
  ): Promise<void> {
    let payload: Payload | undefined
    let jobName: string
    let workerId: string

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
      workerId = jobOrWorker as string
    } else {
      payload = payloadOrJob
      jobName = jobOrWorker as string
      workerId = workerIdArg as string
    }

    if (!payload) {
      const existing = this.leases.get(jobName)
      if (existing && existing.workerId === workerId) {
        this.leases.delete(jobName)
      }
      return
    }

    const pool = (payload.db as any).pool
    if (!pool || typeof pool.query !== 'function') {
      return
    }

    try {
      const query = `
        DELETE FROM maintenance_leases
        WHERE job_name = $1 AND worker_id = $2;
      `
      await pool.query(query, [jobName, workerId])
    } catch (error: unknown) {
      console.error(`[MaintenanceLeaseService] releaseLease failed for job ${jobName}:`, error)
    }
  }

  static async getActiveLease(
    payloadOrJob: any,
    jobNameArg?: string
  ): Promise<MaintenanceLeaseEntity | undefined> {
    let payload: Payload | undefined
    let jobName: string

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
    } else {
      payload = payloadOrJob
      jobName = jobNameArg as string
    }

    if (!payload) {
      const now = new Date()
      const existing = this.leases.get(jobName)
      if (existing && new Date(existing.leaseExpiresAt) > now) {
        return existing
      }
      return undefined
    }

    const pool = (payload.db as any).pool
    if (!pool || typeof pool.query !== 'function') {
      return undefined
    }

    try {
      const query = `
        SELECT job_name, worker_id, lease_expires_at
        FROM maintenance_leases
        WHERE job_name = $1 AND lease_expires_at > NOW();
      `
      const res = await pool.query(query, [jobName])
      if (res.rows.length === 0) {
        return undefined
      }

      const row = res.rows[0]
      return {
        jobName: row.job_name,
        workerId: row.worker_id,
        leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
      }
    } catch (error: unknown) {
      console.error(`[MaintenanceLeaseService] getActiveLease failed for job ${jobName}:`, error)
      return undefined
    }
  }
}
