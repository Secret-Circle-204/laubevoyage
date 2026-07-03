import type { CurrencyCode } from '@/types'
import { rateRegistry } from './rate-registry'
import { catalogRegistry } from './catalog-registry'
import { roundForCurrency, getCurrencyDecimals } from './rounding'

export interface PricingSnapshot {
  version: number
  basePriceEGP: number
  promotionDiscountEGP: number
  couponDiscountEGP: number
  loyaltyDiscountEGP: number
  subtotalEGP: number
  taxes: number
  fees: number
  totalAmountEGP: number
  displayCurrency: string
  displayAmount: number
  exchangeRate: number
  exchangeProvider: string
  exchangeRateTimestamp: Date | null
  roundingStrategy: string
  currencyDecimals: number
  createdAt: Date
}

export interface PricingResult {
  snapshot: PricingSnapshot
  formattedPrice: string
}

/**
 * Pricing Pipeline
 *
 * Strict execution order:
 * Package -> Pricing Domain -> Discount Engine -> Coupon Engine -> Loyalty Engine -> Tax Engine -> Pricing Snapshot -> Stripe Adapter
 */
export class PricingPipeline {
  /**
   * Execute the full pricing pipeline.
   * Returns a display-ready PricingResult and the exhaustive Immutable Snapshot.
   */
  async execute(params: {
    basePriceEGP: number
    promotionDiscount?: number
    couponDiscount?: number
    loyaltyDiscount?: number
    taxes?: number
    fees?: number
    targetCurrency: CurrencyCode
    locale?: string
  }): Promise<PricingResult> {
    // 1. Core calculation in EGP
    const promotionDiscountEGP = params.promotionDiscount || 0
    const couponDiscountEGP = params.couponDiscount || 0
    const loyaltyDiscountEGP = params.loyaltyDiscount || 0
    
    let subtotalEGP = params.basePriceEGP - promotionDiscountEGP - couponDiscountEGP - loyaltyDiscountEGP
    subtotalEGP = Math.max(0, subtotalEGP) // Never go negative

    const taxesEGP = params.taxes || 0
    const feesEGP = params.fees || 0
    const totalAmountEGP = subtotalEGP + taxesEGP + feesEGP

    // 2. Rate Resolver (from Rate Registry)
    let exchangeRate = 1
    let exchangeProvider = 'System'
    let exchangeRateTimestamp: Date | null = new Date()
    
    if (params.targetCurrency !== 'EGP') {
      const rateData = await rateRegistry.getRate(params.targetCurrency)
      if (rateData) {
        exchangeRate = rateData.rate
        exchangeProvider = rateData.source
        exchangeRateTimestamp = new Date(rateData.lastUpdate)
      } else {
        // Fallback if not found in registry (shouldn't happen in prod if cron ran)
        console.warn(`[PricingPipeline] Rate not found for ${params.targetCurrency}. Defaulting to 1.`)
      }
    }

    // 3. Conversion & Rounding
    const unroundedDisplayAmount = totalAmountEGP * exchangeRate
    const displayAmount = await roundForCurrency(unroundedDisplayAmount, params.targetCurrency)
    const currencyDecimals = await getCurrencyDecimals(params.targetCurrency)

    // 4. Create the Immutable Snapshot
    const snapshot: PricingSnapshot = {
      version: 1,
      basePriceEGP: params.basePriceEGP,
      promotionDiscountEGP,
      couponDiscountEGP,
      loyaltyDiscountEGP,
      subtotalEGP,
      taxes: taxesEGP,
      fees: feesEGP,
      totalAmountEGP,
      displayCurrency: params.targetCurrency,
      displayAmount,
      exchangeRate,
      exchangeProvider,
      exchangeRateTimestamp,
      roundingStrategy: 'HALF_UP',
      currencyDecimals,
      createdAt: new Date(),
    }

    // 5. Currency Formatter (Localized String)
    const locale = params.locale || 'en-US'
    const formattedPrice = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: params.targetCurrency,
      minimumFractionDigits: currencyDecimals,
      maximumFractionDigits: currencyDecimals,
    }).format(displayAmount)

    return {
      snapshot,
      formattedPrice,
    }
  }
}
