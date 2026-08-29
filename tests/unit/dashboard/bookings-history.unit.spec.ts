import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { BookingStatus, LoyaltyTier } from '@/types'
import { BookingPaymentStatus } from '@/domains/booking/types'
import * as factory from '@/domains/factory'

describe('Gate 17.5.54 — Customer Bookings History Portal Unit Tests', () => {
  let mockBookingService: any
  let mockExperienceService: any
  let mockDestinationService: any
  let mockLocalizationService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockBookingService = {
      getUserBookings: vi.fn(),
    }

    mockExperienceService = {
      getManyByIds: vi.fn(),
      getDepartureSlotsByIds: vi.fn(),
    }

    mockDestinationService = {
      getCitiesByIds: vi.fn(),
    }

    mockLocalizationService = {
      buildContext: vi.fn().mockResolvedValue({
        language: 'en',
        currency: 'USD',
        country: 'US',
      }),
      translateUiKey: vi.fn().mockImplementation((key: string) => {
        if (key === 'catalog.packageLabel') return 'Package'
        if (key === 'catalog.dailyTourLabel') return 'Daily Tour'
        return key
      }),
      formatPrice: vi.fn().mockImplementation(async (amountEGP: number) => ({
        originalPrice: amountEGP,
        originalCurrency: 'EGP',
        convertedAmount: amountEGP / 50,
        currency: 'USD',
        formatted: `$${(amountEGP / 50).toFixed(2)}`,
        exchangeRate: 0.02,
        rateTimestamp: '2026-08-29T12:00:00Z',
      })),
      formatAlreadyConvertedPrice: vi.fn().mockImplementation(
        async (displayAmount: number, amountEGP: number, displayCurrency: string, exchangeRate: number) => ({
          originalPrice: amountEGP,
          originalCurrency: 'EGP',
          convertedAmount: displayAmount,
          currency: displayCurrency,
          formatted: `${displayCurrency} ${displayAmount.toFixed(2)}`,
          exchangeRate,
          rateTimestamp: '2026-08-29T12:00:00Z',
        }),
      ),
    }

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      booking: mockBookingService,
      experience: mockExperienceService,
      destination: mockDestinationService,
      localization: mockLocalizationService,
    } as any)
  })

  it('performs true repository batch queries for experiences, slots, and cities with deduplicated IDs', async () => {
    // 3 bookings referencing 2 experiences, 2 departure slots
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 1,
          bookingNumber: 'BK-101',
          experienceId: 10,
          departureSlot: 100,
          startDate: '2026-09-01',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 5000,
          outstandingBalance: 0,
          travelers: [{ name: 'John Doe' }],
          pricingSnapshot: {
            displayAmount: 100,
            displayCurrency: 'USD',
            totalAmountEGP: 5000,
            exchangeRate: 0.02,
          },
        },
        {
          id: 2,
          bookingNumber: 'BK-102',
          experienceId: 10, // Same experience
          departureSlot: 101,
          startDate: '2026-09-05',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'partially_paid' as BookingPaymentStatus,
          amountPaid: 2500,
          outstandingBalance: 2500,
          travelers: [{ name: 'Jane Doe' }, { name: 'Bob Doe' }],
          pricingSnapshot: {
            displayAmount: 100,
            displayCurrency: 'USD',
            totalAmountEGP: 5000,
            exchangeRate: 0.02,
          },
        },
        {
          id: 3,
          bookingNumber: 'BK-103',
          experienceId: 20, // Different experience
          departureSlot: 100, // Same slot as booking 1
          startDate: '2026-09-10',
          status: BookingStatus.COMPLETED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 3000,
          outstandingBalance: 0,
          travelers: [{ name: 'Alice Smith' }],
          pricingSnapshot: {
            displayAmount: 60,
            displayCurrency: 'USD',
            totalAmountEGP: 3000,
            exchangeRate: 0.02,
          },
        },
      ],
      total: 3,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([
      {
        id: 10,
        title: 'Nile Cruise Luxury',
        type: 'package',
        cityId: 5,
        duration: { days: 4, nights: 3 },
        heroUrl: 'https://example.com/nile.jpg',
      },
      {
        id: 20,
        title: 'Pyramids Day Tour',
        type: 'daily_tour',
        cityId: 5, // Same city
        duration: { durationMinutes: 240 },
        heroUrl: 'https://example.com/pyramids.jpg',
      },
    ])

    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([
      { id: 100, startTime: '08:00' },
      { id: 101, startTime: '14:30' },
    ])

    mockDestinationService.getCitiesByIds.mockResolvedValue([
      {
        id: 5,
        name: 'Cairo',
        country: { id: 1, name: 'Egypt' },
      },
    ])

    const result = await CustomerPortalLoader.loadBookingsHistory(1, { page: 1, limit: 10 })

    // Verify exactly 1 call per batch entity with deduplicated IDs
    expect(mockExperienceService.getManyByIds).toHaveBeenCalledTimes(1)
    expect(mockExperienceService.getManyByIds).toHaveBeenCalledWith([10, 20])

    expect(mockExperienceService.getDepartureSlotsByIds).toHaveBeenCalledTimes(1)
    expect(mockExperienceService.getDepartureSlotsByIds).toHaveBeenCalledWith([100, 101])

    expect(mockDestinationService.getCitiesByIds).toHaveBeenCalledTimes(1)
    expect(mockDestinationService.getCitiesByIds).toHaveBeenCalledWith([5])

    // Verify assembled DTOs
    expect(result.bookings).toHaveLength(3)

    const [b1, b2, b3] = result.bookings
    expect(b1.reference).toBe('BK-101')
    expect(b1.productTypeLabel).toBe('Package')
    expect(b1.destinationCity).toBe('Cairo, Egypt')
    expect(b1.durationText).toBe('4 Days / 3 Nights')
    expect(b1.departureTime).toBe('08:00')
    expect(b1.passengersCount).toBe(1)

    expect(b2.reference).toBe('BK-102')
    expect(b2.departureTime).toBe('14:30')
    expect(b2.passengersCount).toBe(2)

    expect(b3.reference).toBe('BK-103')
    expect(b3.productTypeLabel).toBe('Daily Tour')
    expect(b3.durationText).toBe('4 Hours')
  })

  it('respects selected departure slot precedence over generic experience schedule', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 1,
          bookingNumber: 'BK-PRECEDENCE-1',
          experienceId: 10,
          departureSlot: 555,
          startDate: '2026-10-01',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 1000,
          outstandingBalance: 0,
          travelers: [{ name: 'Test' }],
          pricingSnapshot: { totalAmountEGP: 1000 },
        },
        {
          id: 2,
          bookingNumber: 'BK-PRECEDENCE-2',
          experienceId: 10,
          departureSlot: undefined, // No selected slot
          startDate: '2026-10-02',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 1000,
          outstandingBalance: 0,
          travelers: [{ name: 'Test 2' }],
          pricingSnapshot: { totalAmountEGP: 1000 },
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([
      {
        id: 10,
        title: 'Desert Safari',
        schedules: [{ startTime: '06:00' }], // Generic schedule
      },
    ])

    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([
      { id: 555, startTime: '07:15' }, // Selected slot time
    ])

    mockDestinationService.getCitiesByIds.mockResolvedValue([])

    const result = await CustomerPortalLoader.loadBookingsHistory(1)

    expect(result.bookings[0].departureTime).toBe('07:15') // Precedence: selected slot
    expect(result.bookings[1].departureTime).toBe('06:00') // Fallback: schedule
  })

  it('correctly zeroes presentation balance for cancelled or refunded bookings without mutating persisted history', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 1,
          bookingNumber: 'BK-CANCELLED',
          experienceId: 10,
          startDate: '2026-11-01',
          status: BookingStatus.CANCELLED,
          paymentStatus: 'unpaid' as BookingPaymentStatus,
          amountPaid: 0,
          outstandingBalance: 8000, // In DB it was 8000
          travelers: [{ name: 'Alice' }],
          pricingSnapshot: {
            displayAmount: 160,
            displayCurrency: 'USD',
            totalAmountEGP: 8000,
            exchangeRate: 0.02,
          },
        },
        {
          id: 2,
          bookingNumber: 'BK-REFUNDED',
          experienceId: 10,
          startDate: '2026-11-05',
          status: BookingStatus.REFUNDED,
          paymentStatus: 'refunded' as BookingPaymentStatus,
          amountPaid: 0,
          outstandingBalance: 0,
          travelers: [{ name: 'Bob' }],
          pricingSnapshot: {
            displayAmount: 100,
            displayCurrency: 'USD',
            totalAmountEGP: 5000,
            exchangeRate: 0.02,
          },
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([])
    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([])
    mockDestinationService.getCitiesByIds.mockResolvedValue([])

    const result = await CustomerPortalLoader.loadBookingsHistory(1)

    expect(result.bookings[0].isCancelled).toBe(true)
    expect(result.bookings[0].outstandingBalance?.convertedAmount).toBe(0)
    expect(result.bookings[0].outstandingBalance?.formatted).toBe('USD 0.00')

    expect(result.bookings[1].isCancelled).toBe(true)
    expect(result.bookings[1].outstandingBalance?.convertedAmount).toBe(0)
  })

  it('translates lifecycle status filter tabs into database-native BookingUserFilter parameters', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 1,
    })

    // 1. All
    await CustomerPortalLoader.loadBookingsHistory(1, { status: undefined })
    expect(mockBookingService.getUserBookings).toHaveBeenLastCalledWith(1, 1, 10, undefined)

    // 2. Confirmed
    await CustomerPortalLoader.loadBookingsHistory(1, { status: 'confirmed' })
    expect(mockBookingService.getUserBookings).toHaveBeenLastCalledWith(1, 1, 10, {
      status: BookingStatus.CONFIRMED,
    })

    // 3. Pending Payment & Review
    await CustomerPortalLoader.loadBookingsHistory(1, { status: 'pending_payment' })
    expect(mockBookingService.getUserBookings).toHaveBeenLastCalledWith(1, 1, 10, {
      status: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_ADMIN_REVIEW],
    })

    // 4. Completed
    await CustomerPortalLoader.loadBookingsHistory(1, { status: 'completed' })
    expect(mockBookingService.getUserBookings).toHaveBeenLastCalledWith(1, 1, 10, {
      status: BookingStatus.COMPLETED,
    })

    // 5. Cancelled
    await CustomerPortalLoader.loadBookingsHistory(1, { status: 'cancelled' })
    expect(mockBookingService.getUserBookings).toHaveBeenLastCalledWith(1, 1, 10, {
      status: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
    })
  })

  it('handles missing operational data cleanly without inventing synthetic values', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 1,
          bookingNumber: 'BK-NO-DATA',
          experienceId: 999, // Unresolvable experience
          departureSlot: 888, // Unresolvable slot
          startDate: '2026-12-01',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 1000,
          outstandingBalance: 0,
          travelers: [],
          pricingSnapshot: { totalAmountEGP: 1000 },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([])
    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([])
    mockDestinationService.getCitiesByIds.mockResolvedValue([])

    const result = await CustomerPortalLoader.loadBookingsHistory(1)

    const card = result.bookings[0]
    expect(card.productTypeLabel).toBeUndefined()
    expect(card.destinationCity).toBeUndefined()
    expect(card.durationText).toBeUndefined()
    expect(card.departureTime).toBeUndefined()
    expect(card.returnTime).toBeUndefined()
    expect(card.endDate).toBeUndefined()
  })

  it('formats returnTime from authoritative completionAt in destinationTimezone and applies singular/plural duration grammar', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 10,
          bookingNumber: 'LBV-260829-15977',
          experienceId: 1,
          departureSlot: 50,
          startDate: '2026-08-29',
          completionAt: '2026-08-29T05:00:00.000Z', // In Africa/Cairo (UTC+3), this is 08:00
          destinationTimezone: 'Africa/Cairo',
          status: BookingStatus.COMPLETED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 3334,
          outstandingBalance: 0,
          travelers: [{ name: 'Traveler' }],
          pricingSnapshot: { totalAmountEGP: 3334 },
        },
        {
          id: 11,
          bookingNumber: 'LBV-260901-PACKAGE',
          experienceId: 2,
          departureSlot: undefined,
          startDate: '2026-09-01',
          endDate: '2026-09-02',
          completionAt: '2026-09-02T10:00:00.000Z',
          destinationTimezone: 'Europe/Athens',
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 10000,
          outstandingBalance: 0,
          travelers: [{ name: 'Traveler 2' }],
          pricingSnapshot: { totalAmountEGP: 10000 },
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([
      {
        id: 1,
        title: 'Giza Pyramids Private Tour',
        type: 'daily_tour',
        duration: { durationMinutes: 60 }, // 1 hour -> singular grammar: "1 Hour"
      },
      {
        id: 2,
        title: 'Athens Luxury Escapade',
        type: 'package',
        duration: { days: 1, nights: 1 }, // 1 day / 1 night -> singular grammar
      },
    ])

    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([
      { id: 50, startTime: '07:00' },
    ])

    mockDestinationService.getCitiesByIds.mockResolvedValue([])

    const result = await CustomerPortalLoader.loadBookingsHistory(1)

    const [dailyTour, pkg] = result.bookings

    // Daily Tour asserts
    expect(dailyTour.durationText).toBe('1 Hour')
    expect(dailyTour.departureTime).toBe('07:00')
    expect(dailyTour.returnTime).toBe('08:00') // Formatted from completionAt in Africa/Cairo
    expect(dailyTour.destinationTimezone).toBe('Africa/Cairo')

    // Package Tour asserts
    expect(pkg.durationText).toBe('1 Day / 1 Night')
    expect(pkg.endDate).toBe('2026-09-02')
  })

  it('evaluates returnTime strictly to undefined if destinationTimezone is missing, preventing synthetic timezone fallbacks', async () => {
    mockBookingService.getUserBookings.mockResolvedValue({
      data: [
        {
          id: 99,
          bookingNumber: 'BK-NO-TZ',
          experienceId: 1,
          startDate: '2026-08-29',
          completionAt: '2026-08-29T05:00:00.000Z',
          destinationTimezone: undefined, // Missing timezone
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'paid' as BookingPaymentStatus,
          amountPaid: 1000,
          outstandingBalance: 0,
          travelers: [],
          pricingSnapshot: { totalAmountEGP: 1000 },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    mockExperienceService.getManyByIds.mockResolvedValue([])
    mockExperienceService.getDepartureSlotsByIds.mockResolvedValue([])
    mockDestinationService.getCitiesByIds.mockResolvedValue([])

    const result = await CustomerPortalLoader.loadBookingsHistory(1)

    // Strict invariant: Missing destinationTimezone MUST yield undefined returnTime (Zero hardcoded fallback)
    expect(result.bookings[0].returnTime).toBeUndefined()
  })
})

