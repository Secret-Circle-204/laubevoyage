import { TravelerRepository } from './repositories/traveler-repository'
import type { CompanionTravelerEntity } from './types'

/**
 * Profile Manager Sub-Service
 * Manages companion traveler profiles using dedicated repositories.
 */
export class ProfileManager {
  private travelerRepo: TravelerRepository

  constructor(travelerRepo: TravelerRepository) {
    this.travelerRepo = travelerRepo
  }

  async getTravelers(customerId: number): Promise<CompanionTravelerEntity[]> {
    return this.travelerRepo.findByCustomerId(customerId)
  }

  async addTraveler(traveler: Omit<CompanionTravelerEntity, 'travelerId'>): Promise<CompanionTravelerEntity> {
    return this.travelerRepo.addTraveler(traveler)
  }
}
