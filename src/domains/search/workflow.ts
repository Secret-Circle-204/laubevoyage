import type { Payload } from 'payload'
import { SearchRepository } from './repository'
import { SearchPolicy } from './policy'
import type { SearchQueryDTO, SearchResponseDTO } from './types'

/**
 * Search Workflow Engine
 * Central orchestrator handling search query validation, pipeline execution, and result formatting.
 */
export class SearchWorkflowEngine {
  public repository: SearchRepository

  constructor(payload: Payload) {
    this.repository = new SearchRepository(payload)
  }

  async executeSearch(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    // 1. Policy check
    const policyResult = SearchPolicy.validateQuery(query)
    if (!policyResult.valid) {
      throw new Error(`[SearchPolicy] Invalid search query: ${policyResult.reason}`)
    }

    // 2. Execute pipeline search
    return this.repository.search(query)
  }
}
