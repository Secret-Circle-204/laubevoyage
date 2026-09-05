import { describe, it, expect, vi } from 'vitest'
import { BookingRepository } from '@/domains/booking/repository'
import { CustomerProfileLoader } from '@/application/customer/loaders'

describe('GATE 19: Authoritative Booking Companion Travelers Projection Unit Tests', () => {
  it('should project exactly companion travelers (travelers[1..N]) via Drizzle SQL and exclude Lead Traveler', async () => {
    const mockRows = [
      {
        traveler_id: 'tr_101_1',
        booking_id: 101,
        booking_number: 'LBV-260904-62428',
        first_name: 'Sara',
        last_name: 'Companion',
        date_of_birth: '1995-05-12T00:00:00.000Z',
        passport_number: 'A12345678',
      },
    ]

    const mockPayload: any = {
      db: {
        drizzle: {
          execute: vi.fn().mockImplementation(async (query) => {
            const sqlStr = String(query?.queryChunks?.[0]?.value || query?.queryChunks?.[0] || query || '')
            if (sqlStr.includes('COUNT(')) {
              return { rows: [{ total_count: 1 }] }
            }
            return { rows: mockRows }
          }),
        },
      },
    }

    const repo = new BookingRepository(mockPayload)
    const result = await repo.findCompanionTravelersByCustomerId(50, { page: 1, limit: 20 })

    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.totalPages).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({
      id: 'tr_tr_101_1',
      bookingId: 101,
      bookingNumber: 'LBV-260904-62428',
      firstName: 'Sara',
      lastName: 'Companion',
      dateOfBirth: '1995-05-12T00:00:00.000Z',
      passportNumber: 'A12345678',
    })
  })

  it('should return total 0 and totalPages 0 when customer bookings have zero companion travelers', async () => {
    const mockPayload: any = {
      db: {
        drizzle: {
          execute: vi.fn().mockImplementation(async (query) => {
            const sqlStr = String(query?.queryChunks?.[0]?.value || query?.queryChunks?.[0] || query || '')
            if (sqlStr.includes('COUNT(')) {
              return { rows: [{ total_count: 0 }] }
            }
            return { rows: [] }
          }),
        },
      },
    }

    const repo = new BookingRepository(mockPayload)
    const result = await repo.findCompanionTravelersByCustomerId(51, { page: 1, limit: 20 })

    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
    expect(result.data).toHaveLength(0)
    expect(result.data).toEqual([])
  })

  it('CustomerProfileLoader integration: should wire companion travelers and totalCompanions to profile DTO and propagate errors loudly (Fail Fast)', async () => {
    const { getApplicationServices } = await import('@/application/factory')
    vi.mock('@/application/factory', () => ({
      getApplicationServices: vi.fn().mockResolvedValue({
        customer: {
          getById: vi.fn().mockResolvedValue({
            id: 50,
            firstName: 'Ahmed',
            lastName: 'Lead',
            email: 'ahmed@example.com',
            phone: '+201001234567',
          }),
        },
        booking: {
          getCustomerCompanionTravelers: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'tr_tr_101_1',
                bookingId: 101,
                bookingNumber: 'LBV-260904-62428',
                firstName: 'Sara',
                lastName: 'Companion',
                dateOfBirth: '1995-05-12T00:00:00.000Z',
                passportNumber: 'A12345678',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        },
      }),
    }))

    const profileData = await CustomerProfileLoader.load(50)

    expect(profileData.firstName).toBe('Ahmed')
    expect(profileData.lastName).toBe('Lead')
    expect(profileData.totalCompanions).toBe(1)
    expect(profileData.travelers).toHaveLength(1)
    expect(profileData.travelers[0]).toEqual({
      id: 'tr_tr_101_1',
      firstName: 'Sara',
      lastName: 'Companion',
      relationship: 'Companion',
      dateOfBirth: '1995-05-12T00:00:00.000Z',
      passportNumber: 'A12345678',
    })
  })

  it('CustomerProfileLoader integration: throws explicit error if booking service fails (Zero silent error swallowing)', async () => {
    const { getApplicationServices } = await import('@/application/factory')
    vi.mocked(getApplicationServices).mockResolvedValueOnce({
      customer: {
        getById: vi.fn().mockResolvedValue({ id: 50, firstName: 'A', lastName: 'B' }),
      },
      booking: {
        getCustomerCompanionTravelers: vi.fn().mockRejectedValue(new Error('PostgreSQL Connection Lost')),
      },
    } as any)

    await expect(CustomerProfileLoader.load(50)).rejects.toThrow('PostgreSQL Connection Lost')
  })
})
