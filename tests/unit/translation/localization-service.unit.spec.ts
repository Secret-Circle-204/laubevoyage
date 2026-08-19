import { describe, it, expect, vi } from 'vitest'
import { LocalizationService } from '@/domains/localization/service'
import { CurrencyService } from '@/domains/currency/service'

describe('Localization Domain: LocalizationService & Resolution Policies Unit Tests', () => {
  const mockTranslationService: any = {}
  const mockLanguageService: any = {
    resolveDisplayLanguage: vi.fn().mockImplementation(async (params) => {
      if (params.cookieLocale) return params.cookieLocale
      if (params.sessionLanguage) return params.sessionLanguage
      if (params.acceptLanguage) {
        const primary = params.acceptLanguage.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
        if (primary) return primary
      }
      return 'en'
    }),
    resolvePreferredCurrency: vi.fn().mockImplementation(async (langCode) => {
      if (langCode === 'fr') return 'EUR'
      if (langCode === 'de') return 'EUR'
      if (langCode === 'ja') return 'JPY'
      if (langCode === 'en') return 'USD'
      return undefined
    }),
  }
  const mockPricingFacade: any = {
    resolveDisplayCurrency: vi.fn().mockImplementation(async (params) => {
      if (params?.cookieCurrency) return params.cookieCurrency
      if (params?.languagePreferredCurrencyCode) return params.languagePreferredCurrencyCode
      if (params?.geoCurrencyCode) return params.geoCurrencyCode
      return 'USD'
    }),
    convertPrice: vi.fn().mockImplementation(async (amt, from, to) => ({
      amount: amt,
      currency: to,
      exchangeRate: 1,
      sourceAmount: amt,
      sourceCurrency: from,
      formatted: `${amt} ${to}`,
    })),
  }

  const localizationService = new LocalizationService(
    mockTranslationService,
    mockPricingFacade,
    undefined,
    mockLanguageService,
  )

  it('should resolve language from cookie when present, ignoring accept-language and geo', async () => {
    const ctx = await localizationService.buildContext({
      cookieLocale: 'ar',
      acceptLanguage: 'en-US,en;q=0.9',
      geoCountry: 'US',
    })

    expect(ctx.language).toBe('ar')
  })

  it('should resolve currency from language-preferred currency when cookie and session are missing', async () => {
    const ctx = await localizationService.buildContext({
      acceptLanguage: 'fr-FR,fr;q=0.9',
      geoCountry: 'EG', // French visitor in Egypt (Ghardaga)
    })

    expect(ctx.language).toBe('fr')
    expect(ctx.currency).toBe('EUR') // Language-preferred currency EUR takes precedence over geo currency EGP
    expect(ctx.country).toBe('EG')
  })

  it('should resolve currency from cookie when present, overriding language-preferred currency', async () => {
    const ctx = await localizationService.buildContext({
      cookieCurrency: 'USD',
      acceptLanguage: 'fr-FR,fr;q=0.9',
      geoCountry: 'EG',
    })

    expect(ctx.language).toBe('fr')
    expect(ctx.currency).toBe('USD') // Cookie overrides language preference
  })

  it('should bypass preferred display currency if it is undefined (missing relationship) and fallback to next available currency in cascade', async () => {
    const ctx = await localizationService.buildContext({
      acceptLanguage: 'nl', // Dutch language has preferredDisplayCurrencyCode = undefined
      geoCountry: 'US', // Geo country US preferred currency is 'USD'
    })

    expect(ctx.language).toBe('nl')
    expect(ctx.currency).toBe('USD') // Falls back to Geo Currency USD
    expect(ctx.country).toBe('US')
  })

  it('should bypass preferred display currency if it is inactive and fallback to next available currency in cascade', async () => {
    const originalResolve = mockPricingFacade.resolveDisplayCurrency
    mockPricingFacade.resolveDisplayCurrency = vi.fn().mockImplementation(async (params) => {
      // Simulate active currencies: USD, EGP (EUR is simulated as inactive)
      const activeCodes = new Set(['EGP', 'USD'])
      const raw = params || {}
      if (raw.cookieCurrency && activeCodes.has(raw.cookieCurrency.toUpperCase())) return raw.cookieCurrency.toUpperCase()
      if (raw.sessionCurrency && activeCodes.has(raw.sessionCurrency.toUpperCase())) return raw.sessionCurrency.toUpperCase()
      if (raw.languagePreferredCurrencyCode && activeCodes.has(raw.languagePreferredCurrencyCode.toUpperCase())) {
        return raw.languagePreferredCurrencyCode.toUpperCase()
      }
      if (raw.geoCurrencyCode && activeCodes.has(raw.geoCurrencyCode.toUpperCase())) return raw.geoCurrencyCode.toUpperCase()
      if (raw.geoCountry === 'US') return 'USD'
      return 'EGP'
    })

    const ctx = await localizationService.buildContext({
      acceptLanguage: 'de-DE,de;q=0.9', // de resolves to EUR preferred currency
      geoCountry: 'US', // US resolves to USD
    })

    // Restore original mock
    mockPricingFacade.resolveDisplayCurrency = originalResolve

    expect(ctx.language).toBe('de')
    expect(ctx.currency).toBe('USD') // EUR inactive, falls back to Geo Currency USD
    expect(ctx.country).toBe('US')
  })

  it('should resolve CurrencyService.resolveDisplayCurrency dynamically from geoCurrencyCode and fallback to USD', async () => {
    const mockRepo: any = {
      findActiveCurrencies: vi.fn().mockResolvedValue({
        docs: [
          { isoCode: 'EGP', numericCode: 818, name: 'Egyptian Pound', symbol: 'EGP', decimals: 2, isActive: true, displayOrder: 1, isDefault: true },
          { isoCode: 'USD', numericCode: 840, name: 'US Dollar', symbol: '$', decimals: 2, isActive: true, displayOrder: 2, isDefault: false },
          { isoCode: 'EUR', numericCode: 978, name: 'Euro', symbol: '€', decimals: 2, isActive: true, displayOrder: 3, isDefault: false },
        ],
      }),
    }

    const currencyService = new CurrencyService(mockRepo)

    const eurResult = await currencyService.resolveDisplayCurrency({ geoCurrencyCode: 'EUR' })
    expect(eurResult).toBe('EUR')

    const jpyResult = await currencyService.resolveDisplayCurrency({ geoCurrencyCode: 'JPY' })
    expect(jpyResult).toBe('USD')
  })

  it('should fallback to DEFAULT_LOCALE_CONTEXT when all inputs are empty', async () => {
    const ctx = await localizationService.buildContext({})

    expect(ctx.language).toBe('en')
    expect(ctx.currency).toBe('USD') // English default language matches USD currency
    expect(ctx.country).toBe('EG')
    expect(ctx.timezone).toBe('Africa/Cairo')
  })
})
