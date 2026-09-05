import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { EventOutboxService } from '../events/outbox'
import { ExperienceService } from '../experience/service'

/**
 * Booking Cancellation Sub-Service
 * Enforces cancellation policies, releases holds, restores points, and emits BookingCancelledEvent.
 */
export class BookingCancellation {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private outboxService: EventOutboxService

  constructor(repository: BookingRepository, experienceService: ExperienceService) {
    this.repository = repository
    this.experienceService = experienceService
    this.outboxService = EventOutboxService.getInstance()
  }

  async cancel(bookingId: number, actor: Actor, reason: string, context?: RequestContext): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)

    // Validate cancellation policy
    const policyResult = BookingPolicy.canCancel(booking, actor)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Cancellation forbidden: ${policyResult.reason}`)
    }

    // Release capacity hold if active, or release committed capacity if confirmed/paid
    let releasedCapacity = booking.capacityHold
    if (booking.capacityHold && booking.capacityHold.status === 'active') {
      releasedCapacity = CapacityHoldService.releaseHold(booking.capacityHold)

      try {
        const departureId = booking.capacityHold.departureId || (await this.experienceService.getDepartureSlotByDate(
          booking.capacityHold.experienceId,
          booking.capacityHold.date,
          context,
        ))?.departureId
        if (departureId) {
          await this.experienceService.releaseCapacity(departureId, booking.capacityHold.seats, context)
          console.log(`[BookingCancellation] Released uncommitted slot capacity: Slot ID ${departureId}, ${booking.capacityHold.seats} seats.`)
        }
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        console.error(`[BookingCancellation] Failed to release slot capacity:`, errorObj)
        throw new Error(`[BookingCancellation] Capacity release failed for Booking #${booking.id}: ${errorObj.message}`, { cause: errorObj })
      }
    } else if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
      try {
        const seats = booking.travelers?.length || booking.capacityHold?.seats || 1
        const departureId = booking.capacityHold?.departureId || (await this.experienceService.getDepartureSlotByDate(
          booking.experienceId,
          booking.startDate,
          context,
        ))?.departureId
        if (departureId && typeof this.experienceService.releaseCommittedCapacity === 'function') {
          await this.experienceService.releaseCommittedCapacity(departureId, seats, context)
          console.log(`[BookingCancellation] Released committed sold capacity: Slot ID ${departureId}, ${seats} seats.`)
        }
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        console.error(`[BookingCancellation] Failed to release committed capacity:`, errorObj)
        throw new Error(`[BookingCancellation] Committed capacity release failed for Booking #${booking.id}: ${errorObj.message}`, { cause: errorObj })
      }
    }

    // Release point hold
    const releasedPointHold = booking.pointHold
      ? PointHoldService.releaseHold(booking.pointHold)
      : null

    // Determine structured terminal reason
    let reasonCode: 'CUSTOMER_REQUEST' | 'COMPANY_CANCELLATION' | 'SYSTEM_POLICY' | 'COMPANY_REJECTED' = 'SYSTEM_POLICY'
    if (actor.type === 'customer') {
      reasonCode = 'CUSTOMER_REQUEST'
    } else if (actor.type === 'admin') {
      const lowerReason = reason.toLowerCase()
      if (lowerReason.includes('reject') || lowerReason.includes('refus')) {
        reasonCode = 'COMPANY_REJECTED'
      } else {
        reasonCode = 'COMPANY_CANCELLATION'
      }
    }

    const updatedMetadata = booking.metadata || {}
    updatedMetadata.terminalReason = {
      type: reasonCode === 'COMPANY_REJECTED' ? 'REJECTION' : 'CANCELLATION',
      reason: reasonCode,
    }

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

    const cancelledBooking = await this.repository.transitionStatus(bookingId, BookingStatus.CANCELLED, {
      capacityHold: releasedCapacity,
      pointHold: releasedPointHold,
      notes: reason,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
      metadata: updatedMetadata,
    }, context)

    // Publish BookingCancelledEvent via outbox
    await this.outboxService.record({
      type: 'BOOKING_CANCELLED',
      aggregateType: 'Booking',
      aggregateId: String(bookingId),
      booking: cancelledBooking,
      actor,
      reason,
    }, context)

    return cancelledBooking
  }
}
