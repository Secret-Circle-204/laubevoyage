import { describe, it, expect, vi } from 'vitest'
import { LocalizationService } from '@/domains/localization/service'
import { CurrencyService } from '@/domains/currency/service'
import { Language } from '@/types/locale'

describe('Localization Domain: LocalizationService & Resolution Policies Unit Tests', () => {
  const mockTranslationService: any = {}
  const mockPricingFacade: any = {
    resolveDisplayCurrency: vi.fn().mockImplementation(async (code) => {
      if (!code) return 'USD'
      if (['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].includes(code.toUpperCase())) {
        return code.toUpperCase()
      }
      return 'USD'
    }),
  }

  const localizationService = new LocalizationService(mockTranslationService, mockPricingFacade)

  it('should resolve language from cookie when present, ignoring accept-language and geo', () => {
    const ctx = localizationService.buildContext({
      cookieLocale: 'ar',
      acceptLanguage: 'en-US,en;q=0.9',
      geoCountry: 'US',
    })

    expect(ctx.language).toBe(Language.AR)
  })

  it('should resolve language from Accept-Language when cookie is missing (Resolution Independence Rule)', () => {
    const ctx = localizationService.buildContext({
      acceptLanguage: 'fr-FR,fr;q=0.9',
      geoCountry: 'DE', // French visitor in Germany
    })

    // Language follows browser Accept-Language (fr), NOT Germany country language
    expect(ctx.language).toBe(Language.FR)
    expect(ctx.currency).toBe('EUR') // Currency follows Germany (EUR)
    expect(ctx.country).toBe('DE')
  })

  it('should resolve CurrencyService.resolveDisplayCurrency business policy for unsupported currency (JP -> USD)', async () => {
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

    // Supported currency
    const eurResult = await currencyService.resolveDisplayCurrency('EUR')
    expect(eurResult).toBe('EUR')

    // Unsupported currency (JPY) -> fallback to USD business policy
    const jpyResult = await currencyService.resolveDisplayCurrency('JPY')
    expect(jpyResult).toBe('USD')
  })

  it('should fallback to DEFAULT_LOCALE_CONTEXT when all inputs are empty', () => {
    const ctx = localizationService.buildContext({})

    expect(ctx.language).toBe(Language.EN)
    expect(ctx.currency).toBe('EGP')
    expect(ctx.country).toBe('EG')
    expect(ctx.timezone).toBe('Africa/Cairo')
  })
})
