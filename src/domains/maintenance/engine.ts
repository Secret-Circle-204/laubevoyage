import { MaintenanceRepository } from './repository'

/**
 * Batched Non-Locking Maintenance Engine
 * Constitutional Directive: Zero `SELECT *` over thousands of records at once.
 * Executes background tasks via chunked batched processing (`LIMIT 20` per query iteration).
 */
export class MaintenanceEngine {
  private repository: MaintenanceRepository

  constructor(repository: MaintenanceRepository) {
    this.repository = repository
  }

  /**
   * Complete Finished Bookings: status == 'confirmed' AND endDate < now() in chunks of 20
   */
  async completeFinishedBookings(batchSize = 20): Promise<{ processedCount: number }> {
    let totalProcessed = 0
    let hasMore = true

    while (hasMore) {
      const docs = await this.repository.findConfirmedExpiredBookings(batchSize)

      if (docs.length === 0) {
        hasMore = false
        break
      }

      for (const doc of docs) {
        await this.repository.updateBookingStatus(doc.id, 'completed')
        totalProcessed++
      }

      if (docs.length < batchSize) {
        hasMore = false
      }
    }

    return { processedCount: totalProcessed }
  }

  /**
   * Expire Stale Draft Holds: status == 'draft' AND holdUntil < now() in chunks of 20
   */
  async expireStaleDraftHolds(batchSize = 20): Promise<{ processedCount: number }> {
    let totalProcessed = 0
    let hasMore = true

    while (hasMore) {
      const docs = await this.repository.findStaleDraftBookings(batchSize)

      if (docs.length === 0) {
        hasMore = false
        break
      }

      for (const doc of docs) {
        await this.repository.updateBookingStatus(doc.id, 'expired')
        totalProcessed++
      }

      if (docs.length < batchSize) {
        hasMore = false
      }
    }

    return { processedCount: totalProcessed }
  }
}
