import type { ExperienceRepository } from './repository'
import type { ExperienceAggregate } from './aggregate'
import type { ExperienceSearchQueryParams } from './types'

/**
 * Experience Search Service
 * Multi-faceted search index projection service filtering experiences by country, city, price range (EGP), duration, and availability.
 */
export class ExperienceSearchService {
  private repository: ExperienceRepository

  constructor(repository: ExperienceRepository) {
    this.repository = repository
  }

  async searchExperiences(params: ExperienceSearchQueryParams): Promise<ExperienceAggregate[]> {
    try {
      return await this.repository.findFiltered(params)
    } catch (err) {
      console.error('[ExperienceSearchService] Failed searching experiences:', err)
      throw err
    }
  }
}
