import type { Payload } from 'payload'
import { SearchWorkflowEngine } from './workflow'
import type { SearchQueryDTO, SearchResponseDTO } from './types'

/**
 * Search Domain Service (Enterprise Thin Facade)
 * Single entry point for all search, filtering, and discovery queries.
 */
export class SearchService {
  private workflowEngine: SearchWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new SearchWorkflowEngine(payload)
  }

  async search(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    return this.workflowEngine.executeSearch(query)
  }
}
