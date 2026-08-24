import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebhookProcessor } from '@/domains/payment/webhook-processor'
import { PaymentAdapterFactory } from '@/domains/payment/adapters/factory'
import { catalogRegistry } from '@/domains/currency/catalog-registry'

vi.mock('@/domains/currency/catalog-registry', () => {
  return {
    catalogRegistry: {
      get: vi.fn().mockResolvedValue({
        isoCode: 'USD',
        decimals: 2,
        symbol: '$',
      }),
    },
  }
})

describe('WebhookProcessor Stripe Integration Tests', () => {
  let mockPaymentRepo: any
  let mockOutboxRepo: any
  let stripeAdapter: any
  let processor: WebhookProcessor

  beforeEach(() => {
    vi.restoreAllMocks()

    mockPaymentRepo = {
      findByTransactionId: vi.fn().mockResolvedValue({
        transactionId: 'tx_123',
        bookingId: 101,
        customerId: 32,
        attempts: [],
      }),
      appendAttempt: vi.fn().mockResolvedValue(undefined),
      recordProcessed: vi.fn().mockResolvedValue(undefined),
      findWebhookByEventId: vi.fn().mockResolvedValue(undefined),
      appendWebhook: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockImplementation(async (txId, status) => ({
        transactionId: txId,
        bookingId: 101,
        customerId: 32,
        status,
      })),
      isProcessed: vi.fn().mockResolvedValue(false),
      beginTransaction: vi.fn().mockResolvedValue('tx_mock_123'),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    }

    mockOutboxRepo = {
      add: vi.fn().mockResolvedValue(undefined),
    }

    stripeAdapter = {
      verifyWebhook: vi.fn(),
    }

    vi.spyOn(PaymentAdapterFactory, 'resolve').mockReturnValue(stripeAdapter)

    processor = new WebhookProcessor(mockPaymentRepo, mockOutboxRepo)
  })

  it('should successfully process valid Stripe webhook and parse minor units to major units', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      created: 1786282981,
      data: {
        object: {
          id: 'sess_123',
          currency: 'usd',
          amount_total: 499, // $4.99 USD
          customer_details: { email: 'hamza@laube.com' },
          metadata: { bookingId: '101', transactionId: 'tx_123' },
          payment_intent: 'pi_intent_123',
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)

    const result = await processor.processStripeWebhook('raw_body', 'sig_123')

    expect(result.processed).toBe(true)
    expect(mockPaymentRepo.appendAttempt).toHaveBeenCalledWith(
      'tx_123',
      expect.objectContaining({
        amount: 4.99,
        currency: 'USD',
        status: 'successful',
        transactionReference: 'pi_intent_123',
      }),
      expect.any(Object),
    )

    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYMENT_COMPLETED',
        amount: 4.99,
        currency: 'USD',
        customerEmail: 'hamza@laube.com',
        occurredAt: '2026-08-09T13:43:01.000Z',
      }),
      expect.objectContaining({
        transactionId: expect.any(String),
      }),
    )
  })

  it('should throw explicit error if currency is missing in Stripe session details', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          currency: null,
          amount_total: 1000,
          metadata: { bookingId: '101', transactionId: 'tx_123' },
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)

    await expect(processor.processStripeWebhook('raw_body', 'sig_123')).rejects.toThrow(
      '[WebhookProcessor] Missing currency in Stripe session details.',
    )
  })

  it('should throw explicit error if amount_total is missing in Stripe session details', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          currency: 'usd',
          amount_total: undefined,
          metadata: { bookingId: '101', transactionId: 'tx_123' },
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)

    await expect(processor.processStripeWebhook('raw_body', 'sig_123')).rejects.toThrow(
      '[WebhookProcessor] Missing amount_total in Stripe session details.',
    )
  })

  it('should process webhook and propagate undefined customerEmail if email is missing', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          currency: 'usd',
          amount_total: 1000,
          customer_details: {},
          metadata: { bookingId: '101', transactionId: 'tx_123' },
          payment_intent: 'sess_123',
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)

    const result = await processor.processStripeWebhook('raw_body', 'sig_123')

    expect(result.processed).toBe(true)
    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYMENT_COMPLETED',
        customerEmail: undefined,
      }),
      expect.objectContaining({
        transactionId: expect.any(String),
      }),
    )
  })

  it('should leave occurredAt as undefined and NOT fall back to server time if Stripe created timestamp is missing', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      created: undefined,
      data: {
        object: {
          id: 'sess_123',
          currency: 'usd',
          amount_total: 1000,
          customer_details: {},
          metadata: { bookingId: '101', transactionId: 'tx_123' },
          payment_intent: 'sess_123',
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)

    const result = await processor.processStripeWebhook('raw_body', 'sig_123')

    expect(result.processed).toBe(true)
    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYMENT_COMPLETED',
        occurredAt: undefined,
      }),
      expect.objectContaining({
        transactionId: expect.any(String),
      }),
    )
  })

  it('should throw explicit error if currency is unregistered in CMS catalog registry', async () => {
    const rawPayload = {
      id: 'evt_stripe_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          currency: 'UNKNOWN',
          amount_total: 1000,
          metadata: { bookingId: '101', transactionId: 'tx_123' },
        },
      },
    }

    stripeAdapter.verifyWebhook.mockResolvedValue(rawPayload)
    vi.mocked(catalogRegistry.get).mockResolvedValueOnce(undefined)

    await expect(processor.processStripeWebhook('raw_body', 'sig_123')).rejects.toThrow(
      '[CurrencyDomain] Currency "UNKNOWN" is not registered or active in the CMS catalog.'
    )
  })
})
