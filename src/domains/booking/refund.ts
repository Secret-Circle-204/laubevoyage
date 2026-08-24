import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { validateTransition } from './state-machine'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { ExperienceService } from '../experience/service'

/**
 * Booking Refund Sub-Service
 * Transitions booking to REFUNDED, releases capacity holds, restores points.
 */
export class BookingRefund {
  private repository: BookingRepository
  private experienceService: ExperienceService

  constructor(repository: BookingRepository, experienceService: ExperienceService) {
    this.repository = repository
    this.experienceService = experienceService
  }

  async refund(bookingId: number, actor?: Actor, context?: RequestContext): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)
    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Refund Service' }

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
      } catch (err: any) {
        console.error(`[BookingRefund] Failed to release slot capacity:`, err)
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
      } catch (err: any) {
        console.error(`[BookingRefund] Failed to release committed capacity:`, err)
      }
    }

    // Release point hold
    const releasedPointHold = booking.pointHold
      ? PointHoldService.releaseHold(booking.pointHold)
      : null

    const updatedMetadata = booking.metadata || {}
    updatedMetadata.terminalReason = {
      type: 'REFUND',
      reason: 'Payment Refunded',
    }

    // Append timeline and audit
    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'booking_refunded',
      title: 'Booking Refunded',
      description: 'The booking was fully refunded.',
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: currentActor,
      action: 'BOOKING_REFUNDED',
      reason: 'Payment Refunded',
      previousValue: booking.status,
      newValue: BookingStatus.REFUNDED,
    })

    const refundedBooking = await this.repository.transitionStatus(bookingId, BookingStatus.REFUNDED, {
      capacityHold: releasedCapacity,
      pointHold: releasedPointHold,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
      metadata: updatedMetadata,
    }, context)

    return refundedBooking
  }
}
