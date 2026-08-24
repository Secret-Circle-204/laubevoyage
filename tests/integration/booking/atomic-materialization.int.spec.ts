import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingCreator } from '@/domains/booking/creator'
import { BookingStatus, RequestContext } from '@/types'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'

describe('Atomic Materialization Boundary & Mandatory Write (Zero Orphan Slots)', () => {
  let repositoryMock: any
  let experienceServiceMock: any
  let loyaltyServiceMock: any
  let pricingPipelineMock: any
  let bookingCreator: BookingCreator

  const mockSlotDeparture: BookableDeparture = {
    id: 55, // Materialized slot
    departureId: 'DEP-10-2026-10-20-0900',
    experienceId: 10,
    experienceTitle: 'Cairo Nile Cruise',
    experienceType: 'package',
    date: '2026-10-20',
    startTime: '09:00',
    effectiveBasePrice: 1000,
    capacityTotal: 20,
    capacityAvailable: 20,
    status: 'available',
  }

  beforeEach(() => {
    repositoryMock = {
      create: vi.fn().mockImplementation(async (data: any) => ({
        id: 99,
        bookingNumber: 'LBV-260820-12345',
        ...data,
      })),
      update: vi.fn().mockImplementation(async (id: number, data: any) => ({
        id,
        ...data,
      })),
    }

    experienceServiceMock = {
      getById: vi.fn().mockResolvedValue({
        id: 10,
        type: 'package',
        availability: 'available',
        price: 1000,
        durationDays: 3,
        schedules: [{ startTime: '09:00', defaultCapacity: 20 }],
      }),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
      getOrCreateDailyDeparture: vi.fn().mockImplementation(async (expId: number, date: string, startTime: string) => ({
        id: 55,
        departureId: `DEP-${expId}-${date}-${startTime.replace(':', '')}`,
        experienceId: expId,
        date,
        startTime,
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      })),
      reserveCapacity: vi.fn().mockResolvedValue({
        slot: {
          id: 55,
          departureId: 'DEP-10-2026-08-20-0900',
          capacityReserved: 2,
          capacityAvailable: 18,
          version: 2,
        },
        holdId: 'hold_test_1',
      }),
    }

    loyaltyServiceMock = {
      getCustomerBalance: vi.fn().mockResolvedValue(100),
    }

    const customerRepositoryMock: any = {
      findById: vi.fn().mockResolvedValue({ id: 1, status: 'active' }),
    }

    pricingPipelineMock = {
      calculate: vi.fn().mockResolvedValue({
        basePriceEGP: 1000,
        subtotalEGP: 2000,
        totalAmountEGP: 2000,
        displayCurrency: 'USD',
        exchangeRate: 0.02,
        displayAmount: 40,
        pricingVersion: 'v2',
      }),
    }

    bookingCreator = new BookingCreator(
      repositoryMock,
      customerRepositoryMock,
      experienceServiceMock,
      loyaltyServiceMock,
      pricingPipelineMock,
    )
  })

  it('Happy Path: Booking creation reserves capacity and creates hold for Fixed Package slot', async () => {
    const booking = await bookingCreator.createDraft({
      userId: 1,
      departure: mockSlotDeparture,
      travelers: [
        { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '+123456789' },
        { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', phone: '+123456789' },
      ],
      pointsToRedeem: 0,
      currency: 'USD' as any,
      endDate: '2026-10-23',
      source: 'website',
    })

    // Assert: Capacity was reserved for the slot
    expect(experienceServiceMock.reserveCapacity).toHaveBeenCalledWith(
      'DEP-10-2026-10-20-0900',
      10,
      2,
      1,
      99,
      undefined,
    )

    // Assert: CapacityHold entity created and attached
    expect(booking.capacityHold).toBeDefined()
    expect(booking.capacityHold?.departureSlotId).toBe(55)
    expect(booking.capacityHold?.seats).toBe(2)
  })

  it('Rollback Boundary: When reserveCapacity throws, draft creation fails with exception and no partial state', async () => {
    experienceServiceMock.reserveCapacity.mockRejectedValueOnce(
      new Error('[AvailabilityPolicy] Reservation forbidden: Requested seats (25) exceed available capacity (20).'),
    )

    await expect(
      bookingCreator.createDraft({
        userId: 1,
        departure: mockSlotDeparture,
        travelers: Array.from({ length: 25 }).map((_, i) => ({
          firstName: `Guest${i}`,
          lastName: 'Test',
          email: `guest${i}@example.com`,
          phone: '+123456789',
        })),
        pointsToRedeem: 0,
        currency: 'USD' as any,
        endDate: '2026-10-23',
        source: 'website',
      }),
    ).rejects.toThrow('Reservation forbidden')
  })
})
