import { catalogRegistry } from './catalog-registry'

/**
 * Currency Rounding Policy
 *
 * Different currencies have different decimal rules.
 * We fetch the decimals dynamically from the Catalog Registry.
 */

/**
 * Round an amount according to the target currency's decimal rules.
 */
export async function roundForCurrency(amount: number, currency: string): Promise<number> {
  const decimals = await getCurrencyDecimals(currency)
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor) / factor
}

/**
 * Convert a display amount to the smallest currency unit for Stripe.
 * e.g. $4.99 USD -> 499 (cents)
 */
export async function toSmallestUnit(amount: number, currency: string): Promise<number> {
  const decimals = await getCurrencyDecimals(currency)
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor)
}

/**
 * Get the number of decimal places for a currency from the Registry.
 */
export async function getCurrencyDecimals(currency: string): Promise<number> {
  const currencyIdentity = await catalogRegistry.get(currency)
  return currencyIdentity?.decimals ?? 2 // Default to 2 if not found
}
