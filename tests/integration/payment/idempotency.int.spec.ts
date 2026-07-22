import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentWorkflowEngine } from '@/domains/payment/workflow'

describe('Payment Domain: Webhook Idempotency Integration Tests', () => {
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

  it('should skip duplicate webhook event processing if already recorded in DB Webhook Ledger', async () => {
    const mockTxDoc = {
      id: 'tx_101',
      transactionId: 'tx_101',
      bookingId: 1,
      customerId: 5,
      version: 1,
      provider: 'stripe',
      status: 'successful',
      session: { sessionId: 'sess_1' },
      attempts: [],
      webhookLedger: [{ eventId: 'evt_stripe_duplicate_101', provider: 'stripe', eventType: 'checkout.session.completed', bookingId: 1, processedAt: '2026-07-22T12:00:00.000Z', status: 'processed' }],
      auditTrail: [],
    }

    // Mock find matching eventId in DB Webhook Ledger
    mockPayload.find.mockResolvedValue({ docs: [mockTxDoc] })

    // Simulate duplicate webhook call
    const result = await workflowEngine.executeWebhookWorkflow(
      JSON.stringify({ id: 'evt_stripe_duplicate_101', type: 'checkout.session.completed', data: { object: { id: 'sess_1' } } }),
      'mock_signature',
      'bnpl',
    )

    expect(result.processed).toBe(false)
    expect(mockPayload.update).not.toHaveBeenCalled()
  })
})
