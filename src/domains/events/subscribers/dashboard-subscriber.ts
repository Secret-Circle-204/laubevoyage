import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingCancelledEvent } from '../booking-events'
import type { LoyaltyEarnedEvent } from '../loyalty-events'
import { DashboardWorkflowEngine } from '../../dashboard/workflow'
import { DashboardProjectionRepository } from '../../dashboard/repository'
import { DashboardQueryBus } from '../../dashboard/query-bus'
import { CustomerRepository } from '../../customer/repositories/customer-repository'
import { LoyaltyRepository } from '../../loyalty/repository'
import { BookingRepository } from '../../booking/repository'

/**
 * Dashboard CQRS Read Model Subscriber
 * Asynchronously updates or invalidates pre-compiled CustomerPortalProjection read models upon domain events.
 */
export function registerDashboardProjectionSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const customerRepo = new CustomerRepository(payload)
  const loyaltyRepo = new LoyaltyRepository(payload)
  const bookingRepo = new BookingRepository(payload)

  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo)
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
        workflowEngine.repository.invalidate(customerId)

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
        workflowEngine.repository.invalidate(customerId)

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
        workflowEngine.repository.invalidate(customerId)

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
}
