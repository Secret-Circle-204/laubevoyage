import type { Payload } from 'payload'

/**
 * Data Retention & Storage Purge Manager
 * Purges expired temporary holds older than 30 days, cleans up stale device sessions,
 * deletes unverified customers whose registration window has expired,
 * and prunes historical maintenance execution telemetry according to domain retention policies.
 */
export class DataRetentionService {
  private payload: Payload | undefined

  constructor(payload?: Payload) {
    this.payload = payload
  }

  /**
   * Purges unverified customer registration accounts whose verification period has elapsed.
   */
  async purgeUnverifiedCustomers(referenceDate: Date = new Date()): Promise<{ purgedCustomers: number }> {
    if (!this.payload) return { purgedCustomers: 0 }

    const nowIso = referenceDate.toISOString()
    let purgedCustomers = 0
    const BATCH_LIMIT = 100

    try {
      const expiredCustomers = await this.payload.find({
        collection: 'customers',
        where: {
          and: [
            { status: { equals: 'pending_verification' } },
            { verificationExpiresAt: { less_than: nowIso } },
          ],
        },
        limit: BATCH_LIMIT,
      })

      for (const doc of expiredCustomers.docs) {
        try {
          await this.payload.delete({
            collection: 'customers',
            id: Number(doc.id),
          })
          purgedCustomers++
        } catch (err: unknown) {
          console.error(`[DataRetentionService] Failed to delete customer #${doc.id}:`, err)
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[DataRetentionService] Error during customer retention purge query:', errMsg)
    }

    return { purgedCustomers }
  }

  /**
   * Purges historical maintenance execution telemetry according to domain retention policies:
   * - 14-day retention for routine no-op logs (status: 'success' AND itemsProcessed: 0)
   * - 90-day retention for logs with meaningful activity (status: 'success' AND itemsProcessed > 0)
   * - 90-day retention for execution anomalies (status: 'failed' OR status: 'partial_success')
   * - In-flight records (status: 'running') are STRICTLY IMMUNE and NEVER deleted.
   *
   * Bounded batching (limit: 100 per query pass) prevents database lock contention.
   */
  async purgeExpiredMaintenanceLogs(referenceDate: Date = new Date()): Promise<{ purgedLogs: number }> {
    if (!this.payload) return { purgedLogs: 0 }

    const nowMs = referenceDate.getTime()
    const cutoff14dIso = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString()
    const cutoff90dIso = new Date(nowMs - 90 * 24 * 60 * 60 * 1000).toISOString()

    let purgedLogs = 0
    const BATCH_LIMIT = 100

    try {
      // 1. Tier 1: Routine No-Op Logs (Success + 0 Processed) older than 14 Days
      const routineLogs = await this.payload.find({
        collection: 'maintenance-logs',
        where: {
          and: [
            { status: { equals: 'success' } },
            { itemsProcessed: { equals: 0 } },
            { executedAt: { less_than: cutoff14dIso } },
          ],
        },
        limit: BATCH_LIMIT,
      })

      for (const doc of routineLogs.docs) {
        try {
          await this.payload.delete({
            collection: 'maintenance-logs',
            id: Number(doc.id),
          })
          purgedLogs++
        } catch (err: unknown) {
          console.error(`[DataRetentionService] Failed to delete routine maintenance log #${doc.id}:`, err)
        }
      }

      // 2. Tier 2: Meaningful Success Logs (itemsProcessed > 0) older than 90 Days
      const meaningfulLogs = await this.payload.find({
        collection: 'maintenance-logs',
        where: {
          and: [
            { status: { equals: 'success' } },
            { itemsProcessed: { greater_than: 0 } },
            { executedAt: { less_than: cutoff90dIso } },
          ],
        },
        limit: BATCH_LIMIT,
      })

      for (const doc of meaningfulLogs.docs) {
        try {
          await this.payload.delete({
            collection: 'maintenance-logs',
            id: Number(doc.id),
          })
          purgedLogs++
        } catch (err: unknown) {
          console.error(`[DataRetentionService] Failed to delete meaningful maintenance log #${doc.id}:`, err)
        }
      }

      // 3. Tier 3: Error & Partial Success Logs older than 90 Days
      const anomalyLogs = await this.payload.find({
        collection: 'maintenance-logs',
        where: {
          and: [
            { status: { in: ['failed', 'partial_success'] } },
            { executedAt: { less_than: cutoff90dIso } },
          ],
        },
        limit: BATCH_LIMIT,
      })

      for (const doc of anomalyLogs.docs) {
        try {
          await this.payload.delete({
            collection: 'maintenance-logs',
            id: Number(doc.id),
          })
          purgedLogs++
        } catch (err: unknown) {
          console.error(`[DataRetentionService] Failed to delete anomaly maintenance log #${doc.id}:`, err)
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[DataRetentionService] Error during maintenance log retention query:', errMsg)
    }

    return { purgedLogs }
  }

  /**
   * Main entrypoint for hourly data_retention_purge job.
   */
  async purgeExpiredHoldsAndSessions(referenceDate: Date = new Date()): Promise<{ purgedCount: number }> {
    const { purgedCustomers } = await this.purgeUnverifiedCustomers(referenceDate)
    const { purgedLogs } = await this.purgeExpiredMaintenanceLogs(referenceDate)
    return { purgedCount: purgedCustomers + purgedLogs }
  }
}
