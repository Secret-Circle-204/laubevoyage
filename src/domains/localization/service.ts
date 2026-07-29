import type { PayloadRequest } from 'payload'
import { TranslationService } from '../translation/service'
import { PricingFacade } from '../currency/facade'
import { LanguageService } from '../languages/service'
import type { ConvertedPrice } from '../currency/types'
import type { LocaleContext, LocaleContextInputs, CurrencyCode } from '@/types/locale'
import { DEFAULT_LOCALE_CONTEXT, Language, MeasurementSystem } from '@/types/locale'
import { JsonTranslationDictionary, type ITranslationDictionary } from '../translation/dictionary'

import { countryCatalogRegistry } from '../destination/country-registry'

/**
 * Localization Domain Service — Presentation Gateway & Single Decision Owner
 * Central orchestrator for all locale-dependent operations via Dependency Injection:
 * - Single Decision Owner for resolving traveler's LocaleContext via async resolution pipeline
 * - Delegates language resolution to LanguageDomain (CMS Languages collection)
 * - Delegates currency resolution & country mapping to CurrencyDomain (CMS Currencies collection)
 * - Delegates UI Infrastructure texts to ITranslationDictionary (0ms JSON lookup)
 * - Delegates dynamic CMS content translation to the Translation Domain & Engine
 * - Formats dates, numbers, and money on the server
 */
export class LocalizationService {
  private translationService: TranslationService
  private pricingFacade: PricingFacade
  private languageService?: LanguageService
  private uiDictionary: ITranslationDictionary

  constructor(
    translationService: TranslationService,
    pricingFacade: PricingFacade,
    uiDictionary?: ITranslationDictionary,
    languageService?: LanguageService,
  ) {
    this.translationService = translationService
    this.pricingFacade = pricingFacade
    this.languageService = languageService
    this.uiDictionary = uiDictionary || new JsonTranslationDictionary()
  }

  /**
   * Single Decision Owner Pipeline for building LocaleContext.
   * Receives raw facts contract (LocaleContextInputs or Partial<LocaleContext>) and applies independent cascades.
   */
  async buildContext(inputs?: LocaleContextInputs | Partial<LocaleContext>): Promise<LocaleContext> {
    const raw = this.normalizeInputs(inputs)
    let countryConfig
    if (raw.geoCountry) {
      try {
        countryConfig = await countryCatalogRegistry.get(raw.geoCountry)
      } catch (err) {
        // Fallback
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[LocalizationService] geoCountry = "${raw.geoCountry || ''}"`)
      console.log(`[LocalizationService] country.currencyCode = "${countryConfig?.currencyCode || ''}"`)
      console.log(`[LocalizationService] country.defaultLanguageCode = "${countryConfig?.defaultLanguageCode || ''}"`)
    }

    const language = await this.resolveLanguage(raw, countryConfig?.defaultLanguageCode || undefined)

    let languagePreferredCurrencyCode: string | undefined = undefined
    if (this.languageService) {
      languagePreferredCurrencyCode = await this.languageService.resolvePreferredCurrency(language)
    }

    const currency = await this.resolveCurrency(raw, countryConfig?.currencyCode || undefined, languagePreferredCurrencyCode)

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[LocalizationService] resolvedLanguage = "${language}"`)
      console.log(`[LocalizationService] resolvedCurrency = "${currency}"`)
    }

    const country = this.resolveCountry(raw)
    const timezone = this.resolveTimezone(raw, countryConfig?.timezone || undefined)
    const measurement = this.resolveMeasurement(raw, countryConfig?.measurementSystem || undefined)
    const weekStart = this.resolveWeekStart(raw, countryConfig?.weekStart)

    const requestContextId = inputs && 'requestContextId' in inputs && inputs.requestContextId
      ? inputs.requestContextId
      : `req-${Math.random().toString(36).substring(2, 9)}`

    return this.assembleContext({
      language,
      currency,
      country,
      timezone,
      measurement,
      weekStart,
    }, requestContextId)
  }

  private normalizeInputs(inputs?: LocaleContextInputs | Partial<LocaleContext>): LocaleContextInputs {
    if (!inputs) return {}
    const raw = inputs as Record<string, any>
    return {
      cookieLocale: (raw.cookieLocale || raw.language || '').toString().toLowerCase().trim(),
      cookieCurrency: (raw.cookieCurrency || raw.currency || '').toString().toUpperCase().trim(),
      sessionLanguage: (raw.sessionLanguage || '').toString().toLowerCase().trim(),
      sessionCurrency: (raw.sessionCurrency || '').toString().toUpperCase().trim(),
      acceptLanguage: (raw.acceptLanguage || '').toString().toLowerCase().trim(),
      geoCountry: (raw.geoCountry || raw.country || '').toString().toUpperCase().trim(),
      geoTimezone: (raw.geoTimezone || raw.timezone || '').toString().trim(),
    }
  }

  private async resolveLanguage(inputs: LocaleContextInputs, geoDefaultLanguageCode?: string): Promise<Language> {
    if (this.languageService) {
      const resolved = await this.languageService.resolveDisplayLanguage({
        cookieLocale: inputs.cookieLocale,
        sessionLanguage: inputs.sessionLanguage,
        acceptLanguage: inputs.acceptLanguage,
        geoDefaultLanguageCode,
      })
      return resolved as Language
    }
    if (inputs.cookieLocale) return inputs.cookieLocale as Language
    if (inputs.sessionLanguage) return inputs.sessionLanguage as Language
    if (inputs.acceptLanguage) {
      const primaryLang = inputs.acceptLanguage.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
      if (primaryLang) return primaryLang as Language
    }
    return DEFAULT_LOCALE_CONTEXT.language
  }

  private async resolveCurrency(
    inputs: LocaleContextInputs,
    geoCurrencyCode?: string,
    languagePreferredCurrencyCode?: string
  ): Promise<CurrencyCode> {
    const resolved = await this.pricingFacade.resolveDisplayCurrency({
      cookieCurrency: inputs.cookieCurrency,
      sessionCurrency: inputs.sessionCurrency,
      geoCountry: inputs.geoCountry,
      geoCurrencyCode,
      languagePreferredCurrencyCode,
    })
    return resolved as CurrencyCode
  }

  private resolveCountry(inputs: LocaleContextInputs): string {
    return inputs.geoCountry || DEFAULT_LOCALE_CONTEXT.country
  }

  private resolveTimezone(inputs: LocaleContextInputs, geoTimezone?: string): string {
    return inputs.geoTimezone || geoTimezone || DEFAULT_LOCALE_CONTEXT.timezone
  }

  private resolveMeasurement(inputs: LocaleContextInputs, geoMeasurement?: string): MeasurementSystem {
    if (geoMeasurement === 'imperial' || geoMeasurement === 'metric') {
      return geoMeasurement as MeasurementSystem
    }
    return DEFAULT_LOCALE_CONTEXT.measurement
  }

  private resolveWeekStart(inputs: LocaleContextInputs, geoWeekStart?: number | null): 0 | 1 | 6 {
    if (geoWeekStart === 0 || geoWeekStart === 1 || geoWeekStart === 6) {
      return geoWeekStart
    }
    return DEFAULT_LOCALE_CONTEXT.weekStart
  }

  private assembleContext(
    resolved: {
      language: Language
      currency: CurrencyCode
      country: string
      timezone: string
      measurement: MeasurementSystem
      weekStart: 0 | 1 | 6
    },
    requestContextId?: string
  ): LocaleContext {
    return {
      language: resolved.language,
      currency: resolved.currency,
      country: resolved.country,
      timezone: resolved.timezone,
      measurement: resolved.measurement,
      weekStart: resolved.weekStart,
      requestContextId,
    }
  }

  // =========================================================================
  // Translation Delegation
  // =========================================================================

  /**
   * Translate a static UI Infrastructure text key using ITranslationDictionary (0ms synchronous lookup).
   */
  translateUiKey(key: string, ctx: LocaleContext): string {
    return this.uiDictionary.get(ctx.language, key)
  }

  /**
   * Translate a single text field (Dynamic CMS Content).
   */
  async translateText(
    text: string,
    ctx: LocaleContext,
    version?: number,
    req?: PayloadRequest,
  ): Promise<string> {
    return this.translationService.translate(text, ctx.language, version, req)
  }

  /**
   * Translate multiple text strings at once in 1 Single Batch Request.
   */
  async translateBatch(texts: string[], ctx: LocaleContext): Promise<string[]> {
    return this.translationService.translateBatch(texts, ctx.language)
  }

  /**
   * Translate multiple fields of a document at once.
   * Returns display-ready key/value pairs.
   */
  async translateFields(
    fields: Record<string, string>,
    ctx: LocaleContext,
    version?: number,
    req?: PayloadRequest,
  ): Promise<Record<string, string>> {
    return this.translationService.translateFields(fields, ctx.language, version, req)
  }

  // =========================================================================
  // Pricing Delegation
  // =========================================================================

  /**
   * Convert a base EGP price to the traveler's display currency
   * and return a fully formatted FormattedPricingResult.
   */
  async formatPrice(basePriceEGP: number, ctx: LocaleContext): Promise<ConvertedPrice> {
    return this.pricingFacade.getConvertedPrice(basePriceEGP, ctx.currency, ctx.language || 'en')
  }

  // =========================================================================
  // Formatting Utilities
  // =========================================================================

  /**
   * Format a date server-side using Intl.DateTimeFormat.
   */
  formatDate(date: Date | string, ctx: LocaleContext): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(ctx.language, {
      dateStyle: 'long',
      timeZone: ctx.timezone,
    }).format(d)
  }

  /**
   * Format a number server-side using Intl.NumberFormat.
   */
  formatNumber(value: number, ctx: LocaleContext): string {
    return new Intl.NumberFormat(ctx.language).format(value)
  }
}
