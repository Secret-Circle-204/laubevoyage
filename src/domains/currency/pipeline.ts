import { CurrencyCode } from '@/types'
import type { PricingResult, CurrencySnapshot } from '@/types/locale'
import { CurrencyService } from './service'
import { roundForCurrency } from './rounding'

/**
 * Pricing Pipeline
 *
 * Sequential stages for computing a display-ready price:
 * 1. Base Price (EGP)
 * 2. Promotion Resolver (seasonal discounts)
 * 3. Coupon Apply
 * 4. Loyalty Discount (redeemed points)
 * 5. Rate Resolver (exchange rate)
 * 6. Rounding Policy (currency-specific decimals)
 * 7. Currency Formatter (localized string)
 *
 * The frontend never sees priceEGP. It only receives PricingResult.
 */
export class PricingPipeline {
  private currencyService: CurrencyService

  constructor(currencyService: CurrencyService) {
    this.currencyService = currencyService
  }

  /**
   * Execute the full pricing pipeline.
   * Returns a display-ready PricingResult for the frontend.
   */
  async execute(params: {
    basePriceEGP: number
    promotionDiscount?: number   // absolute EGP discount from promotions
    couponDiscount?: number      // absolute EGP discount from coupons
    loyaltyDiscount?: number     // absolute EGP value of redeemed points
    targetCurrency: CurrencyCode
    locale?: string
  }): Promise<PricingResult & { netPriceEGP: number; exchangeRate: number }> {
    // Stage 1-4: Calculate net price in EGP after all discounts
    let netPriceEGP = params.basePriceEGP
    netPriceEGP -= (params.promotionDiscount || 0)
    netPriceEGP -= (params.couponDiscount || 0)
    netPriceEGP -= (params.loyaltyDiscount || 0)
    netPriceEGP = Math.max(0, netPriceEGP) // Never go negative

    // Stage 5: Rate Resolver
    let exchangeRate = 1
    let displayPrice = netPriceEGP

    if (params.targetCurrency !== CurrencyCode.EGP) {
      exchangeRate = await this.currencyService.getRate(
        CurrencyCode.EGP,
        params.targetCurrency,
      )
      displayPrice = netPriceEGP * exchangeRate
    }

    // Stage 6: Rounding Policy
    displayPrice = roundForCurrency(displayPrice, params.targetCurrency)

    // Stage 7: Currency Formatter
    const locale = params.locale || 'en'
    const formattedPrice = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: params.targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayPrice)

    return {
      netPriceEGP,
      exchangeRate,
      displayPrice,
      displayCurrency: params.targetCurrency,
      formattedPrice,
    }
  }

  /**
   * Generate a frozen CurrencySnapshot for booking persistence.
   * This snapshot is stored alongside the booking to prevent
   * retroactive price changes when exchange rates fluctuate.
   */
  async createSnapshot(
    basePriceEGP: number,
    targetCurrency: CurrencyCode,
  ): Promise<CurrencySnapshot> {
    let exchangeRate = 1
    let displayAmount = basePriceEGP

    if (targetCurrency !== CurrencyCode.EGP) {
      exchangeRate = await this.currencyService.getRate(CurrencyCode.EGP, targetCurrency)
      displayAmount = roundForCurrency(basePriceEGP * exchangeRate, targetCurrency)
    }

    return {
      basePriceEGP,
      exchangeRateUsed: exchangeRate,
      displayAmount,
      displayCurrency: targetCurrency,
    }
  }
}
