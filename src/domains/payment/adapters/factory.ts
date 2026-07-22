import type { IPaymentAdapter } from './adapter.interface'
import type { PaymentProviderType } from '../types'
import { StripePaymentAdapter } from './stripe'
import { BNPLPaymentAdapter } from './bnpl'

/**
 * Payment Adapter Factory
 * Strategy pattern resolver for payment gateway adapters.
 * Adding new providers (PayPal, Apple Pay) requires zero modifications to PaymentService.
 */
export class PaymentAdapterFactory {
  static resolve(provider: PaymentProviderType): IPaymentAdapter {
    switch (provider) {
      case 'stripe':
        return new StripePaymentAdapter()
      case 'bnpl':
      case 'manual':
        return new BNPLPaymentAdapter()
      default:
        throw new Error(`[PaymentAdapterFactory] Unsupported provider: "${provider}"`)
    }
  }
}
