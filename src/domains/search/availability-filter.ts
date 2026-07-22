import type { SearchResultItemDTO } from './types'

/**
 * Real-time Slot Availability Filter
 * Filters out sold-out experiences or slots that lack required seats for requested passengers count.
 */
export class SearchAvailabilityFilter {
  static filterAvailable(items: SearchResultItemDTO[], requiredSeats = 1): SearchResultItemDTO[] {
    return items.filter((item) => item.availableSeats >= requiredSeats)
  }
}
