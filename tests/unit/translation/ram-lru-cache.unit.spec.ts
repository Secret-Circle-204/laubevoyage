import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TranslationRepository } from '../../../src/domains/translation/repository'
import type { TranslationRecordEntity } from '../../../src/domains/translation/types'

describe('TranslationRepository — Bounded Hot RAM LRU Cache Specs', () => {
  const originalEnv = process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES

  afterEach(() => {
    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = originalEnv
  })

  // --------------------------------------------------------------------------
  // TEST 1: Strict Capacity Bounding (No Unbounded Growth)
  // --------------------------------------------------------------------------
  it('should strictly enforce maxEntries bound when inserting multiple records', async () => {
    const mockDb: Record<string, any> = {}
    const mockPayload: any = {
      create: vi.fn().mockImplementation(({ data }) => {
        const key = `${data.originalHash}_${data.language}`
        mockDb[key] = { id: `id_${data.originalHash}`, ...data }
        return Promise.resolve(mockDb[key])
      }),
      find: vi.fn().mockImplementation(({ where }) => {
        const hash = where.and[0].originalHash.equals
        const lang = where.and[1].language.equals
        const item = mockDb[`${hash}_${lang}`]
        return Promise.resolve({ docs: item ? [item] : [] })
      }),
    }

    const repo = new TranslationRepository(mockPayload, { maxEntries: 3 })

    // Insert 5 records
    for (let i = 1; i <= 5; i++) {
      await repo.saveTranslation({
        translationId: `id_${i}`,
        translationKey: `Key_${i}`,
        locale: 'ar',
        translatedText: `ترجمة_${i}`,
        provider: 'azure',
        cachedAt: new Date().toISOString(),
      })
    }

    // Invariant: RAM cache size is strictly bounded to 3
    expect((repo as any).cacheMap.size).toBe(3)

    // Invariant: Database received ALL 5 records (zero DB loss)
    expect(mockPayload.create).toHaveBeenCalledTimes(5)
    expect(Object.keys(mockDb)).toHaveLength(5)
  })

  // --------------------------------------------------------------------------
  // TEST 2: LRU Recency Refresh & Eviction Order
  // --------------------------------------------------------------------------
  it('should evict the Least Recently Used item and retain Most Recently Used items', async () => {
    const mockDb: Record<string, any> = {}
    const mockPayload: any = {
      create: vi.fn().mockImplementation(({ data }) => {
        const key = `${data.originalHash}_${data.language}`
        mockDb[key] = { id: `id_${data.originalHash}`, ...data }
        return Promise.resolve(mockDb[key])
      }),
      find: vi.fn().mockImplementation(({ where }) => {
        const hash = where.and[0].originalHash.equals
        const lang = where.and[1].language.equals
        const item = mockDb[`${hash}_${lang}`]
        return Promise.resolve({ docs: item ? [item] : [] })
      }),
    }

    const repo = new TranslationRepository(mockPayload, { maxEntries: 3 })

    // 1. Add Key_1, Key_2, Key_3 (Cache order: [Key_1, Key_2, Key_3])
    await repo.saveTranslation({
      translationId: '1',
      translationKey: 'Key_1',
      locale: 'ar',
      translatedText: 'نص 1',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })
    await repo.saveTranslation({
      translationId: '2',
      translationKey: 'Key_2',
      locale: 'ar',
      translatedText: 'نص 2',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })
    await repo.saveTranslation({
      translationId: '3',
      translationKey: 'Key_3',
      locale: 'ar',
      translatedText: 'نص 3',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })

    // 2. Read Key_1 (Moves Key_1 to Most Recently Used: [Key_2, Key_3, Key_1])
    mockPayload.find.mockClear()
    const hit1 = await repo.findByKeyAndLocale('Key_1', 'ar')
    expect(hit1?.translatedText).toBe('نص 1')
    expect(mockPayload.find).toHaveBeenCalledTimes(0) // 0 DB calls = Pure RAM Hit

    // 3. Add Key_4 (Cache full: evicts Key_2! Cache becomes: [Key_3, Key_1, Key_4])
    await repo.saveTranslation({
      translationId: '4',
      translationKey: 'Key_4',
      locale: 'ar',
      translatedText: 'نص 4',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })

    expect((repo as any).cacheMap.size).toBe(3)

    // 4. Verify Key_1, Key_3, Key_4 are RAM Hits (0 DB queries)
    mockPayload.find.mockClear()
    await repo.findByKeyAndLocale('Key_1', 'ar')
    await repo.findByKeyAndLocale('Key_3', 'ar')
    await repo.findByKeyAndLocale('Key_4', 'ar')
    expect(mockPayload.find).toHaveBeenCalledTimes(0)

    // 5. Verify Key_2 was evicted from RAM -> Fetches from DB and repopulates RAM
    mockPayload.find.mockClear()
    const refetched2 = await repo.findByKeyAndLocale('Key_2', 'ar')
    expect(refetched2?.translatedText).toBe('نص 2')
    expect(mockPayload.find).toHaveBeenCalledTimes(1) // 1 DB call = RAM Miss -> DB Hit!
  })

  // --------------------------------------------------------------------------
  // TEST 3: Zero PostgreSQL Deletion on In-Memory Eviction
  // --------------------------------------------------------------------------
  it('should keep 100% of PostgreSQL records intact when items are evicted from RAM', async () => {
    const mockDbStore = new Map<string, any>()
    const mockPayload: any = {
      create: vi.fn().mockImplementation(({ data }) => {
        mockDbStore.set(`${data.originalHash}_${data.language}`, data)
        return Promise.resolve(data)
      }),
      find: vi.fn().mockImplementation(({ where }) => {
        const hash = where.and[0].originalHash.equals
        const lang = where.and[1].language.equals
        const doc = mockDbStore.get(`${hash}_${lang}`)
        return Promise.resolve({ docs: doc ? [doc] : [] })
      }),
      delete: vi.fn(), // Should NEVER be called
    }

    const repo = new TranslationRepository(mockPayload, { maxEntries: 2 })

    for (let i = 1; i <= 10; i++) {
      await repo.saveTranslation({
        translationId: `t_${i}`,
        translationKey: `Word_${i}`,
        locale: 'ar',
        translatedText: `كلمة_${i}`,
        provider: 'cloudflare',
        cachedAt: new Date().toISOString(),
      })
    }

    // Invariant: RAM holds exactly 2 items
    expect((repo as any).cacheMap.size).toBe(2)

    // Invariant: DB holds all 10 items
    expect(mockDbStore.size).toBe(10)

    // Invariant: DB delete was NEVER called
    expect(mockPayload.delete).toHaveBeenCalledTimes(0)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Environment Variable Validation & Sanitization
  // --------------------------------------------------------------------------
  it('should safely validate and fallback on invalid environment variable values', () => {
    // 1. Invalid string -> 20000
    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = 'abc'
    const repo1 = new TranslationRepository()
    expect((repo1 as any).maxEntries).toBe(20000)

    // 2. Negative integer -> 20000
    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = '-500'
    const repo2 = new TranslationRepository()
    expect((repo2 as any).maxEntries).toBe(20000)

    // 3. Valid integer string -> parsed
    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = '5000'
    const repo3 = new TranslationRepository()
    expect((repo3 as any).maxEntries).toBe(5000)

    // 4. Clamping bounds: < 50 clamped to 50, > 100000 clamped to 100000
    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = '10'
    const repo4 = new TranslationRepository()
    expect((repo4 as any).maxEntries).toBe(50)

    process.env.TRANSLATION_RAM_CACHE_MAX_ENTRIES = '999999'
    const repo5 = new TranslationRepository()
    expect((repo5 as any).maxEntries).toBe(100000)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Batch Lookup LRU Recency Refresh
  // --------------------------------------------------------------------------
  it('should refresh LRU order during batch lookups', async () => {
    const mockPayload: any = {
      create: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    const repo = new TranslationRepository(mockPayload, { maxEntries: 3 })

    await repo.saveTranslation({
      translationId: '1',
      translationKey: 'K1',
      locale: 'ar',
      translatedText: 'T1',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })
    await repo.saveTranslation({
      translationId: '2',
      translationKey: 'K2',
      locale: 'ar',
      translatedText: 'T2',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })
    await repo.saveTranslation({
      translationId: '3',
      translationKey: 'K3',
      locale: 'ar',
      translatedText: 'T3',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })

    // Batch lookup K1, K2 -> moves K1, K2 to MRU: [K3, K1, K2]
    const batchRes = await repo.findByKeysAndLocaleBatch(['K1', 'K2'], 'ar')
    expect(batchRes.foundMap.get('K1')).toBe('T1')
    expect(batchRes.foundMap.get('K2')).toBe('T2')

    // Add K4 -> evicts K3 (least recently used)
    await repo.saveTranslation({
      translationId: '4',
      translationKey: 'K4',
      locale: 'ar',
      translatedText: 'T4',
      provider: 'azure',
      cachedAt: new Date().toISOString(),
    })

    // K1, K2, K4 remain in cache
    expect((repo as any).cacheMap.has('K1_ar')).toBe(true)
    expect((repo as any).cacheMap.has('K2_ar')).toBe(true)
    expect((repo as any).cacheMap.has('K4_ar')).toBe(true)
    expect((repo as any).cacheMap.has('K3_ar')).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 6: Stress Test — 1,000 Records into Max 50
  // --------------------------------------------------------------------------
  it('should cap cache size at 50 even under a barrage of 1,000 distinct items', async () => {
    const repo = new TranslationRepository(undefined, { maxEntries: 50 })

    for (let i = 0; i < 1000; i++) {
      await repo.saveTranslation({
        translationId: `id_${i}`,
        translationKey: `StressKey_${i}`,
        locale: 'ar',
        translatedText: `StressText_${i}`,
        provider: 'azure',
        cachedAt: new Date().toISOString(),
      })
    }

    expect((repo as any).cacheMap.size).toBe(50)
  })
})
