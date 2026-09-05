import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { validateTransition } from './state-machine'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { ExperienceService } from '../experience/service'
import { EventOutboxService } from '../events/outbox'

/**
 * Booking Refund Sub-Service
 * Transitions booking to REFUNDED, releases capacity holds, restores points, and emits BOOKING_REFUNDED event.
 */
export class BookingRefund {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private outboxService: EventOutboxService

  constructor(repository: BookingRepository, experienceService: ExperienceService) {
    this.repository = repository
    this.experienceService = experienceService
    this.outboxService = EventOutboxService.getInstance()
  }

  async refund(
    bookingId: number,
    actor?: Actor,
    context?: RequestContext,
    reason?: string,
  ): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)
    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Refund Service' }
    const refundReason = reason || 'Payment Refunded'

    // Validate state transition using canonical StateMachine
    validateTransition(booking.status, BookingStatus.REFUNDED)

    // Validate refund policy
    const policyResult = BookingPolicy.canRefund(booking)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Refund forbidden: ${policyResult.reason}`)
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
          console.log(`[BookingRefund] Released uncommitted slot capacity: Slot ID ${departureId}, ${booking.capacityHold.seats} seats.`)
        }
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        console.error(`[BookingRefund] Failed to release slot capacity:`, errorObj)
        throw new Error(`[BookingRefund] Capacity release failed for Booking #${booking.id}: ${errorObj.message}`, { cause: errorObj })
      }
    } else if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
      try {
        const seats = booking.travelers?.length || booking.capacityHold?.seats || 1
        const departureId = booking.capacityHold?.departureId || (await this.experienceService.getDepartureSlotByDate(
          booking.experienceId,
          booking.startDate,
          context,
        ))?.departureId
        if (departureId) {
          await this.experienceService.releaseCommittedCapacity(departureId, seats, context)
          console.log(`[BookingRefund] Released committed sold capacity: Slot ID ${departureId}, ${seats} seats.`)
        }
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        console.error(`[BookingRefund] Failed to release committed capacity:`, errorObj)
        throw new Error(`[BookingRefund] Committed capacity release failed for Booking #${booking.id}: ${errorObj.message}`, { cause: errorObj })
      }
    }

    // Release point hold
    const releasedPointHold = booking.pointHold
      ? PointHoldService.releaseHold(booking.pointHold)
      : null

    const updatedMetadata = booking.metadata || {}
    updatedMetadata.terminalReason = {
      type: 'REFUND',
      reason: refundReason,
    }

    // Append timeline and audit
    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'booking_refunded',
      title: 'Booking Refunded',
      description: `The booking was fully refunded. Reason: ${refundReason}`,
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: currentActor,
      action: 'BOOKING_REFUNDED',
      reason: refundReason,
      previousValue: booking.status,
      newValue: BookingStatus.REFUNDED,
    })

    const refundedBooking = await this.repository.transitionStatus(bookingId, BookingStatus.REFUNDED, {
      capacityHold: releasedCapacity,
      pointHold: releasedPointHold,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
      metadata: updatedMetadata,
      paymentStatus: 'refunded',
      amountPaid: 0,
      outstandingBalance: booking.pricingSnapshot?.totalAmountEGP || 0,
    }, context)

    // Publish canonical BOOKING_REFUNDED domain event via transactional outbox
    await this.outboxService.record({
      type: 'BOOKING_REFUNDED',
      aggregateType: 'Booking',
      aggregateId: String(booking.id),
      booking: refundedBooking,
      actor: currentActor,
      reason: refundReason,
    }, context)

    return refundedBooking
  }
}
