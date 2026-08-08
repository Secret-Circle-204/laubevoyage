import { BookingStatus } from '@/types'
import { BookingPolicy } from '../booking/policy'
import type { CreateSessionParams, RefundParams, RefundResult, PaymentProviderType } from './types'
import type { PaymentAggregate } from './aggregate'
import { PaymentWorkflowEngine } from './workflow'
import type { BookingRepository } from '../booking/repository'
import type { CustomerRepository } from '../customer/repository'
import type { ExperienceRepository } from '../experience/repository'
import { PaymentRepository } from './repository'
import { PaymentAdapterFactory } from './adapters/factory'
import { PaymentUrlBuilder } from './url-builder'

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

  constructor(
    paymentRepository: PaymentRepository,
    bookingRepository?: BookingRepository,
    customerRepository?: CustomerRepository,
    experienceRepository?: ExperienceRepository,
    outboxRepository?: import('../events/contracts/outbox-repository.interface').IOutboxRepository,
  ) {
    this.paymentRepository = paymentRepository
    this.bookingRepository = bookingRepository || ({} as BookingRepository)
    this.customerRepository = customerRepository || ({} as CustomerRepository)
    this.experienceRepository = experienceRepository || ({} as ExperienceRepository)
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
      } catch (err) {
        console.error(`[PaymentService] Failed checking status of existing checkout session:`, err)
      }
    }

    // 2. Block new/retry payment session if capacity hold is expired
    if (booking.capacityHold?.expiresAt) {
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
      displayCurrency: pricingSnapshot.displayCurrency || 'EGP',
      displayAmount: pricingSnapshot.displayAmount || 0,
      successUrl,
      cancelUrl,
      customerEmail: userDoc?.email || undefined,
      experienceTitle: experienceDoc?.title || `Booking #${booking.bookingNumber}`,
    }

    const paymentAggregate = await this.workflowEngine.executeCreateSessionWorkflow(providerType, sessionParams, booking.status)
    const session = paymentAggregate.session || (await adapter.createCheckoutSession(sessionParams))

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
    const displayCurrency = pricingSnapshot.displayCurrency || 'EGP'
    const displayAmount = pricingSnapshot.displayAmount || 0

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

    const transactionId = `tx_bnpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const params: CreateSessionParams = {
      transactionId,
      bookingId: booking.id,
      customerId: booking.customerId,
      bookingNumber: booking.bookingNumber,
      basePriceEGP: booking.pricingSnapshot.basePriceEGP,
      displayCurrency: booking.pricingSnapshot.displayCurrency || 'EGP',
      displayAmount: booking.pricingSnapshot.displayAmount || 0,
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
   * Reconcile any pending payment transactions (called by CronDispatcher / background processes)
   */
  async reconcilePendingPayments(): Promise<number> {
    const pendingTransactions = await this.paymentRepository.findPendingTransactions()
    let reconciledCount = 0

    for (const tx of pendingTransactions) {
      if (tx.provider !== 'stripe') continue
      
      const sessionId = tx.session?.sessionId
      if (!sessionId) continue

      try {
        const adapter = PaymentAdapterFactory.resolve('stripe')
        const stripeStatus = await adapter.retrievePaymentStatus({ providerSessionId: sessionId })
        
        if (stripeStatus.status === 'paid') {
          console.log(`[PaymentReconciliation] Found paid Stripe session for Transaction ${tx.transactionId}. Reconciling...`)
          
          const { getDomainServices } = await import('../factory')
          const { booking } = await getDomainServices()
          const bookingDoc = await booking.getById(tx.bookingId)

          const attemptRecord = {
            attemptId: `att_recon_${tx.transactionId}`,
            attemptNumber: tx.attempts.length + 1,
            provider: 'stripe' as const,
            amount: tx.attempts[0]?.amount || 0,
            currency: tx.attempts[0]?.currency || 'EGP',
            status: 'successful' as const,
            transactionReference: sessionId,
            timestamp: new Date().toISOString(),
          }

          // Evaluate booking policy to verify if confirmation is allowed
          const canConfirmResult = BookingPolicy.canConfirm(bookingDoc)
          if (canConfirmResult.allowed) {
            await booking.markAsPaid(tx.bookingId, attemptRecord)
            await booking.confirm(tx.bookingId)
            await this.paymentRepository.updateStatus(tx.transactionId, 'successful')
          } else {
            console.warn(`[PaymentReconciliation] BookingPolicy canConfirm rejected for Booking #${tx.bookingId}: ${canConfirmResult.reason}`)
            // Keep/set status to CANCELLED/EXPIRED, but record attempt and set metadata flags
            await booking.markAsPaid(tx.bookingId, attemptRecord)
            
            const metadata = bookingDoc.metadata || {}
            metadata.paymentReceivedAfterExpiry = true
            metadata.manualRefundRequired = true
            metadata.reconciliationNotes = `payment_received_after_expiry: ${canConfirmResult.reason}`
            
            await booking.update(tx.bookingId, {
              status: BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY,
              metadata,
            })
            await this.paymentRepository.updateStatus(tx.transactionId, 'successful')
          }
          reconciledCount++
        } else if (stripeStatus.status === 'failed') {
          console.log(`[PaymentReconciliation] Stripe session expired/failed for Transaction ${tx.transactionId}. Marking attempt as failed.`)
          await this.paymentRepository.updateStatus(tx.transactionId, 'failed')
        }
      } catch (err: any) {
        console.error(`[PaymentReconciliation] Failed reconciling Transaction ${tx.transactionId}:`, err)
      }
    }

    return reconciledCount
  }
}
