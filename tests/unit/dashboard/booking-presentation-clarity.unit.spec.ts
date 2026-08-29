import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { BookingStatus } from '@/types'
import type { BookingAggregate, BookingPaymentStatus } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'

// Mock getDomainServices
vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

import { getDomainServices } from '@/domains/factory'

describe('Customer Booking Presentation Clarity & Currency Uniformity (Unit Tests)', () => {
  const mockContext = {
    language: 'en',
    currency: 'USD',
    timezone: 'Africa/Cairo',
  }

  const mockLocalization = {
    buildContext: vi.fn().mockResolvedValue(mockContext),
    formatPrice: vi.fn().mockImplementation(async (amountEGP: number) => ({
      baseAmountEGP: amountEGP,
      convertedAmount: amountEGP,
      currencyCode: 'EGP',
      currencySymbol: 'EGP',
      formatted: `${amountEGP.toLocaleString()} EGP`,
      exchangeRate: 1,
      decimals: 2,
    } as ConvertedPrice)),
    formatAlreadyConvertedPrice: vi.fn().mockImplementation(
      async (converted: number, baseEGP: number, currency: string, rate: number) => ({
        baseAmountEGP: baseEGP,
        convertedAmount: converted,
        currencyCode: currency,
        currencySymbol: currency === 'USD' ? '$' : currency,
        formatted: currency === 'USD' ? `$${converted.toFixed(2)}` : `${converted.toFixed(2)} ${currency}`,
        exchangeRate: rate,
        decimals: 2,
      } as ConvertedPrice),
    ),
    formatNumber: vi.fn((n: number) => n.toLocaleString()),
    translateUiKey: vi.fn((k: string) => k),
    translateText: vi.fn(async (t: string) => t),
  }

  const createMockBooking = (
    paymentStatus: BookingPaymentStatus,
    amountPaid: number,
    outstandingBalance: number,
    totalAmountEGP: number = 3480,
    exchangeRate: number = 0.0199,
    displayCurrency: string = 'USD',
  ): BookingAggregate => ({
    id: 14427,
    bookingNumber: 'LBV-260829-81458',
    version: 1,
    source: 'website',
    status: BookingStatus.CONFIRMED,
    customerId: 642,
    experienceId: 101,
    travelers: [{ firstName: 'Nono', lastName: 'Mazen', email: 'nono@example.com', phone: '123' }],
    startDate: '2026-08-29',
    endDate: '2026-08-29',
    completionAt: '2026-08-29T12:00:00Z',
    paymentWindowExpiresAt: '2026-08-29T12:05:00Z',
    pricingSnapshot: {
      version: 1,
      pricingVersion: 1,
      basePriceEGP: totalAmountEGP,
      promotionDiscountEGP: 0,
      couponDiscountEGP: 0,
      loyaltyDiscountEGP: 0,
      subtotalEGP: totalAmountEGP,
      taxes: 0,
      fees: 0,
      totalAmountEGP,
      displayCurrency,
      displayAmount: Number((totalAmountEGP * exchangeRate).toFixed(2)),
      exchangeRate,
    },
    capacityHold: null,
    pointHold: null,
    paymentStatus,
    amountPaid,
    outstandingBalance,
    pointsEarned: totalAmountEGP,
    paymentAttempts: [],
    timeline: [],
    auditTrail: [],
    documents: {},
    createdAt: '2026-08-29T00:00:00Z',
    updatedAt: '2026-08-29T00:00:00Z',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('State 1 (partially_paid): transforms booking with exact matching exchange rates and presents remaining balance', async () => {
    const booking = createMockBooking('partially_paid', 1480, 2000, 3480, 0.0199, 'USD')

    const mockExperience = { id: 101, title: 'Giza Pyramids Private Tour', heroUrl: '/giza.jpg' }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({ data: [booking], total: 1, page: 1, totalPages: 1 }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([mockExperience]),
      },
      dashboard: {
        getPortalOverview: vi.fn().mockResolvedValue({
          customer: { fullName: 'Nono Mazen', email: 'nono@example.com' },
          loyalty: { tier: 'Explorer', pointsBalance: 3480, totalSpentEGP: 3480 },
          trips: { activeBookingsCount: 1 },
        }),
      },
      customer: {
        getById: vi.fn().mockResolvedValue({ id: 642, email: 'nono@example.com', fullName: 'Nono Mazen' }),
      },
      loyalty: {
        getActiveConfig: vi.fn().mockResolvedValue({
          programCode: 'LAUBE_LOYALTY',
          name: 'Standard',
          version: 1,
          tiers: [{ tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 }],
          redemptionPointsUnit: 100,
          redemptionValueEGP: 10,
        }),
        getTierThresholds: vi.fn().mockReturnValue([{ tier: 'explorer', minSpentEGP: 0 }]),
        calculatePointValueInEGP: vi.fn().mockResolvedValue(348),
      },
      currency: {
        getActiveCurrencies: vi.fn().mockResolvedValue([{ isoCode: 'USD' }]),
      },
      pricingFacade: {
        getConvertedPrice: vi.fn().mockResolvedValue({
          baseAmountEGP: 348,
          convertedAmount: 6.93,
          currencyCode: 'USD',
          currencySymbol: '$',
          formatted: '$6.93',
          exchangeRate: 0.0199,
          decimals: 2,
        }),
      },
      notification: {
        getNotificationsByRecipient: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 }),
      },
    })

    const overview = await CustomerPortalLoader.loadOverview(642, { locale: 'en', currency: 'USD' })

    expect(overview.recentBookings).toHaveLength(1)
    const card = overview.recentBookings[0]

    // 1. Authoritative Domain Operational and Financial States
    expect(card.status).toBe(BookingStatus.CONFIRMED)
    expect(card.paymentStatus).toBe('partially_paid')

    // 2. Uniform Currency & Exchange Rate Consistency
    expect(card.totalCost.currencyCode).toBe('USD')
    expect(card.totalCost.exchangeRate).toBe(0.0199)
    expect(card.totalCost.formatted).toBe('$69.25')

    expect(card.paidAmount?.currencyCode).toBe('USD')
    expect(card.paidAmount?.exchangeRate).toBe(0.0199)
    expect(card.paidAmount?.formatted).toBe('$29.45')

    expect(card.outstandingBalance?.currencyCode).toBe('USD')
    expect(card.outstandingBalance?.exchangeRate).toBe(0.0199)
    expect(card.outstandingBalance?.formatted).toBe('$39.80')

    // 3. Loyalty SSOT preserved
    expect(overview.totalSpentEGP).toBe(3480)
    expect(overview.points).toBe(3480)
  })

  it('State 2 (unpaid): transforms booking with zero paid and full total as outstanding balance', async () => {
    const booking = createMockBooking('unpaid', 0, 3480, 3480, 0.0199, 'USD')
    const mockExperience = { id: 101, title: 'Giza Pyramids Private Tour', heroUrl: '/giza.jpg' }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({ data: [booking], total: 1, page: 1, totalPages: 1 }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([mockExperience]),
      },
    })

    const history = await CustomerPortalLoader.loadBookingsHistory(642, { locale: 'en', currency: 'USD' })

    expect(history.bookings).toHaveLength(1)
    const card = history.bookings[0]

    expect(card.status).toBe(BookingStatus.CONFIRMED)
    expect(card.paymentStatus).toBe('unpaid')
    expect(card.paidAmount?.formatted).toBe('$0.00')
    expect(card.outstandingBalance?.formatted).toBe('$69.25')
  })

  it('State 3 (paid): transforms booking with full paid and zero outstanding balance', async () => {
    const booking = createMockBooking('paid', 3480, 0, 3480, 0.0199, 'USD')
    const mockExperience = { id: 101, title: 'Giza Pyramids Private Tour', heroUrl: '/giza.jpg' }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({ data: [booking], total: 1, page: 1, totalPages: 1 }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([mockExperience]),
      },
    })

    const history = await CustomerPortalLoader.loadBookingsHistory(642, { locale: 'en', currency: 'USD' })

    expect(history.bookings).toHaveLength(1)
    const card = history.bookings[0]

    expect(card.status).toBe(BookingStatus.CONFIRMED)
    expect(card.paymentStatus).toBe('paid')
    expect(card.paidAmount?.formatted).toBe('$69.25')
    expect(card.outstandingBalance?.formatted).toBe('$0.00')
  })

  it('State 4 (refunded): transforms booking with refund status preserved', async () => {
    const booking = createMockBooking('refunded', 0, 0, 3480, 0.0199, 'USD')
    const mockExperience = { id: 101, title: 'Giza Pyramids Private Tour', heroUrl: '/giza.jpg' }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({ data: [booking], total: 1, page: 1, totalPages: 1 }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([mockExperience]),
      },
    })

    const history = await CustomerPortalLoader.loadBookingsHistory(642, { locale: 'en', currency: 'USD' })

    expect(history.bookings).toHaveLength(1)
    const card = history.bookings[0]

    expect(card.status).toBe(BookingStatus.CONFIRMED)
    expect(card.paymentStatus).toBe('refunded')
    expect(card.paidAmount?.formatted).toBe('$0.00')
    expect(card.outstandingBalance?.formatted).toBe('$0.00')
  })
})
