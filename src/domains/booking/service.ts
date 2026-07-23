import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingWorkflowEngine } from './workflow'
import { BookingRepository } from './repository'
import type { CustomerRepository } from '../customer/repository'
import type { ExperienceRepository } from '../experience/repository'
import type { LoyaltyService } from '../loyalty/service'

/**
 * Booking Domain Service (Enterprise Facade)
 * Single entry point for all booking operations via Constructor Dependency Injection.
 * Delegated to BookingWorkflowEngine for single-responsibility orchestration.
 */
export class BookingService {
  private repository: BookingRepository
  private workflowEngine: BookingWorkflowEngine

  constructor(
    repository: BookingRepository,
    customerRepository?: CustomerRepository,
    experienceRepository?: ExperienceRepository,
    loyaltyService?: LoyaltyService,
  ) {
    this.repository = repository
    this.workflowEngine = new BookingWorkflowEngine(repository, customerRepository, experienceRepository, loyaltyService)
  }

  /**
   * Create a new booking in draft state.
   */
  async create(data: CreateBookingParams): Promise<number> {
    const booking = await this.workflowEngine.executeCheckoutWorkflow(data)
    return booking.id
  }

  /**
   * Move booking to pending payment via Workflow Engine.
   */
  async moveToPendingPayment(bookingId: number): Promise<void> {
    await this.workflowEngine.executePendingPaymentWorkflow(bookingId)
  }

  /**
   * Mark as paid (called by PaymentService webhook adapter).
   */
  async markAsPaid(bookingId: number, paymentAttempt: PaymentAttempt): Promise<void> {
    if (!paymentAttempt) {
      throw new Error('[BookingService] markAsPaid requires a valid PaymentAttempt object.')
    }
    await this.workflowEngine.executePaymentWorkflow(bookingId, paymentAttempt)
  }

  /**
   * Confirm booking after successful payment.
   */
  async confirm(bookingId: number, _paymentId?: string): Promise<void> {
    await this.workflowEngine.executeConfirmationWorkflow(bookingId)
  }

  /**
   * Cancel booking with reason and actor tracking.
   */
  async cancel(bookingId: number, reason: string, actor?: Actor): Promise<void> {
    await this.workflowEngine.executeCancellationWorkflow(bookingId, actor, reason)
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
