import type { Payload } from 'payload'
import type { TranslationRecordEntity } from './types'

/**
 * Translation Repository
 * Data persistence layer for 'translations' Payload collection.
 */
export class TranslationRepository {
  private payload?: Payload
  private cacheMap: Map<string, TranslationRecordEntity> = new Map()

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async findActiveLocales(): Promise<Array<{ code: string; name: string }>> {
    if (!this.payload) return []
    try {
      const res = await this.payload.find({
        collection: 'translations' as any,
        limit: 100,
      })
      const localeSet = new Map<string, string>()
      for (const doc of res.docs || []) {
        const item = doc as any
        if (item.locale) {
          localeSet.set(item.locale, item.localeName || item.locale.toUpperCase())
        }
      }
      return Array.from(localeSet.entries()).map(([code, name]) => ({ code, name }))
    } catch (err: unknown) {
      console.error('[TranslationRepository] Error querying active locales:', err)
      return []
    }
  }

  async findByKeyAndLocale(translationKey: string, locale: string): Promise<TranslationRecordEntity | null> {
    const key = `${translationKey}_${locale}`
    const cached = this.cacheMap.get(key)
    if (cached) return cached

    return null
  }

  async saveTranslation(record: TranslationRecordEntity): Promise<TranslationRecordEntity> {
    const key = `${record.translationKey}_${record.locale}`
    this.cacheMap.set(key, record)
    return record
  }
}
