import type { SeoMetadataDTO } from './types'

/**
 * SEO Metadata & OpenGraph Engine
 * Generates dynamic Meta Titles, Meta Descriptions, Canonical URLs, OpenGraph sharing tags, and JSON-LD structured schema.
 */
export class ContentSeoEngine {
  static generateSeoMetadata(params: {
    title: string
    description?: string
    slug: string
    ogImage?: string
    domainUrl?: string
  }): SeoMetadataDTO {
    const domain = params.domainUrl || 'https://laube-voyage.com'
    const canonicalUrl = `${domain}/${params.slug}`
    const metaTitle = `${params.title} | L'Aube Voyage`
    const metaDescription = params.description || `Discover luxury travel experiences with L'Aube Voyage.`
    const ogImage = params.ogImage || `${domain}/images/og-default.jpg`

    const jsonLdSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
    })

    return {
      title: metaTitle,
      description: metaDescription,
      canonicalUrl,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      ogImage,
      jsonLdSchema,
    }
  }
}
