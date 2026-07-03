import type { Payload, PayloadRequest } from 'payload'
import { TranslationService } from '../translation/service'
import { CurrencyService } from '../currency/service'
import { CurrencyCode } from '@/types'
import type {
  LocaleContext,
  PricingResult,
} from '@/types/locale'
import { DEFAULT_LOCALE_CONTEXT } from '@/types/locale'

/**
 * Localization Domain Service — Presentation Gateway
 *
 * Central orchestrator for all locale-dependent operations:
 * - Determines and manages the traveler's Locale Context
 * - Delegates text translation to the Translation Domain
 * - Delegates price conversion to the Currency Domain
 * - Formats dates, numbers, and money on the server
 *
 * Other domains (Packages, Booking, Dashboard, Loyalty) call this service
 * to receive display-ready data. They never manage locale concerns themselves.
 */
export class LocalizationService {
  private payload: Payload
  private translationService: TranslationService
  private currencyService: CurrencyService

  constructor(payload: Payload) {
    this.payload = payload
    this.translationService = new TranslationService(payload)
    this.currencyService = new CurrencyService(payload)
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
   * Translate a single text field.
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
   * and return a fully formatted PricingResult.
   */
  async formatPrice(
    basePriceEGP: number,
    ctx: LocaleContext,
  ): Promise<PricingResult> {
    const targetCurrency = ctx.currency

    if (targetCurrency === CurrencyCode.EGP) {
      return {
        displayPrice: basePriceEGP,
        displayCurrency: CurrencyCode.EGP,
        formattedPrice: this.formatMoney(basePriceEGP, CurrencyCode.EGP, ctx.language),
      }
    }

    const displayPrice = await this.currencyService.convert(
      CurrencyCode.EGP,
      targetCurrency,
      basePriceEGP,
    )

    return {
      displayPrice,
      displayCurrency: targetCurrency,
      formattedPrice: this.formatMoney(displayPrice, targetCurrency, ctx.language),
    }
  }

  // =========================================================================
  // Formatting Utilities
  // =========================================================================

  /**
   * Format money server-side using Intl.NumberFormat.
   */
  formatMoney(amount: number, currency: string, locale: string = 'en'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

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
