import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { PaymentAttemptsService } from './payment-attempts'
import { EventBus } from '../events/event-bus'

/**
 * Booking Confirmation Sub-Service
 * Handles payment processing, state transition to CONFIRMED, hold commitments, and publishing BookingConfirmedEvent.
 */
export class BookingConfirmation {
  private repository: BookingRepository
  private eventBus: EventBus

  constructor(repository: BookingRepository) {
    this.repository = repository
    this.eventBus = EventBus.getInstance()
  }

  /**
   * Mark booking as PAID (called by Payment Adapter webhook).
   */
  async markAsPaid(bookingId: number, paymentAttempt: PaymentAttempt, actor?: Actor): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId)
    
    // Record payment attempt
    const updatedAttempts = PaymentAttemptsService.recordAttempt(booking.paymentAttempts, {
      provider: paymentAttempt.provider,
      amount: paymentAttempt.amount,
      currency: paymentAttempt.currency,
      status: paymentAttempt.status,
      transactionReference: paymentAttempt.transactionReference,
      failureReason: paymentAttempt.failureReason,
    })

    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Payment Webhook' }
    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'payment_received',
      title: 'Payment Received',
      description: 'Your payment was successfully processed.',
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: currentActor,
      action: 'PAYMENT_SUCCESSFUL',
      previousValue: booking.status,
      newValue: BookingStatus.PAID,
    })

    return this.repository.update(bookingId, {
      status: BookingStatus.PAID,
      paymentId: paymentAttempt.transactionReference || paymentAttempt.attemptId,
      paymentAttempts: updatedAttempts,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    })
  }

  /**
   * Confirm booking after successful payment.
   */
  async confirm(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId)

    // Validate confirmation policy
    const policyResult = BookingPolicy.canConfirm(booking)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Confirmation forbidden: ${policyResult.reason}`)
    }

    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Booking Confirmation Service' }

    // Commit holds
    const committedCapacity = booking.capacityHold
      ? CapacityHoldService.commitHold(booking.capacityHold)
      : null
    const committedPointHold = booking.pointHold
      ? PointHoldService.commitHold(booking.pointHold)
      : null

    // Append timeline and audit entries
    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'booking_confirmed',
      title: 'Booking Confirmed',
      description: 'Your booking has been confirmed! Prepare for your upcoming journey.',
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: currentActor,
      action: 'BOOKING_CONFIRMED',
      previousValue: booking.status,
      newValue: BookingStatus.CONFIRMED,
    })

    // Update repository
    const confirmedBooking = await this.repository.update(bookingId, {
      status: BookingStatus.CONFIRMED,
      capacityHold: committedCapacity,
      pointHold: committedPointHold,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    })

    // Publish BookingConfirmedEvent to decoupled listeners (Loyalty, Notification, Analytics)
    await this.eventBus.publish({
      type: 'BOOKING_CONFIRMED',
      booking: confirmedBooking,
      actor: currentActor,
      timestamp: new Date().toISOString(),
    })

    return confirmedBooking
  }
}
