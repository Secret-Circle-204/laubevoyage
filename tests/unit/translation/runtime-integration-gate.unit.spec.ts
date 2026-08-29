import { describe, it, expect, vi } from 'vitest'
import { TranslationService } from '../../../src/domains/translation/service'
import { TranslationRepository } from '../../../src/domains/translation/repository'
import { TranslationProviderPool } from '../../../src/domains/translation/pool/translation-provider-pool'
import type { ITranslationProvider } from '../../../src/domains/translation/providers/provider.interface'
import type { TranslationProviderId } from '../../../src/domains/translation/types'

class MockProviderAdapter implements ITranslationProvider {
  readonly providerId: TranslationProviderId
  public callCount = 0
  public shouldFailWith: Error | null = null
  private configured: boolean

  constructor(id: TranslationProviderId, configured = true) {
    this.providerId = id
    this.configured = configured
  }

  isConfigured(): boolean {
    return this.configured
  }

  async translateText(text: string, targetLocale: string): Promise<string> {
    this.callCount++
    if (this.shouldFailWith) {
      throw this.shouldFailWith
    }
    return `[${this.providerId}:${targetLocale}] ${text}`
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale)
  }

  async translateBatch(texts: string[], targetLocale: string): Promise<string[]> {
    this.callCount++
    if (this.shouldFailWith) {
      throw this.shouldFailWith
    }
    return texts.map((t) => `[${this.providerId}:${targetLocale}] ${t}`)
  }
}

describe('Phase B.3.2-F — Production Runtime Integration & Failure Matrix Gate', () => {
  // --------------------------------------------------------------------------
  // TEST 1: Full 3-Tier Lifecycle (RAM Hit -> DB Hit -> Acquisition -> Eviction)
  // --------------------------------------------------------------------------
  it('should execute complete end-to-end caching lifecycle without superfluous provider calls', async () => {
    const postgresStore = new Map<string, any>()

    const mockPayload: any = {
      create: vi.fn().mockImplementation(({ data }) => {
        const key = `${data.originalHash}_${data.language}`
        const doc = { id: `pg_${Date.now()}_${Math.random()}`, ...data }
        postgresStore.set(key, doc)
        return Promise.resolve(doc)
      }),
      find: vi.fn().mockImplementation(({ where }) => {
        const hash = where.and[0].originalHash.equals
        const lang = where.and[1].language.equals
        const doc = postgresStore.get(`${hash}_${lang}`)
        return Promise.resolve({ docs: doc ? [doc] : [] })
      }),
    }

    const azure = new MockProviderAdapter('azure')
    const cloudflare = new MockProviderAdapter('cloudflare')
    const googleCloud = new MockProviderAdapter('google-cloud')
    const pool = new TranslationProviderPool([azure, cloudflare, googleCloud])

    // Capacity bound = 2 for deterministic eviction testing
    const repository = new TranslationRepository(mockPayload, { maxEntries: 2 })
    const service = new TranslationService(repository, pool)

    // --- STEP 1: True Cache Miss (Acquisition via Provider Pool) ---
    const res1 = await service.translate('Luxor Temple', 'ar')
    expect(res1).toBe('[azure:ar] Luxor Temple')
    expect(azure.callCount).toBe(1)
    expect(mockPayload.create).toHaveBeenCalledTimes(1)
    expect(postgresStore.size).toBe(1)

    // --- STEP 2: RAM Hit (0 DB calls, 0 Provider calls) ---
    mockPayload.find.mockClear()
    const res1_cached = await service.translate('Luxor Temple', 'ar')
    expect(res1_cached).toBe('[azure:ar] Luxor Temple')
    expect(azure.callCount).toBe(1) // Still 1!
    expect(mockPayload.find).toHaveBeenCalledTimes(0) // 0 DB calls

    // --- STEP 3: Add 2 More Items to Force Eviction of "Luxor Temple" from RAM ---
    await service.translate('Nile Cruise', 'ar') // Provider B (cloudflare)
    await service.translate('Red Sea', 'ar') // Provider C (google-cloud)

    expect(postgresStore.size).toBe(3)
    expect((repository as any).cacheMap.size).toBe(2)
    // Luxor Temple was evicted from RAM (because maxEntries = 2)

    // --- STEP 4: Request Evicted "Luxor Temple" -> RAM Miss -> PostgreSQL Hit -> Repopulate RAM ---
    mockPayload.find.mockClear()
    const initialAzureCalls = azure.callCount
    const initialCloudflareCalls = cloudflare.callCount
    const initialGoogleCalls = googleCloud.callCount

    const res1_repopulated = await service.translate('Luxor Temple', 'ar')
    expect(res1_repopulated).toBe('[azure:ar] Luxor Temple')

    // Invariant: Fetched from DB, ZERO new external provider calls!
    expect(mockPayload.find).toHaveBeenCalledTimes(1)
    expect(azure.callCount).toBe(initialAzureCalls)
    expect(cloudflare.callCount).toBe(initialCloudflareCalls)
    expect(googleCloud.callCount).toBe(initialGoogleCalls)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Tier Failure Matrix & Zero Cascading
  // --------------------------------------------------------------------------
  it('should isolate provider failures, prevent blind cascading, and route next request to healthy provider', async () => {
    const azure = new MockProviderAdapter('azure')
    const cloudflare = new MockProviderAdapter('cloudflare')
    const googleCloud = new MockProviderAdapter('google-cloud')
    const pool = new TranslationProviderPool([azure, cloudflare, googleCloud])
    const repository = new TranslationRepository(undefined, { maxEntries: 20000 })
    const service = new TranslationService(repository, pool)

    // 1. Azure encounters 429 quota exhaustion
    const error429 = new Error('HTTP 429 Rate Limit Exceeded')
    ;(error429 as any).status = 429
    azure.shouldFailWith = error429

    // Request 1: hits Azure -> fails -> automatically fails over to Cloudflare within the same request!
    const res1 = await service.translate('Hurghada Resort', 'ar')
    expect(res1).toBe('[cloudflare:ar] Hurghada Resort')
    expect(azure.callCount).toBe(1)
    expect(cloudflare.callCount).toBe(1) // Invariant: Successful intra-request failover!
    expect(googleCloud.callCount).toBe(0)

    // Invariant: Azure circuit is now OPEN
    expect(pool.getProviderState('azure')?.circuit).toBe('OPEN')

    // Request 2: Next incoming request evaluates Priority 1 (Azure is OPEN -> skipped) -> executes Priority 2 (Cloudflare)!
    const res2 = await service.translate('Sharm El Sheikh', 'ar')
    expect(res2).toBe('[cloudflare:ar] Sharm El Sheikh')
    expect(azure.callCount).toBe(1) // ZERO new calls to Azure
    expect(cloudflare.callCount).toBe(2)

    // Request 3: When Cloudflare also fails -> cascades to Google Cloud!
    cloudflare.shouldFailWith = error429
    const res3 = await service.translate('Cairo Tower', 'ar')
    expect(res3).toBe('[google-cloud:ar] Cairo Tower')
    expect(googleCloud.callCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // TEST 3: Total Blackout & Zero Network Egress
  // --------------------------------------------------------------------------
  it('should quench all network egress when all providers are in OPEN state', async () => {
    const azure = new MockProviderAdapter('azure')
    const cloudflare = new MockProviderAdapter('cloudflare')
    const googleCloud = new MockProviderAdapter('google-cloud')
    const pool = new TranslationProviderPool([azure, cloudflare, googleCloud], { failureThreshold: 1 })
    const repository = new TranslationRepository(undefined, { maxEntries: 20000 })
    const service = new TranslationService(repository, pool)

    const err500 = new Error('Service Unavailable')
    ;(err500 as any).status = 503
    azure.shouldFailWith = err500
    cloudflare.shouldFailWith = err500
    googleCloud.shouldFailWith = err500

    // Trip all 3 providers to OPEN
    await service.translate('Trip_1', 'ar')
    await service.translate('Trip_2', 'ar')
    await service.translate('Trip_3', 'ar')

    const callsA = azure.callCount
    const callsB = cloudflare.callCount
    const callsC = googleCloud.callCount

    // Send 100 concurrent requests during total provider blackout
    const blackoutPromises = Array.from({ length: 100 }, (_, i) =>
      service.translate(`Blackout_Key_${i}`, 'ar')
    )

    const results = await Promise.all(blackoutPromises)
    expect(results).toHaveLength(100)

    // Invariant: All returned transient source text
    for (let i = 0; i < 100; i++) {
      expect(results[i]).toBe(`Blackout_Key_${i}`)
    }

    // Invariant: ZERO network egress occurred
    expect(azure.callCount).toBe(callsA)
    expect(cloudflare.callCount).toBe(callsB)
    expect(googleCloud.callCount).toBe(callsC)
  })
})
