import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import { BookingStatus } from '@/types'
import { BookingPolicy } from '@/domains/booking/policy'
import { PaymentService } from '@/domains/payment/service'
import { PaymentRepository } from '@/domains/payment/repository'
import { PaymentAdapterFactory } from '@/domains/payment/adapters/factory'
import * as factoryModule from '@/domains/factory'

describe('Layer 13: Payment Reconciliation Integration Tests', () => {
  let mockPayload: any
  let paymentService: PaymentService
  let mockPaymentRepo: any
  let mockBookingDoc: any
  let stripeAdapter: any
  let adapterFactorySpy: MockInstance

  beforeEach(() => {
    mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('mock_tx_123'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }

    mockPaymentRepo = {
      findPendingTransactions: vi.fn(),
      updateStatus: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('mock_tx_123'),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    }

    paymentService = new PaymentService(
      mockPaymentRepo,
      {} as any, // bookingRepository will be resolved via getDomainServices
      {} as any,
      {} as any
    )

    stripeAdapter = {
      retrievePaymentStatus: vi.fn(),
    }
    adapterFactorySpy = vi.spyOn(PaymentAdapterFactory, 'resolve').mockReturnValue(stripeAdapter)
  })

  it('should reconcile on-time Stripe payment and confirm the booking', async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString() // 1 minute in the future
    mockBookingDoc = {
      id: 101,
      bookingNumber: 'LB-101',
      status: 'pending_payment',
      capacityHold: { status: 'active', expiresAt },
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      metadata: {},
    }

    const pendingTx = {
      transactionId: 'tx_123',
      bookingId: 101,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_123' },
      attempts: [{ amount: 5000, currency: 'EGP' }],
    }

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([pendingTx])
    stripeAdapter.retrievePaymentStatus.mockResolvedValue({
      status: 'paid',
      gatewayStatus: 'session:complete_payment:paid',
      completedAt: new Date(Date.now() - 10000).toISOString(), // Completed 10 seconds ago (on-time)
    })

    const mockMarkAsPaid = vi.fn().mockImplementation(() => {
      mockBookingDoc.status = BookingStatus.PAID
    })
    const mockConfirm = vi.fn()
    const mockUpdate = vi.fn()

    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(mockBookingDoc),
        markAsPaid: mockMarkAsPaid,
        confirm: mockConfirm,
        update: mockUpdate,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(1)
    expect(mockMarkAsPaid).toHaveBeenCalled()
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_123', 'successful', expect.any(Object))
    expect(mockPaymentRepo.commitTransaction).toHaveBeenCalledWith('mock_tx_123')
  })

  it('should reconcile late Stripe payment and transition booking directly to PAYMENT_RECEIVED_AFTER_EXPIRY', async () => {
    const expiresAt = new Date(Date.now() - 60000).toISOString() // 1 minute in the past
    mockBookingDoc = {
      id: 101,
      bookingNumber: 'LB-101',
      status: 'expired',
      capacityHold: { status: 'expired', expiresAt },
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      metadata: {},
    }

    const pendingTx = {
      transactionId: 'tx_123',
      bookingId: 101,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_123' },
      attempts: [{ amount: 5000, currency: 'EGP' }],
    }

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([pendingTx])
    stripeAdapter.retrievePaymentStatus.mockResolvedValue({
      status: 'paid',
      gatewayStatus: 'session:complete_payment:paid',
      completedAt: new Date(Date.now() - 10000).toISOString(), // Completed 10 seconds ago (which is late)
    })

    const mockMarkAsPaid = vi.fn()
    const mockConfirm = vi.fn()
    const mockUpdate = vi.fn()

    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(mockBookingDoc),
        markAsPaid: mockMarkAsPaid,
        confirm: mockConfirm,
        update: mockUpdate,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(1)
    expect(mockMarkAsPaid).not.toHaveBeenCalled()
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(101, expect.objectContaining({
      status: BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY,
    }), expect.any(Object))
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_123', 'successful', expect.any(Object))
    expect(mockPaymentRepo.commitTransaction).toHaveBeenCalledWith('mock_tx_123')
  })

  it('should roll back both booking and payment transaction updates on update failure', async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString()
    mockBookingDoc = {
      id: 101,
      bookingNumber: 'LB-101',
      status: 'pending_payment',
      capacityHold: { status: 'active', expiresAt },
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      metadata: {},
    }

    const pendingTx = {
      transactionId: 'tx_123',
      bookingId: 101,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_123' },
      attempts: [{ amount: 5000, currency: 'EGP' }],
    }

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([pendingTx])
    stripeAdapter.retrievePaymentStatus.mockResolvedValue({
      status: 'paid',
      gatewayStatus: 'session:complete_payment:paid',
      completedAt: new Date(Date.now() - 10000).toISOString(),
    })

    const mockConfirm = vi.fn().mockRejectedValue(new Error('DB Mismatch on update'))

    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(mockBookingDoc),
        markAsPaid: vi.fn(),
        confirm: mockConfirm,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(0)
    expect(mockPaymentRepo.rollbackTransaction).toHaveBeenCalledWith('mock_tx_123')
    expect(mockPaymentRepo.commitTransaction).not.toHaveBeenCalled()
  })

  it('should reconcile on-time even when reconciliation runs after expiry if payment completed before expiry', async () => {
    const expiresAt = new Date(Date.now() - 60000).toISOString() // 1 minute in the past
    mockBookingDoc = {
      id: 101,
      bookingNumber: 'LB-101',
      status: 'pending_payment',
      capacityHold: { status: 'active', expiresAt }, // Still active in DB (Expiration worker hasn't run)
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      metadata: {},
    }

    const pendingTx = {
      transactionId: 'tx_123',
      bookingId: 101,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_123' },
      attempts: [{ amount: 5000, currency: 'EGP' }],
    }

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([pendingTx])
    stripeAdapter.retrievePaymentStatus.mockResolvedValue({
      status: 'paid',
      gatewayStatus: 'session:complete_payment:paid',
      completedAt: new Date(Date.now() - 120000).toISOString(), // Completed 2 minutes ago (before expiresAt)
    })

    const mockMarkAsPaid = vi.fn().mockImplementation(() => {
      mockBookingDoc.status = BookingStatus.PAID
    })
    const mockConfirm = vi.fn()

    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(mockBookingDoc),
        markAsPaid: mockMarkAsPaid,
        confirm: mockConfirm,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(1)
    expect(mockMarkAsPaid).toHaveBeenCalled()
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_123', 'successful', expect.any(Object))
  })

  it('should process reconciliation successfully when webhook is lost (first time discovery)', async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString()
    mockBookingDoc = {
      id: 102,
      bookingNumber: 'LB-102',
      status: 'pending_payment',
      capacityHold: { status: 'active', expiresAt },
      paymentAttempts: [],
      metadata: {},
    }

    const pendingTx = {
      transactionId: 'tx_456',
      bookingId: 102,
      provider: 'stripe',
      status: 'initiated',
      session: { sessionId: 'sess_456' },
      attempts: [{ amount: 7500, currency: 'EGP' }],
    }

    mockPaymentRepo.findPendingTransactions.mockResolvedValue([pendingTx])
    stripeAdapter.retrievePaymentStatus.mockResolvedValue({
      status: 'paid',
      gatewayStatus: 'session:complete_payment:paid',
      completedAt: new Date(Date.now() - 5000).toISOString(),
    })

    const mockMarkAsPaid = vi.fn().mockImplementation(() => {
      mockBookingDoc.status = BookingStatus.PAID
    })
    const mockConfirm = vi.fn()

    vi.spyOn(factoryModule, 'getDomainServices').mockResolvedValue({
      booking: {
        getById: vi.fn().mockResolvedValue(mockBookingDoc),
        markAsPaid: mockMarkAsPaid,
        confirm: mockConfirm,
      },
    } as any)

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(1)
    expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('tx_456', 'successful', expect.any(Object))
  })

  it('should be fully idempotent and perform no-op on subsequent reconciliation runs', async () => {
    // Already reconciled/successful transactions will not be returned by findPendingTransactions
    mockPaymentRepo.findPendingTransactions.mockResolvedValue([])

    const count = await paymentService.reconcilePendingPayments()

    expect(count).toBe(0)
    expect(stripeAdapter.retrievePaymentStatus).not.toHaveBeenCalled()
  })
})
