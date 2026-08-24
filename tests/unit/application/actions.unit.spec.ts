import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import { getApplicationServices } from '@/application/factory'

vi.mock('@/application/factory', () => ({
  getApplicationServices: vi.fn(),
}))

describe('Application Server Actions: Pricing & Daily Tour Materialization (BATCH 17C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should resolve pricing using slotId for package departures', async () => {
    const mockAppServices = {
      experience: {
        getById: vi.fn().mockResolvedValue({ id: 1, type: 'package', packageMode: 'fixed_date' }),
        getOrCreateDailyDeparture: vi.fn(),
      },
      localization: {
        buildContext: vi.fn().mockResolvedValue({
          language: 'en',
          currency: 'EGP',
          timezone: 'Africa/Cairo',
        }),
      },
      bookingPricingUseCase: {
        calculate: vi.fn().mockResolvedValue({
          unitPrice: { baseAmountEGP: 5000, convertedAmount: 5000, formatted: '5,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          totalCost: { baseAmountEGP: 10000, convertedAmount: 10000, formatted: '10,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          departure: { departureId: 'DEP-1-2026-10-01-0900' },
        }),
      },
    }

    ;(getApplicationServices as any).mockResolvedValue(mockAppServices)

    const result = await resolvePricingAction({
      experienceId: 1,
      slotId: 101,
      adults: 2,
      currency: 'EGP',
      locale: 'en',
    })

    expect(result.success).toBe(true)
    expect(result.slotId).toBe(101)
    expect(result.departureId).toBe('DEP-1-2026-10-01-0900')
    expect(result.pricing?.totalPrice.convertedAmount).toBe(10000)
    expect(mockAppServices.bookingPricingUseCase.calculate).toHaveBeenCalledWith({
      experienceId: 1,
      slotId: 101,
      adultsCount: 2,
      childrenCount: 0,
      ctx: expect.any(Object),
    })
  })

  it('should materialize departure slot on demand when date and startTime are provided for Daily Tour', async () => {
    const mockAppServices = {
      experience: {
        getById: vi.fn().mockResolvedValue({ id: 2, type: 'daily_tour' }),
        getOrCreateDailyDeparture: vi.fn(),
      },
      localization: {
        buildContext: vi.fn().mockResolvedValue({
          language: 'en',
          currency: 'EGP',
          timezone: 'Africa/Cairo',
        }),
      },
      bookingPricingUseCase: {
        calculate: vi.fn(),
        calculatePreview: vi.fn().mockResolvedValue({
          unitPrice: { baseAmountEGP: 1200, convertedAmount: 1200, formatted: '1,200 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          totalCost: { baseAmountEGP: 2400, convertedAmount: 2400, formatted: '2,400 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          departure: { departureId: 'DEP-2-2026-11-01-1000' },
        }),
      },
    }

    ;(getApplicationServices as any).mockResolvedValue(mockAppServices)

    const result = await resolvePricingAction({
      experienceId: 2,
      date: '2026-11-01',
      startTime: '10:00',
      adults: 2,
      currency: 'EGP',
      locale: 'en',
    })

    expect(result.success).toBe(true)
    expect(result.departureId).toBe('DEP-2-2026-11-01-1000')
    expect(mockAppServices.experience.getOrCreateDailyDeparture).not.toHaveBeenCalled()
    expect(mockAppServices.bookingPricingUseCase.calculatePreview).toHaveBeenCalledWith({
      experienceId: 2,
      date: '2026-11-01',
      startTime: '10:00',
      adultsCount: 2,
      childrenCount: 0,
      ctx: expect.any(Object),
    })
  })

  it('should fail fast if neither slotId nor date/startTime is provided', async () => {
    ;(getApplicationServices as any).mockResolvedValue({
      experience: {
        getById: vi.fn().mockResolvedValue({ id: 3, type: 'daily_tour' }),
      },
      localization: {
        buildContext: vi.fn().mockResolvedValue({
          language: 'en',
          currency: 'EGP',
        }),
      },
      bookingPricingUseCase: {},
    })

    const result = await resolvePricingAction({
      experienceId: 3,
      adults: 1,
      currency: 'EGP',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('date and startTime are required')
  })
})
