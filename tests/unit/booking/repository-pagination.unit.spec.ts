import { describe, it, expect, vi } from 'vitest'
import { BookingRepository } from '@/domains/booking/repository'
import { BookingStatus } from '@/types'
import type { Payload } from 'payload'

describe('Booking Domain: Server-Side Pagination & DB Status Filtering', () => {
  it('should query database with customerId, pagination parameters, and status filter', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 1,
          bookingNumber: 'LV-1001',
          status: 'confirmed',
          startDate: '2026-09-01',
          user: 55,
          experience: 10,
          travelers: [{ firstName: 'John', lastName: 'Doe' }],
          pricingSnapshot: { totalAmountEGP: 15000 },
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
      ],
      totalDocs: 42,
      page: 2,
      totalPages: 5,
      limit: 10,
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new BookingRepository(mockPayload)
    const result = await repository.findByUser(55, 2, 10, { status: BookingStatus.CONFIRMED })

    // Verify database query was executed with exact DB-level WHERE and LIMIT/OFFSET
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(mockFind).toHaveBeenCalledWith({
      collection: 'bookings',
      where: {
        user: { equals: 55 },
        status: { equals: 'confirmed' },
      },
      page: 2,
      limit: 10,
      sort: '-createdAt',
      req: undefined,
    })

    // Verify mapped paginated response
    expect(result.data.length).toBe(1)
    expect(result.data[0].bookingNumber).toBe('LV-1001')
    expect(result.total).toBe(42)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(5)
    expect(result.limit).toBe(10)
  })

  it('should query database without status filter when no filter is provided', async () => {
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

    const repository = new BookingRepository(mockPayload)
    await repository.findByUser(77, 1, 10)

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'bookings',
      where: {
        user: { equals: 77 },
      },
      page: 1,
      limit: 10,
      sort: '-createdAt',
      req: undefined,
    })
  })
})
