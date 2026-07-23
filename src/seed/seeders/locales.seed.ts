import type { Payload } from 'payload'

export interface LocaleSeedData {
  translationKey: string
  locale: string
  translatedText: string
  provider: 'cache' | 'google' | 'libre' | 'manual'
}

/**
 * Recognized Languages Catalog Metadata Markers.
 * Static UI Infrastructure texts are stored in src/dictionaries/*.json for 0ms DB-free performance.
 */
export const RECOGNIZED_LOCALES: LocaleSeedData[] = [
  { translationKey: 'locale_name', locale: 'en', translatedText: 'English', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'ar', translatedText: 'العربية', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'fr', translatedText: 'Français', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'de', translatedText: 'Deutsch', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'es', translatedText: 'Español', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'it', translatedText: 'Italiano', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'ru', translatedText: 'Русский', provider: 'manual' },
  { translationKey: 'locale_name', locale: 'zh', translatedText: '中文', provider: 'manual' },
]

export async function seedLocales(payload: Payload): Promise<void> {
  console.log('🌐 [Seed] Seeding Master Languages Catalog...')
  let seededCount = 0

  for (const item of RECOGNIZED_LOCALES) {
    try {
      const existing = await payload.find({
        collection: 'translations',
        where: {
          and: [
            { translationKey: { equals: item.translationKey } },
            { locale: { equals: item.locale } },
          ],
        },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'translations',
          data: item,
        })
        seededCount++
      }
    } catch (err: unknown) {
      console.error(`[seedLocales] Error seeding language ${item.locale}:`, err)
    }
  }

  console.log(`   ✅ Languages Catalog initialized (${seededCount} new records created).`)
}
