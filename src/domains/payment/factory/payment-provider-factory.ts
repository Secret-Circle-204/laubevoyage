import type { PaymentProvider } from '../contracts/payment-provider'
import { StripePaymentProvider } from '../providers/stripe-provider'
import { PaymobPaymentProvider } from '../providers/paymob-provider'
import { BnplPaymentProvider } from '../providers/bnpl-provider'

export class PaymentProviderFactory {
  private static providers: Map<string, PaymentProvider> = new Map<string, PaymentProvider>([
    ['stripe', new StripePaymentProvider()],
    ['paymob', new PaymobPaymentProvider()],
    ['fawry', new PaymobPaymentProvider()],
    ['vodafone_cash', new PaymobPaymentProvider()],
    ['bnpl', new BnplPaymentProvider()],
  ])

  static getProvider(providerId: string): PaymentProvider {
    const key = (providerId || 'stripe').toLowerCase()
    const provider = this.providers.get(key)
    if (!provider) {
      // Fallback default provider
      return this.providers.get('stripe')!
    }
    return provider
  }

  static registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.providerId.toLowerCase(), provider)
  }
}
