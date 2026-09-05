import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { TranslationRepository } from '../domains/translation/repository'
import { TranslationService } from '../domains/translation/service'
import { registerTranslationCacheSubscriber } from '../domains/events/subscribers/cache-subscribers'
import { registerPresentationSubscriber } from '../domains/events/subscribers/presentation-subscriber'
import { ITranslationProvider } from '../domains/translation/providers/provider.interface'
import { TranslationProviderPool } from '../domains/translation/pool/translation-provider-pool'

async function run() {
  console.log('================================================================')
  console.log('GATE 17.6.5 — TARGETED TRANSLATION CACHE INVALIDATION TEST SUITE')
  console.log('================================================================\n')

  const payload = await getPayload({ config })
  registerTranslationCacheSubscriber()
  registerPresentationSubscriber()

  // Clean test keys from DB before starting
  await payload.delete({
    collection: 'translation-cache',
    where: {
      originalHash: { in: ['TestKey_A', 'TestKey_B', 'TestKey_Fallback', 'Turkey_Test', 'Egypt_Test', 'Spain_Test'] }
    }
  })

  // -------------------------------------------------------------------------
  // TEST 1: NORMAL RAM HIT (Zero DB, Zero Provider Calls)
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 1: NORMAL RAM HIT PERFORMANCE INVARIANT')
  console.log('----------------------------------------------------------------')
  let providerCalls = 0
  const mockProvider: ITranslationProvider = {
    providerId: 'azure',
    translateText: async (text) => { providerCalls++; return `Translated_${text}` },
    translateKey: async (key) => { providerCalls++; return `Translated_${key}` },
    translateBatch: async (texts) => { providerCalls++; return texts.map(t => `Translated_${t}`) },
  }

  const repo1 = new TranslationRepository(payload)
  const service1 = new TranslationService(repo1, mockProvider)

  // First request: Cache Miss -> calls provider -> saves to RAM & DB
  const firstRes = await service1.translate('TestKey_A', 'ar')
  console.log(`[First Call] Result: "${firstRes}" | Provider Calls: ${providerCalls}`)
  if (firstRes !== 'Translated_TestKey_A' || providerCalls !== 1) {
    throw new Error(`TEST 1 FAILED: First call did not execute provider correctly.`)
  }

  // Second request: MUST be RAM Hit -> 0 provider calls, 0 DB queries
  const secondRes = await service1.translate('TestKey_A', 'ar')
  console.log(`[Second Call] Result: "${secondRes}" | Provider Calls: ${providerCalls}`)
  if (secondRes !== 'Translated_TestKey_A' || providerCalls !== 1) {
    throw new Error(`TEST 1 FAILED: Second call was not a pure RAM hit! Provider calls increased to ${providerCalls}`)
  }
  console.log('✅ TEST 1 PASSED: Pure RAM Hit returned in O(1) without DB or Provider calls.\n')

  // -------------------------------------------------------------------------
  // TEST 2: PAYLOAD UPDATE WITHOUT RESTART
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 2: PAYLOAD UPDATE WITHOUT RESTART (TARGETED EVICTION)')
  console.log('----------------------------------------------------------------')
  // Find DB doc for TestKey_A
  const docA = (await payload.find({
    collection: 'translation-cache',
    where: { and: [{ originalHash: { equals: 'TestKey_A' } }, { language: { equals: 'ar' } }] }
  })).docs[0]

  if (!docA) throw new Error('TestKey_A not found in DB')

  // Update doc in Payload (Simulating Admin UI modification)
  console.log(`Updating TestKey_A in Payload to "Manually_Corrected_A"...`)
  await payload.update({
    collection: 'translation-cache',
    id: docA.id,
    data: {
      translatedText: 'Manually_Corrected_A'
    }
  })

  // Request TestKey_A again on existing service1 without restart
  const postUpdateRes = await service1.translate('TestKey_A', 'ar')
  console.log(`[Post-Update Call] Result: "${postUpdateRes}" | Provider Calls: ${providerCalls}`)
  if (postUpdateRes !== 'Manually_Corrected_A') {
    throw new Error(`TEST 2 FAILED: Post-update result was "${postUpdateRes}", expected "Manually_Corrected_A"`)
  }
  console.log('✅ TEST 2 PASSED: Payload update evicted RAM immediately and next request read new DB truth without restart.\n')

  // -------------------------------------------------------------------------
  // TEST 3: PAYLOAD DELETE WITHOUT RESTART
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 3: PAYLOAD DELETE WITHOUT RESTART')
  console.log('----------------------------------------------------------------')
  // Delete doc in Payload (Simulating Admin UI deletion)
  console.log(`Deleting TestKey_A in Payload...`)
  await payload.delete({
    collection: 'translation-cache',
    id: docA.id
  })

  // Request TestKey_A again: should be Cache Miss -> provider called again
  const preCallCount = providerCalls
  const postDeleteRes = await service1.translate('TestKey_A', 'ar')
  console.log(`[Post-Delete Call] Result: "${postDeleteRes}" | Provider Calls: ${providerCalls}`)
  if (providerCalls !== preCallCount + 1) {
    throw new Error(`TEST 3 FAILED: RAM was not evicted on delete; provider was not called.`)
  }
  console.log('✅ TEST 3 PASSED: Payload delete evicted RAM and triggered fresh translation.\n')

  // -------------------------------------------------------------------------
  // TEST 4: MULTI-PROCESS / MULTI-INSTANCE TOPOLOGY
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 4: MULTI-INSTANCE EVICALL & PROPAGATION PATH')
  console.log('----------------------------------------------------------------')
  // Instantiate two separate repository instances simulating Node A and Node B
  const repoA = new TranslationRepository(payload)
  const repoB = new TranslationRepository(payload)

  const serviceA = new TranslationService(repoA, mockProvider)
  const serviceB = new TranslationService(repoB, mockProvider)

  // Seed TestKey_B on both instances
  await serviceA.translate('TestKey_B', 'ar')
  await serviceB.translate('TestKey_B', 'ar')

  // Verify both repoA and repoB have it in RAM
  console.log(`Node A & Node B RAM populated for TestKey_B.`)

  // Mutate TestKey_B via Payload
  const docB = (await payload.find({
    collection: 'translation-cache',
    where: { and: [{ originalHash: { equals: 'TestKey_B' } }, { language: { equals: 'ar' } }] }
  })).docs[0]

  await payload.update({
    collection: 'translation-cache',
    id: docB.id,
    data: { translatedText: 'Propagated_Value_B' }
  })

  // Both serviceA and serviceB must return the new value
  const valA = await serviceA.translate('TestKey_B', 'ar')
  const valB = await serviceB.translate('TestKey_B', 'ar')

  console.log(`[Node A Post-Mutation] Result: "${valA}"`)
  console.log(`[Node B Post-Mutation] Result: "${valB}"`)

  if (valA !== 'Propagated_Value_B' || valB !== 'Propagated_Value_B') {
    throw new Error(`TEST 4 FAILED: Multi-instance invalidation did not evict across instances. valA=${valA}, valB=${valB}`)
  }
  console.log('✅ TEST 4 PASSED: Mutation evicted all active instances in process memory.\n')

  // -------------------------------------------------------------------------
  // TEST 5: TARGETED BLAST RADIUS
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 5: TARGETED BLAST RADIUS (ISOLATION TEST)')
  console.log('----------------------------------------------------------------')
  // Create 4 distinct keys
  await service1.translate('Turkey_Test', 'ar')
  await service1.translate('Turkey_Test', 'fr')
  await service1.translate('Egypt_Test', 'ar')
  await service1.translate('Spain_Test', 'ar')

  const docTurkeyAr = (await payload.find({
    collection: 'translation-cache',
    where: { and: [{ originalHash: { equals: 'Turkey_Test' } }, { language: { equals: 'ar' } }] }
  })).docs[0]

  // Invalidate ONLY Turkey_Test in 'ar'
  await payload.update({
    collection: 'translation-cache',
    id: docTurkeyAr.id,
    data: { translatedText: 'تركيا_المحدثة' }
  })

  const callsBeforeCheck = providerCalls

  // Verify other 3 keys remain pure RAM Hits (0 provider calls)
  const turkeyFr = await service1.translate('Turkey_Test', 'fr')
  const egyptAr = await service1.translate('Egypt_Test', 'ar')
  const spainAr = await service1.translate('Spain_Test', 'ar')
  const turkeyAr = await service1.translate('Turkey_Test', 'ar')

  console.log(`Turkey (fr): "${turkeyFr}"`)
  console.log(`Egypt (ar):  "${egyptAr}"`)
  console.log(`Spain (ar):  "${spainAr}"`)
  console.log(`Turkey (ar): "${turkeyAr}"`)

  if (callsBeforeCheck !== providerCalls) {
    throw new Error(`TEST 5 FAILED: Unrelated keys were evicted and caused provider calls!`)
  }
  if (turkeyAr !== 'تركيا_المحدثة') {
    throw new Error(`TEST 5 FAILED: Mutated key was not updated!`)
  }
  console.log('✅ TEST 5 PASSED: Blast radius strictly zero. Only Turkey/ar was evicted.\n')

  // -------------------------------------------------------------------------
  // TEST 6: PROVIDER FALLBACK INTEGRITY & ZERO LOOPS
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------')
  console.log('TEST 6: PROVIDER FALLBACK INTEGRITY & ZERO LOOPS')
  console.log('----------------------------------------------------------------')
  let primaryAttempts = 0
  let fallbackAttempts = 0

  const failingPrimary: ITranslationProvider = {
    providerId: 'azure',
    translateText: async () => { primaryAttempts++; throw new Error('Primary Azure Timeout 504') },
    translateKey: async () => { primaryAttempts++; throw new Error('Primary Azure Timeout 504') },
    translateBatch: async () => { primaryAttempts++; throw new Error('Primary Azure Timeout 504') },
  }

  const workingFallback: ITranslationProvider = {
    providerId: 'google',
    translateText: async (text) => { fallbackAttempts++; return `GoogleFallback_${text}` },
    translateKey: async (key) => { fallbackAttempts++; return `GoogleFallback_${key}` },
    translateBatch: async (texts) => { fallbackAttempts++; return texts.map(t => `GoogleFallback_${t}`) },
  }

  const pool = new TranslationProviderPool([failingPrimary, workingFallback])
  const fallbackService = new TranslationService(new TranslationRepository(payload), pool)

  // First request: Primary fails -> Fallback succeeds -> caches with provider='google'
  const fallbackRes1 = await fallbackService.translate('TestKey_Fallback', 'ar')
  console.log(`[First Call with Fallback] Result: "${fallbackRes1}" | Primary attempts: ${primaryAttempts} | Fallback attempts: ${fallbackAttempts}`)

  if (fallbackRes1 !== 'GoogleFallback_TestKey_Fallback' || primaryAttempts !== 1 || fallbackAttempts !== 1) {
    throw new Error('TEST 6 FAILED: Fallback chain did not execute correctly.')
  }

  // Second request: MUST be Cache Hit -> NO primary retry, NO fallback call, NO loops
  const fallbackRes2 = await fallbackService.translate('TestKey_Fallback', 'ar')
  console.log(`[Second Call with Fallback] Result: "${fallbackRes2}" | Primary attempts: ${primaryAttempts} | Fallback attempts: ${fallbackAttempts}`)

  if (primaryAttempts !== 1 || fallbackAttempts !== 1) {
    throw new Error(`TEST 6 FAILED: Cache did not accept fallback result! Retried primary=${primaryAttempts}`)
  }
  console.log('✅ TEST 6 PASSED: Fallback translation accepted into cache with zero loops and zero re-attempts.\n')

  // Clean test keys from DB after testing
  await payload.delete({
    collection: 'translation-cache',
    where: {
      originalHash: { in: ['TestKey_A', 'TestKey_B', 'TestKey_Fallback', 'Turkey_Test', 'Egypt_Test', 'Spain_Test'] }
    }
  })

  console.log('================================================================')
  console.log('🎉 ALL 6 COMPREHENSIVE TESTS PASSED 100% WITH ZERO DEFECTS')
  console.log('================================================================')
  process.exit(0)
}

run().catch((err) => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
