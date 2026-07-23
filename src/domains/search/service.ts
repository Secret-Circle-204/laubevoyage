import { SearchWorkflowEngine } from './workflow'
import { SearchRepository } from './repository'
import type { SearchQueryDTO, SearchResponseDTO } from './types'

/**
 * Search Domain Service (Enterprise Thin Facade)
 * Single entry point for all search, filtering, and discovery queries via Dependency Injection.
 */
export class SearchService {
  private workflowEngine: SearchWorkflowEngine

  constructor(repository?: SearchRepository) {
    const repo = repository || new SearchRepository()
    this.workflowEngine = new SearchWorkflowEngine(repo)
  }

  async search(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    return this.workflowEngine.executeSearch(query)
  }
}
