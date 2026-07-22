import { describe, it, expect } from 'vitest'
import { PaymentPolicy } from '@/domains/payment/policy'
import type { PaymentAggregate } from '@/domains/payment/aggregate'

describe('Payment Domain: Policy Unit Tests', () => {
  describe('canCreateSession', () => {
    it('should disallow session creation for completed or cancelled bookings', () => {
      const result = PaymentPolicy.canCreateSession('completed', 5000)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_BOOKING_STATUS')
    })

    it('should disallow session creation if display amount is zero or negative', () => {
      const result = PaymentPolicy.canCreateSession('draft', 0)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_AMOUNT')
    })

    it('should allow session creation for valid draft booking with positive amount', () => {
      const result = PaymentPolicy.canCreateSession('draft', 5000)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canProcessWebhook', () => {
    it('should disallow duplicate webhook event IDs (Idempotency Guard)', () => {
      const result = PaymentPolicy.canProcessWebhook(true)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DUPLICATE_WEBHOOK_EVENT')
    })

    it('should allow unprocessed webhook event IDs', () => {
      const result = PaymentPolicy.canProcessWebhook(false)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canRefund', () => {
    it('should disallow refund if transaction status is not successful', () => {
      const mockTx = { status: 'failed' } as PaymentAggregate
      const result = PaymentPolicy.canRefund(mockTx, 5000)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('TRANSACTION_NOT_SUCCESSFUL')
    })
  })
})
