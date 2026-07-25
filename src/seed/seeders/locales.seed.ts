import type { Payload } from 'payload'

export interface LanguageSeedData {
  name: string
  nativeName: string
  code: string
  isRTL: boolean
  isActive: boolean
  isDefault: boolean
  displayOrder: number
}

export const INITIAL_LANGUAGES: LanguageSeedData[] = [
  { name: 'English', nativeName: 'English', code: 'en', isRTL: false, isActive: true, isDefault: true, displayOrder: 1 },
  { name: 'Arabic', nativeName: 'العربية', code: 'ar', isRTL: true, isActive: true, isDefault: false, displayOrder: 2 },
  { name: 'French', nativeName: 'Français', code: 'fr', isRTL: false, isActive: true, isDefault: false, displayOrder: 3 },
  { name: 'German', nativeName: 'Deutsch', code: 'de', isRTL: false, isActive: true, isDefault: false, displayOrder: 4 },
  { name: 'Spanish', nativeName: 'Español', code: 'es', isRTL: false, isActive: true, isDefault: false, displayOrder: 5 },
  { name: 'Italian', nativeName: 'Italiano', code: 'it', isRTL: false, isActive: true, isDefault: false, displayOrder: 6 },
  { name: 'Russian', nativeName: 'Русский', code: 'ru', isRTL: false, isActive: true, isDefault: false, displayOrder: 7 },
  { name: 'Chinese', nativeName: '简体中文', code: 'zh', isRTL: false, isActive: true, isDefault: false, displayOrder: 8 },
  { name: 'Japanese', nativeName: '日本語', code: 'ja', isRTL: false, isActive: true, isDefault: false, displayOrder: 9 },
  { name: 'Portuguese', nativeName: 'Português', code: 'pt', isRTL: false, isActive: true, isDefault: false, displayOrder: 10 },
  { name: 'Dutch', nativeName: 'Nederlands', code: 'nl', isRTL: false, isActive: true, isDefault: false, displayOrder: 11 },
  { name: 'Polish', nativeName: 'Polski', code: 'pl', isRTL: false, isActive: true, isDefault: false, displayOrder: 12 },
  { name: 'Finnish', nativeName: 'Suomi', code: 'fi', isRTL: false, isActive: true, isDefault: false, displayOrder: 13 },
]

export async function seedLocales(payload: Payload): Promise<void> {
  console.log('🌐 [Seed] Verifying Languages Catalog...')

  try {
    let seededCount = 0

    for (const lang of INITIAL_LANGUAGES) {
      const existing = await payload.find({
        collection: 'languages',
        where: {
          code: { equals: lang.code },
        },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'languages',
          data: lang,
        })
        seededCount++
      } else {
        const doc = existing.docs[0] as any
        if (doc.isActive !== lang.isActive) {
          await payload.update({
            collection: 'languages',
            id: doc.id,
            data: {
              isActive: lang.isActive,
            },
          })
          seededCount++
        }
      }
    }

    if (seededCount > 0) {
      console.log(`   ✅ Successfully updated/seeded ${seededCount} languages in database.`)
    } else {
      console.log('   ✅ Languages Catalog already fully seeded and active.')
    }
  } catch (err: unknown) {
    console.error('   ❌ Failed seeding languages catalog:', err)
  }
}
