import { PaymentProvider, PaymentStatus } from '@/types'
import type { Payload } from 'payload'
import { BookingService } from '../booking/service'

interface StripeWebhookEvent {
  type: string
  data: {
    object: {
      id: string
      metadata?: {
        bookingId?: string | number
      } | null
      payment_intent?: string | null
    }
  }
}

/**
 * Payment Domain Service
 * Handles payment processing with multiple providers
 */
export class PaymentService {
  private payload: Payload
  private bookingService: BookingService

  constructor(payload: Payload) {
    this.payload = payload
    this.bookingService = new BookingService(payload)
  }

  /**
   * Create payment session (Stripe)
   */
  async createStripeSession(bookingId: number, successUrl: string, cancelUrl: string) {
    const booking = await this.bookingService.getById(bookingId)

    // TODO: Implement Stripe session creation
    // This is a placeholder for Stripe integration

    return {
      sessionId: 'mock_session_id',
      url: 'https://checkout.stripe.com/mock',
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(event: StripeWebhookEvent) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const bookingIdRaw = session.metadata?.bookingId

        if (bookingIdRaw) {
          const bookingId = Number(bookingIdRaw)
          await this.bookingService.markAsPaid(bookingId)
          await this.bookingService.confirm(bookingId, session.payment_intent || 'unknown')
        }
        break
      }

      case 'payment_intent.payment_failed':
        // Handle failed payment
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  }

  /**
   * Process Book Now Pay Later
   */
  async processBookNowPayLater(bookingId: number) {
    // Mark as paid immediately for BNPL
    await this.bookingService.markAsPaid(bookingId)
    await this.bookingService.confirm(bookingId, 'bnpl_' + Date.now())
  }
}

