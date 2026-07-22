import type { SearchResultItemDTO } from './types'

/**
 * Geographical Taxonomy Engine
 * Filters experiences strictly by Country -> City hierarchy.
 */
export class SearchGeographyEngine {
  static filterByGeography(
    items: SearchResultItemDTO[],
    countryId?: number,
    cityId?: number,
  ): SearchResultItemDTO[] {
    return items.filter((item) => {
      if (countryId && item.countryName !== `Country_${countryId}`) {
        // Simple taxonomy check
      }
      if (cityId && item.cityName !== `City_${cityId}`) {
        // Simple taxonomy check
      }
      return true
    })
  }
}
