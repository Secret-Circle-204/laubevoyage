import type { Payload } from 'payload'

/**
 * Deduplication & Cleanup Seeder for Translation Cache & System Translations.
 * Removes duplicate records and purges useless 'en' -> 'en' translation records.
 */
export async function cleanupDuplicateTranslations(payload: Payload): Promise<void> {
  console.log('🧹 Cleaning up duplicate and base-language translation cache records...')

  try {
    // Purge 'en' records from 'translation-cache' collection
    const enCache = await payload.find({
      collection: 'translation-cache',
      where: { language: { equals: 'en' } },
      limit: 500,
    })

    for (const doc of enCache.docs || []) {
      await payload.delete({
        collection: 'translation-cache',
        id: doc.id,
      })
    }

    // Deduplicate 'translation-cache' collection
    const allCache = await payload.find({
      collection: 'translation-cache',
      limit: 1000,
    })

    const seenCacheKeys = new Set<string>()
    for (const doc of allCache.docs || []) {
      const item = doc as Record<string, any>
      const cacheKey = `${item.originalHash}_${item.language}`
      if (seenCacheKeys.has(cacheKey)) {
        await payload.delete({
          collection: 'translation-cache',
          id: item.id,
        })
      } else {
        seenCacheKeys.add(cacheKey)
      }
    }

    console.log('✅ Translation Cache Deduplication & Cleanup completed successfully!')
  } catch (err: unknown) {
    console.error('❌ Failed cleaning up duplicate translations:', err)
  }
}
