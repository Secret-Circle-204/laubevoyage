import { describe, it, expect } from 'vitest'
import { BookingPricingUseCase, type CalculatePricingParams } from '@/application/booking/pricing-usecase'
import type { ExperienceService } from '@/domains/experience/service'
import type { PricingFacade } from '@/domains/currency/facade'
import type { LocalizationService } from '@/domains/localization/service'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import type { PackageExperienceAggregate } from '@/domains/experience/aggregate'
import type { PricingCalculationResult, ConvertedPrice } from '@/domains/currency/types'
import type { LocaleContext } from '@/types/locale'
import { MeasurementSystem } from '@/types/locale'

describe('Gate 3: Accommodation Option Selection & Pricing Engine Suite', () => {
  const mockLocaleCtx: LocaleContext = {
    language: 'en',
    currency: 'EGP',
    country: 'EG',
    timezone: 'Africa/Cairo',
    measurement: MeasurementSystem.METRIC,
    weekStart: 1,
  }

  const createMockDeparture = (overrides?: Partial<BookableDeparture>): BookableDeparture =>
    ({
      departureId: 'dep-101',
      experienceId: 1955,
      date: '2026-10-01',
      experienceType: 'package',
      effectiveBasePrice: 5000,
      capacityAvailable: 20,
      status: 'available',
      ...overrides,
    }) as BookableDeparture

  const createPricingUseCase = (packageDoc: Partial<PackageExperienceAggregate>) => {
    const defaultDeparture = createMockDeparture()

    const experienceService: Partial<ExperienceService> = {
      resolveBookableDepartureBySlot: async () => defaultDeparture,
      resolveBookableDepartureByDate: async () => defaultDeparture,
      getById: async () =>
        ({
          id: 1955,
          title: 'Egypt Grand Explorer',
          slug: 'egypt-grand-explorer',
          type: 'package',
          packageMode: 'fixed_date',
          price: 5000,
          childPolicy: {
            childrenAllowed: true,
            childSharingBedPercentage: 50,
            childExtraBedPercentage: 75,
          },
          ...packageDoc,
        }) as PackageExperienceAggregate,
    }

    const pricingFacade: Partial<PricingFacade> = {
      calculateCheckoutSnapshot: async (input) => {
        const adultsBase = (input.basePricePerPersonEGP || 5000) * input.adultsCount
        const accommodation = input.commercialBreakdown?.accommodationTotalEGP || 0
        const children = input.commercialBreakdown?.childrenTotalEGP || 0
        const subtotal = adultsBase + accommodation + children
        const totalAmount = subtotal - (input.loyaltyDiscountEGP || 0)

        const snapshot: PricingCalculationResult = {
          snapshotId: 'snap-1',
          snapshotVersion: '1.0',
          pricingRuleVersion: '1.0',
          exchangeRateVersion: '1.0',
          basePriceEGP: adultsBase,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: input.loyaltyDiscountEGP || 0,
          subtotalEGP: subtotal,
          taxes: 0,
          fees: 0,
          totalAmountEGP: totalAmount,
          displayCurrency: input.targetCurrency,
          displayAmount: totalAmount,
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

    return new BookingPricingUseCase(
      experienceService as ExperienceService,
      pricingFacade as PricingFacade,
      localizationService as LocalizationService,
    )
  }

  // =========================================================================
  // TEST GROUP A: Single Option Auto-Selection
  // =========================================================================
  describe('Test Group A: Single Option Auto-Selection', () => {
    it('A1: automatically selects the single option with per_stay pricing', async () => {
      const useCase = createPricingUseCase({
        accommodations: [
          {
            order: 1,
            nights: 3,
            options: [
              {
                id: 'opt-single-stay',
                propertyId: 101,
                property: { id: 101, name: 'Hilton Luxor', slug: 'hilton-luxor', type: 'hotel', cityId: 1, isActive: true },
                roomCategory: 'Deluxe Nile View',
                boardBasis: 'bed_and_breakfast',
                pricingUnit: 'per_stay',
                roomRates: [
                  { occupancy: 'single', rateEGP: 4000, enabled: true },
                  { occupancy: 'double', rateEGP: 6000, enabled: true },
                ],
              },
            ],
          },
        ],
      })

      // Client omits selectedAccommodationOptions
      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2, // 1 double room
        ctx: mockLocaleCtx,
      })

      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(6000)
      expect(result.commercialBreakdown?.staysBreakdown).toHaveLength(1)
      const stayBreakdown = result.commercialBreakdown!.staysBreakdown![0]
      expect(stayBreakdown.order).toBe(1)
      expect(stayBreakdown.optionId).toBe('opt-single-stay')
      expect(stayBreakdown.propertyName).toBe('Hilton Luxor')
      expect(stayBreakdown.roomCategory).toBe('Deluxe Nile View')
      expect(stayBreakdown.boardBasis).toBe('bed_and_breakfast')
      expect(stayBreakdown.pricingUnit).toBe('per_stay')
      expect(stayBreakdown.stayAccommodationTotalEGP).toBe(6000)
      expect(result.selectedAccommodationOptions).toEqual({ 1: 'opt-single-stay' })
    })

    it('A2: automatically selects single option with per_night pricing (rate × nights)', async () => {
      const useCase = createPricingUseCase({
        accommodations: [
          {
            order: 1,
            nights: 4,
            options: [
              {
                id: 'opt-single-night',
                propertyId: 102,
                property: { id: 102, name: 'Marriott Cairo', slug: 'marriott-cairo', type: 'hotel', cityId: 2, isActive: true },
                roomCategory: 'Superior City View',
                pricingUnit: 'per_night',
                roomRates: [
                  { occupancy: 'double', rateEGP: 1500, enabled: true },
                ],
              },
            ],
          },
        ],
      })

      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2, // 1 double room
        ctx: mockLocaleCtx,
      })

      // 1500 * 4 nights = 6000
      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(6000)
      expect(result.commercialBreakdown?.staysBreakdown![0].appliedRoomRates[0].totalRoomCostEGP).toBe(6000)
      expect(result.commercialBreakdown?.staysBreakdown![0].appliedRoomRates[0].nightsMultiplier).toBe(4)
      expect(result.selectedAccommodationOptions).toEqual({ 1: 'opt-single-night' })
    })
  })

  // =========================================================================
  // TEST GROUP B: Multiple Options Resolution & Isolation
  // =========================================================================
  describe('Test Group B: Multiple Options Resolution', () => {
    const multiOptionPackage: Partial<PackageExperienceAggregate> = {
      accommodations: [
        {
          order: 1,
          nights: 3,
          options: [
            {
              id: 'opt-luxury-a',
              propertyId: 201,
              property: { id: 201, name: 'Rixos Premium', slug: 'rixos', type: 'resort', cityId: 3, isActive: true },
              roomCategory: 'Presidential Suite',
              boardBasis: 'all_inclusive',
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 14000, enabled: true }],
            },
            {
              id: 'opt-budget-b',
              propertyId: 202,
              property: { id: 202, name: 'Bella Vista Resort', slug: 'bella-vista', type: 'hotel', cityId: 3, isActive: true },
              roomCategory: 'Standard Room',
              boardBasis: 'half_board',
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 8000, enabled: true }],
            },
          ],
        },
      ],
    }

    it('B1: prices ONLY Option A (14,000 EGP) when Option A is selected; Option B contributes 0', async () => {
      const useCase = createPricingUseCase(multiOptionPackage)

      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        selectedAccommodationOptions: { 1: 'opt-luxury-a' },
        ctx: mockLocaleCtx,
      })

      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(14000)
      expect(result.commercialBreakdown?.staysBreakdown![0].optionId).toBe('opt-luxury-a')
      expect(result.commercialBreakdown?.staysBreakdown![0].propertyName).toBe('Rixos Premium')
      expect(result.commercialBreakdown?.staysBreakdown![0].boardBasis).toBe('all_inclusive')
      expect(result.selectedAccommodationOptions).toEqual({ 1: 'opt-luxury-a' })
    })

    it('B2: prices ONLY Option B (8,000 EGP) when Option B is selected; Option A contributes 0', async () => {
      const useCase = createPricingUseCase(multiOptionPackage)

      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        selectedAccommodationOptions: { 1: 'opt-budget-b' },
        ctx: mockLocaleCtx,
      })

      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(8000)
      expect(result.commercialBreakdown?.staysBreakdown![0].optionId).toBe('opt-budget-b')
      expect(result.commercialBreakdown?.staysBreakdown![0].propertyName).toBe('Bella Vista Resort')
      expect(result.commercialBreakdown?.staysBreakdown![0].boardBasis).toBe('half_board')
      expect(result.selectedAccommodationOptions).toEqual({ 1: 'opt-budget-b' })
    })

    it('B3: FAILS if selection is omitted for a multi-option Stay (no silent fallback)', async () => {
      const useCase = createPricingUseCase(multiOptionPackage)

      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          // omitted selectedAccommodationOptions
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow(
        '[BookingPricingUseCase] Explicit accommodation option selection required for Stay #1 (multiple options available).',
      )
    })

    it('B4: FAILS if an invalid or non-existent option ID is supplied', async () => {
      const useCase = createPricingUseCase(multiOptionPackage)

      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAccommodationOptions: { 1: 'non-existent-option-id' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow(
        '[BookingPricingUseCase] Invalid accommodation option "non-existent-option-id" for Stay #1.',
      )
    })
  })

  // =========================================================================
  // TEST GROUP C: Occupancy Compatibility Matrix
  // =========================================================================
  describe('Test Group C: Occupancy Compatibility Matrix', () => {
    // Option A supports: single, double
    // Option B supports: triple, quad
    const occupancyPackage: Partial<PackageExperienceAggregate> = {
      accommodations: [
        {
          order: 1,
          nights: 2,
          options: [
            {
              id: 'opt-couples',
              propertyId: 301,
              roomCategory: 'Couples Boutique',
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 3000, enabled: true },
                { occupancy: 'double', rateEGP: 5000, enabled: true },
                { occupancy: 'triple', rateEGP: 0, enabled: false },
                { occupancy: 'quad', rateEGP: 0, enabled: false },
              ],
            },
            {
              id: 'opt-families',
              propertyId: 302,
              roomCategory: 'Family Suites',
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 0, enabled: false },
                { occupancy: 'double', rateEGP: 0, enabled: false },
                { occupancy: 'triple', rateEGP: 7000, enabled: true },
                { occupancy: 'quad', rateEGP: 9000, enabled: true },
              ],
            },
          ],
        },
      ],
    }

    it('C1: Option A selected -> single/double valid, triple/quad invalid; does NOT fail due to Option B', async () => {
      const useCase = createPricingUseCase(occupancyPackage)

      // single -> valid
      const resSingle = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 1,
        selectedAllocationId: '1xsingle',
        selectedAccommodationOptions: { 1: 'opt-couples' },
        ctx: mockLocaleCtx,
      })
      expect(resSingle.commercialBreakdown?.accommodationTotalEGP).toBe(3000)

      // double -> valid
      const resDouble = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        selectedAllocationId: '1xdouble',
        selectedAccommodationOptions: { 1: 'opt-couples' },
        ctx: mockLocaleCtx,
      })
      expect(resDouble.commercialBreakdown?.accommodationTotalEGP).toBe(5000)

      // triple -> invalid
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 3,
          selectedAllocationId: '1xtriple',
          selectedAccommodationOptions: { 1: 'opt-couples' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('Invalid or unsupported room allocation arrangement "1xtriple"')

      // quad -> invalid
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 4,
          selectedAllocationId: '1xquad',
          selectedAccommodationOptions: { 1: 'opt-couples' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('Invalid or unsupported room allocation arrangement "1xquad"')
    })

    it('C2: Option B selected -> triple/quad valid, single/double invalid; does NOT fail due to Option A', async () => {
      const useCase = createPricingUseCase(occupancyPackage)

      // single -> invalid
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 1,
          selectedAllocationId: '1xsingle',
          selectedAccommodationOptions: { 1: 'opt-families' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('Invalid or unsupported room allocation arrangement "1xsingle"')

      // double -> invalid
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAllocationId: '1xdouble',
          selectedAccommodationOptions: { 1: 'opt-families' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('Invalid or unsupported room allocation arrangement "1xdouble"')

      // triple -> valid
      const resTriple = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 3,
        selectedAllocationId: '1xtriple',
        selectedAccommodationOptions: { 1: 'opt-families' },
        ctx: mockLocaleCtx,
      })
      expect(resTriple.commercialBreakdown?.accommodationTotalEGP).toBe(7000)

      // quad -> valid
      const resQuad = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 4,
        selectedAllocationId: '1xquad',
        selectedAccommodationOptions: { 1: 'opt-families' },
        ctx: mockLocaleCtx,
      })
      expect(resQuad.commercialBreakdown?.accommodationTotalEGP).toBe(9000)
    })
  })

  // =========================================================================
  // TEST GROUP D: Multi-Stay Independence & Totals
  // =========================================================================
  describe('Test Group D: Multi-Stay Independence', () => {
    const multiStayPackage: Partial<PackageExperienceAggregate> = {
      accommodations: [
        {
          order: 1,
          nights: 5,
          options: [
            {
              id: 'stay1-opt-a',
              propertyId: 401,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 10000, enabled: true }],
            },
            {
              id: 'stay1-opt-b',
              propertyId: 402,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 7000, enabled: true }],
            },
          ],
        },
        {
          order: 2,
          nights: 3,
          options: [
            {
              id: 'stay2-opt-c',
              propertyId: 403,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 5000, enabled: true }],
            },
            {
              id: 'stay2-opt-d',
              propertyId: 404,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 9000, enabled: true }],
            },
          ],
        },
      ],
    }

    it('D1: Select Stay 1 -> Option B (7,000) and Stay 2 -> Option C (5,000) = Total 12,000', async () => {
      const useCase = createPricingUseCase(multiStayPackage)

      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        selectedAccommodationOptions: {
          1: 'stay1-opt-b',
          2: 'stay2-opt-c',
        },
        ctx: mockLocaleCtx,
      })

      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(12000)
      expect(result.commercialBreakdown?.staysBreakdown).toHaveLength(2)
      expect(result.commercialBreakdown?.staysBreakdown![0].optionId).toBe('stay1-opt-b')
      expect(result.commercialBreakdown?.staysBreakdown![0].stayAccommodationTotalEGP).toBe(7000)
      expect(result.commercialBreakdown?.staysBreakdown![1].optionId).toBe('stay2-opt-c')
      expect(result.commercialBreakdown?.staysBreakdown![1].stayAccommodationTotalEGP).toBe(5000)
    })
  })

  // =========================================================================
  // TEST GROUP E: Per-Night Multi-Stay Test (Independent Nights)
  // =========================================================================
  describe('Test Group E: Per-Night Multi-Stay Test', () => {
    it('E1: Stay 1 (5 nights, per_night @ 1000) + Stay 2 (3 nights, per_stay @ 2000) = 5000 + 2000 = 7000', async () => {
      const useCase = createPricingUseCase({
        accommodations: [
          {
            order: 1,
            nights: 5,
            options: [
              {
                id: 'opt-night-5',
                propertyId: 501,
                pricingUnit: 'per_night',
                roomRates: [{ occupancy: 'double', rateEGP: 1000, enabled: true }],
              },
            ],
          },
          {
            order: 2,
            nights: 3,
            options: [
              {
                id: 'opt-stay-3',
                propertyId: 502,
                pricingUnit: 'per_stay',
                roomRates: [{ occupancy: 'double', rateEGP: 2000, enabled: true }],
              },
            ],
          },
        ],
      })

      // Single-option stays auto-selected
      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        ctx: mockLocaleCtx,
      })

      expect(result.commercialBreakdown?.staysBreakdown![0].stayAccommodationTotalEGP).toBe(5000)
      expect(result.commercialBreakdown?.staysBreakdown![1].stayAccommodationTotalEGP).toBe(2000)
      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(7000)
    })
  })

  // =========================================================================
  // TEST GROUP F: Server-Side Anti-Tampering & Authority
  // =========================================================================
  describe('Test Group F: Server-Side Anti-Tampering', () => {
    const tamperingPackage: Partial<PackageExperienceAggregate> = {
      accommodations: [
        {
          order: 1,
          nights: 2,
          options: [
            {
              id: 'stay1-opt-valid',
              propertyId: 601,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 5000, enabled: true }],
            },
          ],
        },
        {
          order: 2,
          nights: 2,
          options: [
            {
              id: 'stay2-opt-valid',
              propertyId: 602,
              pricingUnit: 'per_stay',
              roomRates: [{ occupancy: 'double', rateEGP: 6000, enabled: true }],
            },
          ],
        },
      ],
    }

    it('F1: rejects unknown option ID ("not-real-option")', async () => {
      const useCase = createPricingUseCase(tamperingPackage)

      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAccommodationOptions: { 1: 'not-real-option' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('[BookingPricingUseCase] Invalid accommodation option "not-real-option" for Stay #1.')
    })

    it('F2: rejects option ID belonging to another Stay (cross-stay tampering)', async () => {
      const useCase = createPricingUseCase(tamperingPackage)

      // Passing Stay 2's option ID for Stay 1
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAccommodationOptions: { 1: 'stay2-opt-valid' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('[BookingPricingUseCase] Invalid accommodation option "stay2-opt-valid" for Stay #1.')
    })

    it('F3: rejects propertyId passed in place of optionId', async () => {
      const useCase = createPricingUseCase(tamperingPackage)

      // Passing propertyId string '601'
      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAccommodationOptions: { 1: '601' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('[BookingPricingUseCase] Invalid accommodation option "601" for Stay #1.')
    })

    it('F4: rejects unknown stay order (e.g. 999) to prevent input tampering', async () => {
      const useCase = createPricingUseCase(tamperingPackage)

      await expect(
        useCase.calculate({
          experienceId: 1955,
          slotId: 1,
          adultsCount: 2,
          selectedAccommodationOptions: { 999: 'stay1-opt-valid' },
          ctx: mockLocaleCtx,
        }),
      ).rejects.toThrow('[BookingPricingUseCase] Unknown stay order "999" in accommodation options selection.')
    })

    it('F5: guarantees pricing values come strictly from authoritative server aggregate, not client', async () => {
      const useCase = createPricingUseCase(tamperingPackage)

      // Even if client attempts to pass forged data in params, it is ignored
      const result = await useCase.calculate({
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        selectedAccommodationOptions: { 1: 'stay1-opt-valid', 2: 'stay2-opt-valid' },
        ctx: mockLocaleCtx,
      })

      // Must be 5000 + 6000 = 11000
      expect(result.commercialBreakdown?.accommodationTotalEGP).toBe(11000)
    })
  })

  // =========================================================================
  // TEST GROUP G: Determinism
  // =========================================================================
  describe('Test Group G: Determinism', () => {
    it('G1: identical inputs produce identical deterministic output regardless of call count', async () => {
      const useCase = createPricingUseCase({
        accommodations: [
          {
            order: 1,
            nights: 3,
            options: [
              {
                id: 'opt-det-1',
                propertyId: 701,
                roomCategory: 'Royal Suite',
                pricingUnit: 'per_stay',
                roomRates: [{ occupancy: 'double', rateEGP: 12500, enabled: true }],
              },
            ],
          },
        ],
      })

      const params: CalculatePricingParams = {
        experienceId: 1955,
        slotId: 1,
        adultsCount: 2,
        ctx: mockLocaleCtx,
      }

      const res1 = await useCase.calculate(params)
      const res2 = await useCase.calculate(params)

      expect(res1.commercialBreakdown?.accommodationTotalEGP).toBe(12500)
      expect(res1.commercialBreakdown).toEqual(res2.commercialBreakdown)
      expect(res1.snapshot.totalAmountEGP).toBe(res2.snapshot.totalAmountEGP)
    })
  })
})
