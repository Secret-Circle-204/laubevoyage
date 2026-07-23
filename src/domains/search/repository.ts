import type { Payload } from 'payload'
import { SearchQueryPipeline } from './query-pipeline'
import type { SearchQueryDTO, SearchResponseDTO, SearchResultItemDTO } from './types'

/**
 * Search Repository
 * Data store layer wrapping the high-speed SearchQueryPipeline.
 * Connects directly to Payload CMS experiences collection with zero hardcoded data fallbacks.
 */
export class SearchRepository {
  private payload?: Payload
  private queryPipeline: SearchQueryPipeline

  constructor(payload?: Payload) {
    this.payload = payload
    this.queryPipeline = new SearchQueryPipeline()
  }

  async search(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    if (this.payload) {
      try {
        const res = await this.payload.find({
          collection: 'experiences',
          where: query.keyword
            ? {
                title: { contains: query.keyword },
              }
            : {},
          limit: query.limit || 50,
        })

        const items: SearchResultItemDTO[] = (res.docs || []).map((doc: any) => ({
          experienceId: Number(doc.id),
          title: doc.title || '',
          slug: doc.slug || '',
          countryName: typeof doc.country === 'object' && doc.country !== null ? doc.country.name || '' : '',
          cityName: typeof doc.city === 'object' && doc.city !== null ? doc.city.name || '' : '',
          category: doc.type || '',
          durationDays: doc.durationDays || 0,
          priceEGP: doc.basePriceEGP || 0,
          rating: doc.rating || 0,
          reviewCount: doc.reviewsCount || 0,
          thumbnailUrl: typeof doc.featuredImage === 'object' && doc.featuredImage !== null ? doc.featuredImage.url || '' : '',
          availableSeats: doc.availableCapacity || 0,
        }))

        this.queryPipeline.updateIndex(items)
      } catch (err: unknown) {
        console.error('[SearchRepository] Failed querying Payload experiences collection:', err)
      }
    }

    return this.queryPipeline.executeSearch(query)
  }
}
