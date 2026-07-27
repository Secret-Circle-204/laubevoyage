import type { PaymentProvider } from '../contracts/payment-provider'
import { PaymentAdapterFactory } from '../adapters/factory'
import type { PaymentProviderType } from '../types'

/**
 * @deprecated Legacy bridge delegating to PaymentAdapterFactory.
 * Use PaymentAdapterFactory directly in new implementations.
 */
export class PaymentProviderFactory {
  static getProvider(providerId: string): PaymentProvider {
    if (!providerId) {
      throw new Error('[PaymentProviderFactory] Provider ID is required.')
    }
    const key = providerId.toLowerCase() as PaymentProviderType
    const adapter = PaymentAdapterFactory.resolve(key)
    return adapter as unknown as PaymentProvider
  }

  static registerProvider(_provider: PaymentProvider): void {
    // No-op for legacy compatibility
  }
}
