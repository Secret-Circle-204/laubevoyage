import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentWorkflowEngine } from '@/domains/payment/workflow'

describe('Payment Domain: Performance Budget & Observability Tests', () => {
  let mockPayload: any
  let workflowEngine: PaymentWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn().mockImplementation((params) =>
        Promise.resolve({
          id: 'tx_101',
          transactionId: 'tx_101',
          status: 'initiated',
          session: { sessionId: 'bnpl_sess_1' },
          ...params.data,
        }),
      ),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn().mockImplementation((params) => Promise.resolve({ id: params.id, ...params.data })),
    }
    workflowEngine = new PaymentWorkflowEngine(mockPayload)
  })

  it('should enforce payment session creation execution duration < 300ms', async () => {
    const startTime = performance.now()

    await workflowEngine.executeCreateSessionWorkflow('bnpl', {
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

    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(300) // Performance budget < 300ms
  })
})
