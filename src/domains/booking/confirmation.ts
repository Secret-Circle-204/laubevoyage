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
import type { ExperienceService } from '../experience/service'
import type { LoyaltyService } from '../loyalty/service'

/**
 * Booking Confirmation Sub-Service
 * Handles payment processing, state transition to CONFIRMED, hold commitments, and publishing BookingConfirmedEvent.
 */
export class BookingConfirmation {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private loyaltyService: LoyaltyService
  private eventBus: EventBus

  constructor(
    repository: BookingRepository,
    experienceService: ExperienceService,
    loyaltyService: LoyaltyService,
  ) {
    this.repository = repository
    this.experienceService = experienceService
    this.loyaltyService = loyaltyService
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
    return this.repository.transitionStatus(bookingId, BookingStatus.PAID, {
      paymentId: paymentAttempt.transactionReference || paymentAttempt.attemptId,
      paymentAttempts: updatedAttempts,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    }, context)
  }

  /**
   * Commit capacity reservations, points, and transition to CONFIRMED.
   */
  async confirm(
    bookingId: number,
    actor?: Actor,
    context?: RequestContext,
    paymentAttempts?: PaymentAttempt[],
  ): Promise<BookingAggregate> {
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

    // Commit capacity in database for Fixed Packages with physical departure slots
    let departureId = booking.capacityHold?.departureId
    const slotId = booking.departureSlot
    if (!departureId && typeof this.experienceService?.getDepartureSlotById === 'function' && slotId) {
      const slot = await this.experienceService.getDepartureSlotById(slotId, booking.experienceId)
      if (slot) {
        departureId = slot.departureId
      }
    }

    const hasSlotOrHold = !!(booking.capacityHold || slotId)
    if (hasSlotOrHold && !departureId) {
      throw new Error(`[BookingConfirmation] FATAL: Cannot confirm Booking #${bookingId} without resolving authoritative departureId. Inventory commitment is mandatory.`)
    }

    if (departureId && this.experienceService && typeof this.experienceService.commitCapacity === 'function') {
      const seatsToCommit = booking.capacityHold?.seats || (Array.isArray(booking.travelers) && booking.travelers.length > 0 ? booking.travelers.length : undefined)
      if (!seatsToCommit) {
        throw new Error(`[BookingConfirmation] FATAL: Cannot confirm Booking #${bookingId} without valid traveler count.`)
      }
      await this.experienceService.commitCapacity(
        departureId,
        seatsToCommit,
        context,
      )
    }

    // Redeem pointHold points discount idempotently inside transaction context
    if (booking.pointHold && booking.pointHold.status === 'held') {
      if (typeof this.loyaltyService?.getBookingLedgerEntries === 'function') {
        const existingEntries = await this.loyaltyService.getBookingLedgerEntries(booking.id, context)
        if (!existingEntries.some((e) => e.type === 'redeem')) {
          if (typeof this.loyaltyService?.redeemPoints === 'function') {
            await this.loyaltyService.redeemPoints(
              booking.customerId,
              booking.pointHold.pointsHeld,
              booking.id,
              booking.pricingSnapshot.totalAmountEGP,
              'Booking point discount redemption',
              undefined,
              context,
            )
            console.log(`[BookingConfirmation] Redeemed ${booking.pointHold.pointsHeld} points for Booking #${booking.id} in ledger.`)
          }
        }
      }
    }

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

    const updateData: Record<string, any> = {
      capacityHold: committedCapacity,
      pointHold: committedPointHold,
      timeline: updatedTimeline,
      auditTrail: updatedAudit,
    }
    if (paymentAttempts) {
      updateData.paymentAttempts = paymentAttempts
    }

    // Update repository
    const confirmedBooking = await this.repository.transitionStatus(bookingId, BookingStatus.CONFIRMED, updateData, context)

    // ATOMIC IN-TRANSACTION OUTBOX RECORDING:
    // Records BOOKING_CONFIRMED event into Transactional Outbox inside active DB transaction (context.transactionId)
    // BEFORE commit, guaranteeing zero crash inconsistency.
    const outboxService = EventOutboxService.getInstance()
    await outboxService.record({
      eventId: `evt_bk_conf_${booking.id}_${Date.now()}`,
      correlationId: `corr_${booking.id}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'BOOKING_CONFIRMED',
      aggregateType: 'Booking',
      aggregateId: String(booking.id),
      booking: confirmedBooking,
      actor: currentActor,
      timestamp: new Date().toISOString(),
    }, context)

    console.log(`[BookingConfirmation] 🎉 Booking #${bookingId} status updated to CONFIRMED and BOOKING_CONFIRMED recorded to Outbox atomically.`);
    return confirmedBooking
  }

  /**
   * Domain Event Dispatcher:
   * Records BOOKING_CONFIRMED event into Transactional Outbox.
   */
  async publishBookingConfirmedEvent(booking: BookingAggregate, actor?: Actor, context?: RequestContext): Promise<void> {
    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Booking Confirmation Service' }
    console.log(`[BookingConfirmation] 📤 Recording BOOKING_CONFIRMED event into Outbox for Booking #${booking.id}...`);

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
    }, context)
  }
}
