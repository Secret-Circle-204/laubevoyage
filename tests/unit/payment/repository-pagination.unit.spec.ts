import { describe, it, expect, vi } from 'vitest'
import { PaymentRepository } from '@/domains/payment/repository'
import type { Payload } from 'payload'

describe('Payment Domain: Server-Side Pagination & DB Status Filtering', () => {
  it('should query payment-transactions with customerId, pagination parameters, and status filter', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 501,
          transactionId: 'tx_stripe_999',
          bookingId: 101,
          customerId: 77,
          version: 1,
          provider: 'stripe',
          status: 'successful',
          session: {},
          attempts: [
            {
              attemptId: 'att_1',
              attemptNumber: 1,
              provider: 'stripe',
              amount: 5000,
              currency: 'EGP',
              status: 'successful',
              timestamp: '2026-08-15T10:00:00Z',
            },
          ],
          webhookLedger: [],
          auditTrail: [],
          createdAt: '2026-08-15T10:00:00Z',
          updatedAt: '2026-08-15T10:00:00Z',
        },
      ],
      totalDocs: 35,
      page: 2,
      totalPages: 4,
      limit: 10,
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new PaymentRepository(mockPayload)
    const result = await repository.findByCustomerId(77, 2, 10, { status: 'successful' })

    // Verify database query parameters
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(mockFind).toHaveBeenCalledWith({
      collection: 'payment-transactions',
      where: {
        customerId: { equals: 77 },
        status: { equals: 'successful' },
      },
      page: 2,
      limit: 10,
      sort: '-createdAt',
      req: undefined,
    })

    // Verify paginated response structure
    expect(result.data.length).toBe(1)
    expect(result.data[0].transactionId).toBe('tx_stripe_999')
    expect(result.data[0].status).toBe('successful')
    expect(result.total).toBe(35)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(4)
    expect(result.limit).toBe(10)
  })

  it('should query payment-transactions without status filter when no status is provided', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [],
      totalDocs: 0,
      page: 1,
      totalPages: 1,
      limit: 10,
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new PaymentRepository(mockPayload)
    const result = await repository.findByCustomerId(88, 1, 10)

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'payment-transactions',
      where: {
        customerId: { equals: 88 },
      },
      page: 1,
      limit: 10,
      sort: '-createdAt',
      req: undefined,
    })

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
  })
})
