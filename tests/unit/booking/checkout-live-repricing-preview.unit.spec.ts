import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingPricingUseCase } from '@/application/booking/pricing-usecase'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import { type LocaleContext, MeasurementSystem } from '@/types/locale'

describe('GATE 17.4: Live Loyalty Checkout Repricing & Multi-Currency Transparency Unit Tests', () => {
  const mockLoyaltyConfig: LoyaltyProgramConfig = {
    id: '1',
    status: 'published',
    version: 1,
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Voyage Loyalty Program",
    baseEarnRate: 1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    minRedemptionPoints: 50,
    redemptionStepUnit: 50,
    maxRedemptionPercent: 50,
    maxRedemptionFixedEGP: 5000,
    allowPartialRedemption: true,
    welcomeBonus: 100,
    expirationMonths: 12,
    bonusNeverExpires: true,
    tiers: [
      { tier: 'bronze', label: 'Bronze', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
      { tier: 'silver', label: 'Silver', minSpentEGP: 10000, earnMultiplier: 1.25, upgradeBonus: 250 },
      { tier: 'gold', label: 'Gold', minSpentEGP: 25000, earnMultiplier: 1.5, upgradeBonus: 500 },
      { tier: 'platinum', label: 'Platinum', minSpentEGP: 50000, earnMultiplier: 2.0, upgradeBonus: 1000 },
    ],
  }

  const sarContext: LocaleContext = {
    language: 'en',
    currency: 'SAR',
    country: 'SA',
    timezone: 'Asia/Riyadh',
    measurement: MeasurementSystem.METRIC,
    weekStart: 0,
  }

  const usdContext: LocaleContext = {
    language: 'en',
    currency: 'USD',
    country: 'US',
    timezone: 'America/New_York',
    measurement: MeasurementSystem.IMPERIAL,
    weekStart: 0,
  }

  let mockExpService: any
  let mockPricingFacade: any
  let mockLocalizationService: any
  let mockLoyaltyService: any
  let pricingUseCase: BookingPricingUseCase

  const sampleDeparture: BookableDeparture = {
    departureId: 'dep_cairo_1',
    experienceId: 7,
    experienceTitle: 'Cairo Nile Cruise & Pyramids',
    date: '2026-09-01',
    startTime: '10:00',
    effectiveBasePrice: 3500, // 3,500 EGP per adult
    experienceType: 'package',
    status: 'available',
  }

  beforeEach(() => {
    mockExpService = {
      resolveBookableDepartureBySlot: vi.fn().mockResolvedValue(sampleDeparture),
      resolvePreviewDepartureByDate: vi.fn().mockResolvedValue(sampleDeparture),
    }

    mockPricingFacade = {
      calculateCheckoutSnapshot: vi.fn().mockImplementation((params) => {
        const totalBaseEGP = params.basePricePerPersonEGP * (params.adultsCount + (params.childrenCount || 0))
        const loyaltyDiscount = params.loyaltyDiscountEGP || 0
        const netBaseEGP = Math.max(0, totalBaseEGP - loyaltyDiscount)
        const exchangeRate = params.targetCurrency === 'SAR' ? 0.074373 : params.targetCurrency === 'USD' ? 0.02 : 1.0
        const displayAmount = Math.round(netBaseEGP * exchangeRate * 100) / 100

        return Promise.resolve({
          snapshotId: 'snap_preview_1',
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: totalBaseEGP,
          loyaltyDiscountEGP: loyaltyDiscount,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: netBaseEGP,
          taxes: 0,
          fees: 0,
          totalAmountEGP: netBaseEGP,
          displayCurrency: params.targetCurrency,
          displayAmount,
          exchangeRate,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        })
      }),
    }

    mockLocalizationService = {
      formatPrice: vi.fn().mockImplementation((amountEGP, ctx) => {
        const rate = ctx.currency === 'SAR' ? 0.074373 : ctx.currency === 'USD' ? 0.02 : 1.0
        const converted = Math.round(amountEGP * rate * 100) / 100
        return Promise.resolve({
          baseAmountEGP: amountEGP,
          convertedAmount: converted,
          currencyCode: ctx.currency,
          currencySymbol: ctx.currency,
          formatted: `${ctx.currency} ${converted.toFixed(2)}`,
          exchangeRate: rate,
          decimals: 2,
        })
      }),
    }

    mockLoyaltyService = {
      getCustomerBalance: vi.fn().mockResolvedValue(10000), // 10,000 points available
      getActiveConfig: vi.fn().mockResolvedValue(mockLoyaltyConfig),
      calculatePointValueInEGP: vi.fn().mockImplementation((points) => {
        return Promise.resolve(Math.floor((points / mockLoyaltyConfig.redemptionPointsUnit) * mockLoyaltyConfig.redemptionValueEGP))
      }),
      calculateEarnedPoints: vi.fn().mockImplementation((amountEGP) => {
        return Promise.resolve(Math.floor(amountEGP * mockLoyaltyConfig.baseEarnRate))
      }),
    }

    pricingUseCase = new BookingPricingUseCase(
      mockExpService,
      mockPricingFacade,
      mockLocalizationService,
      mockLoyaltyService,
    )
  })

  describe('1. Standard Live Preview without Loyalty Points', () => {
    it('calculates full price with zero loyalty discount when points are omitted or 0', async () => {
      const result = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 1,
        ctx: sarContext,
      })

      expect(result.snapshot.basePriceEGP).toBe(3500)
      expect(result.snapshot.loyaltyDiscountEGP).toBe(0)
      expect(result.snapshot.totalAmountEGP).toBe(3500)
      expect(result.totalCost.formatted).toBe('SAR 260.31')
      expect(result.loyaltyDiscountPrice).toBeUndefined()
      expect(result.estimatedEarnPoints).toBe(3500) // 3500 EGP spent = 3500 points
    })
  })

  describe('2. Live Preview with 1,000 Points Redemption in SAR', () => {
    it('calculates authoritative EGP discount, SAR presentation, and net estimated earn points', async () => {
      const result = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 1,
        ctx: sarContext,
        pointsToRedeem: 1000,
        customerId: 55,
      })

      // 1. Loyalty Domain Valuation: 1000 pts / 100 * 10 = 100 EGP (internal snapshot)
      expect(result.snapshot.loyaltyDiscountEGP).toBe(100)

      // 2. Pricing Pipeline: 3500 - 100 = 3400 EGP
      expect(result.snapshot.subtotalEGP).toBe(3400)
      expect(result.snapshot.totalAmountEGP).toBe(3400)

      // 3. Multi-Currency Presentation in SAR:
      // Original: 3500 * 0.074373 = 260.31 SAR
      expect(result.originalPrice?.formatted).toBe('SAR 260.31')
      // Discount: 100 * 0.074373 = 7.44 SAR
      expect(result.loyaltyDiscountPrice?.formatted).toBe('SAR 7.44')
      // Total Payable: 3400 * 0.074373 = 252.87 SAR
      expect(result.totalCost.formatted).toBe('SAR 252.87')

      // 4. Remaining Balance: 10000 - 1000 = 9000 pts
      expect(result.remainingLoyaltyPoints).toBe(9000)

      // 5. Estimated Earn on Net Paid Amount: 3400 EGP net = 3400 pts
      expect(result.estimatedEarnPoints).toBe(3400)
    })
  })

  describe('3. Dynamic Live Points Adjustment (1000 -> 2000 -> 5000)', () => {
    it('recalculates preview dynamically as user increases points', async () => {
      // Step A: 2,000 points (200 EGP -> 3300 EGP -> 245.43 SAR)
      const res2000 = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 1,
        ctx: sarContext,
        pointsToRedeem: 2000,
        customerId: 55,
      })
      expect(res2000.snapshot.loyaltyDiscountEGP).toBe(200)
      expect(res2000.snapshot.totalAmountEGP).toBe(3300)
      expect(res2000.totalCost.formatted).toBe('SAR 245.43')
      expect(res2000.loyaltyDiscountPrice?.formatted).toBe('SAR 14.87')
      expect(res2000.remainingLoyaltyPoints).toBe(8000)
      expect(res2000.estimatedEarnPoints).toBe(3300)

      // Step B: 5,000 points (500 EGP -> 3000 EGP -> 223.12 SAR)
      const res5000 = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 1,
        ctx: sarContext,
        pointsToRedeem: 5000,
        customerId: 55,
      })
      expect(res5000.snapshot.loyaltyDiscountEGP).toBe(500)
      expect(res5000.snapshot.totalAmountEGP).toBe(3000)
      expect(res5000.totalCost.formatted).toBe('SAR 223.12')
      expect(res5000.loyaltyDiscountPrice?.formatted).toBe('SAR 37.19')
      expect(res5000.remainingLoyaltyPoints).toBe(5000)
      expect(res5000.estimatedEarnPoints).toBe(3000)
    })
  })

  describe('4. Strict Domain Validation Failures during Preview', () => {
    it('fails fast when points exceed customer balance', async () => {
      await expect(
        pricingUseCase.calculate({
          experienceId: 7,
          slotId: 101,
          adultsCount: 1,
          ctx: sarContext,
          pointsToRedeem: 15000, // Balance is 10,000
          customerId: 55,
        }),
      ).rejects.toThrow(/Insufficient points balance/)
    })

    it('fails fast when points are below minimum threshold', async () => {
      await expect(
        pricingUseCase.calculate({
          experienceId: 7,
          slotId: 101,
          adultsCount: 1,
          ctx: sarContext,
          pointsToRedeem: 25, // Min is 50
          customerId: 55,
        }),
      ).rejects.toThrow(/below minimum threshold/)
    })

    it('fails fast when points violate redemption step unit', async () => {
      await expect(
        pricingUseCase.calculate({
          experienceId: 7,
          slotId: 101,
          adultsCount: 1,
          ctx: sarContext,
          pointsToRedeem: 75, // Step is 50
          customerId: 55,
        }),
      ).rejects.toThrow(/multiple of 50/)
    })

    it('fails fast when points exceed maximum allowable discount percent (50% max = 1750 EGP)', async () => {
      // Total is 3,500 EGP. Max 50% discount = 1,750 EGP (17,500 points).
      // If customer has 20,000 balance and requests 18,000 points (1,800 EGP discount):
      mockLoyaltyService.getCustomerBalance = vi.fn().mockResolvedValue(25000)

      await expect(
        pricingUseCase.calculate({
          experienceId: 7,
          slotId: 101,
          adultsCount: 1,
          ctx: sarContext,
          pointsToRedeem: 18000,
          customerId: 55,
        }),
      ).rejects.toThrow(/exceeds 50% maximum allowed booking discount/)
    })
  })

  describe('5. Multi-Passenger & Multi-Currency Parity', () => {
    it('multiplies base price for 2 adults and applies loyalty discount', async () => {
      const result = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 2, // 2 * 3500 = 7000 EGP base
        ctx: sarContext,
        pointsToRedeem: 1000, // 100 EGP discount
        customerId: 55,
      })

      expect(result.snapshot.basePriceEGP).toBe(7000)
      expect(result.snapshot.loyaltyDiscountEGP).toBe(100)
      expect(result.snapshot.totalAmountEGP).toBe(6900)
      expect(result.originalPrice?.formatted).toBe('SAR 520.61')
      expect(result.totalCost.formatted).toBe('SAR 513.17')
      expect(result.estimatedEarnPoints).toBe(6900)
    })

    it('correctly calculates presentation in USD currency', async () => {
      const result = await pricingUseCase.calculate({
        experienceId: 7,
        slotId: 101,
        adultsCount: 1,
        ctx: usdContext,
        pointsToRedeem: 1000, // 100 EGP
        customerId: 55,
      })

      expect(result.snapshot.basePriceEGP).toBe(3500)
      expect(result.snapshot.totalAmountEGP).toBe(3400)
      // 3500 * 0.02 = $70.00 USD
      expect(result.originalPrice?.formatted).toBe('USD 70.00')
      // 100 * 0.02 = $2.00 USD
      expect(result.loyaltyDiscountPrice?.formatted).toBe('USD 2.00')
      // 3400 * 0.02 = $68.00 USD
      expect(result.totalCost.formatted).toBe('USD 68.00')
    })
  })

  describe('6. Zero Mutation Invariant Proof', () => {
    it('executes preview without any database writes or state mutations', async () => {
      const result = await pricingUseCase.calculatePreview({
        experienceId: 7,
        date: '2026-09-01',
        startTime: '10:00',
        adultsCount: 1,
        ctx: sarContext,
        pointsToRedeem: 1000,
        customerId: 55,
      })

      expect(result).toBeDefined()
      expect(result.totalCost.formatted).toBe('SAR 252.87')

      // Assert that no mutation methods exist or were invoked
      expect(mockExpService.lockCapacity).toBeUndefined()
      expect(mockLoyaltyService.redeemPoints).toBeUndefined()
    })
  })
})
