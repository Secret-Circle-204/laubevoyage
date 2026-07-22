export interface SearchExecutedEvent {
  type: 'SEARCH_EXECUTED'
  eventVersion: 'v1'
  keyword?: string
  totalResults: number
  executionTimeMs: number
  timestamp: string
}

export type SearchDomainEvent = SearchExecutedEvent
