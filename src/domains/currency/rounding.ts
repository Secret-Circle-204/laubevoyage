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
 * Convert a smallest currency unit (e.g. cents) back to the display amount.
 * e.g. 499 (cents) USD -> 4.99
 */
export async function fromSmallestUnit(amount: number, currency: string): Promise<number> {
  const decimals = await getCurrencyDecimals(currency)
  const factor = Math.pow(10, decimals)
  return amount / factor
}

/**
 * Get the number of decimal places for a currency from the Registry.
 */
export async function getCurrencyDecimals(currency: string): Promise<number> {
  const currencyIdentity = await catalogRegistry.get(currency)
  if (!currencyIdentity) {
    throw new Error(`[CurrencyDomain] Currency "${currency}" is not registered or active in the CMS catalog.`)
  }
  return currencyIdentity.decimals
}
