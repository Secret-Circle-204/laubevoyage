import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookingStatus } from '@/types'
import { BookingPolicy } from '@/domains/booking/policy'
import { PaymentService } from '@/domains/payment/service'
import { PaymentRepository } from '@/domains/payment/repository'
import { PaymentAdapterFactory } from '@/domains/payment/adapters/factory'
import * as factoryModule from '@/domains/factory'

describe('Layer 12: Checkout & Expiration Lifecycle Regression Tests', () => {
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

  it('should block checkout creation if booking hold is expired', async () => {
    const expiredBooking = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'pending_payment',
      customerId: 5,
      experienceId: 12,
      pricingSnapshot: { basePriceEGP: 5000, displayCurrency: 'EGP', displayAmount: 5000 },
      paymentWindowExpiresAt: new Date(Date.now() - 60000).toISOString(),
      capacityHold: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      },
    }

    mockPayload.findByID.mockResolvedValue(expiredBooking)
    bookingWorkflow.repository.findById = vi.fn().mockResolvedValue(expiredBooking)

    const result = await paymentService.processPaymentCheckout({
      bookingId: 101,
      gatewayId: 'stripe',
      appUrl: 'http://localhost:3000',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/payment window expired|hold expired/i)
  })

  it('should enforce central BookingPolicy.canConfirm and mark metadata flags upon payment after hold expiry', async () => {
    const expiredBooking = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'expired',
      customerId: 5,
      experienceId: 12,
      pricingSnapshot: { basePriceEGP: 5000, displayCurrency: 'EGP', displayAmount: 5000 },
      paymentWindowExpiresAt: new Date(Date.now() - 60000).toISOString(),
      capacityHold: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      },
      metadata: {},
    }

    const mockPendingTx = {
      transactionId: 'tx_123',
      bookingId: 101,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_123', url: 'http://stripe.com/pay' },
      attempts: [{ amount: 5000, currency: 'EGP' }],
    }

    // Mock BookingPolicy.canConfirm to reject
    const canConfirmSpy = vi.spyOn(BookingPolicy, 'canConfirm').mockReturnValue({
      allowed: false,
      reason: 'Hold expired',
    })

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([mockPendingTx])
    bookingWorkflow.repository.findById = vi.fn().mockResolvedValue(expiredBooking)

    // Mock PaymentAdapterFactory to prevent calling real Stripe API
    const mockStripeAdapter = {
      retrievePaymentStatus: vi.fn().mockResolvedValue({
        status: 'paid',
        gatewayStatus: 'session:complete_payment:paid',
        completedAt: new Date(Date.now() - 30000).toISOString(),
      }),
    }
    const adapterFactorySpy = vi.spyOn(PaymentAdapterFactory, 'resolve').mockReturnValue(mockStripeAdapter as any)
    
    const mockUpdate = vi.fn()
    // Stub getDomainServices from factory dynamically
    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(expiredBooking),
        markAsPaid: vi.fn(),
        update: mockUpdate,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(1)
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_123', 'successful', expect.any(Object))
    expect(mockUpdate).toHaveBeenCalledWith(101, expect.objectContaining({
      status: BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY,
      metadata: expect.objectContaining({
        paymentReceivedAfterExpiry: true,
        manualRefundRequired: true,
      })
    }), expect.any(Object))
    canConfirmSpy.mockRestore()
    adapterFactorySpy.mockRestore()
  })
})
