import type { Payload, PayloadRequest } from 'payload'
import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingCreator } from './creator'
import { BookingConfirmation } from './confirmation'
import { BookingCancellation } from './cancellation'
import { BookingExpiration } from './expiration'
import { BookingCompletion } from './completion'
import { BookingQueries } from './queries'
import type { CustomerRepository } from '../customer/repository'
import { ExperienceService } from '../experience/service'
import type { ExperienceRepository } from '../experience/repository'
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

    const custRepo = customerRepository || ({} as CustomerRepository)
    const expSvc = experienceService || ({} as ExperienceService)
    const loySvc = loyaltyService || ({} as LoyaltyService)
    const pipeline = pricingPipeline || ({} as PricingPipeline)

    this.creator = new BookingCreator(this.repository, custRepo, expSvc, loySvc, pipeline)
    this.confirmation = new BookingConfirmation(this.repository)
    this.cancellation = new BookingCancellation(this.repository, expSvc)
    this.expiration = new BookingExpiration(this.repository, expSvc)
    this.completion = new BookingCompletion(this.repository)
    this.queries = new BookingQueries(this.repository)
  }

  async executeCheckoutWorkflow(
    params: CreateBookingParams,
    actor?: Actor,
    req?: PayloadRequest,
  ): Promise<BookingAggregate> {
    return this.creator.createDraft(params, req)
  }

  async executePendingPaymentWorkflow(bookingId: number, req?: PayloadRequest): Promise<BookingAggregate> {
    return this.repository.updateStatus(bookingId, BookingStatus.PENDING_PAYMENT, req)
  }

  async executePaymentWorkflow(
    bookingId: number,
    paymentAttempt: PaymentAttempt,
    req?: PayloadRequest,
  ): Promise<BookingAggregate> {
    return this.confirmation.markAsPaid(bookingId, paymentAttempt, undefined, req)
  }

  async executeConfirmationWorkflow(bookingId: number, actor?: Actor, req?: PayloadRequest): Promise<BookingAggregate> {
    return this.confirmation.confirm(bookingId, actor, req)
  }

  async publishBookingConfirmedEvent(booking: BookingAggregate, actor?: Actor): Promise<void> {
    return this.confirmation.publishBookingConfirmedEvent(booking, actor)
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
