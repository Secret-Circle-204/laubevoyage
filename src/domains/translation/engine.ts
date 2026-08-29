import type { TranslationRepository } from './repository'
import { TranslationProviderFactory } from './factory/translation-provider-factory'
import type { ITranslationProvider } from './providers/provider.interface'
import type { TranslationRecordEntity } from './types'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Two-Tiered Translation Engine
 * Tier 1: Memory / DB Cache lookup.
 * Tier 2: Third-party provider with in-memory Circuit Breaker resilience guard.
 */
export class TranslationEngine {
  private repository: TranslationRepository
  private provider: ITranslationProvider
  private pendingMap: Map<string, Promise<TranslationRecordEntity>> = new Map()

  // Circuit Breaker Resilience State
  private circuitState: CircuitState = 'CLOSED'
  private failureCount: number = 0
  private cooldownUntil: number = 0
  private halfOpenProbeInFlight: boolean = false

  private readonly failureThreshold: number
  private readonly defaultCooldownMs: number
  private readonly minCooldownMs: number = 5000 // 5 seconds minimum bounded cooldown
  private readonly maxCooldownMs: number = 300000 // 5 minutes maximum bounded cooldown

  constructor(repository: TranslationRepository, provider?: ITranslationProvider) {
    this.repository = repository
    this.provider = provider || TranslationProviderFactory.getProvider()
    this.failureThreshold = Number(process.env.TRANSLATION_FAILURE_THRESHOLD) || 3
    this.defaultCooldownMs = Number(process.env.TRANSLATION_CIRCUIT_COOLDOWN_MS) || 60000
  }

  // --- Circuit Breaker Observability & Test Helpers ---
  getCircuitState(): CircuitState {
    this.evaluateCooldownTransition()
    return this.circuitState
  }

  getFailureCount(): number {
    return this.failureCount
  }

  getCooldownUntil(): number {
    return this.cooldownUntil
  }

  resetCircuitForTest(): void {
    this.circuitState = 'CLOSED'
    this.failureCount = 0
    this.cooldownUntil = 0
    this.halfOpenProbeInFlight = false
  }

  /**
   * Evaluates time-based state transitions from OPEN to HALF_OPEN.
   */
  private evaluateCooldownTransition(): void {
    if (this.circuitState === 'OPEN' && Date.now() >= this.cooldownUntil) {
      this.circuitState = 'HALF_OPEN'
      this.halfOpenProbeInFlight = false
      console.log(`[TranslationEngine] Circuit breaker entering HALF_OPEN probe state. Testing provider health...`)
    }
  }

  /**
   * Determines if an external network call to the provider is permitted.
   * Returns true if CLOSED or eligible for a HALF_OPEN single probe.
   */
  private canAttemptProviderEgress(): boolean {
    this.evaluateCooldownTransition()

    if (this.circuitState === 'OPEN') {
      return false
    }

    if (this.circuitState === 'HALF_OPEN') {
      if (this.halfOpenProbeInFlight) {
        return false // Only 1 probe at a time allowed
      }
      this.halfOpenProbeInFlight = true
      return true
    }

    return true
  }

  private handleProviderSuccess(): void {
    if (this.circuitState === 'HALF_OPEN' || this.circuitState === 'OPEN') {
      console.log(`[TranslationEngine] Circuit breaker recovered to CLOSED. Provider healthy.`)
    }
    this.circuitState = 'CLOSED'
    this.failureCount = 0
    this.cooldownUntil = 0
    this.halfOpenProbeInFlight = false
  }

  private handleProviderFailure(err: unknown): void {
    this.halfOpenProbeInFlight = false
    const status = (err as any)?.status
    const retryAfter = (err as any)?.retryAfter
    const isTimeout = (err as any)?.name === 'TimeoutError' || (err as any)?.name === 'AbortError'

    // 1. HTTP 400 and 404 do NOT count towards circuit tripping (client/request error, not provider outage)
    if (status === 400 || status === 404) {
      return
    }

    // 2. HTTP 429 and HTTP 401/403 trip immediately to OPEN
    if (status === 429 || status === 401 || status === 403) {
      let cooldown = this.defaultCooldownMs
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10)
        if (!isNaN(parsed)) {
          cooldown = parsed * 1000
        } else {
          const parsedDate = new Date(retryAfter).getTime()
          if (!isNaN(parsedDate)) {
            cooldown = Math.max(0, parsedDate - Date.now())
          }
        }
      }
      const boundedCooldown = Math.min(Math.max(cooldown, this.minCooldownMs), this.maxCooldownMs)
      this.tripCircuit(
        status === 429 ? 'HTTP 429 (Rate Limited)' : `HTTP ${status} (Auth Failure)`,
        boundedCooldown
      )
      return
    }

    // 3. 5xx, Timeout, Network failure, or malformed response increment failure count
    this.failureCount++
    if (this.circuitState === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      const reason = isTimeout
        ? 'Request Timeout'
        : status
        ? `HTTP ${status}`
        : err instanceof Error
        ? err.message
        : 'Unknown Provider Failure'
      this.tripCircuit(reason, this.defaultCooldownMs)
    }
  }

  private tripCircuit(reason: string, cooldownMs: number): void {
    const previousState = this.circuitState
    this.circuitState = 'OPEN'
    this.cooldownUntil = Date.now() + cooldownMs
    this.failureCount = this.failureThreshold
    this.halfOpenProbeInFlight = false

    if (previousState !== 'OPEN') {
      console.warn(
        `[TranslationEngine] Circuit breaker tripped to OPEN. Provider: "${this.provider.providerId}". Reason: ${reason}. Cooldown: ${cooldownMs}ms.`
      )
    }
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

    // 1. Tier 1 & 2: Cache lookup (RAM + DB Persistence) — ALWAYS RUNS FIRST (Cache Read Immunity)
    const cached = await this.repository.findByKeyAndLocale(translationKey, locale)
    if (cached) return cached

    // 2. Circuit Breaker Fast-Short-Circuit: If OPEN, fast-fallback immediately with 0 egress
    if (!this.canAttemptProviderEgress()) {
      throw new Error(`[TranslationEngine] Circuit breaker is OPEN for provider "${this.provider.providerId}". Egress paused.`)
    }

    // 3. In-Flight Concurrent Request Deduplication (Pending Lock)
    const lockKey = `${translationKey}_${locale}`
    const existingPending = this.pendingMap.get(lockKey)
    if (existingPending) {
      return existingPending
    }

    const executionPromise = (async () => {
      try {
        const translatedText = await this.provider.translateKey(translationKey, locale)
        if (!translatedText || !translatedText.trim()) {
          throw new Error(`[TranslationEngine] Provider returned empty translation for key: "${translationKey}"`)
        }

        this.handleProviderSuccess()

        const record: TranslationRecordEntity = {
          translationId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          translationKey,
          locale,
          translatedText,
          provider: this.provider.providerId,
          cachedAt: new Date().toISOString(),
        }

        return await this.repository.saveTranslation(record)
      } catch (err: unknown) {
        this.handleProviderFailure(err)
        throw err
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

    // 2. Query Two-Tiered Cache (RAM + DB Collection) — ALWAYS RUNS FIRST (Cache Read Immunity)
    const { foundMap, missingKeys } = await this.repository.findByKeysAndLocaleBatch(uniqueTexts, locale)

    const validMissingKeys = missingKeys.filter((k) => Boolean(k && k.trim()))

    if (validMissingKeys.length > 0) {
      // Circuit Breaker Fast Short-Circuit: If OPEN, fast-fallback immediately with 0 egress
      if (!this.canAttemptProviderEgress()) {
        return texts.map((t) => foundMap.get(t) || t)
      }

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
          const translatedMissing = await this.provider.translateBatch(keysToFetch, locale)

          // ATOMIC VALIDATION: exact count, string, non-empty
          if (!Array.isArray(translatedMissing) || translatedMissing.length !== keysToFetch.length) {
            throw new Error(
              `[TranslationEngine] Batch provider result count mismatch: expected ${keysToFetch.length}, got ${
                Array.isArray(translatedMissing) ? translatedMissing.length : typeof translatedMissing
              }`
            )
          }

          // Pass 1: Strict Validation of every segment
          const validEntries: { originalText: string; translatedText: string }[] = []
          for (let i = 0; i < keysToFetch.length; i++) {
            const originalText = keysToFetch[i]
            const translatedText = translatedMissing[i]

            if (typeof translatedText !== 'string' || !translatedText.trim()) {
              throw new Error(
                `[TranslationEngine] Invalid or empty translation returned at index ${i} for key: "${originalText}"`
              )
            }

            validEntries.push({ originalText, translatedText })
          }

          // Pass 2: Atomic assignment to foundMap and persistence list
          const newRecords: TranslationRecordEntity[] = []
          for (let i = 0; i < validEntries.length; i++) {
            const { originalText, translatedText } = validEntries[i]
            foundMap.set(originalText, translatedText)

            newRecords.push({
              translationId: `trans_${Date.now()}_${i}`,
              translationKey: originalText,
              locale,
              translatedText,
              provider: this.provider.providerId,
              cachedAt: new Date().toISOString(),
            })
          }

          // Save new translations to RAM + Persistent Database
          await this.repository.saveTranslationsBatch(newRecords)
          this.handleProviderSuccess()
          batchResolve(newRecords)
        } catch (err: unknown) {
          this.handleProviderFailure(err)
          batchReject(err)
          // CRITICAL INVARIANT: DO NOT call saveTranslationsBatch on failure
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

