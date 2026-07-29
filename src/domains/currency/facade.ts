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

  /**
   * Currency Domain Public API: Resolves display currency against active CMS catalog.
   * Relocates country-to-currency mapping to Currency Domain.
   */
  async resolveDisplayCurrency(params?: {
    cookieCurrency?: string
    sessionCurrency?: string
    geoCountry?: string
    geoCurrencyCode?: string
    languagePreferredCurrencyCode?: string
  } | string): Promise<string> {
    const raw = typeof params === 'string' ? { cookieCurrency: params } : params || {}
    const activeCurrencies = await catalogRegistry.getAll()
    if (activeCurrencies.length === 0) {
      throw new Error('FATAL CONFIGURATION ERROR: No active currencies are configured in the CMS.')
    }

    const defaultCurrencies = activeCurrencies.filter((c) => c.isDefault)
    if (defaultCurrencies.length === 0) {
      throw new Error('FATAL CONFIGURATION ERROR: No default currency is configured in the CMS (isDefault = true).')
    }
    if (defaultCurrencies.length > 1) {
      throw new Error(
        `FATAL CONFIGURATION ERROR: Multiple default currencies configured in the CMS: ${defaultCurrencies
          .map((c) => c.isoCode)
          .join(', ')}. Exactly one is allowed.`
      )
    }

    const supportedCodes = new Set(activeCurrencies.map((c) => c.isoCode.toUpperCase()))

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CurrencyService] cookieCurrency =', raw.cookieCurrency)
      console.log('[CurrencyService] sessionCurrency =', raw.sessionCurrency)
      console.log('[CurrencyService] languagePreferredCurrencyCode =', raw.languagePreferredCurrencyCode)
      console.log('[CurrencyService] geoCurrencyCode =', raw.geoCurrencyCode)
      console.log('[CurrencyService] defaultCurrency =', defaultCurrencies[0].isoCode.toUpperCase())
    }

    // 1. Cookie Currency preference
    if (raw.cookieCurrency) {
      const cookieCurrUpper = raw.cookieCurrency.trim().toUpperCase()
      if (supportedCodes.has(cookieCurrUpper)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CurrencyService] chosenCurrency = "${cookieCurrUpper}", reason = "Cookie preference"`)
        }
        return cookieCurrUpper
      }
    }

    // 2. Session Currency preference
    if (raw.sessionCurrency) {
      const sessionCurrUpper = raw.sessionCurrency.trim().toUpperCase()
      if (supportedCodes.has(sessionCurrUpper)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CurrencyService] chosenCurrency = "${sessionCurrUpper}", reason = "Session preference"`)
        }
        return sessionCurrUpper
      }
    }

    // 3. Language Preferred Currency
    if (raw.languagePreferredCurrencyCode) {
      const langCurrUpper = raw.languagePreferredCurrencyCode.trim().toUpperCase()
      if (supportedCodes.has(langCurrUpper)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CurrencyService] chosenCurrency = "${langCurrUpper}", reason = "Language Preferred Currency"`)
        }
        return langCurrUpper
      }
    }

    // 4. Geo Currency Code preference
    if (raw.geoCurrencyCode) {
      const geoCurrUpper = raw.geoCurrencyCode.trim().toUpperCase()
      if (supportedCodes.has(geoCurrUpper)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CurrencyService] chosenCurrency = "${geoCurrUpper}", reason = "Geo Currency Code preference"`)
        }
        return geoCurrUpper
      }
    }

    const fallback = defaultCurrencies[0].isoCode.toUpperCase()
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CurrencyService] chosenCurrency = "${fallback}", reason = "CMS Default fallback"`)
    }
    return fallback
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
