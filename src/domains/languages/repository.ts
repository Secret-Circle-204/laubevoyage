import type { Payload } from 'payload'
import type { Language } from './types'

export class LanguageRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Maintained for backward compatibility.
   * Caching is managed authoritatively by Next.js Server-side Data Cache (unstable_cache).
   */
  static invalidateAll(): void {
    // No-op: eliminates split-brain dual caching across webpack boundaries
  }

  /**
   * Maintained for backward compatibility.
   */
  invalidateCache(): void {
    // No-op: eliminates split-brain dual caching across webpack boundaries
  }

  /**
   * Fetch active languages sorted by displayOrder directly from database.
   * Single source of truth. Authoritatively cached by LanguageService via unstable_cache.
   */
  async findActiveLanguages(): Promise<Language[]> {
    try {
      const res = await this.payload.find({
        collection: 'languages',
        where: {
          isActive: { equals: true },
        },
        sort: 'displayOrder',
        limit: 100,
      })

      const languages: Language[] = (res.docs || []).map((doc: any) => {
        let preferredDisplayCurrencyCode: string | null = null
        if (doc.preferredDisplayCurrency) {
          if (typeof doc.preferredDisplayCurrency === 'object' && 'isoCode' in doc.preferredDisplayCurrency) {
            preferredDisplayCurrencyCode = doc.preferredDisplayCurrency.isoCode
          } else if (typeof doc.preferredDisplayCurrency === 'string') {
            preferredDisplayCurrencyCode = doc.preferredDisplayCurrency
          } else {
            throw new Error(
              `FATAL CONFIGURATION ERROR: Language "${doc.name}" points to a broken or missing preferredDisplayCurrency record (ID: ${JSON.stringify(doc.preferredDisplayCurrency)}).`
            )
          }
        }
        return {
          id: String(doc.id),
          name: doc.name,
          nativeName: doc.nativeName,
          code: doc.code,
          isRTL: !!doc.isRTL,
          isActive: !!doc.isActive,
          isDefault: !!doc.isDefault,
          displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
          preferredDisplayCurrencyCode,
        }
      })

      return languages
    } catch (err: unknown) {
      console.error('[LanguageRepository] Error querying active languages:', err)
      return []
    }
  }

  /**
   * Get the marked default fallback language directly from database.
   */
  async getDefaultLanguage(): Promise<Language | null> {
    try {
      const res = await this.payload.find({
        collection: 'languages',
        where: {
          isDefault: { equals: true },
          isActive: { equals: true },
        },
        limit: 1,
      })

      if (res.docs && res.docs.length > 0) {
        const doc = res.docs[0] as any
        let preferredDisplayCurrencyCode: string | null = null
        if (doc.preferredDisplayCurrency) {
          if (typeof doc.preferredDisplayCurrency === 'object' && 'isoCode' in doc.preferredDisplayCurrency) {
            preferredDisplayCurrencyCode = doc.preferredDisplayCurrency.isoCode
          } else if (typeof doc.preferredDisplayCurrency === 'string') {
            preferredDisplayCurrencyCode = doc.preferredDisplayCurrency
          } else {
            throw new Error(
              `FATAL CONFIGURATION ERROR: Language "${doc.name}" points to a broken or missing preferredDisplayCurrency record (ID: ${JSON.stringify(doc.preferredDisplayCurrency)}).`
            )
          }
        }
        const lang: Language = {
          id: String(doc.id),
          name: doc.name,
          nativeName: doc.nativeName,
          code: doc.code,
          isRTL: !!doc.isRTL,
          isActive: !!doc.isActive,
          isDefault: !!doc.isDefault,
          displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
          preferredDisplayCurrencyCode,
        }
        return lang
      }

      // Fallback: If no default is marked, try the first active language
      const active = await this.findActiveLanguages()
      if (active.length > 0) {
        return active[0]
      }
    } catch (err: unknown) {
      console.error('[LanguageRepository] Error querying default language:', err)
    }

    return null
  }
}
