import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { BookingCreator } from '@/domains/booking/creator'
import { BookingRepository } from '@/domains/booking/repository'
import { ExperiencePolicy } from '@/domains/experience/policy'
import { PaymentService } from '@/domains/payment/service'
import { SessionResolver } from '@/application/auth/session-resolver'
import { BookingStatus } from '@/types'
import * as domainFactory from '@/domains/factory'

describe('P0 Emergency: Past Departure Admission Guard & Incident #2 Regression Guard', () => {
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      update: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn(),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('mock_tx_123'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }

    vi.spyOn(SessionResolver, 'resolve').mockResolvedValue({
      isAuthenticated: true,
      user: { id: 136, role: 'customer' },
      customerId: 136,
      type: 'customer',
    } as any)
  })

  it('REGRESSION GUARD (Incident #2): confirmCheckoutAction strictly rejects checkout for past Daily Tour (09:00 tour requested at 18:00)', async () => {
    // Current simulated server time: 2026-08-22 18:00:00 (6 hours after tour finished at 12:00)
    const simulatedNow = new Date('2026-08-22T15:00:00.000Z') // 18:00 Cairo Time (+03:00)

    const mockExp = {
      id: 53,
      title: 'Daily Safari Tour',
      type: 'daily_tour',
      availability: 'available',
      durationMinutes: 180,
      price: 1500,
      blackouts: [],
    }

    const mockServices = {
      experience: {
        getById: vi.fn().mockResolvedValue(mockExp),
        resolvePreviewDepartureByDate: vi.fn().mockImplementation(async (expId, date, startTime) => {
          const bookability = ExperiencePolicy.isDepartureBookable(
            {
              type: 'daily_tour',
              date,
              startTime,
              durationMinutes: 180,
              timezone: 'Africa/Cairo',
            },
            simulatedNow,
          )

          return {
            id: undefined,
            departureId: `DEP-${expId}-${date}-${startTime.replace(':', '')}`,
            experienceId: expId,
            experienceTitle: mockExp.title,
            experienceType: 'daily_tour',
            date,
            startTime,
            effectiveBasePrice: 1500,
            capacityAvailable: 10,
            capacityTotal: 10,
            status: !bookability.allowed ? 'past' : 'available',
          }
        }),
      },
      booking: {
        getByIdempotencyKey: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      localization: {
        buildContext: vi.fn().mockResolvedValue({
          language: 'en',
          currency: 'EGP',
          timezone: 'Africa/Cairo',
        }),
      },
      customer: {
        getCurrentCustomer: vi.fn().mockResolvedValue({ id: 136, email: 'customer@example.com', status: 'active' }),
      },
    }

    vi.spyOn(domainFactory, 'getDomainServices').mockResolvedValue({
      ...mockServices,
      payload: mockPayload,
    } as any)

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 53,
      date: '2026-08-22',
      startTime: '09:00',
      adults: 1,
      travelers: [{ firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '0100000000' }],
      gatewayId: 'stripe',
    })

    // Invariant 1: Action rejected with DEPARTURE_IN_PAST
    expect(result.success).toBe(false)
    expect(result.code).toBe('DEPARTURE_IN_PAST')
    expect(result.error).toContain('already passed and cannot be booked')

    // Invariant 2: ZERO bookings created in database
    expect(mockServices.booking.create).not.toHaveBeenCalled()
  })

  it('HARD DOMAIN GUARD: BookingCreator.createDraft throws fail-fast exception if departure is in the past', async () => {
    const repository = new BookingRepository(mockPayload)

    const mockExp = {
      id: 53,
      title: 'Daily Safari Tour',
      type: 'daily_tour',
      availability: 'available',
      durationMinutes: 180,
      duration: { durationMinutes: 180 },
      cityId: 1,
    }

    const mockCustomer = {
      id: 136,
      status: 'active',
    }

    const mockExperienceService = {
      getById: vi.fn().mockResolvedValue(mockExp),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
    }

    const mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue(mockCustomer),
    }

    const mockLoyaltyService = {
      getCustomerBalance: vi.fn().mockResolvedValue(0),
      calculatePointValueInEGP: vi.fn().mockResolvedValue(0),
    }

    const mockPricingPipeline = {
      calculateCheckoutSnapshot: vi.fn().mockResolvedValue({
        basePriceEGP: 1500,
        subtotalEGP: 1500,
        totalAmountEGP: 1500,
        displayCurrency: 'EGP',
        displayAmount: 1500,
        exchangeRate: 1,
        pricingVersion: 'v2',
      }),
    }

    const creator = new BookingCreator(
      repository,
      mockCustomerRepo as any,
      mockExperienceService as any,
      mockLoyaltyService as any,
      mockPricingPipeline as any,
    )

    const pastDeparture = {
      experienceId: 53,
      experienceTitle: 'Daily Safari Tour',
      experienceType: 'daily_tour' as const,
      departureId: 'DEP-53-2020-01-01-0900',
      date: '2020-01-01', // Guaranteed in the past
      startTime: '09:00',
      effectiveBasePrice: 1500,
      capacityAvailable: 10,
      capacityTotal: 10,
      status: 'past' as const,
    }

    // Must fail fast and reject aggregate creation
    await expect(
      creator.createDraft({
        userId: 136,
        departure: pastDeparture as any,
        endDate: '2020-01-01',
        source: 'website',
        travelers: [{ firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '0100000000' }],
      }),
    ).rejects.toThrow(/Creation forbidden: Departure on 2020-01-01 at 09:00 has already/)

    expect(mockPayload.create).not.toHaveBeenCalled()
  })

  it('PAYMENT GUARD: PaymentService.processPaymentCheckout blocks Stripe checkout session if trip has already completed', async () => {
    const mockBookingRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 731,
        bookingNumber: 'LBV-260822-73100',
        customerId: 136,
        experienceId: 53,
        status: BookingStatus.DRAFT,
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        completionAt: new Date(Date.now() - 3600 * 1000).toISOString(), // Completed 1 hour ago
        pricingSnapshot: { totalAmountEGP: 1500, displayCurrency: 'EGP', displayAmount: 1500 },
      }),
    }

    const mockPaymentRepo = {
      findByBookingId: vi.fn().mockResolvedValue(null),
      findActiveGateways: vi.fn().mockResolvedValue(['stripe']),
    }

    const paymentService = new PaymentService(
      mockPaymentRepo as any,
      mockBookingRepo as any,
      {} as any,
      {} as any,
    )

    const res = await paymentService.processPaymentCheckout({
      bookingId: 731,
      gatewayId: 'stripe',
      appUrl: 'http://localhost:3000',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('departure has already completed and cannot be paid')
  })

  it('PAYMENT GUARD: PaymentService.processPaymentCheckout blocks Stripe checkout session if departure start instant has arrived, even if completionAt is in the future', async () => {
    // Departure: 09:00 Cairo Time (06:00 UTC)
    // Current time: 09:05 Cairo Time (06:05 UTC)
    // CompletionAt: 12:00 Cairo Time (09:00 UTC - in the future!)
    const simulatedNow = new Date('2026-08-22T06:05:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(simulatedNow)

    const mockBookingRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 732,
        bookingNumber: 'LBV-260822-73200',
        customerId: 136,
        experienceId: 53,
        startDate: '2026-08-22',
        endDate: '2026-08-22',
        status: BookingStatus.DRAFT,
        paymentWindowExpiresAt: new Date('2026-08-22T06:15:00.000Z').toISOString(),
        completionAt: new Date('2026-08-22T09:00:00.000Z').toISOString(), // 12:00 Cairo (in the future)
        pricingSnapshot: { totalAmountEGP: 1500, displayCurrency: 'EGP', displayAmount: 1500 },
      }),
    }

    const mockExpRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 53,
        type: 'daily_tour',
        durationMinutes: 180,
        schedules: [{ startTime: '09:00' }],
        cityId: 1,
      }),
      findTimezoneByCityId: vi.fn().mockResolvedValue('Africa/Cairo'),
    }

    const mockPaymentRepo = {
      findByBookingId: vi.fn().mockResolvedValue(null),
      findActiveGateways: vi.fn().mockResolvedValue(['stripe']),
    }

    const mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue({ id: 136, email: 'test@example.com' }),
    }

    const paymentService = new PaymentService(
      mockPaymentRepo as any,
      mockBookingRepo as any,
      mockCustomerRepo as any,
      mockExpRepo as any,
    )

    const res = await paymentService.processPaymentCheckout({
      bookingId: 732,
      gatewayId: 'stripe',
      appUrl: 'http://localhost:3000',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('can no longer be paid')
    expect(res.error).toContain('already started or passed')

    vi.useRealTimers()
  })
})
