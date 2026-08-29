import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TranslationEngine } from '@/domains/translation/engine'
import { TranslationService } from '@/domains/translation/service'
import { TranslationProviderFactory } from '@/domains/translation/factory/translation-provider-factory'
import type { TranslationRepository } from '@/domains/translation/repository'
import type { ITranslationProvider } from '@/domains/translation/providers/provider.interface'
import type { TranslationRecordEntity } from '@/domains/translation/types'

describe('Phase B.1: Translation Integrity & Cache Safety Unit Tests', () => {
  let mockRepo: any
  let mockProvider: ITranslationProvider

  beforeEach(() => {
    mockRepo = {
      findByKeyAndLocale: vi.fn().mockResolvedValue(null),
      findByKeysAndLocaleBatch: vi.fn().mockImplementation((keys: string[]) => {
        return Promise.resolve({
          foundMap: new Map<string, string>(),
          missingKeys: [...keys],
        })
      }),
      saveTranslation: vi.fn().mockImplementation((r: TranslationRecordEntity) => Promise.resolve(r)),
      saveTranslationsBatch: vi.fn().mockImplementation((records: TranslationRecordEntity[]) => Promise.resolve(records)),
    }

    mockProvider = {
      providerId: 'google',
      translateText: vi.fn(),
      translateKey: vi.fn(),
      translateBatch: vi.fn(),
    }
  })

  // --------------------------------------------------------------------------
  // 1. Single Translation Invariants
  // --------------------------------------------------------------------------

  it('Invariant A: Provider success persists verified translation to repository', async () => {
    mockProvider.translateKey = vi.fn().mockResolvedValue('تم تأكيد الحجز')

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const result = await engine.translate('booking.confirmed', 'ar')

    expect(result.translationKey).toBe('booking.confirmed')
    expect(result.translatedText).toBe('تم تأكيد الحجز')
    expect(result.provider).toBe('google')
    expect(mockRepo.saveTranslation).toHaveBeenCalledTimes(1)
    expect(mockRepo.saveTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        translationKey: 'booking.confirmed',
        locale: 'ar',
        translatedText: 'تم تأكيد الحجز',
      })
    )
  })

  it('Invariant B: Provider 429 error propagates from Engine and NEVER calls saveTranslation', async () => {
    mockProvider.translateKey = vi.fn().mockRejectedValue(new Error('[GoogleTranslationProvider] API returned status 429'))

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const service = new TranslationService(mockRepo as unknown as TranslationRepository, mockProvider)

    // Engine must throw explicitly
    await expect(engine.translate('booking.confirmed', 'ar')).rejects.toThrow('API returned status 429')
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()

    // Service translate() returns transient source string, but DOES NOT persist
    const fallbackText = await service.translate('booking.confirmed', 'ar')
    expect(fallbackText).toBe('booking.confirmed')
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()
  })

  it('Invariant C: Empty or whitespace translation from provider is rejected and NEVER persisted', async () => {
    mockProvider.translateKey = vi.fn().mockResolvedValue('   ')

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    await expect(engine.translate('booking.confirmed', 'ar')).rejects.toThrow('Provider returned empty translation')
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 2. Batch Translation Invariants & Atomicity
  // --------------------------------------------------------------------------

  it('Invariant D: Batch provider success persists all verified records', async () => {
    mockProvider.translateBatch = vi.fn().mockResolvedValue(['القاهرة', 'الأقصر'])

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const results = await engine.translateBatch(['Cairo', 'Luxor'], 'ar')

    expect(results).toEqual(['القاهرة', 'الأقصر'])
    expect(mockRepo.saveTranslationsBatch).toHaveBeenCalledTimes(1)
    expect(mockRepo.saveTranslationsBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ translationKey: 'Cairo', translatedText: 'القاهرة' }),
        expect.objectContaining({ translationKey: 'Luxor', translatedText: 'الأقصر' }),
      ])
    )
  })

  it('Invariant E: Batch provider 429 error NEVER calls saveTranslationsBatch or mutates cache', async () => {
    mockProvider.translateBatch = vi.fn().mockRejectedValue(new Error('[GoogleTranslationProvider] API returned status 429'))

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const results = await engine.translateBatch(['Cairo', 'Luxor'], 'ar')

    // Returns transient source strings
    expect(results).toEqual(['Cairo', 'Luxor'])
    // Zero persistence
    expect(mockRepo.saveTranslationsBatch).not.toHaveBeenCalled()
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()
  })

  it('Invariant F: Batch length mismatch fails atomically with ZERO persistence', async () => {
    // Expected 2, but provider only returned 1 segment
    mockProvider.translateBatch = vi.fn().mockResolvedValue(['القاهرة'])

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const results = await engine.translateBatch(['Cairo', 'Luxor'], 'ar')

    expect(results).toEqual(['Cairo', 'Luxor'])
    expect(mockRepo.saveTranslationsBatch).not.toHaveBeenCalled()
  })

  it('Invariant G: Batch with empty/whitespace item fails atomically with ZERO persistence', async () => {
    // Second item is whitespace
    mockProvider.translateBatch = vi.fn().mockResolvedValue(['القاهرة', '   '])

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const results = await engine.translateBatch(['Cairo', 'Luxor'], 'ar')

    expect(results).toEqual(['Cairo', 'Luxor'])
    expect(mockRepo.saveTranslationsBatch).not.toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 3. Concurrency & In-Flight Deduplication
  // --------------------------------------------------------------------------

  it('Invariant H: Concurrent identical batch requests reuse single in-flight provider execution', async () => {
    let callCount = 0
    mockProvider.translateBatch = vi.fn().mockImplementation(async (keys: string[]) => {
      callCount++
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 50))
      return keys.map((k) => `مترجم_${k}`)
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Launch 3 concurrent identical batch requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      engine.translateBatch(['Giza', 'Aswan'], 'ar'),
      engine.translateBatch(['Giza', 'Aswan'], 'ar'),
      engine.translateBatch(['Giza', 'Aswan'], 'ar'),
    ])

    expect(res1).toEqual(['مترجم_Giza', 'مترجم_Aswan'])
    expect(res2).toEqual(['مترجم_Giza', 'مترجم_Aswan'])
    expect(res3).toEqual(['مترجم_Giza', 'مترجم_Aswan'])

    // Provider MUST have been called exactly ONCE across all 3 concurrent requests
    expect(callCount).toBe(1)
    expect(mockRepo.saveTranslationsBatch).toHaveBeenCalledTimes(1)
  })

  // --------------------------------------------------------------------------
  // 4. Cache Bypass & Factory Integration
  // --------------------------------------------------------------------------

  it('Invariant I: Cached translation skips external provider completely', async () => {
    mockRepo.findByKeysAndLocaleBatch = vi.fn().mockResolvedValue({
      foundMap: new Map([
        ['Cairo', 'القاهرة'],
        ['Luxor', 'الأقصر'],
      ]),
      missingKeys: [],
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const results = await engine.translateBatch(['Cairo', 'Luxor'], 'ar')

    expect(results).toEqual(['القاهرة', 'الأقصر'])
    expect(mockProvider.translateBatch).not.toHaveBeenCalled()
    expect(mockRepo.saveTranslationsBatch).not.toHaveBeenCalled()
  })

  it('Invariant J: TranslationEngine obtains provider via TranslationProviderFactory by default', () => {
    const factoryProvider = TranslationProviderFactory.getProvider()
    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository)

    // Verify engine was initialized with factory provider
    expect((engine as any).provider).toBeDefined()
    expect((engine as any).provider.providerId).toBe(factoryProvider.providerId)
  })

  // --------------------------------------------------------------------------
  // 5. Phase B.3.1: Circuit Breaker & Resilience Behavior Tests
  // --------------------------------------------------------------------------

  it('Resilience A: HTTP 429 trips circuit immediately to OPEN and subsequent requests execute ZERO provider calls', async () => {
    let providerCalls = 0
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      providerCalls++
      const err = new Error('[GoogleTranslationProvider] API returned status 429')
      ;(err as any).status = 429
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Request 1: hits provider and receives 429
    expect(engine.getCircuitState()).toBe('CLOSED')
    await expect(engine.translate('Nile Dinner', 'fr')).rejects.toThrow('429')
    expect(providerCalls).toBe(1)
    expect(engine.getCircuitState()).toBe('OPEN')

    // Requests 2, 3, 4: executed while OPEN. Provider MUST NOT be called!
    await expect(engine.translate('Pyramid Tour', 'fr')).rejects.toThrow('Circuit breaker is OPEN')
    await expect(engine.translate('Desert Safari', 'fr')).rejects.toThrow('Circuit breaker is OPEN')
    await expect(engine.translate('Red Sea Diving', 'fr')).rejects.toThrow('Circuit breaker is OPEN')

    // Exact Provider Invocation Count MUST STILL BE 1!
    expect(providerCalls).toBe(1)
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()
  })

  it('Resilience B: 3 consecutive 5xx errors trip circuit to OPEN', async () => {
    let providerCalls = 0
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      providerCalls++
      const err = new Error('[GoogleTranslationProvider] API returned status 503')
      ;(err as any).status = 503
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Request 1: 1st failure
    await expect(engine.translate('Key1', 'fr')).rejects.toThrow('503')
    expect(engine.getCircuitState()).toBe('CLOSED')
    expect(engine.getFailureCount()).toBe(1)

    // Request 2: 2nd failure
    await expect(engine.translate('Key2', 'fr')).rejects.toThrow('503')
    expect(engine.getCircuitState()).toBe('CLOSED')
    expect(engine.getFailureCount()).toBe(2)

    // Request 3: 3rd failure -> Trips to OPEN
    await expect(engine.translate('Key3', 'fr')).rejects.toThrow('503')
    expect(engine.getCircuitState()).toBe('OPEN')
    expect(providerCalls).toBe(3)

    // Request 4: While OPEN -> Fast bypass with zero provider calls
    await expect(engine.translate('Key4', 'fr')).rejects.toThrow('Circuit breaker is OPEN')
    expect(providerCalls).toBe(3)
  })

  it('Resilience C: 3 consecutive timeouts trip circuit to OPEN', async () => {
    let providerCalls = 0
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      providerCalls++
      const err = new Error('[GoogleTranslationProvider] Request timed out after 3500ms')
      ;(err as any).name = 'TimeoutError'
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // 3 timeouts in a row
    await expect(engine.translate('T1', 'de')).rejects.toThrow('timed out')
    await expect(engine.translate('T2', 'de')).rejects.toThrow('timed out')
    await expect(engine.translate('T3', 'de')).rejects.toThrow('timed out')

    expect(engine.getCircuitState()).toBe('OPEN')
    expect(providerCalls).toBe(3)

    // Next call is fast-bypassed
    await expect(engine.translate('T4', 'de')).rejects.toThrow('Circuit breaker is OPEN')
    expect(providerCalls).toBe(3)
  })

  it('Resilience D: HTTP 400 and 404 do NOT increment breaker failure count and do NOT trip circuit', async () => {
    let providerCalls = 0
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      providerCalls++
      const err = new Error('[GoogleTranslationProvider] API returned status 400')
      ;(err as any).status = 400
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // 5 Bad Requests in a row
    for (let i = 0; i < 5; i++) {
      await expect(engine.translate(`BadKey_${i}`, 'es')).rejects.toThrow('400')
    }

    // Circuit MUST remain CLOSED with failureCount = 0
    expect(engine.getCircuitState()).toBe('CLOSED')
    expect(engine.getFailureCount()).toBe(0)
    expect(providerCalls).toBe(5)
  })

  it('Resilience E: HTTP 401/403 credential error trips circuit immediately to OPEN', async () => {
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      const err = new Error('[GoogleTranslationProvider] API returned status 401')
      ;(err as any).status = 401
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    await expect(engine.translate('AuthTest', 'it')).rejects.toThrow('401')
    expect(engine.getCircuitState()).toBe('OPEN')
  })

  it('Resilience F: HALF_OPEN allows 1 probe request; success transitions to CLOSED', async () => {
    let providerCalls = 0
    let shouldSucceed = false

    mockProvider.translateKey = vi.fn().mockImplementation(async (key: string) => {
      providerCalls++
      if (!shouldSucceed) {
        const err = new Error('429')
        ;(err as any).status = 429
        throw err
      }
      return `Translated_${key}`
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Step 1: Trip to OPEN
    await expect(engine.translate('InitialKey', 'ar')).rejects.toThrow('429')
    expect(engine.getCircuitState()).toBe('OPEN')
    expect(providerCalls).toBe(1)

    // Step 2: Simulate cooldown expiration
    ;(engine as any).cooldownUntil = Date.now() - 1000 // In the past

    // Step 3: Now state should transition to HALF_OPEN on evaluation
    expect(engine.getCircuitState()).toBe('HALF_OPEN')

    // Step 4: Execute probe with healthy provider
    shouldSucceed = true
    const probeResult = await engine.translate('ProbeKey', 'ar')

    expect(probeResult.translatedText).toBe('Translated_ProbeKey')
    expect(providerCalls).toBe(2)
    // Circuit MUST recover to CLOSED
    expect(engine.getCircuitState()).toBe('CLOSED')
    expect(engine.getFailureCount()).toBe(0)
  })

  it('Resilience G: HALF_OPEN probe failure transitions back to OPEN', async () => {
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      const err = new Error('500')
      ;(err as any).status = 500
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Trip to OPEN
    ;(engine as any).tripCircuit('Test Outage', 60000)
    expect(engine.getCircuitState()).toBe('OPEN')

    // Expire cooldown -> HALF_OPEN
    ;(engine as any).cooldownUntil = Date.now() - 1000
    expect(engine.getCircuitState()).toBe('HALF_OPEN')

    // Probe fails
    await expect(engine.translate('FailedProbe', 'ar')).rejects.toThrow('500')

    // Circuit MUST return to OPEN
    expect(engine.getCircuitState()).toBe('OPEN')
  })

  it('Resilience H: Cache reads remain 100% operational when Circuit is OPEN (Cache Read Immunity)', async () => {
    mockRepo.findByKeysAndLocaleBatch = vi.fn().mockResolvedValue({
      foundMap: new Map([
        ['CachedKey1', 'ترجمة 1'],
        ['CachedKey2', 'ترجمة 2'],
      ]),
      missingKeys: [],
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Intentionally trip circuit to OPEN
    ;(engine as any).tripCircuit('Simulated 1-Hour Outage', 3600000)
    expect(engine.getCircuitState()).toBe('OPEN')

    // Query cached translations
    const results = await engine.translateBatch(['CachedKey1', 'CachedKey2'], 'ar')

    // MUST succeed completely with 0 provider calls
    expect(results).toEqual(['ترجمة 1', 'ترجمة 2'])
    expect(mockProvider.translateBatch).not.toHaveBeenCalled()
    expect(mockProvider.translateKey).not.toHaveBeenCalled()
  })

  it('Resilience I: Retry-After header is clamped within [5s, 5m] bounds', async () => {
    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    // Subtest 1: Outrageous Retry-After (999999999 seconds)
    const errHuge = new Error('429')
    ;(errHuge as any).status = 429
    ;(errHuge as any).retryAfter = '999999999'

    ;(engine as any).handleProviderFailure(errHuge)
    const cooldown1 = engine.getCooldownUntil() - Date.now()

    // Must be clamped to <= 300,000ms (5 minutes)
    expect(cooldown1).toBeLessThanOrEqual(300000)
    expect(cooldown1).toBeGreaterThanOrEqual(299000)

    // Subtest 2: Tiny Retry-After (1 second)
    const errTiny = new Error('429')
    ;(errTiny as any).status = 429
    ;(errTiny as any).retryAfter = '1'

    ;(engine as any).handleProviderFailure(errTiny)
    const cooldown2 = engine.getCooldownUntil() - Date.now()

    // Must be clamped to >= 5,000ms (5 seconds)
    expect(cooldown2).toBeGreaterThanOrEqual(4900)
    expect(cooldown2).toBeLessThanOrEqual(5000)
  })

  it('Resilience J: Batch transport chunk failure enforces All-or-Nothing atomicity with ZERO persistence', async () => {
    // Simulating a provider whose 3rd chunk fails
    mockProvider.translateBatch = vi.fn().mockRejectedValue(new Error('[GoogleTranslationProvider] Batch chunk 3 failed'))

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)
    const texts = Array.from({ length: 25 }, (_, i) => `Tour Package Item ${i + 1}`)

    const results = await engine.translateBatch(texts, 'fr')

    // Returns transient original texts for all 25 items
    expect(results).toEqual(texts)
    // ZERO persistence to DB or RAM
    expect(mockRepo.saveTranslationsBatch).not.toHaveBeenCalled()
    expect(mockRepo.saveTranslation).not.toHaveBeenCalled()
  })

  it('Resilience K: Timeout cleanly purges pendingMap without leaving stale promises', async () => {
    mockProvider.translateKey = vi.fn().mockImplementation(async () => {
      const err = new Error('Request timed out')
      ;(err as any).name = 'TimeoutError'
      throw err
    })

    const engine = new TranslationEngine(mockRepo as unknown as TranslationRepository, mockProvider)

    await expect(engine.translate('TimeoutKey', 'zh')).rejects.toThrow('timed out')

    // Verify pendingMap is empty
    expect((engine as any).pendingMap.size).toBe(0)
    expect((engine as any).pendingMap.get('TimeoutKey_zh')).toBeUndefined()
  })
})
