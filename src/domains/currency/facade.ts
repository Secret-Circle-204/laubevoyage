import { catalogRegistry } from './catalog-registry'
import { PricingPipeline } from './pipeline'
import { roundForCurrency } from './rounding'
import type { ConvertedPrice } from './types'

/**
 * Pricing Facade
 * Orchestrates pipeline calculation, database-driven catalog lookups for symbol/decimals,
 * central rounding policy application, and dynamic standard presentation formatting.
 */
export class PricingFacade {
  private pricingPipeline: PricingPipeline

  constructor(pricingPipeline: PricingPipeline) {
    this.pricingPipeline = pricingPipeline
  }

  async getConvertedPrice(
    basePriceEGP: number,
    targetCurrency: string,
    locale: string = 'en',
  ): Promise<ConvertedPrice> {
    const currency = targetCurrency.toUpperCase()

    // 1. Calculate price via the Pipeline (Base -> VAT -> Convert)
    const { snapshot } = await this.pricingPipeline.execute({
      basePriceEGP,
      targetCurrency: currency,
    })

    // 2. Fetch symbol and decimals from catalog registry
    const currencyIdentity = await catalogRegistry.get(currency)
    const symbol = currencyIdentity?.symbol || currency
    const decimals = currencyIdentity?.decimals !== undefined ? currencyIdentity.decimals : 2

    // 3. Central Rounding Policy
    const roundedAmount = await roundForCurrency(snapshot.displayAmount, currency)

    // 4. Dynamic Presentation Formatting (Decouple Display Decimals from Payment Decimals)
    const displayDecimals = (currency === 'EGP' && roundedAmount % 1 === 0) ? 0 : decimals

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: displayDecimals,
      maximumFractionDigits: displayDecimals,
    }).format(roundedAmount)

    return {
      baseAmountEGP: basePriceEGP,
      convertedAmount: roundedAmount,
      currencyCode: currency,
      currencySymbol: symbol,
      formatted,
      exchangeRate: snapshot.exchangeRate,
      decimals,
    }
  }

  /**
   * Calculate pricing snapshot for checkout based on travelers count and loyalty redemption.
   */
  async calculateCheckoutSnapshot(params: {
    basePricePerPersonEGP: number
    adultsCount: number
    childrenCount: number
    targetCurrency: string
    loyaltyDiscountEGP?: number
  }) {
    const totalBaseEGP = params.basePricePerPersonEGP * params.adultsCount
    const { snapshot } = await this.pricingPipeline.execute({
      basePriceEGP: totalBaseEGP,
      targetCurrency: params.targetCurrency.toUpperCase(),
      loyaltyDiscount: params.loyaltyDiscountEGP,
    })
    return snapshot
  }
}
