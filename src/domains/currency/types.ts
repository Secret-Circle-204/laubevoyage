export interface ConvertedPrice {
  baseAmountEGP: number
  convertedAmount: number
  currencyCode: string
  currencySymbol: string
  formatted: string
  exchangeRate: number
  decimals: number
}

export interface PricingCalculationResult {
  snapshotId: string
  snapshotVersion: string
  pricingRuleVersion: string
  exchangeRateVersion: string
  basePriceEGP: number
  loyaltyDiscountEGP: number
  promotionDiscountEGP: number
  couponDiscountEGP: number
  subtotalEGP: number
  taxes: number
  fees: number
  totalAmountEGP: number
  displayCurrency: string
  displayAmount: number
  exchangeRate: number
  exchangeRateTimestamp: string
  auditTrace?: Array<{ stepName: string; amountChangeEGP: number; reason: string; resultingSubtotalEGP: number }>
  calculatedAt: string
}

/**
 * Custom error thrown when an exchange rate is completely unavailable
 */
export class ExchangeRateUnavailableError extends Error {
  constructor(fromCurrency: string, toCurrency: string, reason?: string) {
    super(`Exchange rate unavailable for conversion from ${fromCurrency} to ${toCurrency}${reason ? `: ${reason}` : ''}`)
    this.name = 'ExchangeRateUnavailableError'
  }
}


