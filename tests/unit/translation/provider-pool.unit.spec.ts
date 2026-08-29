import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TranslationProviderPool } from '../../../src/domains/translation/pool/translation-provider-pool'
import { TranslationProviderFactory } from '../../../src/domains/translation/factory/translation-provider-factory'
import type { ITranslationProvider } from '../../../src/domains/translation/providers/provider.interface'
import type { TranslationProviderId } from '../../../src/domains/translation/types'

// Mock Providers for deterministic testing
class MockTestProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId
  public callCount = 0
  public batchCallCount = 0
  public shouldFailWith: Error | null = null
  public delayMs = 0
  private configured: boolean

  constructor(id: TranslationProviderId, configured = true) {
    this.providerId = id
    this.configured = configured
  }

  isConfigured(): boolean {
    return this.configured
  }

  async translateText(text: string, targetLocale: string, sourceLocale: string = 'en'): Promise<string> {
    this.callCount++
    if (this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs))
    }
    if (this.shouldFailWith) {
      throw this.shouldFailWith
    }
    return `[${this.providerId}:${targetLocale}] ${text}`
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    this.batchCallCount++
    if (this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs))
    }
    if (this.shouldFailWith) {
      throw this.shouldFailWith
    }
    return texts.map((t) => `[${this.providerId}:${targetLocale}] ${t}`)
  }
}

describe('TranslationProviderPool — Strict Priority Cascade & Concurrency Specs', () => {
  let providerA: MockTestProvider // Azure (Primary)
  let providerB: MockTestProvider // Google GTX (Secondary Fallback)
  let providerC: MockTestProvider // Cloudflare (Tertiary Fallback)
  let pool: TranslationProviderPool

  beforeEach(() => {
    providerA = new MockTestProvider('azure')
    providerB = new MockTestProvider('google')
    providerC = new MockTestProvider('cloudflare')
    pool = new TranslationProviderPool([providerA, providerB, providerC], {
      failureThreshold: 3,
      defaultCooldownMs: 50000,
    })
  })

  // --------------------------------------------------------------------------
  // TEST 1: Strict Priority Invariant — 100% Traffic to Primary when Healthy
  // --------------------------------------------------------------------------
  it('should route 100% of requests to Provider A (Primary) when healthy with 0 calls to secondary/tertiary', async () => {
    const totalRequests = 100
    const promises: Promise<string>[] = []

    for (let i = 0; i < totalRequests; i++) {
      promises.push(pool.translateText(`Key_${i}`, 'ar'))
    }

    const results = await Promise.all(promises)
    expect(results).toHaveLength(100)

    // Primary handled 100% of traffic
    expect(providerA.callCount).toBe(100)
    // Secondary and Tertiary received ZERO traffic
    expect(providerB.callCount).toBe(0)
    expect(providerC.callCount).toBe(0)

    expect(results[0]).toBe('[azure:ar] Key_0')
    expect(results[99]).toBe('[azure:ar] Key_99')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Cascading Intra-Request Failover (A -> B -> C -> 503)
  // --------------------------------------------------------------------------
  it('should cascade failover: A (fail) -> B (success); A & B (fail) -> C (success); A, B & C (fail) -> 503', async () => {
    const error503 = new Error('HTTP 503 Service Unavailable')
    ;(error503 as any).status = 503
    providerA.shouldFailWith = error503

    // Request 1: Provider A fails -> fails over to Provider B in the same request
    const result1 = await pool.translateText('Key_1', 'ar')
    expect(result1).toBe('[google:ar] Key_1')

    // Invariant: Provider A called (1) and failed; Provider B called (1) and succeeded; Provider C called (0)
    expect(providerA.callCount).toBe(1)
    expect(providerB.callCount).toBe(1)
    expect(providerC.callCount).toBe(0)

    // Request 2: Provider A and Provider B both fail -> fails over to Provider C in the same request
    const error429 = new Error('HTTP 429 Rate Limit')
    ;(error429 as any).status = 429
    providerB.shouldFailWith = error429

    const result2 = await pool.translateText('Key_2', 'ar')
    expect(result2).toBe('[cloudflare:ar] Key_2')
    expect(providerA.callCount).toBe(2)
    expect(providerB.callCount).toBe(2)
    expect(providerC.callCount).toBe(1)

    // Request 3: All 3 providers fail -> throws 503 out-of-service error
    providerC.shouldFailWith = error429
    await expect(pool.translateText('Key_3', 'ar')).rejects.toThrow(
      'All translation providers in the pool failed or are in OPEN circuit state'
    )
  })

  // --------------------------------------------------------------------------
  // TEST 3: Fast-Bypass when Priority 1 is OPEN (Zero Network Calls to Degraded Provider)
  // --------------------------------------------------------------------------
  it('should skip Provider A with 0 network calls when OPEN, executing Provider B directly', async () => {
    // Trip Provider A to OPEN
    const error401 = new Error('HTTP 401 Unauthorized')
    ;(error401 as any).status = 401
    providerA.shouldFailWith = error401

    const res1 = await pool.translateText('Text_1', 'ar')
    expect(res1).toBe('[google:ar] Text_1')
    expect(pool.getProviderState('azure')?.circuit).toBe('OPEN')

    const initialCallsA = providerA.callCount // 1
    const initialCallsB = providerB.callCount // 1

    // Subsequent requests skip Provider A immediately with 0 network calls
    const res2 = await pool.translateText('Text_2', 'ar')
    expect(res2).toBe('[google:ar] Text_2')
    expect(providerA.callCount).toBe(initialCallsA) // Still 1 (ZERO calls to A)
    expect(providerB.callCount).toBe(initialCallsB + 1) // 2
  })

  // --------------------------------------------------------------------------
  // TEST 4: HALF_OPEN Single-Probe Lifecycle & Recovery to 100% Primary
  // --------------------------------------------------------------------------
  it('should admit exactly 1 probe during HALF_OPEN and reclaim 100% Primary status on probe recovery', async () => {
    const error429 = new Error('Rate limit')
    ;(error429 as any).status = 429
    providerA.shouldFailWith = error429

    // Trip Provider A
    await pool.translateText('Fail_A', 'ar')
    expect(pool.getProviderState('azure')?.circuit).toBe('OPEN')

    // Force cooldown timer to expire -> becomes HALF_OPEN
    const stateA = (pool as any).states.get('azure')
    stateA.cooldownUntil = Date.now() - 10
    expect(pool.getProviderState('azure')?.circuit).toBe('HALF_OPEN')

    // Set delay on Provider A so probe stays in-flight during concurrency test
    providerA.shouldFailWith = null
    providerA.delayMs = 50

    // Launch 10 concurrent requests
    const probeRequests = Array.from({ length: 10 }, (_, i) =>
      pool.translateText(`Probe_${i}`, 'ar')
    )

    const results = await Promise.all(probeRequests)
    expect(results).toHaveLength(10)

    // Exactly ONE probe hit Provider A; the other 9 were served by Provider B!
    expect(providerA.callCount).toBe(2) // 1 initial failure + exactly 1 probe!
    expect(providerB.callCount).toBe(10) // 1 initial rescue + 9 concurrent skipped calls

    // Provider A recovered to CLOSED
    expect(pool.getProviderState('azure')?.circuit).toBe('CLOSED')
    expect(pool.getProviderState('azure')?.probeInFlight).toBe(false)

    // Next request routes 100% to Provider A again
    const normalAfterRecovery = await pool.translateText('Normal_Again', 'ar')
    expect(normalAfterRecovery).toBe('[azure:ar] Normal_Again')
    expect(providerA.callCount).toBe(3)
  })

  // --------------------------------------------------------------------------
  // TEST 5: HALF_OPEN Failure Reset Invariant
  // --------------------------------------------------------------------------
  it('should reset probeInFlight to false and return circuit to OPEN when a probe fails', async () => {
    const error500 = new Error('Server 500')
    ;(error500 as any).status = 500

    const testPool = new TranslationProviderPool([providerA, providerB], {
      failureThreshold: 1,
      defaultCooldownMs: 60000,
    })

    providerA.shouldFailWith = error500
    const res1 = await testPool.translateText('Text_1', 'ar')
    expect(res1).toBe('[google:ar] Text_1')

    // Force transition to HALF_OPEN
    const stateA = (testPool as any).states.get('azure')
    stateA.cooldownUntil = Date.now() - 10
    expect(testPool.getProviderState('azure')?.circuit).toBe('HALF_OPEN')

    // Execute probe that fails
    providerA.shouldFailWith = new Error('Probe 503')
    ;(providerA.shouldFailWith as any).status = 503

    const res2 = await testPool.translateText('Probe_Fail', 'ar')
    expect(res2).toBe('[google:ar] Probe_Fail')

    // Invariant: State returned to OPEN and probeInFlight is strictly false
    const finalState = testPool.getProviderState('azure')
    expect(finalState?.circuit).toBe('OPEN')
    expect(finalState?.probeInFlight).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 6: All Providers OPEN — Zero Network Egress Quench
  // --------------------------------------------------------------------------
  it('should throw out-of-service error with 0 provider calls when all providers are OPEN', async () => {
    const error429 = new Error('429')
    ;(error429 as any).status = 429
    providerA.shouldFailWith = error429
    providerB.shouldFailWith = error429
    providerC.shouldFailWith = error429

    await expect(pool.translateText('Key_1', 'ar')).rejects.toThrow()

    expect(pool.getProviderState('azure')?.circuit).toBe('OPEN')
    expect(pool.getProviderState('google')?.circuit).toBe('OPEN')
    expect(pool.getProviderState('cloudflare')?.circuit).toBe('OPEN')

    const initialCallsA = providerA.callCount
    const initialCallsB = providerB.callCount
    const initialCallsC = providerC.callCount

    // Now all are OPEN. Attempt 50 requests
    const blackoutPromises = Array.from({ length: 50 }, () =>
      pool.translateText('Blackout_Text', 'ar').catch((err) => err)
    )

    const errors = await Promise.all(blackoutPromises)
    expect(errors).toHaveLength(50)

    // ZERO external network calls occurred during total blackout
    expect(providerA.callCount).toBe(initialCallsA)
    expect(providerB.callCount).toBe(initialCallsB)
    expect(providerC.callCount).toBe(initialCallsC)
  })

  // --------------------------------------------------------------------------
  // TEST 7: Opt-in Filtering — Unconfigured / Disabled Google GTX Excluded
  // --------------------------------------------------------------------------
  it('should strictly exclude disabled Google GTX and route Azure -> Cloudflare directly', async () => {
    const configuredAzure = new MockTestProvider('azure', true)
    const disabledGoogle = new MockTestProvider('google', false) // ENABLE_GOOGLE_GTX is not true
    const configuredCloudflare = new MockTestProvider('cloudflare', true)

    const testPool = new TranslationProviderPool([
      configuredAzure,
      disabledGoogle,
      configuredCloudflare,
    ])

    expect(testPool.getConfiguredProviders()).toHaveLength(2)

    // When Azure fails, cascades directly to Cloudflare, skipping disabled Google
    configuredAzure.shouldFailWith = new Error('Azure 503')
    ;(configuredAzure.shouldFailWith as any).status = 503

    const res = await testPool.translateText('Key_Test', 'ar')
    expect(res).toBe('[cloudflare:ar] Key_Test')

    expect(configuredAzure.callCount).toBe(1)
    expect(disabledGoogle.callCount).toBe(0) // ZERO calls
    expect(configuredCloudflare.callCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // TEST 8: translateBatch() Consistency through Priority Cascade
  // --------------------------------------------------------------------------
  it('should delegate translateBatch() with strict priority and failover invariants', async () => {
    // Normal: 100% Azure
    const batch1 = await pool.translateBatch(['Hello', 'World'], 'ar')
    expect(batch1).toEqual(['[azure:ar] Hello', '[azure:ar] World'])
    expect(providerA.batchCallCount).toBe(1)
    expect(providerB.batchCallCount).toBe(0)

    // Azure fails: cascades to Google
    providerA.shouldFailWith = new Error('Azure Batch 503')
    ;(providerA.shouldFailWith as any).status = 503

    const batch2 = await pool.translateBatch(['Egypt', 'Nile'], 'ar')
    expect(batch2).toEqual(['[google:ar] Egypt', '[google:ar] Nile'])
    expect(providerB.batchCallCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // TEST 9: Factory Singleton & Strict 3-Provider Topology
  // --------------------------------------------------------------------------
  it('should initialize factory pool with exactly [azure, legacyGoogle, cloudflare] and exclude googleCloud', () => {
    TranslationProviderFactory.resetForTest()

    const factoryPool = TranslationProviderFactory.getPool()
    const registered = factoryPool.getRegisteredProviders()

    expect(registered).toHaveLength(3)
    expect(registered.map((p) => p.providerId)).toEqual(['azure', 'google', 'cloudflare'])
  })
})
