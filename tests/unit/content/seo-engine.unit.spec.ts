import { describe, it, expect } from 'vitest'
import { ContentSeoEngine } from '@/domains/content/seo-engine'

describe('Content Domain: SEO Engine Unit Tests', () => {
  it('should generate valid SEO metadata and JSON-LD structured schema', () => {
    const seo = ContentSeoEngine.generateSeoMetadata({
      title: 'Luxury Red Sea Resort',
      description: 'Exclusive beach luxury in Hurghada',
      slug: 'red-sea-luxury',
    })

    expect(seo.title).toBe("Luxury Red Sea Resort | L'Aube Voyage")
    expect(seo.canonicalUrl).toBe('https://laube-voyage.com/red-sea-luxury')
    expect(seo.jsonLdSchema).toContain('https://schema.org')
  })
})
