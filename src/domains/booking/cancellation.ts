import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { EventBus } from '../events/event-bus'

/**
 * Booking Cancellation Sub-Service
 * Enforces cancellation policies, releases holds, restores points, and emits BookingCancelledEvent.
 */
export class BookingCancellation {
  private repository: BookingRepository
  private eventBus: EventBus

  constructor(repository: BookingRepository) {
    this.repository = repository
    this.eventBus = EventBus.getInstance()
  }

  async cancel(bookingId: number, actor: Actor, reason: string): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId)

    // Validate cancellation policy
    const policyResult = BookingPolicy.canCancel(booking, actor)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Cancellation forbidden: ${policyResult.reason}`)
    }

    // Release capacity hold
    const releasedCapacity = booking.capacityHold
      ? CapacityHoldService.releaseHold(booking.capacityHold)
      : null

    // Release point hold
    const releasedPointHold = booking.pointHold
      ? PointHoldService.releaseHold(booking.pointHold)
      : null

    // Append timeline and audit
    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'booking_cancelled',
      title: 'Booking Cancelled',
      description: `Booking was cancelled. Reason: ${reason}`,
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor,
      action: 'BOOKING_CANCELLED',
      reason,
      previousValue: booking.status,
      newValue: BookingStatus.CANCELLED,
    })

    const cancelledBooking = await this.repository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      capacityHold: releasedCapacity,
      pointHold: releasedPointHold,
      notes: reason,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    })

    // Publish BookingCancelledEvent
    await this.eventBus.publish({
      eventId: `evt_bk_canc_${bookingId}_${Date.now()}`,
      correlationId: `corr_${bookingId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'BOOKING_CANCELLED',
      booking: cancelledBooking,
      actor,
      reason,
      timestamp: new Date().toISOString(),
    })

    return cancelledBooking
  }
}
