import type { ExperienceRepository } from './repository'
import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity } from './types'

/**
 * Experience Queries Sub-Service
 * Read-only queries for experiences, departure slots, and availability calendars.
 */
export class ExperienceQueries {
  private repository: ExperienceRepository

  constructor(repository: ExperienceRepository) {
    this.repository = repository
  }

  async getById(experienceId: number): Promise<ExperienceAggregate> {
    return this.repository.findById(experienceId)
  }

  async getBySlug(slug: string): Promise<ExperienceAggregate | null> {
    return this.repository.findBySlug(slug)
  }

  async getDepartureSlot(departureId: string): Promise<DepartureSlotEntity | null> {
    return this.repository.getDepartureSlot(departureId)
  }
}
