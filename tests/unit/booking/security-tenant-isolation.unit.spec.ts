import { describe, it, expect, vi } from 'vitest'
import { BookingRepository } from '@/domains/booking/repository'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'
import { getDomainServices } from '@/domains/factory'
import type { Payload } from 'payload'

vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

describe('Security & Tenant Isolation: Booking Authorization by Query Boundary', () => {
  it('should enforce tenant ownership in database query (WHERE bookingNumber = $1 AND user = $2)', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 101,
          bookingNumber: 'LBV-260818-39171',
          user: 77,
          experience: 10,
          status: 'confirmed',
          startDate: '2026-09-15',
          endDate: '2026-09-20',
          travelers: [{ firstName: 'Customer', lastName: 'A', email: 'a@example.com', phone: '0100000000' }],
          pricingSnapshot: {
            basePriceEGP: 5000,
            totalAmountEGP: 5000,
            displayCurrency: 'EGP',
            displayAmount: 5000,
          },
          createdAt: '2026-08-18T10:00:00Z',
          updatedAt: '2026-08-18T10:00:00Z',
        },
      ],
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new BookingRepository(mockPayload)

    // Customer A (ID 77) requests their own booking
    const result = await repository.findByBookingNumber('LBV-260818-39171', 77)

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'bookings',
      where: {
        bookingNumber: { equals: 'LBV-260818-39171' },
        user: { equals: 77 },
      },
      limit: 1,
      req: undefined,
    })

    expect(result).not.toBeNull()
    expect(result?.bookingNumber).toBe('LBV-260818-39171')
    expect(result?.customerId).toBe(77)
  })

  it('should return null and leak ZERO data when Customer A attempts to query Customer B booking', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [], // Database returns 0 docs because user is 77 (Customer A), while booking belongs to 88 (Customer B)
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new BookingRepository(mockPayload)

    // Customer A (ID 77) attempts IDOR access to Customer B's booking
    const result = await repository.findByBookingNumber('LBV-260818-99999', 77)

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'bookings',
      where: {
        bookingNumber: { equals: 'LBV-260818-99999' },
        user: { equals: 77 },
      },
      limit: 1,
      req: undefined,
    })

    // Result must be null - zero data leaked
    expect(result).toBeNull()
  })

  it('should return null from BookingDetailsLoader when tenant boundary returns null', async () => {
    const mockBookingService = {
      getByBookingNumber: vi.fn().mockResolvedValue(null),
    }
    const mockLocalizationService = {
      buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'USD' }),
    }

    vi.mocked(getDomainServices).mockResolvedValue({
      booking: mockBookingService,
      localization: mockLocalizationService,
    } as any)

    const details = await BookingDetailsLoader.loadByNumber('LBV-260818-99999', 77)

    expect(mockBookingService.getByBookingNumber).toHaveBeenCalledWith('LBV-260818-99999', 77)
    expect(details).toBeNull()
  })
})
