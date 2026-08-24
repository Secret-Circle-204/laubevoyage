import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingStatus } from '@/types'
import { BookingPolicy } from '@/domains/booking/policy'
import { PaymentService } from '@/domains/payment/service'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { PaymentAdapterFactory } from '@/domains/payment/adapters/factory'

describe('Checkout Intent Invariants Integration Tests', () => {
  let mockPayload: any
  let bookingWorkflow: BookingWorkflowEngine
  let paymentService: PaymentService
  let mockPaymentRepo: any

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    bookingWorkflow = new BookingWorkflowEngine(mockPayload)

    mockPaymentRepo = {
      findByBookingId: vi.fn(),
      findPendingTransactions: vi.fn(),
      updateStatus: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('mock_tx_id'),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    }

    paymentService = new PaymentService(
      mockPaymentRepo,
      bookingWorkflow.repository,
      {} as any,
      {} as any
    )
  })

  describe('BookingPolicy.canReuseForCheckout Intent Verification', () => {
    it('should disallow reuse if displayCurrency does not match requested currency', () => {
      const mockBooking = {
        id: 101,
        customerId: 5,
        experienceId: 12,
        startDate: '2026-08-27',
        status: BookingStatus.DRAFT,
        pricingSnapshot: { displayCurrency: 'OMR' },
        paymentWindowExpiresAt: new Date(Date.now() + 60000).toISOString(),
      } as any

      const result = BookingPolicy.canReuseForCheckout(
        mockBooking,
        5,
        12,
        '2026-08-27',
        'USD',
        'stripe'
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('IDEMPOTENCY_CURRENCY_MISMATCH')
    })

    it('should disallow reuse if gateway target state does not match requested gateway', () => {
      const mockBooking = {
        id: 101,
        customerId: 5,
        experienceId: 12,
        startDate: '2026-08-27',
        status: BookingStatus.PENDING_PAYMENT, // Stripe state
        pricingSnapshot: { displayCurrency: 'USD' },
        paymentWindowExpiresAt: new Date(Date.now() + 60000).toISOString(),
      } as any

      const result = BookingPolicy.canReuseForCheckout(
        mockBooking,
        5,
        12,
        '2026-08-27',
        'USD',
        'bnpl' // BNPL gateway requested
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('IDEMPOTENCY_GATEWAY_MISMATCH')
    })

    it('should allow reuse if currency, gateway type, customer, and date match exactly', () => {
      const mockBooking = {
        id: 101,
        customerId: 5,
        experienceId: 12,
        startDate: '2026-08-27',
        status: BookingStatus.PENDING_PAYMENT,
        pricingSnapshot: { displayCurrency: 'USD' },
        paymentWindowExpiresAt: new Date(Date.now() + 60000).toISOString(),
      } as any

      const result = BookingPolicy.canReuseForCheckout(
        mockBooking,
        5,
        12,
        '2026-08-27',
        'USD',
        'stripe'
      )

      expect(result.allowed).toBe(true)
    })
  })

  describe('PaymentService processPaymentCheckout Cross-Gateway Invalidation', () => {
    it('should expire session and fail old transaction when switching gateways', async () => {
      const mockBooking = {
        id: 101,
        customerId: 5,
        experienceId: 12,
        status: BookingStatus.PENDING_PAYMENT,
        pricingSnapshot: { totalAmountEGP: 5000 },
      } as any

      const existingTx = {
        transactionId: 'tx_stripe_123',
        bookingId: 101,
        provider: 'stripe',
        status: 'initiated',
        session: { sessionId: 'cs_test_stripe' },
      } as any

      bookingWorkflow.repository.findById = vi.fn().mockResolvedValue(mockBooking)
      mockPaymentRepo.findByBookingId.mockResolvedValue(existingTx)

      // Mock expireSession call on factory resolve
      const mockStripeAdapter = {
        expireSession: vi.fn().mockResolvedValue(true),
      }
      const factorySpy = vi.spyOn(PaymentAdapterFactory, 'resolve').mockReturnValue(mockStripeAdapter as any)

      await paymentService.processPaymentCheckout({
        bookingId: 101,
        gatewayId: 'bnpl', // Switching to BNPL
      }).catch(() => {})

      expect(mockStripeAdapter.expireSession).toHaveBeenCalledWith('cs_test_stripe')
      expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_stripe_123', 'failed')
      factorySpy.mockRestore()
    })
  })
})
