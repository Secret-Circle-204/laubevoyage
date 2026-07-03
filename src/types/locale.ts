import { CurrencyCode } from './index'

// ============================================================================
// LOCALIZATION DOMAIN — Locale Context
// ============================================================================

/**
 * Supported application languages.
 */
export enum Language {
  EN = 'en',
  AR = 'ar',
  FR = 'fr',
}

/**
 * Supported measurement systems.
 */
export enum MeasurementSystem {
  METRIC = 'metric',       // KM, Celsius, KG
  IMPERIAL = 'imperial',   // Miles, Fahrenheit, LBS
}

/**
 * Locale Context — carries all user-specific presentation preferences.
 * Language, Currency, Country, Timezone, Measurement, Calendar are all independent.
 */
export interface LocaleContext {
  /** Display language (e.g. 'en', 'ar', 'fr') */
  language: Language

  /** Display currency (e.g. 'USD', 'EGP', 'SAR') */
  currency: CurrencyCode

  /** ISO 3166-1 alpha-2 country code (e.g. 'EG', 'SA', 'US') */
  country: string

  /** IANA timezone identifier (e.g. 'Africa/Cairo', 'Asia/Riyadh') */
  timezone: string

  /** Measurement system preference */
  measurement: MeasurementSystem

  /** Calendar week start (0 = Sunday, 1 = Monday, 6 = Saturday) */
  weekStart: 0 | 1 | 6
}

/**
 * Default locale context for unauthenticated or new users.
 */
export const DEFAULT_LOCALE_CONTEXT: LocaleContext = {
  language: Language.EN,
  currency: CurrencyCode.EGP,
  country: 'EG',
  timezone: 'Africa/Cairo',
  measurement: MeasurementSystem.METRIC,
  weekStart: 6, // Saturday in Egypt
}

/**
 * Pricing result returned by the Pricing Pipeline.
 * The frontend only sees these display-ready values.
 */
export interface PricingResult {
  /** Converted amount in the traveler's currency */
  displayPrice: number
  /** ISO 4217 currency code (e.g. 'USD') */
  displayCurrency: string
  /** Server-formatted string (e.g. '$480.00') */
  formattedPrice: string
}

/**
 * Currency Snapshot — frozen at booking creation time.
 * Prevents retroactive price shifts when exchange rates change.
 */
export interface CurrencySnapshot {
  basePriceEGP: number
  exchangeRateUsed: number
  displayAmount: number
  displayCurrency: string
}
