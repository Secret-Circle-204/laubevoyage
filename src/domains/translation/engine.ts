import type { TranslationRepository } from './repository'
import { GoogleTranslateProvider } from './providers/google-provider'
import type { ITranslationProvider } from './providers/provider.interface'
import type { TranslationRecordEntity } from './types'

/**
 * Two-Tiered Translation Engine
 * Tier 1: Memory / DB Cache lookup.
 * Tier 2: Third-party provider fallback (Zero Latency Policy - cached permanently).
 */
export class TranslationEngine {
  private repository: TranslationRepository
  private provider: ITranslationProvider
  private pendingMap: Map<string, Promise<TranslationRecordEntity>> = new Map()

  constructor(repository: TranslationRepository, provider?: ITranslationProvider) {
    this.repository = repository
    this.provider = provider || new GoogleTranslateProvider()
  }

  async translate(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    // 0. Base Language or Falsy/Whitespace Short-Circuit: Zero DB, zero cache, zero Google calls
    if (!translationKey || !translationKey.trim() || locale === 'en' || locale === 'en-US') {
      return {
        translationId: 'base_en',
        translationKey: translationKey || '',
        locale: locale || 'en',
        translatedText: translationKey || '',
        provider: 'cache',
        cachedAt: new Date().toISOString(),
      }
    }

    // 1. Tier 1 & 2: Cache lookup (RAM + DB Persistence)
    const cached = await this.repository.findByKeyAndLocale(translationKey, locale)
    if (cached) return cached

    // 2. In-Flight Concurrent Request Deduplication (Pending Lock)
    const lockKey = `${translationKey}_${locale}`
    const existingPending = this.pendingMap.get(lockKey)
    if (existingPending) {
      return existingPending
    }

    const executionPromise = (async () => {
      try {
        const translatedText = await this.provider.translateKey(translationKey, locale)
        const record: TranslationRecordEntity = {
          translationId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          translationKey,
          locale,
          translatedText,
          provider: 'google',
          cachedAt: new Date().toISOString(),
        }

        return await this.repository.saveTranslation(record)
      } finally {
        this.pendingMap.delete(lockKey)
      }
    })()

    this.pendingMap.set(lockKey, executionPromise)
    return executionPromise
  }

  /**
   * Batch Translate Multiple Texts in 1 Single Provider Request.
   * Leverages Two-Tiered Cache (RAM + Database Persistence).
   */
  async translateBatch(texts: string[], locale: string): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (locale === 'en') return texts

    // 1. Business Logic Deduplication: Prevent redundant translations/inserts of duplicate strings in the same batch
    const uniqueTexts = Array.from(new Set(texts))

    // 2. Query Two-Tiered Cache (RAM + DB Collection)
    const { foundMap, missingKeys } = await this.repository.findByKeysAndLocaleBatch(uniqueTexts, locale)

    // 2. Fetch missing non-empty texts from provider in 1 Single Batch Request
    const validMissingKeys = missingKeys.filter((k) => Boolean(k && k.trim()))

    if (validMissingKeys.length > 0) {
      try {
        const translatedMissing = await this.provider.translateBatch(validMissingKeys, locale)
        const newRecords: TranslationRecordEntity[] = []

        for (let i = 0; i < validMissingKeys.length; i++) {
          const originalText = validMissingKeys[i]
          const translatedText = translatedMissing[i] || originalText
          foundMap.set(originalText, translatedText)

          newRecords.push({
            translationId: `trans_${Date.now()}_${i}`,
            translationKey: originalText,
            locale,
            translatedText,
            provider: 'google',
            cachedAt: new Date().toISOString(),
          })
        }

        // Save new translations to RAM + Persistent Database
        await this.repository.saveTranslationsBatch(newRecords)
      } catch (err: unknown) {
        console.error('[TranslationEngine] Batch provider execution failed:', err)
      }
    }

    // 3. Reconstruct translated array in original order
    return texts.map((t) => foundMap.get(t) || t)
  }
}
