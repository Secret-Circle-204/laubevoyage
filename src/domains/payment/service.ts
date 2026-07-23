import type { CreateSessionParams, RefundParams, RefundResult } from './types'
import type { PaymentAggregate } from './aggregate'
import { PaymentWorkflowEngine } from './workflow'
import type { BookingRepository } from '../booking/repository'
import type { CustomerRepository } from '../customer/repository'
import type { ExperienceRepository } from '../experience/repository'
import { PaymentRepository } from './repository'

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
  ) {
    this.paymentRepository = paymentRepository
    this.bookingRepository = bookingRepository || ({} as BookingRepository)
    this.customerRepository = customerRepository || ({} as CustomerRepository)
    this.experienceRepository = experienceRepository || ({} as ExperienceRepository)
    this.workflowEngine = new PaymentWorkflowEngine(paymentRepository)
  }

  async getAvailableGateways() {
    return this.paymentRepository.findActiveGateways()
  }

  async processPaymentCheckout(params: { bookingId: number; gatewayId: string; appUrl?: string }) {
    if (params.gatewayId === 'bnpl') {
      const paymentAggregate = await this.processBookNowPayLater(params.bookingId)
      return { success: true, transactionId: paymentAggregate.transactionId, status: paymentAggregate.status }
    }

    const baseUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || ''
    const session = await this.createStripeSession(
      params.bookingId,
      `${baseUrl}/dashboard/bookings`,
      `${baseUrl}/checkout/${params.bookingId}`,
    )

    return { success: true, transactionId: session.transactionId, checkoutUrl: session.url }
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
  async handleStripeWebhook(rawBody: string | Buffer, signature: string) {
    return this.workflowEngine.executeWebhookWorkflow(rawBody, signature, 'stripe')
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
}
