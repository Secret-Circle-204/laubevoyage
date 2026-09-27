import { TravelerRepository } from './repositories/traveler-repository'
import type { CompanionTravelerEntity, TravelerReportRecord } from './types'
import type { PaginatedResponse } from '@/types'

/**
 * Profile Manager Sub-Service
 * Coordinates saved companion profiles and company traveler registry queries.
 */
export class ProfileManager {
  private travelerRepo: TravelerRepository

  constructor(travelerRepo: TravelerRepository) {
    this.travelerRepo = travelerRepo
  }

  /**
   * Get saved companions for a customer account.
   */
  async getSavedCompanions(customerId: number): Promise<CompanionTravelerEntity[]> {
    return this.travelerRepo.findSavedCompanionsByCustomerId(customerId)
  }

  /**
   * Save or link a companion to a customer account.
   */
  async saveCompanion(
    customerId: number,
    travelerId: number,
    relationship: 'spouse' | 'child' | 'parent' | 'friend' | 'self' | 'other' = 'other',
  ): Promise<void> {
    return this.travelerRepo.saveCompanionRelationship(customerId, travelerId, relationship)
  }

  /**
   * Query the authoritative company-wide Traveler Registry with bounded pagination.
   */
  async getTravelersReport(options?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<TravelerReportRecord>> {
    return this.travelerRepo.getTravelersReport(options)
  }
}
