import { MaintenanceRepository } from './repository'
import type { BookingService } from '../booking/service'

/**
 * Batched Non-Locking Maintenance Engine
 * Constitutional Directive: Zero `SELECT *` over thousands of records at once.
 * Executes background tasks via chunked batched processing (`LIMIT 20` per query iteration).
 * Routes status transitions through BookingService as single source of truth.
 */
export class MaintenanceEngine {
  private repository: MaintenanceRepository
  private bookingService?: BookingService

  constructor(repository: MaintenanceRepository, bookingService?: BookingService) {
    this.repository = repository
    this.bookingService = bookingService
  }

  /**
   * Complete Finished Bookings: status == 'confirmed' AND endDate < now() in chunks of 20
   */
  async completeFinishedBookings(batchSize: number): Promise<{ processedCount: number }> {
    if (batchSize === undefined || batchSize === null) {
      throw new Error('[MaintenanceEngine] completeFinishedBookings: batchSize is required.')
    }
    let totalProcessed = 0
    let hasMore = true

    while (hasMore) {
      const docs = await this.repository.findConfirmedExpiredBookings(batchSize)

      if (docs.length === 0) {
        hasMore = false
        break
      }

      for (const doc of docs) {
        if (this.bookingService) {
          await this.bookingService.complete(doc.id)
        } else {
          await this.repository.updateBookingStatus(doc.id, 'completed')
        }
        totalProcessed++
      }

      if (docs.length < batchSize) {
        hasMore = false
      }
    }

    const result = { processedCount: totalProcessed }
    return result
  }

  /**
   * Expire Stale Draft Holds: status == 'draft' AND holdUntil < now() in chunks of 20
   */
  async expireStaleDraftHolds(batchSize: number): Promise<{ processedCount: number }> {
    if (batchSize === undefined || batchSize === null) {
      throw new Error('[MaintenanceEngine] expireStaleDraftHolds: batchSize is required.')
    }
    if (this.bookingService) {
      const processedCount = await this.bookingService.processExpiredBookings()
      const result = { processedCount }
      return result
    }

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

    const result = { processedCount: totalProcessed }
    return result
  }
}
