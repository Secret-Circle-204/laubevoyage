import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { BookingHistoryService } from './history'
import { EventBus } from '../events/event-bus'

/**
 * Booking Completion Sub-Service
 * Marks trip as completed after end date and publishes BookingCompletedEvent.
 */
export class BookingCompletion {
  private repository: BookingRepository
  private eventBus: EventBus

  constructor(repository: BookingRepository) {
    this.repository = repository
    this.eventBus = EventBus.getInstance()
  }

  async complete(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId)

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

    const completedBooking = await this.repository.update(bookingId, {
      status: BookingStatus.COMPLETED,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    })

    await this.eventBus.publish({
      type: 'BOOKING_COMPLETED',
      booking: completedBooking,
      actor: currentActor,
      timestamp: new Date().toISOString(),
    })

    return completedBooking
  }
}
