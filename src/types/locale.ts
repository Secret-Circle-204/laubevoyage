export type CurrencyCode = string

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
 * Raw input facts for resolving Locale Context.
 * Carries un-normalized raw facts from cookies, session, request headers, and Edge Geo.
 */
export interface LocaleContextInputs {
  cookieLocale?: string
  cookieCurrency?: string
  sessionLanguage?: string
  sessionCurrency?: string
  acceptLanguage?: string
  geoCountry?: string
  geoTimezone?: string
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

  /** Unique identifier for tracing the request-scoped context */
  requestContextId?: string
}

/**
 * Default locale context for unauthenticated or new users.
 */
export const DEFAULT_LOCALE_CONTEXT: LocaleContext = {
  language: Language.EN,
  currency: 'EGP',
  country: 'EG',
  timezone: 'Africa/Cairo',
  measurement: MeasurementSystem.METRIC,
  weekStart: 6, // Saturday in Egypt
}
