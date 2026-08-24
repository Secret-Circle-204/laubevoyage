import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingPricingUseCase } from '@/application/booking/pricing-usecase'
import type { ExperienceService } from '@/domains/experience/service'
import type { PricingFacade } from '@/domains/currency/facade'
import type { LocalizationService } from '@/domains/localization/service'
import { MeasurementSystem, type LocaleContext } from '@/types/locale'

describe('Pure Pricing Invariant (Zero DB Mutations)', () => {
  let experienceServiceMock: any
  let pricingFacadeMock: any
  let localizationServiceMock: any
  let pricingUseCase: BookingPricingUseCase

  const mockCtx: LocaleContext = {
    language: 'en',
    currency: 'USD',
    country: 'US',
    timezone: 'America/New_York',
    measurement: MeasurementSystem.METRIC,
    weekStart: 0,
  }

  beforeEach(() => {
    experienceServiceMock = {
      resolvePreviewDepartureByDate: vi.fn().mockImplementation(async (expId: number, date: string, startTime: string) => {
        return {
          id: undefined, // Transient, unpersisted
          departureId: `DEP-${expId}-${date}-${startTime.replace(':', '')}`,
          experienceId: expId,
          experienceTitle: 'Cairo Nile Cruise',
          experienceType: 'daily_tour',
          date,
          startTime,
          effectiveBasePrice: 1000,
          totalCapacity: 20,
          capacityAvailable: 20,
          status: 'available',
        }
      }),
      // Pure read: getOrCreateDailyDeparture should NEVER be called by pricing
      getOrCreateDailyDeparture: vi.fn(),
    }

    pricingFacadeMock = {
      calculateCheckoutSnapshot: vi.fn().mockResolvedValue({
        basePriceEGP: 1000,
        subtotalEGP: 2000,
        totalAmountEGP: 2000,
        displayCurrency: 'USD',
        exchangeRate: 0.02,
        displayAmount: 40,
        pricingVersion: 'v2',
      }),
    }

    localizationServiceMock = {
      formatPrice: vi.fn().mockImplementation(async (amountEGP: number) => ({
        amount: amountEGP * 0.02,
        currency: 'USD',
        formatted: `$${(amountEGP * 0.02).toFixed(2)}`,
        exchangeRate: 0.02,
      })),
    }

    pricingUseCase = new BookingPricingUseCase(
      experienceServiceMock as ExperienceService,
      pricingFacadeMock as PricingFacade,
      localizationServiceMock as LocalizationService,
    )
  })

  it('Pricing Purity: browsing dates and changing times executes pure in-memory calculation with 0 DB mutations', async () => {
    // 1. User selects Date A (2026-08-20, 09:00)
    const resA = await pricingUseCase.calculatePreview({
      experienceId: 10,
      date: '2026-08-20',
      startTime: '09:00',
      adultsCount: 2,
      childrenCount: 0,
      ctx: mockCtx,
    })

    expect(resA.departure.departureId).toBe('DEP-10-2026-08-20-0900')
    expect(resA.totalCost.formatted).toBe('$40.00')

    // 2. User changes to Date B (2026-08-27, 11:00)
    const resB = await pricingUseCase.calculatePreview({
      experienceId: 10,
      date: '2026-08-27',
      startTime: '11:00',
      adultsCount: 2,
      childrenCount: 0,
      ctx: mockCtx,
    })

    expect(resB.departure.departureId).toBe('DEP-10-2026-08-27-1100')
    expect(resB.totalCost.formatted).toBe('$40.00')

    // Invariant: Zero DB mutations triggered
    expect(experienceServiceMock.getOrCreateDailyDeparture).not.toHaveBeenCalled()
    expect(experienceServiceMock.resolvePreviewDepartureByDate).toHaveBeenCalledTimes(2)
  })

  it('100 concurrent pricing requests execute pure math and return 100 valid DTOs with 0 slot insertions', async () => {
    const dates = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24']
    const times = ['09:00', '11:00', '14:00', '16:00']

    const requests = Array.from({ length: 100 }).map((_, i) => {
      const date = dates[i % dates.length]!
      const time = times[i % times.length]!
      return pricingUseCase.calculatePreview({
        experienceId: 10,
        date,
        startTime: time,
        adultsCount: 2,
        childrenCount: 0,
        ctx: mockCtx,
      })
    })

    const results = await Promise.all(requests)

    expect(results).toHaveLength(100)
    results.forEach((res) => {
      expect(res.totalCost.formatted).toBe('$40.00')
      expect(res.departure.departureId).toBeDefined()
    })

    // Invariant: Zero DB mutations across all 100 concurrent pricing requests
    expect(experienceServiceMock.getOrCreateDailyDeparture).not.toHaveBeenCalled()
    expect(experienceServiceMock.resolvePreviewDepartureByDate).toHaveBeenCalledTimes(100)
  })

  it('should reject pricing calculation when departure status is past', async () => {
    experienceServiceMock.resolvePreviewDepartureByDate.mockResolvedValueOnce({
      id: undefined,
      departureId: 'DEP-10-2026-08-22-0900',
      experienceId: 10,
      experienceTitle: 'Cairo Nile Cruise',
      experienceType: 'daily_tour',
      date: '2026-08-22',
      startTime: '09:00',
      effectiveBasePrice: 1000,
      capacityAvailable: 20,
      capacityTotal: 20,
      status: 'past',
    })

    await expect(
      pricingUseCase.calculatePreview({
        experienceId: 10,
        date: '2026-08-22',
        startTime: '09:00',
        adultsCount: 2,
        childrenCount: 0,
        ctx: mockCtx,
      }),
    ).rejects.toThrow(/already passed and cannot be booked/)
  })
})
