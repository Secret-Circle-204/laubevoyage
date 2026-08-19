import { describe, it, expect, vi } from 'vitest'
import { BookingRepository } from '@/domains/booking/repository'
import type { Payload } from 'payload'

describe('Booking Domain: Customer Trip Summary ($O(1) Memory Aggregation)', () => {
  it('should query exact counts and single latest booking without fetching full collection', async () => {
    const mockCount = vi.fn()
      // First count call: total bookings
      .mockResolvedValueOnce({ totalDocs: 42 })
      // Second count call: confirmed upcoming bookings
      .mockResolvedValueOnce({ totalDocs: 5 })

    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 301,
          bookingNumber: 'LBV-260818-77123',
          user: 77,
          startDate: '2026-10-01',
          createdAt: '2026-08-18T10:00:00Z',
        },
      ],
    })

    const mockPayload = {
      count: mockCount,
      find: mockFind,
    } as unknown as Payload

    const repository = new BookingRepository(mockPayload)
    const summary = await repository.getCustomerTripSummary(77)

    // 1. Verify total bookings count query
    expect(mockCount).toHaveBeenNthCalledWith(1, {
      collection: 'bookings',
      where: { user: { equals: 77 } },
      req: undefined,
    })

    // 2. Verify confirmed upcoming count query
    expect(mockCount).toHaveBeenNthCalledWith(2, {
      collection: 'bookings',
      where: {
        user: { equals: 77 },
        status: { equals: 'confirmed' },
      },
      req: undefined,
    })

    // 3. Verify single latest booking query (LIMIT 1)
    expect(mockFind).toHaveBeenCalledWith({
      collection: 'bookings',
      where: { user: { equals: 77 } },
      limit: 1,
      sort: '-createdAt',
      req: undefined,
    })

    // 4. Verify aggregated summary structure
    expect(summary.activeBookingsCount).toBe(42)
    expect(summary.upcomingCount).toBe(5)
    expect(summary.latestBookingNumber).toBe('LBV-260818-77123')
    expect(summary.nextDepartureDate).toBe('2026-10-01')
  })

  it('should handle zero bookings gracefully with undefined latest booking', async () => {
    const mockCount = vi.fn()
      .mockResolvedValueOnce({ totalDocs: 0 })
      .mockResolvedValueOnce({ totalDocs: 0 })

    const mockFind = vi.fn().mockResolvedValue({ docs: [] })

    const mockPayload = {
      count: mockCount,
      find: mockFind,
    } as unknown as Payload

    const repository = new BookingRepository(mockPayload)
    const summary = await repository.getCustomerTripSummary(99)

    expect(summary.activeBookingsCount).toBe(0)
    expect(summary.upcomingCount).toBe(0)
    expect(summary.latestBookingNumber).toBeUndefined()
    expect(summary.nextDepartureDate).toBeUndefined()
  })
})
