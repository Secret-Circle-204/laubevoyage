import type { CurrencyCode, Money } from '@/types'
import { unstable_cache } from 'next/cache'
import { rateRegistry } from './rate-registry'
import type { CurrencyIdentity } from './catalog-registry'
import { CurrencyRepository } from './repository'
import { CompositeExchangeRateProvider } from './providers/composite-provider'
import type { ExchangeRateProvider } from './contracts/exchange-rate-provider'
import type { ExchangeRateSource } from './types'
import { ExchangeRateUnavailableError, EXCHANGE_RATE_SOURCES } from './types'
import { CurrencySyncPolicy } from './policy'

function formatProviderDiagnostic(providerName: string, err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: { code?: string; message?: string; hostname?: string } }).cause
    const code = cause?.code || (err as Error & { code?: string }).code
    const status = (err as Error & { status?: number }).status

    const tokens: string[] = [`${providerName}:`]
    if (status) tokens.push(`HTTP ${status}`)
    if (code) tokens.push(`[${code}]`)
    if (cause?.hostname) tokens.push(`host: ${cause.hostname}`)
    tokens.push(cause?.message || err.message)
    return tokens.join(' ')
  }
  return `${providerName}: ${String(err)}`
}

/**
 * Currency Domain Service
 * Single source of truth for all currency operations via CurrencyRepository & Provider Dependency Injection.
 * Base currency: EGP
 */
export class CurrencyService {
  private repository: CurrencyRepository
  private rateProvider: ExchangeRateProvider
  private getCachedActiveCurrencies: () => Promise<CurrencyIdentity[]>

  constructor(repository: CurrencyRepository, rateProvider?: ExchangeRateProvider) {
    this.repository = repository
    this.rateProvider = rateProvider || new CompositeExchangeRateProvider()

    this.getCachedActiveCurrencies = unstable_cache(
      async (): Promise<CurrencyIdentity[]> => {
        const { docs } = await this.repository.findActiveCurrencies()
        return docs
          .map((doc) => ({
            isoCode: doc.isoCode,
            numericCode: doc.numericCode,
            name: doc.name,
            symbol: doc.symbol,
            nativeSymbol: doc.nativeSymbol || null,
            decimals: doc.decimals,
            isActive: doc.isActive ?? true,
            displayOrder: doc.displayOrder ?? 0,
            isDefault: doc.isDefault ?? false,
            flagCode: doc.flagCode || null,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder)
      },
      ['active-currencies-catalog'],
      {
        tags: ['currencies'],
      }
    )
  }

  /**
   * Domain Gateway method for retrieving all active currencies.
   * Cached by Next.js Server-side Data Cache with tag ['currencies'].
   */
  async getActiveCurrencies(): Promise<CurrencyIdentity[]> {
    return this.getCachedActiveCurrencies()
  }

  /**
   * Domain Resolution Policy: Resolves display currency against active CMS currencies catalog.
   * Relocates country-to-currency mapping to Currency Domain.
   * Business Policy:
   * 1. If candidate currency (Cookie or Session) is active in catalogRegistry -> returns it.
   * 2. If geoCountry has a mapped currency active in catalogRegistry -> returns it.
   * 3. If country/candidate currency is unsupported (e.g. JPY) -> returns 'USD' (International Tourism Benchmark).
   * 4. Fallback -> 'EGP' (Platform Base Currency).
   */
  async resolveDisplayCurrency(params?: {
    cookieCurrency?: string
    sessionCurrency?: string
    geoCountry?: string
    geoCurrencyCode?: string
  } | string): Promise<string> {
    const raw = typeof params === 'string' ? { cookieCurrency: params } : params || {}
    const activeCurrencies = await this.getActiveCurrencies()
    const supportedCodes = new Set(activeCurrencies.map((c) => c.isoCode.toUpperCase()))

    // 1. Explicit Cookie Override
    if (raw.cookieCurrency) {
      const normalized = raw.cookieCurrency.trim().toUpperCase()
      if (supportedCodes.has(normalized)) {
        return normalized
      }
    }

    // 2. Session Currency Override
    if (raw.sessionCurrency) {
      const normalized = raw.sessionCurrency.trim().toUpperCase()
      if (supportedCodes.has(normalized)) {
        return normalized
      }
    }

    // 3. Direct Geo Currency Code
    if (raw.geoCurrencyCode) {
      const normalized = raw.geoCurrencyCode.trim().toUpperCase()
      if (supportedCodes.has(normalized)) {
        return normalized
      }
      if (supportedCodes.has('USD')) {
        return 'USD'
      }
    }

    // 4. Country Code Mapping (ISO 3166-1 alpha-2)
    if (raw.geoCountry) {
      const code = raw.geoCountry.trim().toUpperCase()
      const COUNTRY_MAP: Record<string, string> = {
        EG: 'EGP',
        US: 'USD',
        GB: 'GBP',
        EU: 'EUR',
        DE: 'EUR',
        FR: 'EUR',
        IT: 'EUR',
        ES: 'EUR',
        NL: 'EUR',
        BE: 'EUR',
        SA: 'SAR',
        AE: 'AED',
        KW: 'KWD',
        QA: 'QAR',
        BH: 'BHD',
        OM: 'OMR',
        JO: 'JOD',
        CH: 'CHF',
        CA: 'CAD',
        AU: 'AUD',
      }
      const mapped = COUNTRY_MAP[code]
      if (mapped && supportedCodes.has(mapped)) {
        return mapped
      }
      if (supportedCodes.has('USD')) {
        return 'USD'
      }
      return 'USD'
    }

    // 5. Default Fallback
    return 'EGP'
  }

  async markAllStale(errorMessage: string, attemptTime: string) {
    const result = await this.repository.markAllStale(errorMessage, attemptTime)
    rateRegistry.invalidate()
    return result
  }

  async upsertRate(params: {
    fromCurrency: string
    toCurrency: string
    rate: number
    source: ExchangeRateSource
    syncStatus: 'synced' | 'failed' | 'stale'
    timestamp: string
  }) {
    const result = await this.repository.upsertRate(params)
    rateRegistry.invalidate()
    return result
  }

  private getProviders(): ExchangeRateProvider[] {
    if (this.rateProvider instanceof CompositeExchangeRateProvider) {
      return this.rateProvider.providers
    }
    if ('providers' in this.rateProvider && Array.isArray((this.rateProvider as any).providers)) {
      return (this.rateProvider as any).providers
    }
    return [this.rateProvider]
  }

  /**
   * Primary Provider Sync Method with Composite Failover
   */
  async syncExchangeRates(force = false): Promise<{ success: boolean; message: string; timestamp: string; skipped?: boolean }> {
    const now = new Date()
    const nowIso = now.toISOString()
    const providers = this.getProviders()
    const orderedProviders = CurrencySyncPolicy.getOrderedProviders(providers)

    console.log(`[CurrencyService] Starting rate sync cycle (forceSync: ${force}). Providers in priority: ${orderedProviders.map(p => p.name).join(', ')}`)

    // 1. Catalog Completeness & Freshness Policy check
    const activeCurrenciesRes = await this.repository.findActiveCurrencies()
    const activeCodes = (activeCurrenciesRes.docs || [])
      .map((c) => c.isoCode.toUpperCase().trim())
      .filter((code) => code !== 'EGP')

    const existingRatesRes = await this.repository.findExchangeRates('EGP')
    const existingRateCurrencies = new Set(
      (existingRatesRes.docs || [])
        .filter((r) => typeof r.rate === 'number' && r.rate > 0 && r.fromCurrency === 'EGP')
        .map((r) => r.toCurrency.toUpperCase().trim())
    )

    const missingCurrencies = activeCodes.filter((code) => !existingRateCurrencies.has(code))
    const hasMissingRates = missingCurrencies.length > 0

    if (!force && !hasMissingRates) {
      const latestSync = await this.repository.getLatestRateSync()
      if (latestSync) {
        const needsSync = CurrencySyncPolicy.shouldSync(latestSync.source, latestSync.lastSuccess, now)
        if (!needsSync) {
          console.log(`[CurrencyService] Sync skipped: Rates are still fresh. Last synced via ${latestSync.source} at ${latestSync.lastSuccess}.`)
          return {
            success: true,
            message: 'Sync skipped: Rates are still fresh.',
            timestamp: nowIso,
            skipped: true,
          }
        }
      }
    }

    if (hasMissingRates) {
      console.warn(
        `[CurrencyService] Active currencies catalog is incomplete. Missing rates for: [${missingCurrencies.join(', ')}]. Bypassing freshness check to enforce catalog completeness.`
      )
    }

    // 2. Fetch rates with failover
    let activeProviderUsed: ExchangeRateProvider | null = null
    let fetchedRates: Record<string, number> = {}
    const skippedProviders: string[] = []
    const failedProviders: string[] = []

    for (const provider of orderedProviders) {
      // API key policy validation
      const requiresKey = CurrencySyncPolicy.requiresApiKey(provider.source)
      if (requiresKey && !provider.hasApiKey()) {
        skippedProviders.push(`${provider.name} (API key missing)`)
        continue
      }

      try {
        console.log(`[CurrencyService] Fetching rates using provider: ${provider.name}`)
        const result = await provider.fetchRates('EGP')
        if (result.rates && Object.keys(result.rates).length > 0) {
          fetchedRates = result.rates
          activeProviderUsed = provider
          break
        }
      } catch (err: unknown) {
        const formattedMsg = formatProviderDiagnostic(provider.name, err)
        console.warn(`[CurrencyService] Provider ${provider.name} failed: ${formattedMsg}`)
        failedProviders.push(formattedMsg)
      }
    }

    // Handle skipped / all failed scenario
    if (!activeProviderUsed) {
      const errorMsg = `All rate providers failed. Skips: [${skippedProviders.join(', ')}] | Errors: [${failedProviders.join(' | ')}]`
      console.error(`[CurrencyService] ${errorMsg}`)
      try {
        await this.repository.markAllStale(errorMsg, nowIso)
        rateRegistry.invalidate()
      } catch (dbError) {
        console.error('[CurrencyService] Failed marking rates as stale:', dbError)
      }
      return {
        success: false,
        message: 'All providers failed. Kept old rates but marked as STALE.',
        timestamp: nowIso,
      }
    }

    // Save rates for all recognized currencies in the master catalog
    const catalogCurrencies = await this.repository.findAllCatalogCurrencies()
    const catalogIsoCodes = new Set(catalogCurrencies.docs.map(c => c.isoCode.toUpperCase().trim()))

    let updated = 0
    for (const [currency, rate] of Object.entries(fetchedRates)) {
      const normalizedCurrency = currency.toUpperCase().trim()
      if (catalogIsoCodes.has(normalizedCurrency) && normalizedCurrency !== 'EGP' && rate > 0) {
        await this.repository.upsertRate({
          fromCurrency: 'EGP',
          toCurrency: normalizedCurrency,
          rate,
          source: activeProviderUsed.source,
          syncStatus: 'synced',
          timestamp: nowIso,
        })
        updated++
      }
    }

    rateRegistry.invalidate()

    return {
      success: true,

      message: `Successfully synchronized ${updated} exchange rates using provider: ${activeProviderUsed.name}`,
      timestamp: nowIso,
    }
  }

  /**
   * Convert amount from one currency to another using the Rate Registry
   */
  async convert(from: CurrencyCode, to: CurrencyCode, amount: number): Promise<number> {
    if (from === to) return amount

    const rate = await this.getRate(from, to)
    return amount * rate
  }

  /**
   * Get exchange rate between two currencies (Strictly Read-Only, Zero Network I/O)
   */
  async getRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from !== 'EGP') {
      throw new Error('Base currency must be EGP')
    }

    if (to === 'EGP') {
      return 1
    }

    const rateData = await rateRegistry.getRate(to, this.repository)
    if (!rateData) {
      console.error(
        `[CurrencyService] Conversion failed: Exchange rate from ${from} to ${to} is completely missing in database and cache. ` +
        `Timestamp: ${new Date().toISOString()}`
      )
      throw new ExchangeRateUnavailableError(from, to, 'Rate missing in database and cache')
    }

    return rateData.rate
  }

  /**
   * Convert Money object to another currency
   */
  async convertMoney(money: Money, toCurrency: CurrencyCode): Promise<Money> {
    const convertedAmount = await this.convert(money.currency, toCurrency, money.amount)
    return {
      amount: convertedAmount,
      currency: toCurrency,
    }
  }

  /**
   * Convert points to currency value
   * 1 point = 0.5 EGP base value
   */
  async pointsToCurrency(points: number, currency: CurrencyCode): Promise<number> {
    const egpValue = points * 0.5
    return this.convert('EGP', currency, egpValue)
  }

  /**
   * Format money for display
   */
  formatMoney(money: Money, locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
    }).format(money.amount)
  }

  /**
   * Capture an immutable exchange rate snapshot for booking creation
   */
  async getExchangeRateSnapshot(targetCurrency: string): Promise<{ rate: number; timestamp: string }> {
    if (targetCurrency === 'EGP') {
      return { rate: 1, timestamp: new Date().toISOString() }
    }
    const rate = await this.getRate('EGP', targetCurrency as CurrencyCode)
    return { rate, timestamp: new Date().toISOString() }
  }

  /**
   * Background rate refresh for cron dispatcher
   */
  async refreshRateCatalog(): Promise<{ success: boolean; message: string }> {
    return this.syncExchangeRates()
  }
}
