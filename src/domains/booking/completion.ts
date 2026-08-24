import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { BookingHistoryService } from './history'
import { EventOutboxService } from '../events/outbox'

/**
 * Booking Completion Sub-Service
 * Marks trip as completed after end date and publishes BookingCompletedEvent.
 */
export class BookingCompletion {
  private repository: BookingRepository
  private outboxService: EventOutboxService

  constructor(repository: BookingRepository) {
    this.repository = repository
    this.outboxService = EventOutboxService.getInstance()
  }

  async complete(bookingId: number, actor?: Actor, context?: RequestContext): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)

    // Validate completion policy
    const policyResult = BookingPolicy.canComplete(booking)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Completion forbidden: ${policyResult.reason}`)
    }

    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Trip End Worker' }

    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'trip_completed',
      title: 'Trip Completed',
      description: 'Hope you enjoyed your journey with L\'Aube Voyage!',
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: currentActor,
      action: 'BOOKING_COMPLETED',
      previousValue: booking.status,
      newValue: BookingStatus.COMPLETED,
    })

    const completedBooking = await this.repository.transitionStatus(bookingId, BookingStatus.COMPLETED, {
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    }, context)

    await this.outboxService.record({
      type: 'BOOKING_COMPLETED',
      booking: completedBooking,
      actor: currentActor,
    }, context)

    return completedBooking
  }
}
