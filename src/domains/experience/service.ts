import type { Payload } from 'payload'
import { ExperienceWorkflowEngine } from './workflow'
import type { PricingContext, DepartureSlotEntity, ExperienceSearchQueryParams } from './types'
import type { PricingSnapshotData } from '../currency/pipeline'
import type { ExperienceAggregate } from './aggregate'

/**
 * Experience Domain Service (Enterprise Thin Facade)
 * Single entry point for all Destination & Experience catalog operations.
 * Delegated to ExperienceWorkflowEngine for single-responsibility orchestration.
 */
export class ExperienceService {
  private workflowEngine: ExperienceWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new ExperienceWorkflowEngine(payload)
  }

  /**
   * Calculate frozen pricing snapshot with dynamic rules, promotions, taxes, and currency conversion.
   */
  async calculatePricing(
    basePriceEGP: number,
    context: PricingContext,
  ): Promise<PricingSnapshotData> {
    return this.workflowEngine.executePricingWorkflow(basePriceEGP, context)
  }

  /**
   * Reserve seat capacity for a departure slot.
   */
  async reserveCapacity(
    departureId: string,
    experienceId: number,
    seats: number,
    customerId: number,
    bookingId: number,
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    return this.workflowEngine.executeReserveInventoryWorkflow(
      departureId,
      experienceId,
      seats,
      customerId,
      bookingId,
    )
  }

  /**
   * Multi-faceted search for experiences.
   */
  async search(params: ExperienceSearchQueryParams): Promise<ExperienceAggregate[]> {
    return this.workflowEngine.searchService.searchExperiences(params)
  }

  /**
   * Get catalog with pre-computed domain facets.
   */
  async getCatalog(params: ExperienceSearchQueryParams) {
    const results = await this.search(params)
    const prices = results.map((e) => e.basePriceEGP)
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
    const categories = Array.from(new Set(results.map((e) => e.type)))

    return {
      experiences: results,
      facets: { minPrice, maxPrice, categories },
      totalItems: results.length,
    }
  }

  /**
   * Get experience aggregate by ID.
   */
  async getById(experienceId: number): Promise<ExperienceAggregate> {
    return this.workflowEngine.queries.getById(experienceId)
  }

  /**
   * Get departure slot by ID.
   */
  async getDepartureSlot(departureId: string): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlot(departureId)
  }
}
