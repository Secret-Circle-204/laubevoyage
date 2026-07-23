import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import type { LoyaltyEarnedEvent } from '../loyalty-events'
import { DashboardWorkflowEngine } from '../../dashboard/workflow'
import { DashboardProjectionRepository } from '../../dashboard/repository'

/**
 * Dashboard CQRS Read Model Subscriber
 * Asynchronously updates or invalidates pre-compiled CustomerPortalProjection read models upon domain events.
 */
export function registerDashboardProjectionSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const workflowEngine = new DashboardWorkflowEngine(dashboardRepo, payload)

  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    try {
      console.log(`[DashboardSubscriber] BookingConfirmedEvent received. Updating CQRS Projection for customer #${event.booking.customerId}...`)
      const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(event.booking.customerId)
      await workflowEngine.repository.saveProjection(projection)
    } catch (err: any) {
      console.error(`[DashboardSubscriber] Error updating CQRS projection:`, err.message)
    }
  })

  eventBus.subscribe<LoyaltyEarnedEvent>('LOYALTY_EARNED', async (event) => {
    try {
      console.log(`[DashboardSubscriber] LoyaltyEarnedEvent received. Updating CQRS Projection for customer #${event.customerId}...`)
      const projection = await workflowEngine.overviewAggregator.aggregatePortalOverview(event.customerId)
      await workflowEngine.repository.saveProjection(projection)
    } catch (err: any) {
      console.error(`[DashboardSubscriber] Error updating CQRS projection:`, err.message)
    }
  })
}
