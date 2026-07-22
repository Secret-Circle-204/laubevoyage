import { describe, it, expect, vi } from 'vitest'
import { TranslationEngine } from '@/domains/translation/engine'
import type { TranslationRepository } from '@/domains/translation/repository'

describe('Translation Domain: TranslationEngine Unit Tests', () => {
  it('should lookup translation by translationKey and cache result', async () => {
    const mockRepo: any = {
      findByKeyAndLocale: vi.fn().mockResolvedValue(null),
      saveTranslation: vi.fn().mockImplementation((r) => Promise.resolve(r)),
    }

    const engine = new TranslationEngine(mockRepo)
    const result = await engine.translate('booking.confirmed', 'ar')

    expect(result.translationKey).toBe('booking.confirmed')
    expect(result.translatedText).toBe('تم تأكيد الحجز بنجاح')
    expect(result.provider).toBe('google')
  })
})
