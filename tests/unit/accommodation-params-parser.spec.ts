import { describe, it, expect } from 'vitest'
import { AccommodationParamsParser } from '@/application/shared/parsers'
import type { AccommodationStayDTO } from '@/application/experience/dto-details'
import { BookingPricingUseCase } from '@/application/booking/pricing-usecase'
import type { ExperienceService } from '@/domains/experience/service'
import type { PricingFacade } from '@/domains/currency/facade'
import type { LocalizationService } from '@/domains/localization/service'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import type { PackageExperienceAggregate } from '@/domains/experience/aggregate'
import type { PricingCalculationResult, ConvertedPrice } from '@/domains/currency/types'
import type { LocaleContext } from '@/types/locale'
import { MeasurementSystem } from '@/types/locale'

describe('Gate 4.2: Accommodation Selection Resolution & Inbound URL Parsing', () => {
  const mockLocaleCtx: LocaleContext = {
    language: 'en',
    currency: 'EGP',
    country: 'EG',
    timezone: 'Africa/Cairo',
    measurement: MeasurementSystem.METRIC,
    weekStart: 1,
  }

  // T1: Inbound URL deserialization through AccommodationParamsParser
  it('T1: Inbound URL parsing parses valid comma-separated order:optionId pairs into Record<number, string>', () => {
    const raw = '1:opt-luxor-b,2:opt-aswan-y'
    const parsed = AccommodationParamsParser.parse(raw)
    expect(parsed).toEqual({
      1: 'opt-luxor-b',
      2: 'opt-aswan-y',
    })
  })

  // T2: Resilient parsing: malformed tokens or invalid input fail gracefully without crashing
  it('T2: AccommodationParamsParser sanitizes malformed input safely', () => {
    expect(AccommodationParamsParser.parse(undefined)).toBeUndefined()
    expect(AccommodationParamsParser.parse(null)).toBeUndefined()
    expect(AccommodationParamsParser.parse('')).toBeUndefined()
    expect(AccommodationParamsParser.parse('   ')).toBeUndefined()
    expect(AccommodationParamsParser.parse('invalid-string')).toBeUndefined()
    expect(AccommodationParamsParser.parse('1:')).toBeUndefined()
    expect(AccommodationParamsParser.parse(':opt-a')).toBeUndefined()
    expect(AccommodationParamsParser.parse('-1:opt')).toBeUndefined()
    expect(AccommodationParamsParser.parse('0:opt')).toBeUndefined()

    // Resilient parsing of mixed tokens: invalid tokens skipped, valid tokens preserved
    const mixed = AccommodationParamsParser.parse('1:opt-a,malformed,2:opt-b')
    expect(mixed).toEqual({
      1: 'opt-a',
      2: 'opt-b',
    })

    // Later duplicate overwrite is deterministic
    const duplicates = AccommodationParamsParser.parse('1:opt-a,1:opt-b')
    expect(duplicates).toEqual({
      1: 'opt-b',
    })
  })

  // T3: Server integration: parsed selections reach Pricing Engine pure usecase and evaluate ONLY the selected option
  it('T3: Transported selection reaches Pricing Engine pure usecase and evaluates ONLY the selected option', async () => {
    const rawTransportQuery = '1:opt-hilton,2:opt-cataract'
    const transportedSelections = AccommodationParamsParser.parse(rawTransportQuery)
    expect(transportedSelections).toBeDefined()

    const mockDeparture: BookableDeparture = {
      departureId: 'dep-gate4',
      experienceId: 1955,
      date: '2026-10-01',
      experienceType: 'package',
      effectiveBasePrice: 5000,
      capacityAvailable: 10,
      status: 'available',
    } as BookableDeparture

    const mockPackageDoc: Partial<PackageExperienceAggregate> = {
      id: 1955,
      title: 'Grand Nile Package',
      slug: 'grand-nile-package',
      type: 'package',
      packageMode: 'fixed_date',
      price: 5000,
      childPolicy: {
        childrenAllowed: true,
        childSharingBedPercentage: 50,
        childExtraBedPercentage: 75,
      },
      accommodations: [
        {
          order: 1,
          nights: 3,
          options: [
            {
              id: 'opt-hilton',
              propertyId: 201,
              property: { id: 201, name: 'Hilton Luxor', slug: 'hilton-luxor', type: 'hotel', cityId: 1, isActive: true },
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 800, enabled: true },
                { occupancy: 'double', rateEGP: 1200, enabled: true },
              ],
            },
            {
              id: 'opt-sofitel',
              propertyId: 202,
              property: { id: 202, name: 'Sofitel Winter', slug: 'sofitel-winter', type: 'hotel', cityId: 1, isActive: true },
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 2000, enabled: true },
                { occupancy: 'double', rateEGP: 3000, enabled: true },
              ],
            },
          ],
        },
        {
          order: 2,
          nights: 2,
          options: [
            {
              id: 'opt-movenpick',
              propertyId: 301,
              property: { id: 301, name: 'Movenpick Aswan', slug: 'movenpick-aswan', type: 'resort', cityId: 2, isActive: true },
              pricingUnit: 'per_night',
              roomRates: [
                { occupancy: 'single', rateEGP: 500, enabled: true },
                { occupancy: 'double', rateEGP: 800, enabled: true },
              ],
            },
            {
              id: 'opt-cataract',
              propertyId: 302,
              property: { id: 302, name: 'Old Cataract', slug: 'old-cataract', type: 'hotel', cityId: 2, isActive: true },
              pricingUnit: 'per_night',
              roomRates: [
                { occupancy: 'single', rateEGP: 1500, enabled: true },
                { occupancy: 'double', rateEGP: 2500, enabled: true },
              ],
            },
          ],
        },
      ],
    }

    const experienceService: Partial<ExperienceService> = {
      resolveBookableDepartureBySlot: async () => mockDeparture,
      getById: async () => mockPackageDoc as PackageExperienceAggregate,
    }

    let capturedBreakdown: any = null
    const pricingFacade: Partial<PricingFacade> = {
      calculateCheckoutSnapshot: async (input) => {
        capturedBreakdown = input.commercialBreakdown
        const subtotal = 10000 + (input.commercialBreakdown?.accommodationTotalEGP || 0)
        const snapshot: PricingCalculationResult = {
          snapshotId: 'snap-gate4',
          snapshotVersion: '1.0',
          pricingRuleVersion: '1.0',
          exchangeRateVersion: '1.0',
          basePriceEGP: 10000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: subtotal,
          taxes: 0,
          fees: 0,
          totalAmountEGP: subtotal,
          displayCurrency: 'EGP',
          displayAmount: subtotal,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
          commercialBreakdown: input.commercialBreakdown,
        }
        return snapshot
      },
    }

    const localizationService: Partial<LocalizationService> = {
      formatPrice: async (amountEGP, ctx): Promise<ConvertedPrice> => ({
        baseAmountEGP: Number(amountEGP) || 0,
        convertedAmount: Number(amountEGP) || 0,
        currencyCode: ctx?.currency || 'EGP',
        currencySymbol: 'EGP',
        formatted: `${amountEGP} ${ctx?.currency || 'EGP'}`,
        exchangeRate: 1,
        decimals: 2,
      }),
    }

    const useCase = new BookingPricingUseCase(
      experienceService as ExperienceService,
      pricingFacade as PricingFacade,
      localizationService as LocalizationService,
    )

    const result = await useCase.calculate({
      experienceId: 1955,
      slotId: 101,
      adultsCount: 2,
      childrenCount: 0,
      selectedAccommodationOptions: transportedSelections,
      ctx: mockLocaleCtx,
    })

    // Stay 1: Hilton Luxor (per_stay = 1200) -> NOT Sofitel (3000)
    // Stay 2: Old Cataract (per_night = 2500 * 2 nights = 5000) -> NOT Movenpick (800 * 2 = 1600)
    // Total accommodation = 1200 + 5000 = 6200
    expect(capturedBreakdown).toBeDefined()
    expect(capturedBreakdown.accommodationTotalEGP).toBe(6200)
    expect(capturedBreakdown.staysBreakdown).toHaveLength(2)

    const stay1 = capturedBreakdown.staysBreakdown.find((s: any) => s.order === 1)
    expect(stay1.optionId).toBe('opt-hilton')
    expect(stay1.stayAccommodationTotalEGP).toBe(1200)

    const stay2 = capturedBreakdown.staysBreakdown.find((s: any) => s.order === 2)
    expect(stay2.optionId).toBe('opt-cataract')
    expect(stay2.stayAccommodationTotalEGP).toBe(5000)

    expect(result.snapshot.subtotalEGP).toBe(16200) // 10000 base + 6200 accommodation
  })

  // T4: Server auto-selection for single-option stays
  it('T4: Server pricing engine automatically selects option for single-option stays without customer input', async () => {
    const singleOptionPackage: Partial<PackageExperienceAggregate> = {
      id: 1956,
      title: 'Single Option Package',
      slug: 'single-option-package',
      type: 'package',
      packageMode: 'fixed_date',
      price: 4000,
      accommodations: [
        {
          order: 1,
          nights: 2,
          options: [
            {
              id: 'opt-only-one',
              propertyId: 201,
              property: { id: 201, name: 'Only Hotel', slug: 'only-hotel', type: 'hotel', cityId: 1, isActive: true },
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 1000, enabled: true }],
            },
          ],
        },
      ],
    }

    const mockDeparture: BookableDeparture = {
      departureId: 'dep-single',
      experienceId: 1956,
      date: '2026-10-01',
      experienceType: 'package',
      effectiveBasePrice: 4000,
      capacityAvailable: 10,
      status: 'available',
    } as BookableDeparture

    const experienceService: Partial<ExperienceService> = {
      resolveBookableDepartureBySlot: async () => mockDeparture,
      getById: async () => singleOptionPackage as PackageExperienceAggregate,
    }

    let capturedInput: any = null
    const pricingFacade: Partial<PricingFacade> = {
      calculateCheckoutSnapshot: async (input) => {
        capturedInput = input
        return {
          snapshotId: 'snap-single',
          snapshotVersion: '1.0',
          pricingRuleVersion: '1.0',
          exchangeRateVersion: '1.0',
          basePriceEGP: 4000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
          commercialBreakdown: input.commercialBreakdown,
        }
      },
    }

    const localizationService: Partial<LocalizationService> = {
      formatPrice: async (amountEGP, ctx): Promise<ConvertedPrice> => ({
        baseAmountEGP: Number(amountEGP) || 0,
        convertedAmount: Number(amountEGP) || 0,
        currencyCode: ctx?.currency || 'EGP',
        currencySymbol: 'EGP',
        formatted: `${amountEGP} EGP`,
        exchangeRate: 1,
        decimals: 2,
      }),
    }

    const useCase = new BookingPricingUseCase(
      experienceService as ExperienceService,
      pricingFacade as PricingFacade,
      localizationService as LocalizationService,
    )

    // Omit selectedAccommodationOptions entirely: pricing engine auto-selects single option
    const result = await useCase.calculate({
      experienceId: 1956,
      slotId: 101,
      adultsCount: 2,
      childrenCount: 0,
      ctx: mockLocaleCtx,
    })

    expect(result.selectedAccommodationOptions).toEqual({
      1: 'opt-only-one',
    })
    expect(capturedInput.commercialBreakdown.accommodationTotalEGP).toBe(1000)
    expect(capturedInput.commercialBreakdown.staysBreakdown[0].optionId).toBe('opt-only-one')
  })
})
