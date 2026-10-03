import { BookingStatus, RequestContext } from '@/types'
import { BookingPolicy } from '../booking/policy'
import { ExperiencePolicy } from '../experience/policy'
import type {
  CreateSessionParams,
  RefundParams,
  RefundResult,
  PaymentProviderType,
  PaymentStatusType,
  GatewaySessionExpirationOutcome,
  PaymentAuditRecord,
} from './types'
import type { PaymentAggregate } from './aggregate'
import { PaymentWorkflowEngine } from './workflow'
import type { BookingRepository } from '../booking/repository'
import type { CustomerRepository } from '../customer/repository'
import type { ExperienceRepository } from '../experience/repository'
import { PaymentRepository } from './repository'
import { PaymentAdapterFactory } from './adapters/factory'
import { PaymentUrlBuilder } from './url-builder'
import type { PaymentCompletedEvent } from '../events/payment-events'
import type { IOutboxRepository } from '../events/contracts/outbox-repository.interface'

/**
 * Payment Domain Service (Enterprise Thin Facade)
 * Single entry point for all payment operations via Constructor Dependency Injection.
 * Delegated to PaymentWorkflowEngine for single-responsibility orchestration.
 */
export class PaymentService {
  private paymentRepository: PaymentRepository
  private bookingRepository: BookingRepository
  private customerRepository: CustomerRepository
  private experienceRepository: ExperienceRepository
  private workflowEngine: PaymentWorkflowEngine
  private outboxRepository?: IOutboxRepository

  constructor(
    paymentRepository: PaymentRepository,
    bookingRepository?: BookingRepository,
    customerRepository?: CustomerRepository,
    experienceRepository?: ExperienceRepository,
    outboxRepository?: IOutboxRepository,
  ) {
    this.paymentRepository = paymentRepository
    this.bookingRepository = bookingRepository || ({} as BookingRepository)
    this.customerRepository = customerRepository || ({} as CustomerRepository)
    this.experienceRepository = experienceRepository || ({} as ExperienceRepository)
    this.outboxRepository = outboxRepository
    this.workflowEngine = new PaymentWorkflowEngine(paymentRepository, outboxRepository)
  }

  async getAvailableGateways() {
    return this.paymentRepository.findActiveGateways()
  }

  async processPaymentCheckout(params: { bookingId: number; gatewayId: string; appUrl?: string }) {
    if (!params.gatewayId) {
      throw new Error('[PaymentService] Gateway ID is required for payment checkout processing.')
    }
    const providerType = params.gatewayId.toLowerCase() as PaymentProviderType

    const booking = await this.bookingRepository.findById(params.bookingId)
    const existingTx = await this.paymentRepository.findByBookingId(params.bookingId)

    // 1. Check if existing transaction is already paid (allows reconciliation post-expiry)
    if (existingTx && existingTx.status === 'initiated' && existingTx.session?.sessionId) {
      try {
        if (existingTx.provider !== providerType) {
          console.log(`[PaymentService] Gateway changed from ${existingTx.provider} to ${providerType}. Expiring old session.`)
          const oldAdapter = PaymentAdapterFactory.resolve(existingTx.provider as PaymentProviderType)
          await oldAdapter.expireSession(existingTx.session.sessionId)
          await this.paymentRepository.updateStatus(existingTx.transactionId, 'failed')
        } else {
          const adapter = PaymentAdapterFactory.resolve(existingTx.provider as PaymentProviderType)
          const stripeStatus = await adapter.retrievePaymentStatus({ providerSessionId: existingTx.session.sessionId })

          if (stripeStatus.status === 'paid') {
            console.log(`[PaymentService] Existing transaction ${existingTx.transactionId} is already paid. Reconciling...`)
            await this.reconcilePendingPayments()
            return { success: false, error: 'This payment has already been completed. Re-routing...' }
          }

          // If it is open/active, we can reuse it only if the hold is NOT expired.
          if (stripeStatus.status === 'open' && existingTx.session.url) {
            const holdExpired = booking.capacityHold?.expiresAt && new Date() >= new Date(booking.capacityHold.expiresAt)
            if (!holdExpired) {
              console.log(`[PaymentService] Reusing active initiated payment session: ${existingTx.transactionId}`);
              return { success: true, transactionId: existingTx.transactionId, checkoutUrl: existingTx.session.url }
            }
          } else {
            // Terminal/expired old session: mark it failed and allow a new session
            console.log(`[PaymentService] Old Stripe session ${existingTx.session.sessionId} is expired/failed. Marking old transaction as failed.`)
            await this.paymentRepository.updateStatus(existingTx.transactionId, 'failed')
          }
        }
      } catch (err) {
        console.error(`[PaymentService] Failed checking status of existing checkout session:`, err)
      }
    }

    // 2. Block payment session if payment window is expired
    if (booking.status !== 'confirmed' && booking.paymentWindowExpiresAt) {
      if (new Date() >= new Date(booking.paymentWindowExpiresAt)) {
        return { success: false, error: 'Payment window expired for this booking. Please start a new checkout flow.' }
      }
    }

    // 3. Block payment session if departure start instant has already arrived or passed (Admission Cutoff)
    if (this.experienceRepository && booking.experienceId && booking.startDate) {
      const expAggregate = await this.experienceRepository.findById(booking.experienceId)
      if (!expAggregate) {
        throw new Error(`[PaymentService] Experience #${booking.experienceId} associated with Booking #${booking.id} not found.`)
      }

      if (expAggregate.type === 'daily_tour' && booking.completionAt && expAggregate.durationMinutes) {
        const completionMs = new Date(booking.completionAt).getTime()
        const startInstantMs = completionMs - expAggregate.durationMinutes * 60 * 1000
        const startInstantUtc = new Date(startInstantMs)

        if (new Date() >= startInstantUtc) {
          return {
            success: false,
            error: 'This experience departure can no longer be paid: Departure start instant has already started or passed.',
          }
        }
      } else if (booking.departureSlot) {
        const timezone = await this.experienceRepository.findTimezoneByCityId(expAggregate.cityId)
        if (!timezone) {
          throw new Error(`[PaymentService] Failed to resolve destination timezone for Experience #${expAggregate.id}.`)
        }
        const slotDoc = await this.experienceRepository.getDepartureSlotById(booking.departureSlot)
        const bookability = ExperiencePolicy.isDepartureBookable({
          type: expAggregate.type,
          date: booking.startDate,
          startTime: slotDoc?.startTime,
          endDate: booking.endDate,
          timezone,
        })
        if (!bookability.allowed) {
          return {
            success: false,
            error: `This experience departure can no longer be paid: ${bookability.reason}`,
          }
        }
      }
    }

    // 4. Block payment session if departure/trip has already completed
    if (booking.completionAt) {
      if (new Date() >= new Date(booking.completionAt)) {
        return { success: false, error: 'This experience departure has already completed and cannot be paid.' }
      }
    }

    // 5. Block new/retry payment session if capacity hold is expired
    if (booking.status !== 'confirmed' && booking.capacityHold?.expiresAt) {
      if (new Date() >= new Date(booking.capacityHold.expiresAt)) {
        return { success: false, error: 'Booking capacity hold expired. Please start a new checkout flow.' }
      }
    }

    const adapter = PaymentAdapterFactory.resolve(providerType)

    const baseUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      throw new Error('[PaymentService] Missing appUrl parameter or NEXT_PUBLIC_APP_URL environment variable.')
    }

    const userDoc = await this.customerRepository.findById(booking.customerId)
    const experienceDoc = await this.experienceRepository.findById(booking.experienceId)

    const pricingSnapshot = booking.pricingSnapshot
    if (!pricingSnapshot || !pricingSnapshot.displayCurrency) {
      throw new Error(`[PaymentService] Booking #${booking.id} is missing authoritative pricing snapshot displayCurrency.`)
    }
    if (pricingSnapshot.displayAmount === undefined || pricingSnapshot.displayAmount === null || pricingSnapshot.displayAmount < 0) {
      throw new Error(`[PaymentService] Booking #${booking.id} is missing authoritative pricing snapshot displayAmount.`)
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const { successUrl, cancelUrl } = PaymentUrlBuilder.buildUrls({
      baseUrl,
      transactionId,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      gatewayId: params.gatewayId,
    })

    const sessionParams: CreateSessionParams = {
      transactionId,
      bookingId: booking.id,
      customerId: userDoc ? (userDoc.customerId || Number((userDoc as Record<string, any>).id)) : booking.customerId,
      bookingNumber: booking.bookingNumber,
      basePriceEGP: pricingSnapshot.basePriceEGP,
      displayCurrency: pricingSnapshot.displayCurrency,
      displayAmount: pricingSnapshot.displayAmount,
      successUrl,
      cancelUrl,
      customerEmail: userDoc?.email || undefined,
      experienceTitle: experienceDoc?.title || `Booking #${booking.bookingNumber}`,
    }

    const paymentAggregate = await this.workflowEngine.executeCreateSessionWorkflow(providerType, sessionParams, booking.status)
    const session = paymentAggregate.session || (await adapter.createCheckoutSession(sessionParams))

    if (!session.url) {
      throw new Error(`[PaymentService] Checkout session did not return a valid URL for Booking #${booking.id}`)
    }

    return { success: true, transactionId, checkoutUrl: session.url }
  }

  /**
   * Create a checkout session (Stripe, BNPL, or Manual).
   */
  async createStripeSession(bookingId: number, successUrl: string, cancelUrl: string) {
    const booking = await this.bookingRepository.findById(bookingId)
    const userDoc = await this.customerRepository.findById(booking.customerId)
    const experienceDoc = await this.experienceRepository.findById(booking.experienceId)

    const pricingSnapshot = booking.pricingSnapshot
    if (!pricingSnapshot || !pricingSnapshot.displayCurrency) {
      throw new Error(`[PaymentService] Booking #${booking.id} is missing authoritative pricing snapshot displayCurrency.`)
    }
    if (pricingSnapshot.displayAmount === undefined || pricingSnapshot.displayAmount === null || pricingSnapshot.displayAmount < 0) {
      throw new Error(`[PaymentService] Booking #${booking.id} is missing authoritative pricing snapshot displayAmount.`)
    }
    const displayCurrency = pricingSnapshot.displayCurrency
    const displayAmount = pricingSnapshot.displayAmount

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const params: CreateSessionParams = {
      transactionId,
      bookingId: booking.id,
      customerId: userDoc ? (userDoc.customerId || Number((userDoc as Record<string, any>).id)) : booking.customerId,
      bookingNumber: booking.bookingNumber,
      basePriceEGP: pricingSnapshot.basePriceEGP,
      displayCurrency,
      displayAmount,
      successUrl,
      cancelUrl,
      customerEmail: userDoc?.email || undefined,
      experienceTitle: experienceDoc?.title || `Booking #${booking.bookingNumber}`,
    }

    const paymentAggregate = await this.workflowEngine.executeCreateSessionWorkflow('stripe', params, booking.status)

    return {
      sessionId: paymentAggregate.session.sessionId,
      url: paymentAggregate.session.url,
      transactionId: paymentAggregate.transactionId,
    }
  }

  /**
   * Handle Stripe Webhook idempotently.
   */
  async handleStripeWebhook(
    rawBody: string | Buffer,
    signature: string,
    options?: { correlationId?: string; dbTransaction?: unknown },
  ) {
    return this.workflowEngine.executeWebhookWorkflow(rawBody, signature, 'stripe', options)
  }

  /**
   * Handle Paymob Webhook idempotently.
   */
  async handlePaymobWebhook(
    rawBody: string | Buffer,
    signature: string,
    options?: { correlationId?: string; dbTransaction?: unknown },
  ) {
    return this.workflowEngine.executePaymobWebhookWorkflow(rawBody, signature, options)
  }

  /**
   * Process Book Now Pay Later.
   */
  async processBookNowPayLater(bookingId: number): Promise<PaymentAggregate> {
    const booking = await this.bookingRepository.findById(bookingId)
    const pricingSnapshot = booking.pricingSnapshot
    if (!pricingSnapshot) {
      throw new Error(`[PaymentService] Booking #${booking.id} is missing pricing snapshot.`)
    }

    const transactionId = `tx_bnpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const params: CreateSessionParams = {
      transactionId,
      bookingId: booking.id,
      customerId: booking.customerId,
      bookingNumber: booking.bookingNumber,
      basePriceEGP: pricingSnapshot.basePriceEGP,
      displayCurrency: pricingSnapshot.displayCurrency,
      displayAmount: pricingSnapshot.displayAmount,
      successUrl: '',
      cancelUrl: '',
      experienceTitle: `Booking #${booking.bookingNumber}`,
    }

    return this.workflowEngine.executeCreateSessionWorkflow('bnpl', params, booking.status)
  }

  /**
   * Issue a payment refund.
   */
  async refund(params: RefundParams): Promise<{ result: RefundResult; transaction: PaymentAggregate }> {
    return this.workflowEngine.executeRefundWorkflow(params)
  }

  /**
   * Query transaction by transaction ID.
   */
  async getByTransactionId(transactionId: string): Promise<PaymentAggregate | null> {
    return this.workflowEngine.queries.getByTransactionId(transactionId)
  }

  /**
   * Query transaction by booking ID.
   */
  async getByBookingId(bookingId: number): Promise<PaymentAggregate | null> {
    return this.workflowEngine.queries.getByBookingId(bookingId)
  }

  /**
   * Query multiple transaction aggregates matching a list of booking IDs.
   */
  async getManyByBookingIds(bookingIds: number[]): Promise<PaymentAggregate[]> {
    return this.workflowEngine.queries.getManyByBookingIds(bookingIds)
  }

  /**
   * Query paginated transaction aggregates for a specific customer with optional status filtering.
   */
  async getCustomerPayments(
    customerId: number,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: PaymentStatusType },
  ): Promise<import('@/types').PaginatedResponse<PaymentAggregate>> {
    return this.workflowEngine.queries.getCustomerPayments(customerId, page, limit, filters)
  }


  /**
   * Reconcile any pending payment transactions (called by CronDispatcher / background processes)
   * Discovers Stripe status and emits canonical PAYMENT_COMPLETED via existing Outbox / EventBus boundary.
   * Single settlement path ensures all traveler resolution, confirmation, and loyalty workflows execute uniformly.
   */
  async reconcilePendingPayments(): Promise<number> {
    const pendingTransactions = await this.paymentRepository.findPendingTransactions()
    let reconciledCount = 0

    for (const tx of pendingTransactions) {
      if (tx.provider !== 'stripe') continue
      
      const sessionId = tx.session?.sessionId
      if (!sessionId) continue

      // Start database transaction at the infrastructure/repository level
      const transactionID = await this.paymentRepository.beginTransaction()
      const context: RequestContext = { transactionId: transactionID ? String(transactionID) : undefined }

      try {
        // Re-read current transaction state inside active transaction context
        const currentTx = await this.paymentRepository.findByTransactionId(tx.transactionId, context)
        if (!currentTx || currentTx.status !== 'initiated') {
          console.log(`[PaymentReconciliation] Transaction ${tx.transactionId} is already settled (status: ${currentTx?.status || 'not_found'}). Skipping.`)
          await this.paymentRepository.rollbackTransaction(transactionID)
          continue
        }

        const adapter = PaymentAdapterFactory.resolve('stripe')
        const stripeStatus = await adapter.retrievePaymentStatus({ providerSessionId: sessionId })
        
        if (stripeStatus.status === 'paid') {
          console.log(`[PaymentReconciliation] Found paid Stripe session for Transaction ${currentTx.transactionId}. Reconciling via PAYMENT_COMPLETED...`)

          const attemptNumber = currentTx.attempts.length + 1
          const attemptId = `att_recon_${currentTx.transactionId}_${attemptNumber}`
          const amount = currentTx.attempts[0]?.amount || 0
          const currency = currentTx.attempts[0]?.currency || 'EGP'

          const attemptRecord = {
            attemptId,
            attemptNumber,
            provider: 'stripe' as const,
            amount,
            currency,
            status: 'successful' as const,
            transactionReference: sessionId,
            timestamp: stripeStatus.completedAt || new Date().toISOString(),
          }

          // 1. Settle transaction aggregate in payment repository
          await this.paymentRepository.appendAttempt(currentTx.transactionId, attemptRecord, context)
          const updatedAggregate = await this.paymentRepository.updateStatus(currentTx.transactionId, 'successful', context)

          // 2. Resolve customer email if available
          let customerEmail: string | undefined
          if (currentTx.customerId && typeof this.customerRepository?.findById === 'function') {
            try {
              const userDoc = await this.customerRepository.findById(currentTx.customerId)
              customerEmail = userDoc?.email || undefined
            } catch {
              // Graceful fallback: NotificationSubscriber resolves recipientEmail from customerId
            }
          }

          // 3. Construct canonical PAYMENT_COMPLETED event
          const correlationId = `corr_recon_${currentTx.transactionId}`
          const paymentCompletedEvent: PaymentCompletedEvent = {
            type: 'PAYMENT_COMPLETED',
            eventId: `evt_stripe_recon_${currentTx.transactionId}`,
            correlationId,
            eventVersion: 1,
            occurredAt: stripeStatus.completedAt || new Date().toISOString(),
            aggregateType: 'Payment',
            aggregateId: updatedAggregate.transactionId,
            transactionId: updatedAggregate.transactionId,
            bookingId: updatedAggregate.bookingId,
            customerId: updatedAggregate.customerId,
            customerEmail,
            provider: 'stripe',
            amount,
            currency,
            gatewayReference: sessionId,
            attemptId,
            attemptNumber,
          }

          // 4. Publish strictly via canonical Transactional Outbox boundary
          if (!this.outboxRepository) {
            throw new Error(
              `[PaymentReconciliation] OutboxRepository is required for transactional reconciliation of Transaction ${currentTx.transactionId}.`,
            )
          }
          console.log(
            `[PaymentReconciliation] 📤 Queueing PAYMENT_COMPLETED event into Outbox (EventID: ${paymentCompletedEvent.eventId}) with Transactional Context:`,
            !!context.transactionId,
          )
          await this.outboxRepository.add(paymentCompletedEvent, context)

          reconciledCount++
        } else if (stripeStatus.status === 'failed') {
          console.log(`[PaymentReconciliation] Stripe session expired/failed for Transaction ${currentTx.transactionId}. Marking attempt as failed.`)
          await this.paymentRepository.updateStatus(currentTx.transactionId, 'failed', context)
        }

        // Commit transaction
        await this.paymentRepository.commitTransaction(transactionID)
      } catch (err: any) {
        // Rollback transaction
        await this.paymentRepository.rollbackTransaction(transactionID)
        console.error(`[PaymentReconciliation] Failed reconciling Transaction ${tx.transactionId}:`, err)
      }
    }

    return reconciledCount
  }

  /**
   * Gate 3A: Expire gateway checkout session for an expired booking (Stripe only).
   * Called post-commit by BookingExpiration.
   * Performs NO booking state mutation, NO inventory mutation, NO payment settlement, NO refund.
   */
  async expireSessionForBooking(bookingId: number, context?: RequestContext): Promise<{
    attempted: boolean
    outcome?: GatewaySessionExpirationOutcome
    sessionId?: string
    errorDetails?: string
  }> {
    if (!bookingId) {
      return { attempted: false }
    }

    const tx = await this.paymentRepository.findByBookingId(bookingId, context)
    if (!tx) {
      return { attempted: false }
    }

    if (tx.provider !== 'stripe') {
      return { attempted: false }
    }

    // Only attempt expiration if transaction is still initiated (not already successful or failed)
    if (tx.status !== 'initiated') {
      return {
        attempted: false,
        outcome: tx.status === 'successful' ? 'concurrent_payment_complete' : 'already_expired',
      }
    }

    const sessionId = tx.session?.sessionId
    if (!sessionId) {
      return { attempted: false }
    }

    const adapter = PaymentAdapterFactory.resolve('stripe')
    const result = await adapter.expireSession(sessionId)

    // Observability via existing payment transaction audit trail
    const auditRecord: PaymentAuditRecord = {
      auditId: `aud_exp_${Date.now()}`,
      actor: { id: 'system', type: 'system', name: 'BookingExpiration' },
      provider: 'stripe',
      action: 'EXPIRE_GATEWAY_SESSION',
      previousState: tx.status,
      newState: result.outcome === 'expired_successfully' || result.outcome === 'already_expired' ? 'failed' : tx.status,
      transactionId: tx.transactionId,
      bookingId: tx.bookingId,
      timestamp: new Date().toISOString(),
      reason: `Gateway session expiration outcome: ${result.outcome}${result.errorDetails ? ` (${result.errorDetails})` : ''}`,
    }

    if (result.outcome === 'expired_successfully' || result.outcome === 'already_expired') {
      console.log(`[PaymentService] Stripe session ${sessionId} for Booking #${bookingId} resolved as ${result.outcome}. Marking transaction as failed with atomic audit record.`)
      await this.paymentRepository.updateStatus(tx.transactionId, 'failed', context, auditRecord, tx.version)
    } else if (result.outcome === 'concurrent_payment_complete') {
      console.warn(`[PaymentService] ⚠️ CONCURRENT PAYMENT DETECTED: Stripe session ${sessionId} for Booking #${bookingId} was completed concurrently. Leaving settlement to Phase 2 Webhook/Reconciliation path.`)
      await this.paymentRepository.appendAudit(tx.transactionId, auditRecord, context, tx.version)
      // DO NOT mark failed! DO NOT refund! DO NOT confirm!
    } else {
      console.error(`[PaymentService] Failed to expire Stripe session ${sessionId} for Booking #${bookingId}: [${result.outcome}] ${result.errorDetails || ''}`)
      await this.paymentRepository.appendAudit(tx.transactionId, auditRecord, context, tx.version)
    }

    return {
      attempted: true,
      outcome: result.outcome,
      sessionId,
      errorDetails: result.errorDetails,
    }
  }
}
