import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerInvoicesLoader } from '@/application/booking/loaders-invoices'
import { BookingStatus } from '@/types'
import type { BookingAggregate } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'

// Mock getDomainServices
vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

import { getDomainServices } from '@/domains/factory'

describe('Customer Invoices & Financial Documents Loader (Comprehensive Unit Tests)', () => {
  const mockContext = {
    language: 'en',
    currency: 'USD',
    timezone: 'Africa/Cairo',
  }

  const mockLocalization = {
    buildContext: vi.fn().mockResolvedValue(mockContext),
    formatDate: vi.fn((d: Date | string) => {
      const dateObj = typeof d === 'string' ? new Date(d) : d
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }),
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
        convertedAmount: Number(converted.toFixed(2)),
        currencyCode: currency,
        currencySymbol: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency,
        formatted:
          currency === 'USD'
            ? `$${converted.toFixed(2)}`
            : currency === 'EUR'
            ? `€${converted.toFixed(2)}`
            : `${converted.toFixed(2)} ${currency}`,
        exchangeRate: rate,
        decimals: 2,
      } as ConvertedPrice),
    ),
    formatNumber: vi.fn((n: number) => n.toLocaleString()),
    translateUiKey: vi.fn((k: string) => {
      if (k === 'catalog.packageLabel') return 'Tour Package'
      if (k === 'catalog.dailyTourLabel') return 'Daily Tour'
      return k
    }),
    translateText: vi.fn(async (t: string) => t),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Package Booking with Selected Departure Slot: Resolves departure slot time, city, and duration', async () => {
    const rate = 0.0199

    const packageBooking: BookingAggregate = {
      id: 1001,
      bookingNumber: 'LBV-PKG-SLOT-01',
      version: 1,
      source: 'website',
      status: BookingStatus.CONFIRMED,
      customerId: 500,
      experienceId: 301,
      departureSlot: 88,
      travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '123' }],
      startDate: '2026-09-10',
      endDate: '2026-09-14',
      completionAt: '2026-09-14T12:00:00Z',
      paymentWindowExpiresAt: '2026-09-10T12:05:00Z',
      destinationTimezone: 'Africa/Cairo',
      pricingSnapshot: {
        version: 1,
        pricingVersion: 1,
        basePriceEGP: 15000,
        promotionDiscountEGP: 0,
        couponDiscountEGP: 0,
        loyaltyDiscountEGP: 500,
        subtotalEGP: 15000,
        taxes: 0,
        fees: 0,
        totalAmountEGP: 14500,
        displayCurrency: 'USD',
        displayAmount: 288.55,
        exchangeRate: rate,
      },
      capacityHold: null,
      pointHold: null,
      paymentStatus: 'paid',
      amountPaid: 14500,
      outstandingBalance: 0,
      pointsEarned: 14500,
      paymentAttempts: [
        {
          attemptId: 'att_stripe_1',
          attemptNumber: 1,
          provider: 'stripe',
          amount: 14500,
          currency: 'EGP',
          status: 'successful',
          transactionReference: 'pi_3PqzPackage123',
          timestamp: '2026-08-29T11:00:00Z',
        },
      ],
      timeline: [],
      auditTrail: [],
      documents: {},
      createdAt: '2026-08-29T10:30:00Z',
      updatedAt: '2026-08-29T11:00:00Z',
    }

    const mockExperiences = [
      {
        id: 301,
        title: 'Nile Cruise Luxury Experience',
        type: 'package',
        cityId: 101,
        duration: { days: 5, nights: 4 },
        schedules: [{ startTime: '12:00' }], // Generic schedule should NOT override slot time
      },
    ]

    const mockSlot = {
      id: 88,
      departureId: 'DEP-88',
      experience: 301,
      date: '2026-09-10',
      startTime: '08:15', // Selected slot departure time
    }

    const getUserBookingsMock = vi.fn().mockResolvedValue({
      data: [packageBooking],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    const getDepartureSlotByIdMock = vi.fn().mockResolvedValue(mockSlot)
    const getCityByIdMock = vi.fn().mockResolvedValue({
      id: 101,
      name: 'Aswan',
      country: { name: 'Egypt' },
    })

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      destination: {
        getCityById: getCityByIdMock,
      },
      booking: {
        getUserBookings: getUserBookingsMock,
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue(mockExperiences),
        getDepartureSlotById: getDepartureSlotByIdMock,
      },
    })

    const portal = await CustomerInvoicesLoader.load(500, { locale: 'en', currency: 'USD' })

    expect(getUserBookingsMock).toHaveBeenCalledWith(500, 1, 10, undefined)
    expect(getDepartureSlotByIdMock).toHaveBeenCalledWith(88)
    expect(getCityByIdMock).toHaveBeenCalledWith(101)

    const doc = portal.invoices[0]
    expect(doc.productType).toBe('package')
    expect(doc.productTypeLabel).toBe('Tour Package')
    expect(doc.destinationCity).toBe('Aswan, Egypt')
    expect(doc.durationText).toBe('5 Days / 4 Nights')
    expect(doc.departureTime).toBe('08:15') // Proven: Selected departure slot time used!
    expect(doc.endDate).toBe('2026-09-14')
    expect(doc.leadTravelerName).toBe('John Doe')
    expect(doc.basePrice?.formatted).toBe('$298.50')
    expect(doc.loyaltyDiscount?.formatted).toBe('$9.95')
    expect(doc.totalAmount.formatted).toBe('$288.55')
    expect(doc.paidAmount.formatted).toBe('$288.55')
    expect(doc.outstandingBalance.formatted).toBe('$0.00')
    expect(doc.receipts).toHaveLength(1)
    expect(doc.receipts[0].transactionReference).toBe('pi_3PqzPackage123')
  })

  it('2. Zero Fallbacks Test: Missing Experience and Missing Slot Leaves Fields Undefined', async () => {
    const rawBooking: BookingAggregate = {
      id: 1002,
      bookingNumber: 'LBV-RAW-NO-EXP',
      version: 1,
      source: 'website',
      status: BookingStatus.CONFIRMED,
      customerId: 500,
      experienceId: 999, // Non-existent experience
      travelers: [{ firstName: 'Alice', lastName: 'Walker', email: 'alice@example.com', phone: '123' }],
      startDate: '2026-09-15',
      endDate: '2026-09-15',
      completionAt: '2026-09-15T18:00:00Z',
      paymentWindowExpiresAt: '2026-09-15T12:05:00Z',
      pricingSnapshot: {
        version: 1,
        pricingVersion: 1,
        basePriceEGP: 2000,
        promotionDiscountEGP: 0,
        couponDiscountEGP: 0,
        loyaltyDiscountEGP: 0,
        subtotalEGP: 2000,
        taxes: 0,
        fees: 0,
        totalAmountEGP: 2000,
        displayCurrency: 'USD',
        displayAmount: 39.80,
        exchangeRate: 0.0199,
      },
      capacityHold: null,
      pointHold: null,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      outstandingBalance: 2000,
      pointsEarned: 0,
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      documents: {},
      createdAt: '2026-08-29T10:30:00Z',
      updatedAt: '2026-08-29T11:00:00Z',
    }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      destination: {
        getCityById: vi.fn().mockResolvedValue(null),
      },
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({
          data: [rawBooking],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([]), // No experience returned
        getDepartureSlotById: vi.fn().mockResolvedValue(null),
      },
    })

    const portal = await CustomerInvoicesLoader.load(500)
    const doc = portal.invoices[0]

    // PROVEN: Zero fabricated fallbacks!
    expect(doc.productType).toBeUndefined()
    expect(doc.productTypeLabel).toBeUndefined()
    expect(doc.durationText).toBeUndefined()
    expect(doc.departureTime).toBeUndefined() // No hardcoded '09:00'
    expect(doc.destinationCity).toBeUndefined()
    expect(doc.endDate).toBeUndefined() // startDate === endDate -> undefined
  })

  it('3. Cancelled Booking: Outstanding Balance is Zeroed in Presentation ($0.00 / Voided)', async () => {
    const cancelledBooking: BookingAggregate = {
      id: 1003,
      bookingNumber: 'LBV-CANCELLED-01',
      version: 1,
      source: 'website',
      status: BookingStatus.CANCELLED,
      customerId: 500,
      experienceId: 201,
      travelers: [{ firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com', phone: '123' }],
      startDate: '2026-09-20',
      endDate: '2026-09-20',
      completionAt: '2026-09-20T18:00:00Z',
      paymentWindowExpiresAt: '2026-09-20T12:05:00Z',
      pricingSnapshot: {
        version: 1,
        pricingVersion: 1,
        basePriceEGP: 3500,
        promotionDiscountEGP: 0,
        couponDiscountEGP: 0,
        loyaltyDiscountEGP: 0,
        subtotalEGP: 3500,
        taxes: 0,
        fees: 0,
        totalAmountEGP: 3500,
        displayCurrency: 'USD',
        displayAmount: 69.65,
        exchangeRate: 0.0199,
      },
      capacityHold: null,
      pointHold: null,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      outstandingBalance: 3500, // Preserved in DB as 3500
      pointsEarned: 0,
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      documents: {},
      createdAt: '2026-08-29T10:30:00Z',
      updatedAt: '2026-08-29T11:00:00Z',
    }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      destination: {
        getCityById: vi.fn().mockResolvedValue(null),
      },
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({
          data: [cancelledBooking],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([]),
      },
    })

    const portal = await CustomerInvoicesLoader.load(500)
    const doc = portal.invoices[0]

    expect(doc.isCancelled).toBe(true)
    expect(doc.outstandingBalance.formatted).toBe('$0.00') // Presentation zeroed!
  })

  it('4. Multi-Payment Installments (BNPL): Preserves distinct receipt identities without collapsing', async () => {
    const multiPaymentBooking: BookingAggregate = {
      id: 1004,
      bookingNumber: 'LBV-BNPL-MULTI',
      version: 1,
      source: 'website',
      status: BookingStatus.CONFIRMED,
      customerId: 500,
      experienceId: 201,
      travelers: [{ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '456' }],
      startDate: '2026-08-29',
      endDate: '2026-08-29',
      completionAt: '2026-08-29T13:00:00Z',
      paymentWindowExpiresAt: '2026-08-29T12:05:00Z',
      destinationTimezone: 'Africa/Cairo',
      pricingSnapshot: {
        version: 1,
        pricingVersion: 1,
        basePriceEGP: 3500,
        promotionDiscountEGP: 0,
        couponDiscountEGP: 0,
        loyaltyDiscountEGP: 0,
        subtotalEGP: 3500,
        taxes: 0,
        fees: 0,
        totalAmountEGP: 3500,
        displayCurrency: 'USD',
        displayAmount: 69.65,
        exchangeRate: 0.0199,
      },
      capacityHold: null,
      pointHold: null,
      paymentStatus: 'paid',
      amountPaid: 3500,
      outstandingBalance: 0,
      pointsEarned: 3500,
      paymentAttempts: [
        {
          attemptId: 'att_1',
          attemptNumber: 1,
          provider: 'bnpl',
          amount: 1800,
          currency: 'EGP',
          status: 'successful',
          transactionReference: 'man_tranche_1800',
          timestamp: '2026-08-20T10:00:00Z',
        },
        {
          attemptId: 'att_2',
          attemptNumber: 2,
          provider: 'bnpl',
          amount: 999,
          currency: 'EGP',
          status: 'successful',
          transactionReference: 'man_tranche_999',
          timestamp: '2026-08-25T10:00:00Z',
        },
        {
          attemptId: 'att_3',
          attemptNumber: 3,
          provider: 'bnpl',
          amount: 701,
          currency: 'EGP',
          status: 'successful',
          transactionReference: 'man_tranche_701',
          timestamp: '2026-08-29T10:00:00Z',
        },
      ],
      timeline: [],
      auditTrail: [],
      documents: {},
      createdAt: '2026-08-20T09:00:00Z',
      updatedAt: '2026-08-29T10:00:00Z',
    }

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      destination: {
        getCityById: vi.fn().mockResolvedValue(null),
      },
      booking: {
        getUserBookings: vi.fn().mockResolvedValue({
          data: [multiPaymentBooking],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([{ id: 201, title: 'Pyramids Tour' }]),
      },
    })

    const portal = await CustomerInvoicesLoader.load(500)
    const doc = portal.invoices[0]

    expect(doc.paymentPlan).toBe('Buy Now Pay Later (BNPL)')
    expect(doc.receipts).toHaveLength(3)
    expect(doc.receipts[0].transactionReference).toBe('man_tranche_1800')
    expect(doc.receipts[0].amount.formatted).toBe('$35.82') // 1800 * 0.0199
    expect(doc.receipts[1].transactionReference).toBe('man_tranche_999')
    expect(doc.receipts[1].amount.formatted).toBe('$19.88') // 999 * 0.0199
    expect(doc.receipts[2].transactionReference).toBe('man_tranche_701')
    expect(doc.receipts[2].amount.formatted).toBe('$13.95') // 701 * 0.0199
  })

  it('5. Orthogonal Status Tab Filtering: Applies native server-side database filter without axis collapse', async () => {
    const getUserBookingsMock = vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 1,
    })

    ;(getDomainServices as any).mockResolvedValue({
      localization: mockLocalization,
      destination: {
        getCityById: vi.fn().mockResolvedValue(null),
      },
      booking: {
        getUserBookings: getUserBookingsMock,
      },
      experience: {
        getManyByIds: vi.fn().mockResolvedValue([]),
      },
    })

    // 1. Tab 'Paid & Settled'
    await CustomerInvoicesLoader.load(500, { status: 'paid', page: 2, limit: 10 })
    expect(getUserBookingsMock).toHaveBeenLastCalledWith(500, 2, 10, {
      paymentStatus: 'paid',
    })

    // 2. Tab 'Outstanding / Partial' (Includes COMPLETED + partially_paid without excluding valid states)
    await CustomerInvoicesLoader.load(500, { status: 'pending_payment', page: 1, limit: 10 })
    expect(getUserBookingsMock).toHaveBeenLastCalledWith(500, 1, 10, {
      paymentStatus: ['partially_paid', 'unpaid'],
      statusNotIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
      paymentStatusNotIn: ['refunded', 'partially_refunded'],
    })

    // 3. Tab 'Cancelled & Refunded' (Includes both operational cancellation and financial refund)
    await CustomerInvoicesLoader.load(500, { status: 'cancelled', page: 1, limit: 10 })
    expect(getUserBookingsMock).toHaveBeenLastCalledWith(500, 1, 10, {
      or: [
        { status: { in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } },
        { paymentStatus: { in: ['refunded', 'partially_refunded'] } },
      ],
    })
  })
})
