import { describe, it, expect } from 'vitest'
import { ContentSlugService } from '@/domains/content/slug-service'

describe('Content Domain: Slug & 301 Redirect Unit Tests', () => {
  it('should auto-generate clean URL slugs from titles', () => {
    const slug = ContentSlugService.generateSlug("  Luxor & Aswan Luxury Nile Cruise 2026!  ")
    expect(slug).toBe('luxor-aswan-luxury-nile-cruise-2026')
  })

  it('should record 301 redirect mapping when slug changes', () => {
    const redirect = ContentSlugService.recordSlugChange('blog/egypt-tour', 'blog/luxor-tour')
    expect(redirect.statusCode).toBe(301)
    expect(redirect.oldSlug).toBe('blog/egypt-tour')
    expect(redirect.newSlug).toBe('blog/luxor-tour')

    const fetched = ContentSlugService.getRedirect('blog/egypt-tour')
    expect(fetched?.newSlug).toBe('blog/luxor-tour')
  })
})
