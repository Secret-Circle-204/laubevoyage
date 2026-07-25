export interface ConvertedPrice {
  baseAmountEGP: number
  convertedAmount: number
  currencyCode: string
  currencySymbol: string
  formatted: string
  exchangeRate: number
  decimals: number
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

