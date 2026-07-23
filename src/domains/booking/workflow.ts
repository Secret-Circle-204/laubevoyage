import type { Payload } from 'payload'
import type { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingCreator } from './creator'
import { BookingConfirmation } from './confirmation'
import { BookingCancellation } from './cancellation'
import { BookingExpiration } from './expiration'
import { BookingCompletion } from './completion'
import { BookingQueries } from './queries'
import { CustomerRepository } from '../customer/repository'
import { ExperienceRepository } from '../experience/repository'
import { LoyaltyService } from '../loyalty/service'

/**
 * Booking Workflow Engine
 * Central deterministic orchestrator for all booking lifecycle workflows via Dependency Injection.
 */
export class BookingWorkflowEngine {
  public repository: BookingRepository
  public creator: BookingCreator
  public confirmation: BookingConfirmation
  public cancellation: BookingCancellation
  public expiration: BookingExpiration
  public completion: BookingCompletion
  public queries: BookingQueries

  constructor(
    repository: BookingRepository | Payload,
    customerRepository?: CustomerRepository,
    experienceRepository?: ExperienceRepository,
    loyaltyService?: LoyaltyService,
    payload?: Payload,
  ) {
    let activePayload: Payload | undefined = payload

    if (repository && ('find' in repository || 'findByID' in repository)) {
      activePayload = repository as Payload
      this.repository = new BookingRepository(activePayload)
    } else {
      this.repository = repository as BookingRepository
    }

    const custRepo = customerRepository || (activePayload ? new CustomerRepository(activePayload) : ({} as CustomerRepository))
    const expRepo = experienceRepository || (activePayload ? new ExperienceRepository(activePayload) : ({} as ExperienceRepository))
    const loySvc = loyaltyService || (activePayload ? new LoyaltyService(custRepo as any, activePayload) : ({} as LoyaltyService))

    this.creator = new BookingCreator(this.repository, custRepo, expRepo, loySvc)
    this.confirmation = new BookingConfirmation(this.repository)
    this.cancellation = new BookingCancellation(this.repository)
    this.expiration = new BookingExpiration(this.repository)
    this.completion = new BookingCompletion(this.repository)
    this.queries = new BookingQueries(this.repository)
  }

  /**
   * Deterministic Checkout Workflow:
   * Policy check -> Seat Hold -> Point Hold -> Freeze Snapshot -> Create Draft
   */
  async executeCheckoutWorkflow(params: CreateBookingParams): Promise<BookingAggregate> {
    return this.creator.createDraft(params)
  }

  /**
   * Deterministic Pending Payment Workflow:
   * Validate transition -> Transition status to pending_payment
   */
  async executePendingPaymentWorkflow(bookingId: number): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId)
    return this.repository.updateStatus(booking.id, 'pending_payment' as BookingStatus)
  }

  /**
   * Deterministic Payment Processing Workflow:
   * Record Attempt -> Mark Paid -> Transition to Paid
   */
  async executePaymentWorkflow(bookingId: number, paymentAttempt: PaymentAttempt, actor?: Actor): Promise<BookingAggregate> {
    return this.confirmation.markAsPaid(bookingId, paymentAttempt, actor)
  }

  /**
   * Deterministic Confirmation Workflow:
   * Confirm Status -> Commit Holds -> Emit BookingConfirmedEvent (Triggers Loyalty & Notification async queue)
   */
  async executeConfirmationWorkflow(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    return this.confirmation.confirm(bookingId, actor)
  }

  /**
   * Deterministic Cancellation Workflow:
   * Policy check -> Release Holds -> Transition Status -> Emit BookingCancelledEvent
   */
  async executeCancellationWorkflow(bookingId: number, actor: Actor, reason: string): Promise<BookingAggregate> {
    return this.cancellation.cancel(bookingId, actor, reason)
  }

  /**
   * Deterministic Expiration Workflow:
   * Scan -> 7-Step Expiration Pipeline -> Retry -> DLQ/Admin Alert
   */
  async executeExpirationWorkflow(expirationWindowMinutes: number = 15): Promise<number> {
    return this.expiration.processExpiredBookings(expirationWindowMinutes)
  }

  /**
   * Deterministic Completion Workflow:
   * Policy Check -> Complete Status -> Emit BookingCompletedEvent
   */
  async executeCompletionWorkflow(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    return this.completion.complete(bookingId, actor)
  }
}
