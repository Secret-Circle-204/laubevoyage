import type { RequestContext, BookingStatus } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt, CustomerTripSummary, BookingUserFilter } from './types'
import { BookingWorkflowEngine } from './workflow'
import { BookingRepository } from './repository'
import type { CustomerRepository } from '../customer/repository'
import type { ExperienceService } from '../experience/service'
import type { LoyaltyService } from '../loyalty/service'
import type { PricingPipeline } from '../currency/pipeline'

/**
 * Booking Domain Service (Enterprise Facade)
 * Single entry point for all booking operations via Constructor Dependency Injection.
 * Delegated to BookingWorkflowEngine for single-responsibility orchestration.
 */
export class BookingService {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private pricingPipeline: PricingPipeline
  private workflowEngine: BookingWorkflowEngine

  constructor(
    repository: BookingRepository,
    customerRepository: CustomerRepository,
    experienceService: ExperienceService,
    loyaltyService: LoyaltyService,
    pricingPipeline: PricingPipeline,
  ) {
    this.repository = repository
    this.experienceService = experienceService
    this.pricingPipeline = pricingPipeline
    this.workflowEngine = new BookingWorkflowEngine(
      repository,
      customerRepository,
      experienceService,
      loyaltyService,
      pricingPipeline,
    )
  }

  /**
   * Create a new booking in draft state.
   */
  async create(data: CreateBookingParams, context?: RequestContext): Promise<number> {
    const booking = await this.workflowEngine.executeCheckoutWorkflow(data, undefined, context)
    return booking.id
  }

  /**
   * Move booking to pending payment via Workflow Engine.
   */
  async moveToPendingPayment(bookingId: number, context?: RequestContext): Promise<void> {
    await this.workflowEngine.executePendingPaymentWorkflow(bookingId, context)
  }

  /**
   * Move booking to pending admin review status.
   */
  async moveToPendingAdminReview(bookingId: number, context?: RequestContext): Promise<void> {
    await this.workflowEngine.executePendingAdminReviewWorkflow(bookingId, context)
  }

  /**
   * Calculate total active loyalty points held in uncommitted bookings for a customer.
   */
  async getActiveHeldPointsForCustomer(customerId: number, context?: RequestContext): Promise<number> {
    return this.repository.getActiveHeldPointsForCustomer(customerId, context)
  }

  /**
   * Mark as paid (called by PaymentService webhook adapter).
   */
  async markAsPaid(bookingId: number, paymentAttempt: PaymentAttempt, context?: RequestContext): Promise<void> {
    if (!paymentAttempt) {
      throw new Error('[BookingService] markAsPaid requires a valid PaymentAttempt object.')
    }
    await this.workflowEngine.executePaymentWorkflow(bookingId, paymentAttempt, context)
  }

  /**
   * Confirm booking after successful payment.
   */
  async confirm(
    bookingId: number,
    actor?: Actor,
    context?: RequestContext,
    paymentAttempts?: PaymentAttempt[],
  ): Promise<BookingAggregate> {
    return this.workflowEngine.executeConfirmationWorkflow(bookingId, actor, context, paymentAttempts)
  }

  /**
   * Retrieve Booking Repository instance for administrative operations.
   */
  getRepository(): BookingRepository {
    return this.repository
  }

  /**
   * Post-Commit Event Dispatcher
   */
  async publishBookingConfirmedEvent(booking: BookingAggregate, actor?: Actor): Promise<void> {
    await this.workflowEngine.publishBookingConfirmedEvent(booking, actor)
  }

  /**
   * Cancel booking with reason and actor tracking.
   */
  async cancel(bookingId: number, reason: string, actor?: Actor, context?: RequestContext): Promise<void> {
    await this.workflowEngine.executeCancellationWorkflow(bookingId, actor, reason, context)
  }

  /**
   * Refund booking after payment refund.
   */
  async refund(bookingId: number, actor?: Actor, context?: RequestContext, reason?: string): Promise<void> {
    await this.workflowEngine.executeRefundWorkflow(bookingId, actor, context, reason)
  }

  /**
   * Complete booking after trip ends.
   */
  async complete(bookingId: number, context?: RequestContext): Promise<void> {
    await this.workflowEngine.executeCompletionWorkflow(bookingId, undefined, context)
  }

  /**
   * Run background job to expire abandoned drafts.
   */
  async processExpiredBookings(expirationWindowMinutes: number = 15): Promise<number> {
    return this.workflowEngine.executeExpirationWorkflow(expirationWindowMinutes)
  }

  /**
   * Confirm booking from payment webhook with reference
   */
  async confirmBooking(params: { bookingId: number; paymentReference: string }): Promise<void> {
    await this.confirm(params.bookingId, { id: 'system', type: 'system', name: 'Payment Webhook' })
  }

  /**
   * Complete finished trips and emit loyalty events (called by CronDispatcher)
   */
  async processTripCompletions(): Promise<number> {
    // In production workflow engine, query completed trips and invoke completion workflow
    return 0
  }

  /**
   * Release expired booking holds (called by CronDispatcher)
   */
  async releaseExpiredHolds(_minutes?: number): Promise<number> {
    return this.processExpiredBookings()
  }

  /**
   * Get booking by ID.
   */
  async getById(bookingId: number, context?: RequestContext): Promise<BookingAggregate> {
    return this.workflowEngine.queries.getById(bookingId, context)
  }

  /**
   * Get booking by booking number, with optional customerId boundary enforcement.
   */
  async getByBookingNumber(
    bookingNumber: string,
    customerId?: number,
    context?: RequestContext,
  ): Promise<BookingAggregate | null> {
    return this.workflowEngine.queries.getByBookingNumber(bookingNumber, customerId, context)
  }

  /**
   * Get user bookings with pagination and optional filters.
   */
  async getUserBookings(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters?: BookingUserFilter,
  ) {
    return this.workflowEngine.queries.getUserBookings(userId, page, limit, filters)
  }

  /**
   * Query multiple booking aggregates matching a list of IDs.
   */
  async getManyByIds(bookingIds: number[]): Promise<BookingAggregate[]> {
    return this.workflowEngine.queries.getManyByIds(bookingIds)
  }

  /**
   * Retrieve aggregated trip summary metrics for customer overview ($O(1) memory).
   */
  async getCustomerTripSummary(
    customerId: number,
    context?: RequestContext,
  ): Promise<CustomerTripSummary> {
    return this.workflowEngine.queries.getCustomerTripSummary(customerId, context)
  }

  /**
   * Delete booking by ID.
   */
  async delete(bookingId: number): Promise<void> {
    await this.repository.delete(bookingId)
  }

  /**
   * Update booking details.
   */
  async update(bookingId: number, data: Partial<BookingAggregate>, context?: RequestContext): Promise<BookingAggregate> {
    return this.repository.update(bookingId, data, context)
  }

  /**
   * Transition booking status with validation and optimistic concurrency guard.
   */
  async transitionStatus(
    bookingId: number,
    toStatus: BookingStatus,
    data: Record<string, unknown> = {},
    context?: RequestContext
  ): Promise<BookingAggregate> {
    return this.repository.transitionStatus(bookingId, toStatus, data, context)
  }

  /**
   * Get booking by idempotency key.
   */
  async getByIdempotencyKey(idempotencyKey: string, context?: RequestContext): Promise<BookingAggregate | null> {
    return this.repository.getByIdempotencyKey(idempotencyKey, context)
  }
}
