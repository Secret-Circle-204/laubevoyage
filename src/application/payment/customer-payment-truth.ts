import { BookingStatus } from '@/types'

export type CustomerSemanticState =
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_RECEIVED'
  | 'CONFIRMED'
  | 'SESSION_EXPIRED'
  | 'BOOKING_EXPIRED'
  | 'LATE_PAYMENT_UNDER_REVIEW'
  | 'CANCELLED'
  | 'PENDING_ADMIN_REVIEW'
  | 'PAYMENT_UNCONFIRMED'

export interface CustomerPaymentTruthContext {
  bookingStatus: string | BookingStatus
  paymentStatus?: string
  providerStatus?: 'paid' | 'failed' | 'open' | 'unknown'
  isHoldExpired?: boolean
  bookingNumber?: string
  transactionId?: string
  checkoutUrl?: string
}

export interface CustomerPaymentTruth {
  semanticState: CustomerSemanticState
  badgeVariant: 'secondary' | 'outline' | 'warning' | 'error' | 'primary'
  badgeKey: string
  badgeFallback: string
  titleKey: string
  titleFallback: string
  descKey: string
  descFallback: string
  canRetry: boolean
  canWait: boolean
  isTerminal: boolean
  primaryAction: {
    type: 'checkout' | 'link' | 'none'
    labelKey: string
    labelFallback: string
    href?: string
  }
  secondaryAction?: {
    labelKey: string
    labelFallback: string
    href: string
  }
}

export class CustomerPaymentTruthPresenter {
  static resolve(ctx: CustomerPaymentTruthContext): CustomerPaymentTruth {
    const rawBookingStatus = (ctx.bookingStatus || '').toLowerCase()
    const rawPaymentStatus = (ctx.paymentStatus || '').toLowerCase()
    const providerStatus = ctx.providerStatus || 'unknown'
    const isHoldExpired = Boolean(ctx.isHoldExpired)
    const bookingNumber = ctx.bookingNumber || ''
    const checkoutUrl = ctx.checkoutUrl

    // 1. Confirmed / Secured
    if (rawBookingStatus === 'confirmed' || rawBookingStatus === 'paid') {
      return {
        semanticState: 'CONFIRMED',
        badgeVariant: 'secondary',
        badgeKey: 'checkout.truth.confirmed.badge',
        badgeFallback: 'CONFIRMED & SECURED',
        titleKey: 'checkout.truth.confirmed.title',
        titleFallback: 'Journey Confirmed',
        descKey: 'checkout.truth.confirmed.desc',
        descFallback: 'Your reservation is secured and your travel dossier is confirmed.',
        canRetry: false,
        canWait: false,
        isTerminal: true,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.confirmed.action',
          labelFallback: 'Access Travel Dossier →',
          href: bookingNumber ? `/booking/confirmation/${bookingNumber}` : '/dashboard/bookings',
        },
        secondaryAction: {
          labelKey: 'checkout.truth.confirmed.secondary',
          labelFallback: 'View in Member Vault',
          href: '/dashboard/bookings',
        },
      }
    }

    // 2. Pending Administrative / Concierge Review (BNPL, offline hold)
    if (rawBookingStatus === 'pending_admin_review') {
      return {
        semanticState: 'PENDING_ADMIN_REVIEW',
        badgeVariant: 'warning',
        badgeKey: 'checkout.truth.review.badge',
        badgeFallback: 'PENDING CONCIERGE REVIEW',
        titleKey: 'checkout.truth.review.title',
        titleFallback: 'Awaiting Administrative Review',
        descKey: 'checkout.truth.review.desc',
        descFallback:
          'Your reservation request has been received. Our concierge team is reviewing accommodation inventory and will confirm shortly.',
        canRetry: false,
        canWait: true,
        isTerminal: true,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.review.action',
          labelFallback: 'View in Member Vault →',
          href: '/dashboard/bookings',
        },
      }
    }

    // 3. Late Payment Received After Expiry (Internal financial exception)
    if (rawBookingStatus === 'payment_received_after_expiry') {
      return {
        semanticState: 'LATE_PAYMENT_UNDER_REVIEW',
        badgeVariant: 'warning',
        badgeKey: 'checkout.truth.latePayment.badge',
        badgeFallback: 'CONCIERGE SETTLEMENT REVIEW',
        titleKey: 'checkout.truth.latePayment.title',
        titleFallback: 'Payment Under Concierge Review',
        descKey: 'checkout.truth.latePayment.desc',
        descFallback:
          'Your payment was received after the reservation hold expired. Our concierge team is reviewing inventory to confirm your itinerary or arrange resolution. Please do not submit another payment.',
        canRetry: false,
        canWait: true,
        isTerminal: true,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.latePayment.action',
          labelFallback: 'View in Member Vault →',
          href: '/dashboard/bookings',
        },
      }
    }

    // 4. Payment Received — Booking Confirmation In Flight
    // Verified payment, but booking domain hasn't finished transitioning to confirmed yet
    if (
      (rawPaymentStatus === 'successful' || providerStatus === 'paid') &&
      rawBookingStatus !== 'expired' &&
      rawBookingStatus !== 'cancelled'
    ) {
      return {
        semanticState: 'PAYMENT_RECEIVED',
        badgeVariant: 'secondary',
        badgeKey: 'checkout.truth.paymentReceived.badge',
        badgeFallback: 'PAYMENT RECEIVED',
        titleKey: 'checkout.truth.paymentReceived.title',
        titleFallback: 'Payment Received — Finalizing Reservation',
        descKey: 'checkout.truth.paymentReceived.desc',
        descFallback:
          'Your settlement has been verified. We are finalizing your booking credentials. Please do not submit another payment.',
        canRetry: false,
        canWait: true,
        isTerminal: false,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.paymentReceived.action',
          labelFallback: 'View Reservation Status →',
          href: '/dashboard/bookings',
        },
      }
    }

    // 5. Booking Expired (Hold or window elapsed without successful payment)
    if (rawBookingStatus === 'expired' || (isHoldExpired && rawPaymentStatus !== 'successful' && providerStatus !== 'paid')) {
      return {
        semanticState: 'BOOKING_EXPIRED',
        badgeVariant: 'outline',
        badgeKey: 'checkout.truth.expired.badge',
        badgeFallback: 'RESERVATION WINDOW EXPIRED',
        titleKey: 'checkout.truth.expired.title',
        titleFallback: 'Reservation Window Expired',
        descKey: 'checkout.truth.expired.desc',
        descFallback:
          'This reservation was not completed within the payment window. Held accommodations have been released to maintain inventory integrity.',
        canRetry: false,
        canWait: false,
        isTerminal: true,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.expired.action',
          labelFallback: 'Start a New Reservation →',
          href: '/experiences',
        },
        secondaryAction: {
          labelKey: 'checkout.truth.expired.secondary',
          labelFallback: 'Return to Member Vault',
          href: '/dashboard/bookings',
        },
      }
    }

    // 6. Cancelled
    if (rawBookingStatus === 'cancelled') {
      return {
        semanticState: 'CANCELLED',
        badgeVariant: 'outline',
        badgeKey: 'checkout.truth.cancelled.badge',
        badgeFallback: 'RESERVATION CANCELLED',
        titleKey: 'checkout.truth.cancelled.title',
        titleFallback: 'Reservation Cancelled',
        descKey: 'checkout.truth.cancelled.desc',
        descFallback: 'This reservation has been cancelled.',
        canRetry: false,
        canWait: false,
        isTerminal: true,
        primaryAction: {
          type: 'link',
          labelKey: 'checkout.truth.cancelled.action',
          labelFallback: 'Explore Experiences →',
          href: '/experiences',
        },
      }
    }

    // 7. Payment Explicitly Failed (Card declined, 3DS failed) & Hold Still Active
    if (rawPaymentStatus === 'failed' || providerStatus === 'failed') {
      return {
        semanticState: 'PAYMENT_FAILED',
        badgeVariant: 'error',
        badgeKey: 'checkout.truth.failed.badge',
        badgeFallback: 'PAYMENT COULD NOT BE COMPLETED',
        titleKey: 'checkout.truth.failed.title',
        titleFallback: 'Payment Could Not Be Completed',
        descKey: 'checkout.truth.failed.desc',
        descFallback:
          'Your transaction could not be processed. Your reservation hold remains active. You can retry your payment safely.',
        canRetry: true,
        canWait: false,
        isTerminal: true,
        primaryAction: {
          type: 'checkout',
          labelKey: 'checkout.truth.failed.action',
          labelFallback: 'Try Payment Again →',
          href: checkoutUrl || (bookingNumber ? `/checkout/${bookingNumber}` : undefined),
        },
        secondaryAction: {
          labelKey: 'checkout.truth.failed.secondary',
          labelFallback: 'Return to Experiences',
          href: '/experiences',
        },
      }
    }

    // 8. Payment Required (Session open or awaiting payment, hold active)
    if (rawBookingStatus === 'pending_payment' || rawBookingStatus === 'draft') {
      return {
        semanticState: 'PAYMENT_REQUIRED',
        badgeVariant: 'warning',
        badgeKey: 'checkout.truth.required.badge',
        badgeFallback: 'PAYMENT REQUIRED',
        titleKey: 'checkout.truth.required.title',
        titleFallback: 'Payment Not Yet Completed',
        descKey: 'checkout.truth.required.desc',
        descFallback:
          'Your reservation is awaiting payment confirmation. Complete your settlement within the payment window to secure your journey.',
        canRetry: true,
        canWait: true,
        isTerminal: false,
        primaryAction: {
          type: 'checkout',
          labelKey: 'checkout.truth.required.action',
          labelFallback: 'Complete Payment →',
          href: checkoutUrl || (bookingNumber ? `/checkout/${bookingNumber}` : undefined),
        },
        secondaryAction: {
          labelKey: 'checkout.truth.required.secondary',
          labelFallback: 'View in Member Vault',
          href: '/dashboard/bookings',
        },
      }
    }

    // 9. Unconfirmed Fallback (Never guess, never lie about charges)
    return {
      semanticState: 'PAYMENT_UNCONFIRMED',
      badgeVariant: 'outline',
      badgeKey: 'checkout.truth.unconfirmed.badge',
      badgeFallback: 'VERIFICATION PENDING',
      titleKey: 'checkout.truth.unconfirmed.title',
      titleFallback: 'Payment Status Unconfirmed',
      descKey: 'checkout.truth.unconfirmed.desc',
      descFallback:
        'We could not definitively verify your payment status. If your card was charged, your reservation will update automatically once verified. Please check your bank before making another payment.',
      canRetry: false,
      canWait: true,
      isTerminal: true,
      primaryAction: {
        type: 'link',
        labelKey: 'checkout.truth.unconfirmed.action',
        labelFallback: 'Go to Member Vault →',
        href: '/dashboard/bookings',
      },
    }
  }
}
