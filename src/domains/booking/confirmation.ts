import { BookingStatus, RequestContext } from '@/types'
import type { Actor, BookingAggregate, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { PaymentAttemptsService } from './payment-attempts'
import { EventBus } from '../events/event-bus'
import { EventOutboxService } from '../events/outbox'
import { validateTransition } from './state-machine'

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
  async markAsPaid(bookingId: number, paymentAttempt: PaymentAttempt, actor?: Actor, context?: RequestContext): Promise<BookingAggregate> {
    console.log(`[BookingConfirmation] 💳 markAsPaid called for Booking #${bookingId}. Attempt status: ${paymentAttempt.status}, transactionRef: ${paymentAttempt.transactionReference}`);
    const booking = await this.repository.findById(bookingId, context)

    // Validate transition via State Machine
    validateTransition(booking.status, BookingStatus.PAID)
    
    // Record payment attempt
    const updatedAttempts = PaymentAttemptsService.recordAttempt(booking.paymentAttempts, {
      provider: paymentAttempt.provider,
      amount: paymentAttempt.amount,
      currency: paymentAttempt.currency,
      status: paymentAttempt.status,
      transactionReference: paymentAttempt.transactionReference,
      failureReason: paymentAttempt.failureReason,
    })

    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'booking_paid',
      title: 'Booking Paid',
      description: `Payment attempt status: ${paymentAttempt.status}. Ref: ${paymentAttempt.transactionReference}`,
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: actor || { id: 'system', type: 'system', name: 'Stripe Webhook' },
      action: 'BOOKING_PAID',
      reason: 'Payment transaction confirmed by Stripe',
      previousValue: booking.status,
      newValue: BookingStatus.PAID,
    })

    // Persist paid status in repository (inside transaction)
    return this.repository.update(bookingId, {
      status: BookingStatus.PAID,
      paymentId: paymentAttempt.transactionReference || paymentAttempt.attemptId,
      paymentAttempts: updatedAttempts,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    }, context)
  }

  /**
   * Commit capacity reservations, points, and transition to CONFIRMED.
   */
  async confirm(bookingId: number, actor?: Actor, context?: RequestContext): Promise<BookingAggregate> {
    console.log(`[BookingConfirmation] 🚀 confirm called for Booking #${bookingId}.`);
    const booking = await this.repository.findById(bookingId, context)

    // Idempotency: exit early if already confirmed or completed
    if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) {
      console.log(`[BookingConfirmation] Idempotency: Booking #${bookingId} is already ${booking.status}. No-op success.`);
      return booking
    }

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
    }, context)

    console.log(`[BookingConfirmation] 🎉 Booking #${bookingId} status updated to CONFIRMED in repository.`);
    return confirmedBooking
  }

  /**
   * Post-Commit Domain Event Dispatcher:
   * Records BOOKING_CONFIRMED event into Transactional Outbox ONLY AFTER the database transaction has committed.
   */
  async publishBookingConfirmedEvent(booking: BookingAggregate, actor?: Actor): Promise<void> {
    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Booking Confirmation Service' }
    console.log(`[BookingConfirmation] 📤 Recording POST-COMMIT BOOKING_CONFIRMED event into Outbox for Booking #${booking.id}...`);

    const outboxService = EventOutboxService.getInstance()
    await outboxService.record({
      eventId: `evt_bk_conf_${booking.id}_${Date.now()}`,
      correlationId: `corr_${booking.id}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'BOOKING_CONFIRMED',
      aggregateType: 'Booking',
      aggregateId: String(booking.id),
      booking,
      actor: currentActor,
      timestamp: new Date().toISOString(),
    })
  }
}
