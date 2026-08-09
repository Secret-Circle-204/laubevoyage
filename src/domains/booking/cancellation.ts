import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { EventBus } from '../events/event-bus'
import { ExperienceService } from '../experience/service'

/**
 * Booking Cancellation Sub-Service
 * Enforces cancellation policies, releases holds, restores points, and emits BookingCancelledEvent.
 */
export class BookingCancellation {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private eventBus: EventBus

  constructor(repository: BookingRepository, experienceService: ExperienceService) {
    this.repository = repository
    this.experienceService = experienceService
    this.eventBus = EventBus.getInstance()
  }

  async cancel(bookingId: number, actor: Actor, reason: string, context?: RequestContext): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)

    // Validate cancellation policy
    const policyResult = BookingPolicy.canCancel(booking, actor)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Cancellation forbidden: ${policyResult.reason}`)
    }

    // Release capacity hold if active
    let releasedCapacity = booking.capacityHold
    if (booking.capacityHold && booking.capacityHold.status === 'active') {
      releasedCapacity = CapacityHoldService.releaseHold(booking.capacityHold)

      try {
        const slot = await this.experienceService.getDepartureSlotByDate(
          booking.capacityHold.experienceId,
          booking.capacityHold.date,
          context,
        )
        if (slot && slot.departureId) {
          await this.experienceService.releaseCapacity(slot.departureId, booking.capacityHold.seats, context)
          console.log(`[BookingCancellation] Released slot capacity: Slot ID ${slot.departureId}, ${booking.capacityHold.seats} seats.`)
        }
      } catch (err: any) {
        console.error(`[BookingCancellation] Failed to release slot capacity:`, err)
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

    const cancelledBooking = await this.repository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      capacityHold: releasedCapacity,
      pointHold: releasedPointHold,
      notes: reason,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
      metadata: updatedMetadata,
    }, context)

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
