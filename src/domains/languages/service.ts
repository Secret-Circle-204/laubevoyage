import type { LanguageRepository } from './repository'
import type { Language } from './types'

export class LanguageService {
  private repository: LanguageRepository

  constructor(repository: LanguageRepository) {
    this.repository = repository
  }

  /**
   * Domain Gateway method for retrieving all active languages.
   */
  async getActiveLanguages(): Promise<Language[]> {
    return this.repository.findActiveLanguages()
  }

  /**
   * Domain Gateway method for retrieving the default fallback language.
   */
  async getDefaultLanguage(): Promise<Language | null> {
    return this.repository.getDefaultLanguage()
  }

  /**
   * Domain Resolution Policy: Resolves a proposed language against active CMS languages catalog.
   */
  async resolveDisplayLanguage(params: {
    cookieLocale?: string
    sessionLanguage?: string
    acceptLanguage?: string
    geoDefaultLanguageCode?: string
  }): Promise<string> {
    const activeLanguages = await this.getActiveLanguages()
    if (activeLanguages.length === 0) {
      throw new Error('FATAL CONFIGURATION ERROR: No active languages are configured in the CMS.')
    }

    const defaultLangs = activeLanguages.filter((l) => l.isDefault)
    if (defaultLangs.length === 0) {
      throw new Error('FATAL CONFIGURATION ERROR: No default language is configured in the CMS (isDefault = true).')
    }
    if (defaultLangs.length > 1) {
      throw new Error(
        `FATAL CONFIGURATION ERROR: Multiple default languages configured in the CMS: ${defaultLangs
          .map((l) => l.code)
          .join(', ')}. Exactly one is allowed.`
      )
    }

    const activeCodes = new Set(activeLanguages.map((l) => l.code.toLowerCase()))

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[resolveDisplayLanguage] inputs: cookieLocale="${params.cookieLocale || ''}", sessionLanguage="${params.sessionLanguage || ''}", acceptLanguage="${params.acceptLanguage || ''}", geoDefaultLanguageCode="${params.geoDefaultLanguageCode || ''}"`)
    }

    // 1. Cookie locale preference
    if (params.cookieLocale && activeCodes.has(params.cookieLocale.toLowerCase())) {
      const res = params.cookieLocale.toLowerCase()
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[resolveDisplayLanguage] resolved via Cookie: "${res}"`)
      }
      return res
    }

    // 2. Session preferredLanguage preference
    if (params.sessionLanguage && activeCodes.has(params.sessionLanguage.toLowerCase())) {
      const res = params.sessionLanguage.toLowerCase()
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[resolveDisplayLanguage] resolved via Session: "${res}"`)
      }
      return res
    }

    // 3. Geo Country defaultLanguage preference
    if (params.geoDefaultLanguageCode && activeCodes.has(params.geoDefaultLanguageCode.toLowerCase())) {
      const res = params.geoDefaultLanguageCode.toLowerCase()
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[resolveDisplayLanguage] resolved via Geo Country: "${res}"`)
      }
      return res
    }

    // 4. Browser Accept-Language preference
    if (params.acceptLanguage) {
      const primary = params.acceptLanguage.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim().toLowerCase()
      if (primary && activeCodes.has(primary)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[resolveDisplayLanguage] resolved via Browser: "${primary}"`)
        }
        return primary
      }
    }

    // 5. CMS Default Language fallback
    const res = defaultLangs[0].code.toLowerCase()
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[resolveDisplayLanguage] resolved via CMS Default: "${res}"`)
    }
    return res
  }

  /**
   * Resolve preferred currency associated with the given language code in the CMS.
   */
  async resolvePreferredCurrency(languageCode: string): Promise<string | undefined> {
    const active = await this.getActiveLanguages()
    const match = active.find((l) => l.code.toLowerCase() === languageCode.toLowerCase())
    return match?.preferredDisplayCurrencyCode || undefined
  }

  /**
   * Invalidate the in-memory cache manually.
   */
  invalidateCache(): void {
    this.repository.invalidateCache()
  }
}
