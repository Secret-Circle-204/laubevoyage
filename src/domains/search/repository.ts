import type { Payload } from 'payload'
import { SearchQueryPipeline } from './query-pipeline'
import type { SearchQueryDTO, SearchResponseDTO } from './types'

/**
 * Search Repository
 * Data store layer wrapping the high-speed SearchQueryPipeline.
 */
export class SearchRepository {
  private payload: Payload
  private queryPipeline: SearchQueryPipeline

  constructor(payload: Payload) {
    this.payload = payload
    this.queryPipeline = new SearchQueryPipeline()
  }

  async search(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    return this.queryPipeline.executeSearch(query)
  }
}
