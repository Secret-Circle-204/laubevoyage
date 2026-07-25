import type { Payload } from 'payload'
import type { TranslationRecordEntity } from './types'

/**
 * Translation Repository
 * Two-Tiered Data Persistence Layer (RAM Memory + Persistent Payload DB Collection).
 * Language-agnostic persistence layer following Option B & Enterprise Architecture Contract.
 */
export class TranslationRepository {
  private payload?: Payload
  private cacheMap: Map<string, TranslationRecordEntity> = new Map()

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async findByKeyAndLocale(
    translationKey: string,
    locale: string,
  ): Promise<TranslationRecordEntity | null> {
    const key = `${translationKey}_${locale}`

    // Tier 1: Check RAM Cache
    const ramCached = this.cacheMap.get(key)
    if (ramCached) return ramCached

    // Tier 2: Check Database Persistent Cache
    if (this.payload) {
      try {
        const res = await this.payload.find({
          collection: 'translation-cache',
          where: {
            and: [{ originalHash: { equals: translationKey } }, { language: { equals: locale } }],
          },
          limit: 1,
        })

        if (res.docs && res.docs.length > 0) {
          const doc = res.docs[0] as Record<string, any>
          const record: TranslationRecordEntity = {
            translationId: String(doc.id),
            translationKey: doc.originalHash,
            locale: doc.language,
            translatedText: doc.translatedText,
            provider: doc.provider || 'google',
            cachedAt: typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString(),
          }

          // Populate RAM Cache
          this.cacheMap.set(key, record)
          return record
        }
      } catch (err: unknown) {
        console.error('[TranslationRepository] DB persistent cache lookup failed:', err)
      }
    }

    return null
  }

  /**
   * Tier 1 (RAM) -> Tier 2 (Database) Batch Lookup
   * Reduces DB queries and returns found translations map + missing keys.
   */
  async findByKeysAndLocaleBatch(
    translationKeys: string[],
    locale: string,
  ): Promise<{ foundMap: Map<string, string>; missingKeys: string[] }> {
    const foundMap = new Map<string, string>()
    const missingKeys: string[] = []

    // 1. Check RAM Cache for each key
    for (const keyText of translationKeys) {
      const cacheKey = `${keyText}_${locale}`
      const ramRecord = this.cacheMap.get(cacheKey)
      if (ramRecord) {
        foundMap.set(keyText, ramRecord.translatedText)
      } else {
        missingKeys.push(keyText)
      }
    }

    // 2. For RAM misses, query Database Persistent Cache in a single batch
    if (missingKeys.length > 0 && this.payload) {
      try {
        const res = await this.payload.find({
          collection: 'translation-cache',
          where: {
            and: [{ originalHash: { in: missingKeys } }, { language: { equals: locale } }],
          },
          limit: missingKeys.length,
        })

        const dbMissingSet = new Set(missingKeys)

        for (const doc of res.docs || []) {
          const item = doc as Record<string, any>
          const originalText = item.originalHash
          const translatedText = item.translatedText

          if (originalText && translatedText) {
            foundMap.set(originalText, translatedText)
            dbMissingSet.delete(originalText)

            // Populate RAM Cache
            const recordKey = `${originalText}_${locale}`
            this.cacheMap.set(recordKey, {
              translationId: String(item.id),
              translationKey: originalText,
              locale,
              translatedText,
              provider: item.provider || 'google',
              cachedAt:
                typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
            })
          }
        }

        return { foundMap, missingKeys: Array.from(dbMissingSet) }
      } catch (err: unknown) {
        console.error('[TranslationRepository] Batch DB cache lookup failed:', err)
      }
    }

    return { foundMap, missingKeys }
  }

  /**
   * Save single translation to RAM Cache and Database Persistent Collection.
   * Relies on Database Compound Unique Constraint (originalHash, language) to handle race conditions cleanly.
   */
  async saveTranslation(record: TranslationRecordEntity): Promise<TranslationRecordEntity> {
    const key = `${record.translationKey}_${record.locale}`
    this.cacheMap.set(key, record)

    if (this.payload) {
      try {
        await this.payload.create({
          collection: 'translation-cache',
          data: {
            originalHash: record.translationKey,
            sourceText: record.translationKey,
            language: record.locale,
            translatedText: record.translatedText,
            provider: record.provider || 'google',
            version: 1,
          },
        })
      } catch (err: unknown) {
        const msg = String(err)
        const isDuplicate =
          msg.includes('duplicate key') ||
          msg.includes('unique constraint') ||
          msg.includes('original_hash, language') ||
          msg.includes('Value must be unique')

        if (!isDuplicate) {
          console.error('[TranslationRepository] Failed persisting translation to DB:', err)
        }
      }
    }

    return record
  }

  /**
   * Batch save translations in parallel (Promise.allSettled) to RAM Cache and Database Persistent Collection.
   */
  async saveTranslationsBatch(
    records: TranslationRecordEntity[],
  ): Promise<TranslationRecordEntity[]> {
    if (!records || records.length === 0) return []
    await Promise.allSettled(records.map((r) => this.saveTranslation(r)))
    return records
  }
}
