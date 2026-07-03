import { PaymentProvider, PaymentStatus, CurrencyCode } from '@/types'
import type { Payload } from 'payload'
import { BookingService } from '../booking/service'
import { CurrencyService } from '../currency/service'
import { stripe } from '@/lib/stripe'
import type { Customer, Experience } from '@/payload-types'

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
  private currencyService: CurrencyService

  constructor(payload: Payload) {
    this.payload = payload
    this.bookingService = new BookingService(payload)
    this.currencyService = new CurrencyService(payload)
  }

  /**
   * Create payment session (Stripe)
   */
  async createStripeSession(bookingId: number, successUrl: string, cancelUrl: string) {
    const booking = await this.bookingService.getById(bookingId)

    const userDoc = typeof booking.user === 'object' && booking.user !== null
      ? (booking.user as Customer)
      : await this.payload.findByID({ collection: 'customers', id: Number(booking.user) })

    const experienceDoc = typeof booking.experience === 'object' && booking.experience !== null
      ? (booking.experience as Experience)
      : await this.payload.findByID({ collection: 'experiences', id: Number(booking.experience) })

    const currency = booking.pricing.currency || 'EGP'
    const totalAmountEGP = booking.pricing.totalAmount

    if (totalAmountEGP <= 0) {
      throw new Error('Total price must be greater than zero for Stripe payment')
    }

    // Convert EGP amount to booking payment currency
    const targetAmount = await this.currencyService.convert(
      CurrencyCode.EGP,
      currency as CurrencyCode,
      totalAmountEGP
    )

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userDoc.email || undefined,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: experienceDoc.title,
              description: `Booking #${booking.bookingNumber} - L'Aube Voyage`,
            },
            unit_amount: Math.round(targetAmount * 100), // scale to sub-units
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking.id),
        userId: String(userDoc.id),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes session expiry
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return {
      sessionId: session.id,
      url: session.url,
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
