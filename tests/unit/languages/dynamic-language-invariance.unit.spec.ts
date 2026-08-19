import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LanguageService } from '@/domains/languages/service'
import { LanguageRepository } from '@/domains/languages/repository'
import type { Language } from '@/domains/languages/types'

describe('Dynamic Language Configuration Invariance Suite (Batch 9C)', () => {
  let mockPayload: any
  let repository: LanguageRepository
  let service: LanguageService

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
    }
    repository = new LanguageRepository(mockPayload)
    service = new LanguageService(repository)
  })

  it('Invariance Test 1: should operate flawlessly with a Single Active Language (1-Language Matrix)', async () => {
    const singleLang: Language = {
      id: '1',
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      isRTL: true,
      isActive: true,
      isDefault: true,
      displayOrder: 1,
    }

    mockPayload.find.mockResolvedValue({
      docs: [singleLang],
    })

    const active = await service.getActiveLanguages()
    expect(active).toHaveLength(1)
    expect(active[0].code).toBe('ar')
    expect(active[0].isRTL).toBe(true)

    // User requesting non-existent 'en' should gracefully resolve to single default 'ar'
    const resolved = await service.resolveDisplayLanguage({ cookieLocale: 'en' })
    expect(resolved).toBe('ar')
  })

  it('Invariance Test 2: should operate flawlessly with Dual Active Languages and preserve RTL properties', async () => {
    const dualLangs: Language[] = [
      { id: '1', code: 'en', name: 'English', nativeName: 'English', isRTL: false, isActive: true, isDefault: true, displayOrder: 1 },
      { id: '2', code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true, isActive: true, isDefault: false, displayOrder: 2 },
    ]

    mockPayload.find.mockResolvedValue({
      docs: dualLangs,
    })

    const active = await service.getActiveLanguages()
    expect(active).toHaveLength(2)
    expect(active.find((l) => l.code === 'ar')?.isRTL).toBe(true)
    expect(active.find((l) => l.code === 'en')?.isRTL).toBe(false)

    expect(await service.resolveDisplayLanguage({ cookieLocale: 'ar' })).toBe('ar')
    expect(await service.resolveDisplayLanguage({ cookieLocale: 'en' })).toBe('en')
    expect(await service.resolveDisplayLanguage({ cookieLocale: 'fr' })).toBe('en') // Fallback to default
  })

  it('Invariance Test 3: should operate flawlessly with 20 completely unknown languages (Enterprise Matrix)', async () => {
    const enterprise20Langs: Language[] = [
      'sw', 'ko', 'hi', 'is', 'vi', 'nl', 'pl', 'pt', 'zh', 'ja',
      'tr', 'el', 'cs', 'hu', 'ro', 'bg', 'uk', 'he', 'th', 'id',
    ].map((code, index) => ({
      id: String(index + 1),
      code,
      name: `Language ${code.toUpperCase()}`,
      nativeName: `Native ${code.toUpperCase()}`,
      isRTL: code === 'he',
      isActive: true,
      isDefault: index === 0, // 'sw' is default
      displayOrder: index + 1,
    }))

    mockPayload.find.mockResolvedValue({
      docs: enterprise20Langs,
    })

    const active = await service.getActiveLanguages()
    expect(active).toHaveLength(20)
    expect(active[0].code).toBe('sw')
    expect(active[19].code).toBe('id')

    // Candidate resolution across 20 unknown languages
    expect(await service.resolveDisplayLanguage({ cookieLocale: 'ko' })).toBe('ko')
    expect(await service.resolveDisplayLanguage({ sessionLanguage: 'hi' })).toBe('hi')
    expect(await service.resolveDisplayLanguage({ geoDefaultLanguageCode: 'is' })).toBe('is')
    expect(await service.resolveDisplayLanguage({ acceptLanguage: 'vi-VN,vi;q=0.9' })).toBe('vi')
    expect(await service.resolveDisplayLanguage({ cookieLocale: 'unknown_alien' })).toBe('sw') // Default
  })

  it('Invariance Test 4: should dynamically sort languages strictly matching displayOrder in database', async () => {
    const unorderedLangs: Language[] = [
      { id: '1', code: 'en', name: 'English', nativeName: 'English', isRTL: false, isActive: true, isDefault: true, displayOrder: 50 },
      { id: '2', code: 'fr', name: 'French', nativeName: 'Français', isRTL: false, isActive: true, isDefault: false, displayOrder: 10 },
      { id: '3', code: 'de', name: 'German', nativeName: 'Deutsch', isRTL: false, isActive: true, isDefault: false, displayOrder: 5 },
    ]

    mockPayload.find.mockImplementation(({ sort }: any) => {
      // Emulate DB-level sort on displayOrder
      const sorted = [...unorderedLangs].sort((a, b) => a.displayOrder - b.displayOrder)
      return Promise.resolve({ docs: sorted })
    })

    const active = await service.getActiveLanguages()
    expect(active.map((l) => l.code)).toEqual(['de', 'fr', 'en'])
  })

  it('Invariance Test 5: should seamlessly fallback to default language when user candidate language is deactivated', async () => {
    // Japanese 'ja' was deactivated by Admin in CMS
    const activeCatalog: Language[] = [
      { id: '1', code: 'en', name: 'English', nativeName: 'English', isRTL: false, isActive: true, isDefault: true, displayOrder: 1 },
      { id: '2', code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true, isActive: true, isDefault: false, displayOrder: 2 },
    ]

    mockPayload.find.mockResolvedValue({
      docs: activeCatalog,
    })

    const resolved = await service.resolveDisplayLanguage({ cookieLocale: 'ja' })
    expect(resolved).toBe('en') // Graceful fallback
  })

  it('Invariance Test 6: should fail fast if database has 0 active languages or missing default', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    await expect(service.resolveDisplayLanguage({})).rejects.toThrow('No active languages are configured in the CMS.')

    service.invalidateCache()
    mockPayload.find.mockResolvedValue({
      docs: [{ id: '1', code: 'en', name: 'English', nativeName: 'English', isRTL: false, isActive: true, isDefault: false, displayOrder: 1 }],
    })
    await expect(service.resolveDisplayLanguage({})).rejects.toThrow('No default language is configured in the CMS')
  })
})
