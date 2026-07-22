import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentWorkflowEngine } from '@/domains/payment/workflow'

describe('Payment Domain: PaymentWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: PaymentWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    workflowEngine = new PaymentWorkflowEngine(mockPayload)
  })

  it('should execute session creation workflow and persist payment aggregate record', async () => {
    const mockTxDoc = {
      id: 'tx_101',
      transactionId: 'tx_101',
      bookingId: 1,
      customerId: 5,
      version: 1,
      provider: 'bnpl',
      status: 'initiated',
      session: { sessionId: 'bnpl_sess_1' },
      attempts: [],
      webhookLedger: [],
      auditTrail: [],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.create.mockResolvedValue(mockTxDoc)

    const result = await workflowEngine.executeCreateSessionWorkflow('bnpl', {
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
    }, 'draft')

    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'payment-transactions',
      }),
    )
    expect(result.transactionId).toBe('tx_101')
    expect(result.status).toBe('initiated')
  })
})
