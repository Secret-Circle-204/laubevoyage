import type { Payload } from 'payload'
import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingCreator } from './creator'
import { BookingConfirmation } from './confirmation'
import { BookingCancellation } from './cancellation'
import { BookingExpiration } from './expiration'
import { BookingCompletion } from './completion'
import { BookingQueries } from './queries'
import { CustomerRepository } from '../customer/repository'
import { ExperienceService } from '../experience/service'
import { ExperienceRepository } from '../experience/repository'
import { ExperienceWorkflowEngine } from '../experience/workflow'
import { LoyaltyService } from '../loyalty/service'
import { PricingPipeline } from '../currency/pipeline'

/**
 * Booking Workflow Engine
 * Central deterministic orchestrator for all booking lifecycle workflows via Constructor Dependency Injection.
 * Decoupled from direct LoyaltyRepository calls (uses LoyaltyService exclusively).
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
    experienceService?: ExperienceService,
    loyaltyService?: LoyaltyService,
    pricingPipeline?: PricingPipeline,
  ) {
    const activePayload = repository && 'find' in repository ? (repository as Payload) : undefined
    const isRepo = repository && typeof repository === 'object' && 'findById' in repository

    if (isRepo) {
      this.repository = repository as unknown as BookingRepository
    } else {
      this.repository = new BookingRepository(activePayload!)
    }

    const custRepo =
      customerRepository ||
      (activePayload ? new CustomerRepository(activePayload) : ({} as CustomerRepository))

    // Auto-instantiate ExperienceService fallback to avoid test breakdowns
    const pipeline = pricingPipeline || new (PricingPipeline as any)()
    let expSvc: ExperienceService
    if (experienceService) {
      expSvc = experienceService
    } else if (activePayload) {
      const expRepo = new ExperienceRepository(activePayload)
      const expWorkflow = new ExperienceWorkflowEngine(expRepo, pipeline)
      expSvc = new ExperienceService(expRepo, expWorkflow)
    } else {
      expSvc = {} as ExperienceService
    }

    const loySvc = loyaltyService || ({} as LoyaltyService)

    this.creator = new BookingCreator(this.repository, custRepo, expSvc, loySvc, pipeline)
    this.confirmation = new BookingConfirmation(this.repository)
    this.cancellation = new BookingCancellation(this.repository)
    this.expiration = new BookingExpiration(this.repository)
    this.completion = new BookingCompletion(this.repository)
    this.queries = new BookingQueries(this.repository)
  }

  async executeCheckoutWorkflow(
    params: CreateBookingParams,
    actor?: Actor,
  ): Promise<BookingAggregate> {
    return this.creator.createDraft(params)
  }

  async executePendingPaymentWorkflow(bookingId: number): Promise<BookingAggregate> {
    return this.repository.updateStatus(bookingId, BookingStatus.PENDING_PAYMENT)
  }

  async executePaymentWorkflow(
    bookingId: number,
    paymentAttempt: PaymentAttempt,
  ): Promise<BookingAggregate> {
    return this.confirmation.markAsPaid(bookingId, paymentAttempt)
  }

  async executeConfirmationWorkflow(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    return this.confirmation.confirm(bookingId, actor)
  }

  async executeCancellationWorkflow(
    bookingId: number,
    actor?: Actor,
    reason = 'Cancelled',
  ): Promise<BookingAggregate> {
    const currentActor = actor || { id: 'system', type: 'system' as const, name: 'System Worker' }
    return this.cancellation.cancel(bookingId, currentActor, reason)
  }

  async executeCompletionWorkflow(bookingId: number, actor?: Actor): Promise<BookingAggregate> {
    return this.completion.complete(bookingId, actor)
  }

  async executeExpirationWorkflow(expirationWindowMinutes: number = 15): Promise<number> {
    return this.expiration.processExpiredBookings(expirationWindowMinutes)
  }

  async getById(bookingId: number): Promise<BookingAggregate> {
    return this.queries.getById(bookingId)
  }
}
