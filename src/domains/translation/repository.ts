import type { Payload } from 'payload'
import type { TranslationRecordEntity } from './types'

/**
 * Translation Repository
 * Data persistence layer for 'translations' Payload collection.
 */
export class TranslationRepository {
  private payload: Payload
  private cacheMap: Map<string, TranslationRecordEntity> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
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
