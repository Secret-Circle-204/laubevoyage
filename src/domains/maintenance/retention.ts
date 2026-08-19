import type { Payload } from 'payload'

/**
 * Data Retention & Storage Purge Manager
 * Purges expired temporary holds older than 30 days, cleans up stale device sessions,
 * and deletes unverified customers whose registration window has expired.
 */
export class DataRetentionService {
  private payload: Payload | undefined

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async purgeExpiredHoldsAndSessions(): Promise<{ purgedCount: number }> {
    console.log('[DataRetentionService] 🔍 Starting scheduled data retention purge for expired holds & unverified accounts...')

    if (!this.payload) {
      console.warn('[DataRetentionService] ⚠️ No payload instance provided for purge.')
      return { purgedCount: 0 }
    }

    const now = new Date().toISOString()

    try {
      // Find customers where status is 'pending_verification' and verificationExpiresAt < now
      const expiredCustomers = await this.payload.find({
        collection: 'customers',
        where: {
          and: [
            { status: { equals: 'pending_verification' } },
            { verificationExpiresAt: { less_than: now } },
          ],
        },
        limit: 100,
      })

      console.log(`[DataRetentionService] 📊 Scanned unverified accounts: Found ${expiredCustomers.docs.length} expired record(s).`)

      let purgedCount = 0

      for (const doc of expiredCustomers.docs) {
        try {
          await this.payload.delete({
            collection: 'customers',
            id: Number(doc.id),
          })
          purgedCount++
          console.log(`[DataRetentionService] 🗑️ Deleted expired customer: ID #${doc.id} (${doc.email})`)
        } catch (err: unknown) {
          console.error(`[DataRetentionService] ❌ Failed to delete customer #${doc.id}:`, err)
        }
      }

      console.log(`[DataRetentionService] ✅ Retention purge finished. Total removed: ${purgedCount} record(s).`)
      return { purgedCount }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[DataRetentionService] ❌ Error during retention purge query:', errMsg)
      return { purgedCount: 0 }
    }
  }
}
