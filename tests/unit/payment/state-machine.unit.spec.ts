import { describe, it, expect } from 'vitest'
import { validatePaymentTransition, isPaymentTransitionAllowed } from '@/domains/payment/state-machine'

describe('Payment Domain: State Machine Unit Tests', () => {
  it('should allow valid payment status transitions', () => {
    expect(isPaymentTransitionAllowed('initiated', 'processing')).toBe(true)
    expect(isPaymentTransitionAllowed('processing', 'successful')).toBe(true)
    expect(isPaymentTransitionAllowed('processing', 'failed')).toBe(true)
    expect(isPaymentTransitionAllowed('successful', 'refunded')).toBe(true)
    expect(isPaymentTransitionAllowed('successful', 'partially_refunded')).toBe(true)
  })

  it('should forbid invalid state transitions', () => {
    expect(isPaymentTransitionAllowed('initiated', 'successful')).toBe(false)
    expect(isPaymentTransitionAllowed('failed', 'successful')).toBe(false)
    expect(() => validatePaymentTransition('initiated', 'successful')).toThrowError(
      '[PaymentStateMachine] Forbidden transition',
    )
  })
})
