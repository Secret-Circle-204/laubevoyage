import type { Payload } from 'payload'
import type { Language } from './types'

export class LanguageRepository {
  private payload: Payload
  private activeLanguagesCache: Language[] | null = null
  private defaultLanguageCache: Language | null = null

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Invalidate the in-memory cache when changes occur.
   */
  invalidateCache(): void {
    this.activeLanguagesCache = null
    this.defaultLanguageCache = null
  }

  /**
   * Fetch active languages sorted by displayOrder, using memory cache to prevent redundant DB calls.
   */
  async findActiveLanguages(): Promise<Language[]> {
    if (this.activeLanguagesCache !== null) {
      return this.activeLanguagesCache
    }

    try {
      const res = await this.payload.find({
        collection: 'languages',
        where: {
          isActive: { equals: true },
        },
        sort: 'displayOrder',
        limit: 100,
      })

      const languages: Language[] = (res.docs || []).map((doc: any) => ({
        id: String(doc.id),
        name: doc.name,
        nativeName: doc.nativeName,
        code: doc.code,
        isRTL: !!doc.isRTL,
        isActive: !!doc.isActive,
        isDefault: !!doc.isDefault,
        displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
      }))

      this.activeLanguagesCache = languages
      return languages
    } catch (err: unknown) {
      console.error('[LanguageRepository] Error querying active languages:', err)
      return []
    }
  }

  /**
   * Get the marked default fallback language, using memory cache.
   */
  async getDefaultLanguage(): Promise<Language | null> {
    if (this.defaultLanguageCache !== null) {
      return this.defaultLanguageCache
    }

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
        const lang: Language = {
          id: String(doc.id),
          name: doc.name,
          nativeName: doc.nativeName,
          code: doc.code,
          isRTL: !!doc.isRTL,
          isActive: !!doc.isActive,
          isDefault: !!doc.isDefault,
          displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
        }
        this.defaultLanguageCache = lang
        return lang
      }

      // Fallback: If no default is marked, try the first active language
      const active = await this.findActiveLanguages()
      if (active.length > 0) {
        this.defaultLanguageCache = active[0]
        return active[0]
      }
    } catch (err: unknown) {
      console.error('[LanguageRepository] Error querying default language:', err)
    }

    return null
  }
}
