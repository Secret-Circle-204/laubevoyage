import { MaintenanceRepository } from './repository'
import type { BookingService } from '../booking/service'
import { DashboardProjectionRepository } from '../dashboard/repository'
import { DashboardOverviewAggregator } from '../dashboard/overview-aggregator'
import { DashboardQueryBus } from '../dashboard/query-bus'
import { CustomerRepository } from '../customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../customer/repositories/session-repository'
import { LoyaltyRepository } from '../loyalty/repository'
import { BookingRepository } from '../booking/repository'
import type { CustomerPortalProjection } from '../dashboard/types'
import { EventBus } from '../events/event-bus'
import type { DashboardProjectionRebuiltEvent } from '../events/cache-events'

/**
 * Batched Non-Locking Maintenance Engine
 * Constitutional Directive: Zero `SELECT *` over thousands of records at once.
 * Executes background tasks via chunked batched processing (`LIMIT 20` per query iteration).
 * Routes status transitions through BookingService as single source of truth.
 */
export class MaintenanceEngine {
  private repository: MaintenanceRepository
  private bookingService: BookingService
  private dashboardRepo?: DashboardProjectionRepository
  private overviewAggregator?: DashboardOverviewAggregator

  constructor(
    repository: MaintenanceRepository,
    bookingService: BookingService,
    dashboardRepo?: DashboardProjectionRepository,
    overviewAggregator?: DashboardOverviewAggregator,
  ) {
    this.repository = repository
    this.bookingService = bookingService
    this.dashboardRepo = dashboardRepo
    this.overviewAggregator = overviewAggregator
  }

  private getDashboardPrimitives() {
    const payload = this.repository.payloadInstance
    if (!payload) {
      throw new Error('[MaintenanceEngine] Cannot reconcile projections without initialized Payload instance.')
    }
    const dashboardRepo = this.dashboardRepo || new DashboardProjectionRepository(payload)
    if (!this.overviewAggregator) {
      const customerRepo = new CustomerRepository(payload)
      const sessionRepo = new DeviceSessionRepository(payload)
      const loyaltyRepo = new LoyaltyRepository(payload)
      const bookingRepo = new BookingRepository(payload)
      const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
      this.overviewAggregator = new DashboardOverviewAggregator(queryBus)
    }
    return { dashboardRepo, overviewAggregator: this.overviewAggregator }
  }

  /**
   * Complete Finished Bookings: status == 'confirmed' AND completionAt <= now() in chunks of batchSize
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
        await this.bookingService.complete(doc.id)
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
    const processedCount = await this.bookingService.processExpiredBookings()
    const result = { processedCount }
    return result
  }

  /**
   * Reconcile Dashboard Projections:
   * Scans stored CustomerPortalProjection Read Models using bounded, deterministic pagination (`sort: id`).
   * Holds PostgreSQL transaction-scoped advisory lock across the complete aggregation -> diff -> write cycle.
   * Performs ZERO writes when projection state is clean.
   * Performs atomic write + cache tag invalidation only when drift is detected.
   */
  async reconcileDashboardProjections(batchSize: number = 50): Promise<{ processedCount: number; healedCount: number; cleanCount: number }> {
    const payload = this.repository.payloadInstance
    if (!payload) {
      throw new Error('[MaintenanceEngine] Cannot reconcile projections without initialized Payload instance.')
    }
    const { dashboardRepo, overviewAggregator } = this.getDashboardPrimitives()

    let page = 1
    let totalProcessed = 0
    let totalHealed = 0
    let hasMore = true

    while (hasMore) {
      const res = await payload.find({
        collection: 'dashboard-projections',
        limit: batchSize,
        page,
        sort: 'id',
        depth: 0,
      })

      if (!res.docs || res.docs.length === 0) {
        hasMore = false
        break
      }

      for (const doc of res.docs as any[]) {
        const rawCust = doc.customer
        const customerId = typeof rawCust === 'object' && rawCust !== null ? Number(rawCust.id) : Number(rawCust || 0)
        if (!customerId) continue

        totalProcessed++

        // Begin transaction to hold PostgreSQL transaction-scoped advisory lock for the full duration
        let transactionID: string | number | undefined
        if (payload.db && typeof (payload.db as any).beginTransaction === 'function') {
          transactionID = await (payload.db as any).beginTransaction()
        }
        const req: any = transactionID ? { transactionID } : undefined

        try {
          // Acquire PostgreSQL transaction-scoped advisory lock for the customer
          await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

          // Read cached projection stored in document
          const cached = doc.projectionJson as CustomerPortalProjection

          // Compute canonical SSOT projection
          const fresh = await overviewAggregator.aggregatePortalOverview(customerId)

          // Deep In-Memory Drift Comparison
          const isLoyaltyDrift =
            fresh.loyalty.pointsBalance !== cached?.loyalty?.pointsBalance ||
            fresh.loyalty.activeHoldsCount !== cached?.loyalty?.activeHoldsCount ||
            fresh.loyalty.tier !== cached?.loyalty?.tier ||
            fresh.loyalty.totalSpentEGP !== cached?.loyalty?.totalSpentEGP

          const isTripsDrift =
            fresh.trips.upcomingCount !== cached?.trips?.upcomingCount ||
            fresh.trips.activeBookingsCount !== cached?.trips?.activeBookingsCount

          const isCustomerDrift =
            fresh.customer.email !== cached?.customer?.email ||
            fresh.customer.status !== cached?.customer?.status

          const hasDrift = isLoyaltyDrift || isTripsDrift || isCustomerDrift

          if (hasDrift) {
            console.log(
              `[DashboardReconciliation] 🛠️ Drift detected and healed for Customer #${customerId}: ` +
              `Points (${cached?.loyalty?.pointsBalance ?? 'N/A'} -> ${fresh.loyalty.pointsBalance}), ` +
              `Holds (${cached?.loyalty?.activeHoldsCount ?? 'N/A'} -> ${fresh.loyalty.activeHoldsCount}), ` +
              `Upcoming Trips (${cached?.trips?.upcomingCount ?? 'N/A'} -> ${fresh.trips.upcomingCount})`,
            )

            await dashboardRepo.saveProjection(fresh, req)

            // Publish targeted cache rebuild event
            const localBus = EventBus.getInstance()
            const rebuildEvent: DashboardProjectionRebuiltEvent = {
              type: 'DASHBOARD_PROJECTION_REBUILT',
              eventId: `evt_dash_reconciled_${customerId}_${Date.now()}`,
              correlationId: `reconcile_${Date.now()}`,
              eventVersion: 1,
              occurredAt: new Date().toISOString(),
              customerId,
              slices: ['loyalty', 'trips', 'customer'],
            }
            await localBus.publish(rebuildEvent)

            totalHealed++
          }

          if (transactionID) {
            await (payload.db as any).commitTransaction(transactionID)
          }
        } catch (err) {
          if (transactionID) {
            await (payload.db as any).rollbackTransaction(transactionID)
          }
          console.error(`[DashboardReconciliation] Error processing customer #${customerId}:`, err)
        }
      }

      if (page >= res.totalPages) {
        hasMore = false
      } else {
        page++
      }
    }

    const cleanCount = totalProcessed - totalHealed
    console.log(`[DashboardReconciliation] Scan completed. Examined: ${totalProcessed}, Healed: ${totalHealed}, Clean (0-writes): ${cleanCount}`)
    return { processedCount: totalProcessed, healedCount: totalHealed, cleanCount }
  }
}
