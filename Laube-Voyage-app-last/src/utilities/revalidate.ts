import { revalidateTag } from 'next/cache'
import { CacheTag } from '@/lib/cache-tags'

/**
 * Revalidates a cache tag inside Payload CMS collection/global hooks.
 */
export function revalidateCollection(tag: CacheTag) {
  try {
    revalidateTag(tag)
    console.log(`[Revalidation] Successfully cleared cache tag: "${tag}"`)
  } catch (error) {
    console.error(`[Revalidation] Failed to clear tag "${tag}":`, error)
  }
}
