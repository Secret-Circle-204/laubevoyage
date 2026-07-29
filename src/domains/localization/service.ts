import type { PayloadRequest } from 'payload'
import { TranslationService } from '../translation/service'
import { PricingFacade } from '../currency/facade'
import type { ConvertedPrice } from '../currency/types'
import type { LocaleContext, LocaleContextInputs, CurrencyCode } from '@/types/locale'
import { DEFAULT_LOCALE_CONTEXT, Language, MeasurementSystem } from '@/types/locale'
import { JsonTranslationDictionary, type ITranslationDictionary } from '../translation/dictionary'

/**
 * Localization Domain Service — Presentation Gateway & Single Decision Owner
 * Central orchestrator for all locale-dependent operations via Dependency Injection:
 * - Single Decision Owner for resolving traveler's LocaleContext via modular private resolution methods
 * - Delegates UI Infrastructure texts to ITranslationDictionary (0ms JSON lookup)
 * - Delegates dynamic CMS content translation to the Translation Domain & Engine
 * - Delegates price conversion & currency resolution to the Currency Domain
 * - Formats dates, numbers, and money on the server
 */
export class LocalizationService {
  private translationService: TranslationService
  private pricingFacade: PricingFacade
  private uiDictionary: ITranslationDictionary

  constructor(
    translationService: TranslationService,
    pricingFacade: PricingFacade,
    uiDictionary?: ITranslationDictionary,
  ) {
    this.translationService = translationService
    this.pricingFacade = pricingFacade
    this.uiDictionary = uiDictionary || new JsonTranslationDictionary()
  }

  /**
   * Single Decision Owner for Locale Context Resolution.
   * Receives raw facts contract (LocaleContextInputs or Partial<LocaleContext>) and applies independent cascades.
   */
  buildContext(inputs?: LocaleContextInputs | Partial<LocaleContext>): LocaleContext {
    const raw = this.normalizeInputs(inputs)
    const language = this.resolveLanguage(raw)
    const currency = this.resolveCurrency(raw)
    const country = this.resolveCountry(raw)
    const timezone = this.resolveTimezone(raw)
    const measurement = this.resolveMeasurement(raw)
    const weekStart = this.resolveWeekStart(raw)

    return this.assembleContext({
      language,
      currency,
      country,
      timezone,
      measurement,
      weekStart,
    })
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

  private resolveLanguage(inputs: LocaleContextInputs): Language {
    if (inputs.cookieLocale && ['en', 'ar', 'fr'].includes(inputs.cookieLocale)) {
      return inputs.cookieLocale as Language
    }
    if (inputs.sessionLanguage && ['en', 'ar', 'fr'].includes(inputs.sessionLanguage)) {
      return inputs.sessionLanguage as Language
    }
    if (inputs.acceptLanguage) {
      const primaryLang = inputs.acceptLanguage.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
      if (primaryLang && ['en', 'ar', 'fr'].includes(primaryLang)) {
        return primaryLang as Language
      }
    }
    return DEFAULT_LOCALE_CONTEXT.language
  }

  private resolveCurrency(inputs: LocaleContextInputs): CurrencyCode {
    const candidate = inputs.cookieCurrency || inputs.sessionCurrency
    if (candidate && ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].includes(candidate)) {
      return candidate as CurrencyCode
    }
    if (inputs.geoCountry) {
      const countryCurrencyMap: Record<string, CurrencyCode> = {
        EG: 'EGP',
        US: 'USD',
        SA: 'SAR',
        AE: 'AED',
        GB: 'GBP',
        DE: 'EUR',
        FR: 'EUR',
        IT: 'EUR',
        ES: 'EUR',
      }
      const geoCurr = countryCurrencyMap[inputs.geoCountry]
      if (geoCurr) return geoCurr
    }
    return 'EGP' as CurrencyCode
  }

  private resolveCountry(inputs: LocaleContextInputs): string {
    return inputs.geoCountry || DEFAULT_LOCALE_CONTEXT.country
  }

  private resolveTimezone(inputs: LocaleContextInputs): string {
    return inputs.geoTimezone || DEFAULT_LOCALE_CONTEXT.timezone
  }

  private resolveMeasurement(inputs: LocaleContextInputs): MeasurementSystem {
    if (inputs.geoCountry === 'US') {
      return MeasurementSystem.IMPERIAL
    }
    return DEFAULT_LOCALE_CONTEXT.measurement
  }

  private resolveWeekStart(inputs: LocaleContextInputs): 0 | 1 | 6 {
    return DEFAULT_LOCALE_CONTEXT.weekStart
  }

  private assembleContext(resolved: {
    language: Language
    currency: CurrencyCode
    country: string
    timezone: string
    measurement: MeasurementSystem
    weekStart: 0 | 1 | 6
  }): LocaleContext {
    return {
      language: resolved.language,
      currency: resolved.currency,
      country: resolved.country,
      timezone: resolved.timezone,
      measurement: resolved.measurement,
      weekStart: resolved.weekStart,
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
