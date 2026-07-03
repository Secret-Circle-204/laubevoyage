import { CurrencyCode } from '@/types'

/**
 * Currency Rounding Policy
 *
 * Different currencies have different decimal rules:
 * - JPY, KRW: zero decimals
 * - USD, EUR, EGP, AED, SAR: two decimals
 *
 * Stripe requires amounts in the smallest currency unit (e.g. cents).
 * This module ensures amounts are rounded correctly before display and payment.
 */

/** Map of currencies to their decimal precision */
const CURRENCY_DECIMALS: Record<string, number> = {
  [CurrencyCode.EGP]: 2,
  [CurrencyCode.USD]: 2,
  [CurrencyCode.EUR]: 2,
  [CurrencyCode.AED]: 2,
  [CurrencyCode.SAR]: 2,
}

/**
 * Round an amount according to the target currency's decimal rules.
 */
export function roundForCurrency(amount: number, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor) / factor
}

/**
 * Convert a display amount to the smallest currency unit for Stripe.
 * e.g. $4.99 USD -> 499 (cents)
 */
export function toSmallestUnit(amount: number, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor)
}

/**
 * Get the number of decimal places for a currency.
 */
export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2
}
