import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingCancelledEvent } from '../booking-events'
import type {
  LoyaltyEarnedEvent,
  PointsRedeemedEvent,
  PointsRefundedEvent,
  TierUpgradedEvent,
  ManualAdjustmentEvent,
} from '../loyalty-events'
import type { CustomerUpdatedEvent } from '../customer-events'
import { DashboardWorkflowEngine } from '../../dashboard/workflow'
import { DashboardProjectionRepository } from '../../dashboard/repository'
import { DashboardQueryBus } from '../../dashboard/query-bus'
import { CustomerRepository } from '../../customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../../customer/repositories/session-repository'
import { LoyaltyRepository } from '../../loyalty/repository'
import { BookingRepository } from '../../booking/repository'

/**
 * Dashboard CQRS Read Model Subscriber
 * Asynchronously updates or invalidates pre-compiled CustomerPortalProjection read models upon domain events.
 *
 * L1 Cache Strategy: Write-through
 * saveProjection() writes both DB and L1 in a single operation. No explicit invalidate() is called
 * after save — the newly compiled projection remains hot in L1 for the next dashboard request,
 * avoiding a redundant DB roundtrip. L1 is populated from the Ledger (source of truth) and is
 * always correct at the time of write.
 */
export function registerDashboardProjectionSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const customerRepo = new CustomerRepository(payload)
  const sessionRepo = new DeviceSessionRepository(payload)
  const loyaltyRepo = new LoyaltyRepository(payload)
  const bookingRepo = new BookingRepository(payload)

  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const workflowEngine = new DashboardWorkflowEngine(dashboardRepo, queryBus)

  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'DashboardSubscriber.updateProjectionOnBooking',
    async (event) => {
      const customerId = event.booking.customerId
      try {
        console.log(
          `[DashboardSubscriber] BookingConfirmedEvent received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.

        // Publish DASHBOARD_PROJECTION_REBUILT event for Presentation layers
        const localBus = EventBus.getInstance()
        await localBus.publish({
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
        })
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<LoyaltyEarnedEvent>(
    'LOYALTY_EARNED',
    'DashboardSubscriber.updateProjectionOnLoyalty',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] LoyaltyEarnedEvent received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.

        // Publish DASHBOARD_PROJECTION_REBUILT event for Presentation layers
        const localBus = EventBus.getInstance()
        await localBus.publish({
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_loy_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
        })
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<BookingCancelledEvent>(
    'BOOKING_CANCELLED',
    'DashboardSubscriber.updateProjectionOnCancellation',
    async (event) => {
      const customerId = event.booking.customerId
      try {
        console.log(
          `[DashboardSubscriber] BookingCancelledEvent received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.

        // Publish DASHBOARD_PROJECTION_REBUILT event for Presentation layers
        const localBus = EventBus.getInstance()
        await localBus.publish({
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_cancel_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
        })
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on cancellation:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<PointsRedeemedEvent>(
    'POINTS_REDEEMED',
    'DashboardSubscriber.updateProjectionOnRedemption',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] POINTS_REDEEMED received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on redemption:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<PointsRefundedEvent>(
    'POINTS_REFUNDED',
    'DashboardSubscriber.updateProjectionOnRefund',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] POINTS_REFUNDED received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on refund:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<ManualAdjustmentEvent>(
    'MANUAL_ADJUSTMENT',
    'DashboardSubscriber.updateProjectionOnAdjustment',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] MANUAL_ADJUSTMENT received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on adjustment:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'DashboardSubscriber.updateProjectionOnTierUpgrade',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] TIER_UPGRADED received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
        // Write-through: L1 is set by saveProjection(). No invalidation needed.
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on tier upgrade:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )

  eventBus.subscribe<CustomerUpdatedEvent>(
    'CUSTOMER_UPDATED',
    'DashboardSubscriber.updateProjectionOnCustomerUpdate',
    async (event) => {
      const customerId = event.customerId
      try {
        console.log(
          `[DashboardSubscriber] CUSTOMER_UPDATED received. Updating CQRS Projection for customer #${customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          customerId,
        )
        await workflowEngine.repository.saveProjection(projection)

        // Publish DASHBOARD_PROJECTION_REBUILT event for Presentation layers
        const localBus = EventBus.getInstance()
        await localBus.publish({
          type: 'DASHBOARD_PROJECTION_REBUILT',
          eventId: `evt_dash_rebuilt_cust_${customerId}_${Date.now()}`,
          correlationId: event.correlationId,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
        })
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection on customer update:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )
}

