import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'
import { Bookings } from '@/collections/Bookings'
import * as domainFactory from '@/domains/factory'

describe('Gate 5: Booking Snapshot Persistence & Historical Commercial Breakdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1: Schema verification: Bookings collection defines commercialBreakdown under pricingSnapshot group
  it('T1: Payload schema for Bookings defines commercialBreakdown as type "json" under pricingSnapshot group', () => {
    const pricingSnapshotField = Bookings.fields?.find(
      (f: any) => f.name === 'pricingSnapshot' && f.type === 'group'
    ) as any
    expect(pricingSnapshotField).toBeDefined()

    const commercialBreakdownField = pricingSnapshotField.fields?.find(
      (f: any) => f.name === 'commercialBreakdown'
    )
    expect(commercialBreakdownField).toBeDefined()
    expect(commercialBreakdownField.type).toBe('json')
    expect(commercialBreakdownField.admin?.readOnly).toBe(true)
  })

  // T2: Historical booking reading: BookingDetailsLoader extracts stays and roomAllocation directly from persisted snapshot
  it('T2: BookingDetailsLoader reads staysBreakdown and roomAllocation strictly from persisted snapshot', async () => {
    const mockCommercialBreakdown = {
      accommodationTotalEGP: 6200,
      staysBreakdown: [
        {
          order: 1,
          optionId: 'opt-luxor-deluxe',
          propertyId: 201,
          propertyName: 'Hilton Luxor Resort & Spa',
          nights: 3,
          roomCategory: 'Deluxe Nile View',
          boardBasis: 'half_board' as const,
          pricingUnit: 'per_stay' as const,
          stayAccommodationTotalEGP: 1200,
          appliedRoomRates: [
            {
              roomIndex: 1,
              occupancy: 'double' as const,
              pricingUnit: 'per_stay' as const,
              nights: 3,
              unitRateEGP: 1200,
              rateEGP: 1200,
              nightsMultiplier: 1,
              totalRoomCostEGP: 1200,
            },
          ],
        },
        {
          order: 2,
          optionId: 'opt-aswan-palace',
          propertyId: 302,
          propertyName: 'Sofitel Legend Old Cataract Aswan',
          nights: 2,
          roomCategory: 'Palace Premium Suite',
          boardBasis: 'bed_and_breakfast' as const,
          pricingUnit: 'per_night' as const,
          stayAccommodationTotalEGP: 5000,
          appliedRoomRates: [
            {
              roomIndex: 1,
              occupancy: 'double' as const,
              pricingUnit: 'per_night' as const,
              nights: 2,
              unitRateEGP: 2500,
              rateEGP: 2500,
              nightsMultiplier: 2,
              totalRoomCostEGP: 5000,
            },
          ],
        },
      ],
      roomAllocation: [
        {
          roomIndex: 1,
          occupancy: 'double' as const,
          adults: 2,
          children: 0,
        },
      ],
    }

    const mockBookingDoc: any = {
      id: 9999,
      bookingNumber: 'LBV-260919-99999',
      customerId: 10,
      status: 'confirmed',
      paymentStatus: 'paid',
      amountPaid: 16200,
      outstandingBalance: 0,
      startDate: '2026-10-01',
      endDate: '2026-10-06',
      travelers: [
        { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', type: 'adult' },
        { firstName: 'Bob', lastName: 'Smith', type: 'adult' },
      ],
      experienceId: 1955,
      pricingSnapshot: {
        version: 1,
        basePriceEGP: 10000,
        subtotalEGP: 16200,
        totalAmountEGP: 16200,
        loyaltyDiscountEGP: 0,
        displayCurrency: 'EGP',
        displayAmount: 16200,
        exchangeRate: 1,
        commercialBreakdown: mockCommercialBreakdown,
      },
    }

    const mockBookingService = {
      getByBookingNumber: vi.fn().mockResolvedValue(mockBookingDoc),
    }

    const mockLocalization = {
      buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'EGP' }),
      formatAlreadyConvertedPrice: vi.fn().mockImplementation((amount, base, curr) => ({
        baseAmountEGP: base,
        convertedAmount: amount,
        currencyCode: curr,
        currencySymbol: curr,
        formatted: `${amount} ${curr}`,
        exchangeRate: 1,
        decimals: 2,
      })),
      formatPrice: vi.fn().mockImplementation((amount) => ({
        baseAmountEGP: amount,
        convertedAmount: amount,
        currencyCode: 'EGP',
        currencySymbol: 'EGP',
        formatted: `${amount} EGP`,
        exchangeRate: 1,
        decimals: 2,
      })),
      translateBatch: vi.fn().mockResolvedValue(['Grand Nile Package']),
      translateUiKey: vi.fn().mockReturnValue(''),
    }

    vi.spyOn(domainFactory, 'getDomainServices').mockResolvedValue({
      booking: mockBookingService,
      localization: mockLocalization,
      experience: {
        getById: vi.fn().mockResolvedValue({
          id: 1955,
          title: 'Grand Nile Package',
          type: 'package',
        }),
      },
      destination: {
        getCityById: vi.fn().mockResolvedValue(null),
      },
      loyalty: {
        getBookingLedgerEntries: vi.fn().mockResolvedValue([]),
      } as any,
    } as any)

    const result = await BookingDetailsLoader.loadByNumber('LBV-260919-99999', 10, {
      locale: 'en',
      currency: 'EGP',
    })

    expect(result).toBeDefined()
    expect(result?.bookingNumber).toBe('LBV-260919-99999')

    // Stays verified from snapshot
    expect(result?.stays).toHaveLength(2)
    expect(result?.stays[0]).toEqual({
      order: 1,
      propertyName: 'Hilton Luxor Resort & Spa',
      nights: 3,
      roomCategory: 'Deluxe Nile View',
    })
    expect(result?.stays[1]).toEqual({
      order: 2,
      propertyName: 'Sofitel Legend Old Cataract Aswan',
      nights: 2,
      roomCategory: 'Palace Premium Suite',
    })

    // Room configuration verified from snapshot
    expect(result?.roomAllocation).toHaveLength(1)
    expect(result?.roomAllocation[0]).toEqual({
      roomIndex: 1,
      occupancy: 'double',
      adults: 2,
      children: 0,
    })
  })

  // T3: Historical backward compatibility: Bookings created before Gate 5 have null commercialBreakdown and gracefully render empty arrays
  it('T3: Historical bookings without commercialBreakdown gracefully render empty arrays without error', async () => {
    const legacyBookingDoc: any = {
      id: 8888,
      bookingNumber: 'LBV-260801-88888',
      customerId: 10,
      status: 'confirmed',
      paymentStatus: 'paid',
      amountPaid: 10000,
      outstandingBalance: 0,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      travelers: [{ firstName: 'Alice', lastName: 'Smith', type: 'adult' }],
      experienceId: 1950,
      pricingSnapshot: {
        version: 1,
        basePriceEGP: 10000,
        subtotalEGP: 10000,
        totalAmountEGP: 10000,
        loyaltyDiscountEGP: 0,
        displayCurrency: 'EGP',
        displayAmount: 10000,
        exchangeRate: 1,
        // commercialBreakdown is undefined / null
      },
    }

    const mockBookingService = {
      getByBookingNumber: vi.fn().mockResolvedValue(legacyBookingDoc),
    }

    const mockLocalization = {
      buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'EGP' }),
      formatAlreadyConvertedPrice: vi.fn().mockReturnValue({ formatted: '10000 EGP' } as any),
      formatPrice: vi.fn().mockReturnValue({ formatted: '10000 EGP' } as any),
      translateBatch: vi.fn().mockResolvedValue(['Legacy Tour']),
      translateUiKey: vi.fn().mockReturnValue(''),
    }

    vi.spyOn(domainFactory, 'getDomainServices').mockResolvedValue({
      booking: mockBookingService,
      localization: mockLocalization,
      experience: { getById: vi.fn().mockResolvedValue({ id: 1950, title: 'Legacy Tour', type: 'package' }) },
      destination: { getCityById: vi.fn().mockResolvedValue(null) },
      loyalty: { getBookingLedgerEntries: vi.fn().mockResolvedValue([]) } as any,
    } as any)

    const result = await BookingDetailsLoader.loadByNumber('LBV-260801-88888', 10, {
      locale: 'en',
      currency: 'EGP',
    })

    expect(result).toBeDefined()
    expect(result?.stays).toEqual([])
    expect(result?.roomAllocation).toEqual([])
  })
})
