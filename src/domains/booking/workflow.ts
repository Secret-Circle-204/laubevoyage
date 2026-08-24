import type { Payload } from 'payload'
import { BookingStatus } from '@/types'
import type { RequestContext } from '@/types'
import type { Actor, BookingAggregate, CreateBookingParams, PaymentAttempt } from './types'
import { BookingRepository } from './repository'
import { BookingCreator } from './creator'
import { BookingConfirmation } from './confirmation'
import { BookingCancellation } from './cancellation'
import { BookingExpiration } from './expiration'
import { BookingCompletion } from './completion'
import { BookingRefund } from './refund'
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
  public refund: BookingRefund
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
    this.confirmation = new BookingConfirmation(this.repository, expSvc, loySvc)
    this.cancellation = new BookingCancellation(this.repository, expSvc)
    this.expiration = new BookingExpiration(this.repository, expSvc)
    this.completion = new BookingCompletion(this.repository)
    this.refund = new BookingRefund(this.repository, expSvc)
    this.queries = new BookingQueries(this.repository)
  }

  async executeCheckoutWorkflow(
    params: CreateBookingParams,
    actor?: Actor,
    context?: RequestContext,
  ): Promise<BookingAggregate> {
    return this.creator.createDraft(params, context)
  }

  async executePendingPaymentWorkflow(bookingId: number, context?: RequestContext): Promise<BookingAggregate> {
    return this.repository.transitionStatus(bookingId, BookingStatus.PENDING_PAYMENT, {}, context)
  }

  async executePendingAdminReviewWorkflow(bookingId: number, context?: RequestContext): Promise<BookingAggregate> {
    const booking = await this.repository.findById(bookingId, context)
    validateTransition(booking.status, BookingStatus.PENDING_ADMIN_REVIEW)

    // Calculate a single deadline for both reservation and PointHold
    const expiresAt = BookingPolicy.calculateAdminReviewWindowExpiresAt(new Date())
    const expiresAtIso = expiresAt.toISOString()

    const updatedTimeline = BookingHistoryService.appendTimelineEntry(booking.timeline, {
      stepKey: 'pending_admin_review',
      title: 'Awaiting Admin Review',
      description: 'Your booking has been submitted for administrator review.',
    })

    const updatedAudit = BookingHistoryService.appendAuditEntry(booking.auditTrail, {
      actor: { id: 'system', type: 'system', name: 'Booking Workflow Engine' },
      action: 'PENDING_ADMIN_REVIEW',
      previousValue: booking.status,
      newValue: BookingStatus.PENDING_ADMIN_REVIEW,
    })

    const pointHold = booking.pointHold
      ? { ...booking.pointHold, expiresAt: expiresAtIso }
      : null

    return this.repository.transitionStatus(
      bookingId,
      BookingStatus.PENDING_ADMIN_REVIEW,
      {
        paymentWindowExpiresAt: expiresAtIso,
        pointHold,
        timeline: updatedTimeline,
        auditTrail: updatedAudit,
      },
      context,
    )
  }

  async executePaymentWorkflow(
    bookingId: number,
    paymentAttempt: PaymentAttempt,
    context?: RequestContext,
  ): Promise<BookingAggregate> {
    return this.confirmation.markAsPaid(bookingId, paymentAttempt, undefined, context)
  }

  async executeConfirmationWorkflow(
    bookingId: number,
    actor?: Actor,
    context?: RequestContext,
    paymentAttempts?: PaymentAttempt[],
  ): Promise<BookingAggregate> {
    return this.confirmation.confirm(bookingId, actor, context, paymentAttempts)
  }

  async publishBookingConfirmedEvent(booking: BookingAggregate, actor?: Actor): Promise<void> {
    return this.confirmation.publishBookingConfirmedEvent(booking, actor)
  }

  async executeCancellationWorkflow(
    bookingId: number,
    actor?: Actor,
    reason = 'Cancelled',
    context?: RequestContext,
  ): Promise<BookingAggregate> {
    const currentActor = actor || { id: 'system', type: 'system' as const, name: 'System Worker' }
    return this.cancellation.cancel(bookingId, currentActor, reason, context)
  }

  async executeRefundWorkflow(
    bookingId: number,
    actor?: Actor,
    context?: RequestContext,
  ): Promise<BookingAggregate> {
    const currentActor = actor || { id: 'system', type: 'system' as const, name: 'System Worker' }
    return this.refund.refund(bookingId, currentActor, context)
  }

  async executeCompletionWorkflow(bookingId: number, actor?: Actor, context?: RequestContext): Promise<BookingAggregate> {
    return this.completion.complete(bookingId, actor, context)
  }

  async executeExpirationWorkflow(expirationWindowMinutes: number = 15): Promise<number> {
    return this.expiration.processExpiredBookings(expirationWindowMinutes)
  }

  async getById(bookingId: number): Promise<BookingAggregate> {
    return this.queries.getById(bookingId)
  }
}
