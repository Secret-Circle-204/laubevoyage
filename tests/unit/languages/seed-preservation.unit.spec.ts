import { describe, it, expect, vi } from 'vitest'
import { seedLocales } from '@/seed/seeders/locales.seed'
import type { Payload } from 'payload'

describe('Language Seed Preservation & Non-Destructive Bootstrap Guard (Batch 9C)', () => {
  it('should NEVER overwrite or modify existing admin-customized language state during seeding', async () => {
    // Admin customized Arabic (ar): made it default, changed displayOrder to 99
    // Admin customized English (en): deactivated it (isActive: false), changed displayOrder to 100
    const adminCustomizedDocs = [
      {
        id: '1',
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isRTL: false,
        isActive: false, // Admin deactivated!
        isDefault: false,
        displayOrder: 100, // Admin reordered!
        preferredDisplayCurrency: 'EGP', // Admin customized!
      },
      {
        id: '2',
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        isRTL: true,
        isActive: true,
        isDefault: true, // Admin made it default!
        displayOrder: 99,
        preferredDisplayCurrency: 'SAR',
      },
    ]

    const updateSpy = vi.fn()
    const createSpy = vi.fn()

    const mockPayload = {
      find: vi.fn().mockImplementation(({ where }: any) => {
        const targetCode = where?.code?.equals
        const found = adminCustomizedDocs.filter((d) => d.code === targetCode)
        return Promise.resolve({ docs: found })
      }),
      create: createSpy.mockResolvedValue({ id: 'new_id' }),
      update: updateSpy.mockResolvedValue({ id: 'updated_id' }),
    } as unknown as Payload

    // Run the seeder
    await seedLocales(mockPayload)

    // 1. MUST NOT call update on any existing language record!
    expect(updateSpy).not.toHaveBeenCalled()

    // 2. MUST only create missing languages (e.g. fr, de, es, it, ru, zh, ja, pt, nl, pl, fi)
    expect(createSpy).toHaveBeenCalled()
    const createdCodes = createSpy.mock.calls.map((call) => call[0].data.code)
    expect(createdCodes).not.toContain('en')
    expect(createdCodes).not.toContain('ar')
    expect(createdCodes).toContain('fr')
    expect(createdCodes).toContain('de')
  })
})
