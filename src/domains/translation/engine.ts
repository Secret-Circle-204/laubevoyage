import type { TranslationRepository } from './repository'
import { TranslationProviderFactory } from './factory/translation-provider-factory'
import type { ITranslationProvider } from './providers/provider.interface'
import type { TranslationRecordEntity } from './types'
import { TranslationProviderPool, type PoolCircuitState } from './pool/translation-provider-pool'
import { TranslationBlackoutError } from './errors/provider-errors'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Enterprise Translation Engine
 * Tier 1: Memory & Persistent DB Cache lookup (Zero egress on hit).
 * Tier 2: Resilient Provider Pool orchestration (delegates provider circuits and fallbacks to TranslationProviderPool).
 * Responsibilities:
 * - Cache lookup before provider egress
 * - In-flight concurrent request deduplication (pendingMap)
 * - Persisting real translations on success only
 * - Zero cache pollution on provider failures
 */
export class TranslationEngine {
  private repository: TranslationRepository
  private provider: ITranslationProvider
  private pendingMap: Map<string, Promise<TranslationRecordEntity>> = new Map()

  constructor(repository: TranslationRepository, provider?: ITranslationProvider) {
    this.repository = repository
    this.provider = provider || TranslationProviderFactory.getProvider()
  }

  // --- Observability & Test Helpers (Delegated to Provider Pool) ---
  getCircuitState(): CircuitState {
    if (this.provider instanceof TranslationProviderPool) {
      return this.provider.getPoolCircuitState()
    }
    return 'CLOSED'
  }

  resetCircuitForTest(): void {
    if (this.provider instanceof TranslationProviderPool) {
      this.provider.resetAllCircuitsForTest()
    }
  }

  getPendingMapSize(): number {
    return this.pendingMap.size
  }

  async translate(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    // 0. Base Language or Falsy/Whitespace Short-Circuit: Zero DB, zero cache, zero external calls
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

    // 1. Tier 1 & 2: Cache lookup (RAM + DB Persistence) — ALWAYS RUNS FIRST (Cache Read Immunity)
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
        const result = await this.provider.translateTextWithProvenance(translationKey, locale)
        if (!result.text || !result.text.trim()) {
          throw new Error(`[TranslationEngine] Provider returned empty translation for key: "${translationKey}"`)
        }

        const record: TranslationRecordEntity = {
          translationId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          translationKey,
          locale,
          translatedText: result.text,
          provider: result.providerId,
          cachedAt: new Date().toISOString(),
        }

        // Cache write on success only
        return await this.repository.saveTranslation(record)
      } catch (err: unknown) {
        // Re-throw so caller (TranslationService) can handle blackout degradation or report application defect
        throw err
      } finally {
        // Guaranteed pending lock release
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
    if (locale === 'en' || locale === 'en-US') return texts

    // 1. Deduplicate strings in the same batch
    const uniqueTexts = Array.from(new Set(texts))

    // 2. Query Cache (RAM + DB Collection) — ALWAYS RUNS FIRST (Cache Read Immunity)
    const { foundMap, missingKeys } = await this.repository.findByKeysAndLocaleBatch(uniqueTexts, locale)

    const validMissingKeys = missingKeys.filter((k) => Boolean(k && k.trim()))

    if (validMissingKeys.length > 0) {
      // Filter out keys that already have an in-flight execution promise in pendingMap
      const keysToFetch: string[] = []
      const pendingPromises: Promise<unknown>[] = []

      for (const key of validMissingKeys) {
        const lockKey = `${key}_${locale}`
        const existing = this.pendingMap.get(lockKey)
        if (existing) {
          pendingPromises.push(
            existing
              .then((rec) => {
                if (rec && rec.translatedText) {
                  foundMap.set(key, rec.translatedText)
                }
              })
              .catch(() => {
                // In-flight request failed, do not pollute foundMap
              })
          )
        } else {
          keysToFetch.push(key)
        }
      }

      // Await any existing in-flight single/batch promises for keys in this batch
      if (pendingPromises.length > 0) {
        await Promise.allSettled(pendingPromises)
      }

      // If there are keys requiring external translation
      if (keysToFetch.length > 0) {
        let batchResolve!: (val: TranslationRecordEntity[]) => void
        let batchReject!: (err: unknown) => void
        const sharedBatchPromise = new Promise<TranslationRecordEntity[]>((resolve, reject) => {
          batchResolve = resolve
          batchReject = reject
        })

        // Register all keys in pendingMap
        for (const key of keysToFetch) {
          const lockKey = `${key}_${locale}`
          const keyPromise = sharedBatchPromise.then((records) => {
            const match = records.find((r) => r.translationKey === key)
            if (match) return match
            throw new Error(`[TranslationEngine] Key "${key}" not found in batch results`)
          })
          // Prevent unhandled rejection warning if key is not concurrently awaited
          keyPromise.catch(() => {})
          this.pendingMap.set(lockKey, keyPromise)
        }

        try {
          const batchResult = await this.provider.translateBatchWithProvenance(keysToFetch, locale)
          const translatedMissing = batchResult.texts
          const winningProvider = batchResult.providerId

          // Validation of returned segments
          if (!Array.isArray(translatedMissing) || translatedMissing.length !== keysToFetch.length) {
            throw new Error(
              `[TranslationEngine] Batch provider result count mismatch: expected ${keysToFetch.length}, got ${
                Array.isArray(translatedMissing) ? translatedMissing.length : typeof translatedMissing
              }`
            )
          }

          const validEntries: { originalText: string; translatedText: string }[] = []
          for (let i = 0; i < keysToFetch.length; i++) {
            const originalText = keysToFetch[i]!
            const translatedText = translatedMissing[i]

            if (typeof translatedText !== 'string' || !translatedText.trim()) {
              throw new Error(
                `[TranslationEngine] Invalid or empty translation returned at index ${i} for key: "${originalText}"`
              )
            }

            validEntries.push({ originalText, translatedText })
          }

          // Atomic assignment to foundMap and persistence list
          const newRecords: TranslationRecordEntity[] = []
          for (let i = 0; i < validEntries.length; i++) {
            const { originalText, translatedText } = validEntries[i]!
            foundMap.set(originalText, translatedText)

            newRecords.push({
              translationId: `trans_${Date.now()}_${i}`,
              translationKey: originalText,
              locale,
              translatedText,
              provider: winningProvider,
              cachedAt: new Date().toISOString(),
            })
          }

          // Save new translations to RAM + Persistent Database on success only
          await this.repository.saveTranslationsBatch(newRecords)
          batchResolve(newRecords)
        } catch (err: unknown) {
          batchReject(err)
          // Always re-throw so all callers (batch and coalesced single callers on pendingMap) experience the exact same failure.
          // Safe degradation is the sole responsibility of the TranslationService facade.
          throw err
        } finally {
          // Guaranteed cleanup of all registered keys from pendingMap
          for (const key of keysToFetch) {
            const lockKey = `${key}_${locale}`
            this.pendingMap.delete(lockKey)
          }
        }
      }
    }

    // 3. Reconstruct translated array in original order
    return texts.map((t) => foundMap.get(t) || t)
  }
}
