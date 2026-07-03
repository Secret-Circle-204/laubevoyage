import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CacheTag } from './cache-tags'

interface CacheOptions {
  tags?: CacheTag[]
  revalidate?: number
}

/**
 * Centrally wraps data fetching functions.
 * - Next.js `unstable_cache` handles cross-request caching.
 * - React `cache` handles request-level deduplication (Fetch Deduplication).
 * If Next.js stable "use cache" API is adopted, only this file changes.
 */
export function cached<Args extends unknown[], Return>(
  fn: (...args: Args) => Promise<Return>,
  keyParts: string[],
  options: CacheOptions = {}
): (...args: Args) => Promise<Return> {
  return cache(unstable_cache(fn as unknown as (...args: unknown[]) => Promise<unknown>, keyParts, options)) as unknown as (...args: Args) => Promise<Return>
}
