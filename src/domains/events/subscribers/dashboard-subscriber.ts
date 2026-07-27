import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
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
      try {
        console.log(
          `[DashboardSubscriber] BookingConfirmedEvent received. Updating CQRS Projection for customer #${event.booking.customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          event.booking.customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
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
      try {
        console.log(
          `[DashboardSubscriber] LoyaltyEarnedEvent received. Updating CQRS Projection for customer #${event.customerId}...`,
        )
        const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(
          event.customerId,
        )
        await workflowEngine.repository.saveProjection(projection)
      } catch (err: unknown) {
        console.error(
          `[DashboardSubscriber] Error updating CQRS projection:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    },
  )
}
