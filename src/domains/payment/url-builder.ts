/**
 * Payment Gateway URL Builder
 * Domain-controlled builder for provider-specific success and cancel redirect URLs.
 * Keeps PaymentService decoupled from provider URL format logic.
 */
export class PaymentUrlBuilder {
  static buildUrls(params: {
    baseUrl: string
    transactionId: string
    bookingId: number
    bookingNumber: string
    gatewayId: string
  }): { successUrl: string; cancelUrl: string } {
    if (!params.baseUrl) {
      throw new Error('[PaymentUrlBuilder] Base URL is required for constructing redirect URLs.')
    }
    if (!params.gatewayId) {
      throw new Error('[PaymentUrlBuilder] Gateway ID is required for constructing redirect URLs.')
    }
    const base = params.baseUrl.replace(/\/$/, '')
    const gateway = params.gatewayId.toLowerCase()

    if (gateway === 'bnpl' || gateway === 'manual') {
      return {
        successUrl: `${base}/booking/confirmation/${params.bookingNumber}`,
        cancelUrl: `${base}/checkout/${params.bookingNumber}`,
      }
    }

    // Default Hosted Gateway Redirect (Stripe, Paymob, etc.)
    return {
      successUrl: `${base}/checkout/success?tx=${params.transactionId}&bookingNumber=${params.bookingNumber}`,
      cancelUrl: `${base}/checkout/${params.bookingNumber}?status=cancelled&tx=${params.transactionId}`,
    }
  }
}
