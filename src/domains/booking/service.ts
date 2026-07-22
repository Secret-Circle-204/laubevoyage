import type { Payload } from 'payload'
import type { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingWorkflowEngine } from './workflow'
import { registerLoyaltySubscriber } from '../events/subscribers/loyalty-subscriber'
import { registerNotificationSubscriber } from '../events/subscribers/notification-subscriber'

/**
 * Booking Domain Service (Enterprise Facade)
 * Single entry point for all booking operations.
 * Delegated to BookingWorkflowEngine for single-responsibility orchestration.
 */
export class BookingService {
  private workflowEngine: BookingWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new BookingWorkflowEngine(payload)

    // Register event listeners on initialization
    registerLoyaltySubscriber(payload)
    registerNotificationSubscriber()
  }

  /**
   * Create a new booking in draft state.
   */
  async create(data: CreateBookingParams): Promise<number> {
    const booking = await this.workflowEngine.executeCheckoutWorkflow(data)
    return booking.id
  }

  /**
   * Move booking to pending payment.
   */
  async moveToPendingPayment(bookingId: number): Promise<void> {
    await this.workflowEngine.repository.updateStatus(bookingId, 'pending_payment' as BookingStatus)
  }

  /**
   * Mark as paid (called by PaymentService webhook adapter).
   */
  async markAsPaid(bookingId: number, paymentAttempt?: PaymentAttempt): Promise<void> {
    const attempt: PaymentAttempt = paymentAttempt || {
      attemptId: `pay_${Date.now()}`,
      attemptNumber: 1,
      provider: 'stripe',
      amount: 0,
      currency: 'EGP',
      status: 'successful',
      timestamp: new Date().toISOString(),
    }

    await this.workflowEngine.executePaymentWorkflow(bookingId, attempt)
  }

  /**
   * Confirm booking after successful payment.
   */
  async confirm(bookingId: number, paymentId: string): Promise<void> {
    await this.workflowEngine.executeConfirmationWorkflow(bookingId)
  }

  /**
   * Cancel booking with reason and actor tracking.
   */
  async cancel(bookingId: number, reason: string, actor?: Actor): Promise<void> {
    const currentActor: Actor = actor || { id: 'system', type: 'system', name: 'Cancellation Request' }
    await this.workflowEngine.executeCancellationWorkflow(bookingId, currentActor, reason)
  }

  /**
   * Complete booking after trip ends.
   */
  async complete(bookingId: number): Promise<void> {
    await this.workflowEngine.executeCompletionWorkflow(bookingId)
  }

  /**
   * Run background job to expire abandoned drafts.
   */
  async processExpiredBookings(expirationWindowMinutes: number = 15): Promise<number> {
    return this.workflowEngine.executeExpirationWorkflow(expirationWindowMinutes)
  }

  /**
   * Get booking by ID.
   */
  async getById(bookingId: number): Promise<BookingAggregate> {
    return this.workflowEngine.queries.getById(bookingId)
  }

  /**
   * Get booking by booking number.
   */
  async getByBookingNumber(bookingNumber: string): Promise<BookingAggregate | null> {
    return this.workflowEngine.queries.getByBookingNumber(bookingNumber)
  }

  /**
   * Get user bookings with pagination.
   */
  async getUserBookings(userId: number, page: number = 1, limit: number = 10) {
    return this.workflowEngine.queries.getUserBookings(userId, page, limit)
  }
}
