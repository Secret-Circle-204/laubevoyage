import { describe, it, expect } from 'vitest'
import { PaymentAdapterFactory } from '@/domains/payment/adapters/factory'
import { StripePaymentAdapter } from '@/domains/payment/adapters/stripe'
import { BNPLPaymentAdapter } from '@/domains/payment/adapters/bnpl'

describe('Payment Domain: Adapter Factory & Gateway Adapters Unit Tests', () => {
  it('should resolve StripePaymentAdapter for stripe provider', () => {
    const adapter = PaymentAdapterFactory.resolve('stripe')
    expect(adapter).toBeInstanceOf(StripePaymentAdapter)
  })

  it('should resolve BNPLPaymentAdapter for bnpl provider', () => {
    const adapter = PaymentAdapterFactory.resolve('bnpl')
    expect(adapter).toBeInstanceOf(BNPLPaymentAdapter)
  })

  it('should execute BNPL adapter session creation in zero-knowledge mode', async () => {
    const adapter = PaymentAdapterFactory.resolve('bnpl')
    const result = await adapter.createCheckoutSession({
      transactionId: 'tx_101',
      bookingId: 1,
      customerId: 5,
      bookingNumber: 'LBV-260723-00042',
      basePriceEGP: 5000,
      displayCurrency: 'EGP',
      displayAmount: 5000,
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
      experienceTitle: 'Package Tour',
    })

    expect(result.sessionId).toContain('bnpl_sess_')
    expect(result.url).toContain('http://localhost:3000/success?session_id=')
  })
})
