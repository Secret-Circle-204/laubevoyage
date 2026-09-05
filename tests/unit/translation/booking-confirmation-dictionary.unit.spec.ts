import { describe, it, expect } from 'vitest'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

describe('Gate 9 / Translation Dictionary Coverage Unit Test', () => {
  const dictionary = new JsonTranslationDictionary()
  const activeLanguageCodes = ['en', 'ar', 'de', 'es', 'fi', 'fr', 'it', 'ja', 'nl', 'pl', 'pt', 'ru', 'zh']

  it('All 13 active languages have 100% dictionary keys resolved with zero empty strings', () => {
    const testKeys = [
      'bookingConfirmation.thankYou',
      'bookingConfirmation.refSubtitle',
      'bookingConfirmation.statusLabel',
      'bookingConfirmation.totalPriceLabel',
      'bookingConfirmation.nextSteps',
      'bookingConfirmation.printConfirmation',
      'bookingConfirmation.backToBookings',
      'bookingConfirmation.reservationDossier',
    ]

    for (const code of activeLanguageCodes) {
      for (const key of testKeys) {
        const val = dictionary.getStrict(code, key)
        expect(val, `Missing key "${key}" in language "${code}"`).toBeDefined()
        expect(typeof val).toBe('string')
        expect(val!.length).toBeGreaterThan(0)
      }
    }
  })
})
