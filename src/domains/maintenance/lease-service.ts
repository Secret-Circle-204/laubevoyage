import type { Payload } from 'payload'
import type { MaintenanceLeaseEntity } from './types'

/**
 * Distributed Maintenance Lease Service
 * Prevents race conditions across multi-replica/process deployments using database-backed leases,
 * while maintaining backward compatibility with in-memory fallbacks for unit testing.
 */
export class MaintenanceLeaseService {
  private static leases: Map<string, MaintenanceLeaseEntity> = new Map()
  private static activeHeartbeats: Map<string, NodeJS.Timeout> = new Map()

  static async acquireLease(
    payloadOrJob: Payload | string,
    jobOrWorker: string,
    workerOrTtl?: string | number,
    ttlMs = 60000
  ): Promise<boolean> {
    let payload: Payload | undefined
    let jobName: string
    let workerId: string
    let ttl = ttlMs

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
      workerId = jobOrWorker
      ttl = typeof workerOrTtl === 'number' ? workerOrTtl : ttlMs
    } else {
      payload = payloadOrJob
      jobName = jobOrWorker
      workerId = workerOrTtl as string
      ttl = typeof ttlMs === 'number' ? ttlMs : 60000
    }

    const pool = (payload as unknown as { db?: { pool?: { query: Function } } })?.db?.pool
    if (!pool || typeof pool.query !== 'function') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[MaintenanceLeaseService] Database connection pool is unavailable for distributed locking in production.')
      }
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

    const leaseExpiresAt = new Date(Date.now() + ttl)

    try {
      const query = `
        INSERT INTO "maintenance_leases" (job_name, worker_id, lease_expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (job_name)
        DO UPDATE SET
          worker_id = EXCLUDED.worker_id,
          lease_expires_at = EXCLUDED.lease_expires_at,
          updated_at = NOW()
        WHERE "maintenance_leases".lease_expires_at <= NOW()
           OR "maintenance_leases".worker_id = EXCLUDED.worker_id
        RETURNING *;
      `
      const res = await pool.query(query, [jobName, workerId, leaseExpiresAt])
      const acquired = res.rowCount > 0

      if (acquired) {
        const old = this.activeHeartbeats.get(jobName)
        if (old) clearInterval(old)

        const intervalMs = Math.max(5000, ttl / 2)
        const heartbeat = setInterval(async () => {
          const renewed = await MaintenanceLeaseService.renewLease(payload!, jobName, workerId, ttl)
          if (!renewed) {
            clearInterval(heartbeat)
            MaintenanceLeaseService.activeHeartbeats.delete(jobName)
          }
        }, intervalMs)

        if (typeof heartbeat.unref === 'function') {
          heartbeat.unref()
        }
        this.activeHeartbeats.set(jobName, heartbeat)
      }

      return acquired
    } catch (err) {
      console.error(`[MaintenanceLeaseService] Error claiming DB lease for job ${jobName}:`, err)
      return false
    }
  }

  static async renewLease(
    payloadOrJob: Payload | string,
    jobOrWorker: string,
    workerOrTtl?: string | number,
    ttlMs = 60000
  ): Promise<boolean> {
    let payload: Payload | undefined
    let jobName: string
    let workerId: string
    let ttl = ttlMs

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
      workerId = jobOrWorker
      ttl = typeof workerOrTtl === 'number' ? workerOrTtl : ttlMs
    } else {
      payload = payloadOrJob
      jobName = jobOrWorker
      workerId = workerOrTtl as string
      ttl = typeof ttlMs === 'number' ? ttlMs : 60000
    }

    const pool = (payload as unknown as { db?: { pool?: { query: Function } } })?.db?.pool
    if (!pool || typeof pool.query !== 'function') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[MaintenanceLeaseService] Database connection pool is unavailable for lease renewal in production.')
      }
      const now = new Date()
      const existing = this.leases.get(jobName)
      if (existing && new Date(existing.leaseExpiresAt) > now) {
        if (existing.workerId === workerId) {
          const leaseExpiresAt = new Date(now.getTime() + ttl).toISOString()
          this.leases.set(jobName, { jobName, workerId, leaseExpiresAt })
          return true
        }
      }
      return false
    }

    const leaseExpiresAt = new Date(Date.now() + ttl)

    try {
      const query = `
        UPDATE "maintenance_leases"
        SET lease_expires_at = $1, updated_at = NOW()
        WHERE job_name = $2 AND worker_id = $3
        RETURNING *;
      `
      const res = await pool.query(query, [leaseExpiresAt, jobName, workerId])
      return res.rowCount > 0
    } catch (err) {
      console.error(`[MaintenanceLeaseService] Error renewing DB lease for job ${jobName}:`, err)
      return false
    }
  }

  static async releaseLease(
    payloadOrJob: Payload | string,
    jobOrWorker: string,
    workerIdArg?: string
  ): Promise<void> {
    let payload: Payload | undefined
    let jobName: string
    let workerId: string

    if (typeof payloadOrJob === 'string') {
      jobName = payloadOrJob
      workerId = jobOrWorker
    } else {
      payload = payloadOrJob
      jobName = jobOrWorker
      workerId = workerIdArg as string
    }

    const old = this.activeHeartbeats.get(jobName)
    if (old) {
      clearInterval(old)
      this.activeHeartbeats.delete(jobName)
    }

    const pool = (payload as unknown as { db?: { pool?: { query: Function } } })?.db?.pool
    if (!pool || typeof pool.query !== 'function') {
      const existing = this.leases.get(jobName)
      if (existing && existing.workerId === workerId) {
        this.leases.delete(jobName)
      }
      return
    }

    try {
      const query = `
        DELETE FROM "maintenance_leases"
        WHERE job_name = $1 AND worker_id = $2;
      `
      await pool.query(query, [jobName, workerId])
    } catch (err) {
      console.error(`[MaintenanceLeaseService] Error releasing DB lease for job ${jobName}:`, err)
    }
  }

  static async getActiveLease(
    payloadOrJob: Payload | string,
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

    const pool = (payload as unknown as { db?: { pool?: { query: Function } } })?.db?.pool
    if (!pool || typeof pool.query !== 'function') {
      const now = new Date()
      const existing = this.leases.get(jobName)
      if (existing && new Date(existing.leaseExpiresAt) > now) {
        return existing
      }
      return undefined
    }

    try {
      const query = `
        SELECT job_name, worker_id, lease_expires_at
        FROM "maintenance_leases"
        WHERE job_name = $1 AND lease_expires_at > NOW();
      `
      const res = await pool.query(query, [jobName])
      if (res.rowCount > 0) {
        const row = res.rows[0]
        return {
          jobName: row.job_name,
          workerId: row.worker_id,
          leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
        }
      }
    } catch (err) {
      console.error(`[MaintenanceLeaseService] Error getting active DB lease for job ${jobName}:`, err)
    }
    return undefined
  }
}
