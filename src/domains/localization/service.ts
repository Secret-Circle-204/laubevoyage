import type { PayloadRequest } from 'payload'
import { TranslationService } from '../translation/service'
import { PricingFacade } from '../currency/facade'
import type { ConvertedPrice } from '../currency/types'
import type { LocaleContext } from '@/types/locale'
import { DEFAULT_LOCALE_CONTEXT } from '@/types/locale'
import { JsonTranslationDictionary, type ITranslationDictionary } from '../translation/dictionary'

/**
 * Localization Domain Service — Presentation Gateway
 * Central orchestrator for all locale-dependent operations via Dependency Injection:
 * - Determines and manages the traveler's Locale Context
 * - Delegates UI Infrastructure texts to ITranslationDictionary (0ms JSON lookup)
 * - Delegates dynamic CMS content translation to the Translation Domain & Engine
 * - Delegates price conversion to the Pricing Pipeline
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
   * Build a LocaleContext from a customer's saved preferences or request headers.
   */
  buildContext(overrides?: Partial<LocaleContext>): LocaleContext {
    return {
      ...DEFAULT_LOCALE_CONTEXT,
      ...overrides,
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
  async formatPrice(
    basePriceEGP: number,
    ctx: LocaleContext,
  ): Promise<ConvertedPrice> {
    return this.pricingFacade.getConvertedPrice(
      basePriceEGP,
      ctx.currency,
      ctx.language || 'en',
    )
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
