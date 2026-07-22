import type { SearchQueryDTO, SearchPolicyResult } from './types'

/**
 * Pure Search Policy
 * Single source of truth for search query validation and bounds checking.
 */
export class SearchPolicy {
  static validateQuery(query: SearchQueryDTO): SearchPolicyResult {
    if (query.minPriceEGP !== undefined && query.maxPriceEGP !== undefined) {
      if (query.minPriceEGP > query.maxPriceEGP) {
        return {
          valid: false,
          reason: 'Minimum price cannot exceed maximum price.',
        }
      }
    }

    if (query.passengersCount !== undefined && query.passengersCount <= 0) {
      return {
        valid: false,
        reason: 'Passengers count must be greater than zero.',
      }
    }

    return { valid: true }
  }
}
