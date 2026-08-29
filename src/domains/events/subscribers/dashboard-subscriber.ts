import type { Payload, PayloadRequest } from 'payload'
import { EventBus } from '../event-bus'
import type {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  BookingCompletedEvent,
  BookingRefundedEvent,
  BookingPendingAdminReviewEvent,
} from '../booking-events'
import type {
  LoyaltyEarnedEvent,
  PointsRedeemedEvent,
  PointsRefundedEvent,
  TierUpgradedEvent,
  ManualAdjustmentEvent,
} from '../loyalty-events'
import type { CustomerUpdatedEvent } from '../customer-events'
import type { DashboardProjectionRebuiltEvent } from '../cache-events'
import { DashboardWorkflowEngine } from '../../dashboard/workflow'
import { DashboardProjectionRepository } from '../../dashboard/repository'
import { DashboardQueryBus } from '../../dashboard/query-bus'
import { CustomerRepository } from '../../customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../../customer/repositories/session-repository'
import { LoyaltyRepository } from '../../loyalty/repository'
import { BookingRepository } from '../../booking/repository'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'

/**
 * Dashboard CQRS Read Model Subscriber
 * Asynchronously updates or invalidates pre-compiled CustomerPortalProjection read models upon domain events.
 * 
 * Gate 17.5.42 & 17.5.43:
 * - Targeted slice updates with per-customer PostgreSQL advisory transaction locking.
 * - Emits targeted DASHBOARD_PROJECTION_REBUILT events with explicit `slices` array for fine-grained cache revalidation.
 */
export function registerDashboardProjectionSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const customerRepo = new CustomerRepository(payload)
  const sessionRepo = new DeviceSessionRepository(payload)
  const loyaltyRepo = new LoyaltyRepository(payload)
  const bookingRepo = new BookingRepository(payload)
  const inboxRepo = new PayloadInboxRepository(payload)

  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const workflowEngine = new DashboardWorkflowEngine(dashboardRepo, queryBus)

  // ==========================================
  // 1. BOOKING_CREATED (Target: trips + loyalty)
  // ==========================================
  eventBus.subscribe<BookingCreatedEvent>(
    'BOOKING_CREATED',
    'DashboardSubscriber.updateProjectionOnBookingCreated',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnBookingCreated'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const [tripsSlice, loyaltySlice] = await Promise.all([
          workflowEngine.overviewAggregator.calculateTripsSlice(customerId),
          workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId),
        ])

        await workflowEngine.repository.updateSlices(
          customerId,
          { trips: tripsSlice, loyalty: loyaltySlice },
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        // Publish targeted DASHBOARD_PROJECTION_REBUILT event with slices
        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_create_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips', 'loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on booking creation:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 1b. BOOKING_PENDING_ADMIN_REVIEW (Target: trips + loyalty)
  // ==========================================
  eventBus.subscribe<BookingPendingAdminReviewEvent>(
    'BOOKING_PENDING_ADMIN_REVIEW',
    'DashboardSubscriber.updateProjectionOnPendingAdminReview',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnPendingAdminReview'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const [tripsSlice, loyaltySlice] = await Promise.all([
          workflowEngine.overviewAggregator.calculateTripsSlice(customerId),
          workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId),
        ])

        await workflowEngine.repository.updateSlices(
          customerId,
          { trips: tripsSlice, loyalty: loyaltySlice },
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        // Publish targeted DASHBOARD_PROJECTION_REBUILT event with slices
        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_bnpl_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips', 'loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on pending admin review:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 2. BOOKING_CONFIRMED (Target: trips + loyalty)
  // ==========================================
  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'DashboardSubscriber.updateProjectionOnBooking',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnBooking'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const [tripsSlice, loyaltySlice] = await Promise.all([
          workflowEngine.overviewAggregator.calculateTripsSlice(customerId),
          workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId),
        ])

        await workflowEngine.repository.updateSlices(
          customerId,
          { trips: tripsSlice, loyalty: loyaltySlice },
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips', 'loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on booking:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 3. LOYALTY_EARNED (Target: loyalty slice only)
  // ==========================================
  eventBus.subscribe<LoyaltyEarnedEvent>(
    'LOYALTY_EARNED',
    'DashboardSubscriber.updateProjectionOnLoyalty',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnLoyalty'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const loyaltySlice = await workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'loyalty',
          loyaltySlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_loy_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on loyalty earned:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 4. BOOKING_CANCELLED (Target: trips + loyalty)
  // ==========================================
  eventBus.subscribe<BookingCancelledEvent>(
    'BOOKING_CANCELLED',
    'DashboardSubscriber.updateProjectionOnCancellation',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnCancellation'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const [tripsSlice, loyaltySlice] = await Promise.all([
          workflowEngine.overviewAggregator.calculateTripsSlice(customerId),
          workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId),
        ])

        await workflowEngine.repository.updateSlices(
          customerId,
          { trips: tripsSlice, loyalty: loyaltySlice },
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_cancel_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips', 'loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on cancellation:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 5. BOOKING_REFUNDED (Target: trips + loyalty)
  // ==========================================
  eventBus.subscribe<BookingRefundedEvent>(
    'BOOKING_REFUNDED',
    'DashboardSubscriber.updateProjectionOnRefund',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnRefund'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const [tripsSlice, loyaltySlice] = await Promise.all([
          workflowEngine.overviewAggregator.calculateTripsSlice(customerId),
          workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId),
        ])

        await workflowEngine.repository.updateSlices(
          customerId,
          { trips: tripsSlice, loyalty: loyaltySlice },
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_refund_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips', 'loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on refund:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 6. POINTS_REDEEMED (Target: loyalty slice only)
  // ==========================================
  eventBus.subscribe<PointsRedeemedEvent>(
    'POINTS_REDEEMED',
    'DashboardSubscriber.updateProjectionOnRedemption',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnRedemption'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const loyaltySlice = await workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'loyalty',
          loyaltySlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_redeem_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on redemption:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 7. POINTS_REFUNDED (Target: loyalty slice only)
  // ==========================================
  eventBus.subscribe<PointsRefundedEvent>(
    'POINTS_REFUNDED',
    'DashboardSubscriber.updateProjectionOnPointsRefund',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnPointsRefund'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const loyaltySlice = await workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'loyalty',
          loyaltySlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_pts_refund_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on points refund:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 8. MANUAL_ADJUSTMENT (Target: loyalty slice only)
  // ==========================================
  eventBus.subscribe<ManualAdjustmentEvent>(
    'MANUAL_ADJUSTMENT',
    'DashboardSubscriber.updateProjectionOnAdjustment',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnAdjustment'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const loyaltySlice = await workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'loyalty',
          loyaltySlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_adj_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on adjustment:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 9. TIER_UPGRADED (Target: loyalty slice only)
  // ==========================================
  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'DashboardSubscriber.updateProjectionOnTierUpgrade',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnTierUpgrade'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const loyaltySlice = await workflowEngine.overviewAggregator.calculateLoyaltySlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'loyalty',
          loyaltySlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_tier_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['loyalty'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on tier upgrade:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 10. CUSTOMER_UPDATED (Target: customer slice only)
  // ==========================================
  eventBus.subscribe<CustomerUpdatedEvent>(
    'CUSTOMER_UPDATED',
    'DashboardSubscriber.updateProjectionOnCustomerUpdate',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnCustomerUpdate'
      const customerId = event.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const customerSlice = await workflowEngine.overviewAggregator.calculateCustomerSlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'customer',
          customerSlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_cust_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['customer'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on customer update:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )

  // ==========================================
  // 11. BOOKING_COMPLETED (Target: trips slice only)
  // ==========================================
  eventBus.subscribe<BookingCompletedEvent>(
    'BOOKING_COMPLETED',
    'DashboardSubscriber.updateProjectionOnCompletion',
    async (event) => {
      const subscriberName = 'DashboardSubscriber.updateProjectionOnCompletion'
      const customerId = event.booking?.customerId
      if (!customerId) return

      const transactionID = payload.db?.beginTransaction ? await payload.db.beginTransaction() : undefined
      const req = transactionID ? ({ transactionID } as unknown as PayloadRequest) : undefined

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(`[DashboardSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`)
          if (transactionID && payload.db?.rollbackTransaction) await payload.db.rollbackTransaction(transactionID)
          return
        }

        await dashboardRepo.acquireProjectionAdvisoryLock(customerId, req)

        const tripsSlice = await workflowEngine.overviewAggregator.calculateTripsSlice(customerId)

        await workflowEngine.repository.updateSlice(
          customerId,
          'trips',
          tripsSlice,
          () => workflowEngine.overviewAggregator.aggregatePortalOverview(customerId),
          req,
        )

        if (transactionID && payload.db?.commitTransaction) await payload.db.commitTransaction(transactionID)

        const localBus = EventBus.getInstance()
        const rebuildEvent: DashboardProjectionRebuiltEvent = {
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_compl_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          slices: ['trips'],
        }
        await localBus.publish(rebuildEvent)
      } catch (err: unknown) {
        if (transactionID && payload.db?.rollbackTransaction) {
          try {
            await payload.db.rollbackTransaction(transactionID)
          } catch {
            // Rollback already completed
          }
        }
        console.error(`[DashboardSubscriber] Error updating projection on completion:`, err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )
}
