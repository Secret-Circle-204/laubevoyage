import { describe, it, expect } from 'vitest'
import { ContentCacheManager } from '@/domains/content/cache-manager'

describe('Content Domain: Cache Manager Unit Tests', () => {
  it('should cache page data and invalidate/revalidate instantly', () => {
    ContentCacheManager.setCachedPage('home', { title: 'Home Page' })
    expect(ContentCacheManager.getCachedPage('home')).not.toBeNull()

    const res = ContentCacheManager.invalidateAndRevalidate('home')
    expect(res.revalidated).toBe(true)
    expect(ContentCacheManager.getCachedPage('home')).toBeNull()
  })
})
