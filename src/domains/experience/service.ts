import { ExperienceWorkflowEngine } from './workflow'
import { ExperienceRepository } from './repository'
import type { PricingContext, DepartureSlotEntity, ExperienceSearchQueryParams } from './types'
import type { PricingSnapshotData } from '../currency/pipeline'
import type { ExperienceAggregate } from './aggregate'
import { BookableDeparture } from './bookable-departure'
import { PricingPolicyRegistry } from './pricing-policy-registry'


/**
 * Experience Domain Service (Enterprise Thin Facade)
 * Single entry point for all Destination & Experience catalog operations via Dependency Injection.
 * Delegated to ExperienceWorkflowEngine for single-responsibility orchestration.
 */
export class ExperienceService {
  private repository: ExperienceRepository
  private workflowEngine: ExperienceWorkflowEngine

  constructor(repository: ExperienceRepository, workflowEngine: ExperienceWorkflowEngine) {
    this.repository = repository
    this.workflowEngine = workflowEngine
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
    const prices = results.map((e) => e.basePriceEGP).filter((p): p is number => p !== null)
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
   * Get experience aggregate by unique slug.
   */
  async getBySlug(slug: string): Promise<ExperienceAggregate | null> {
    return this.workflowEngine.queries.getBySlug(slug)
  }

  /**
   * Resolves the marketing "Starting From" price for an experience.
   *
   * Business Contract / Rule:
   * 1. For catalog-priced experiences (e.g. daily tours), it returns the experience's base catalog price.
   * 2. For departure-priced experiences (e.g. packages/cruises):
   *    - It fetches all active (not sold-out/cancelled) departure slots that occur on or after `todayStr`.
   *    - It resolves the price of each slot (taking slot overrides into account) and returns the minimum (cheapest) price.
   *    - If no active slots are found, it falls back to the experience's catalog price (if available).
   * 3. Throws an error if no price can be resolved.
   *
   * @param todayStr Current business date formatted as 'YYYY-MM-DD' (assumed Egyptian timezone).
   *                 Departure dates are stored as 'YYYY-MM-DD' strings, allowing chronological comparison.
   */
  async resolveStartingPrice(experienceId: number, todayStr: string): Promise<number> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const pricingSource = PricingPolicyRegistry.getSource(experience.type)

    if (pricingSource === 'catalog') {
      if (experience.basePriceEGP === undefined) {
        throw new Error(`[ExperienceService] Experience ${experienceId} is catalog-priced but has no catalog price.`)
      }
      return experience.basePriceEGP
    }

    const slots = await this.findSlotsByExperienceId(experienceId)
    const availableSlots = slots.filter((s) => s.status === 'available' && s.date >= todayStr)

    let minPrice = Number.POSITIVE_INFINITY

    for (const slot of availableSlots) {
      const price = this.workflowEngine.priceResolver.resolve(experience, slot)
      minPrice = Math.min(minPrice, price)
    }

    if (minPrice === Number.POSITIVE_INFINITY) {
      if (experience.basePriceEGP === undefined) {
        throw new Error(`[ExperienceService] Experience ${experienceId} has no available slots and no catalog price fallback.`)
      }
      return experience.basePriceEGP
    }

    return minPrice
  }

  /**
   * Get departure slot by ID.
   */
  async getDepartureSlot(departureId: string): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlot(departureId)
  }

  /**
   * Get departure slot by slot ID (number) and optional experience ID.
   */
  async getDepartureSlotById(slotId: number, experienceId?: number): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlotById(slotId, experienceId)
  }

  /**
   * Get departure slot by date and experience ID.
   */
  async getDepartureSlotByDate(experienceId: number, date: string): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlotByDate(experienceId, date)
  }

  async findSlotsByExperienceId(experienceId: number): Promise<DepartureSlotEntity[]> {
    const experience = await this.getById(experienceId)
    if (!experience) return []
    const pricingSource = PricingPolicyRegistry.getSource(experience.type)
    if (pricingSource === 'catalog') {
      return [] // Catalog-priced experiences (daily tours) do not support departure slots
    }
    return this.workflowEngine.queries.findSlotsByExperienceId(experienceId)
  }

  /**
   * Use Case: Resolves the bookable departure read model for a given experience and slot ID.
   * Coordinates fetching and pure domain model assembly.
   */
  async resolveBookableDepartureBySlot(experienceId: number, slotId: number): Promise<BookableDeparture> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const slot = await this.getDepartureSlotById(slotId, experienceId)
    if (!slot) {
      throw new Error(`[ExperienceService] Departure slot with ID ${slotId} not found for experience ${experienceId}.`)
    }

    return this.workflowEngine.departureAssembler.assemble(experience, slot)
  }

  /**
   * Use Case: Resolves the bookable departure read model for a given experience and date.
   * Coordinates fetching and pure domain model assembly.
   */
  async resolveBookableDepartureByDate(experienceId: number, date: string): Promise<BookableDeparture> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const slot = await this.getDepartureSlotByDate(experienceId, date)
    if (!slot) {
      throw new Error(`[ExperienceService] Departure slot on date ${date} not found for experience ${experienceId}.`)
    }

    return this.workflowEngine.departureAssembler.assemble(experience, slot)
  }

  /**
   * Assemble BookableDeparture read model using pre-loaded aggregates.
   * [Pure Domain Assembly - Zero DB queries]
   */
  assembleBookableDeparture(experience: ExperienceAggregate, slot: DepartureSlotEntity): BookableDeparture {
    return this.workflowEngine.departureAssembler.assemble(experience, slot)
  }

  /**
   * Resolves the default departure slot to select when a user opens the page.
   * Business rule: The closest available (not sold out/cancelled) slot in the future.
   *
   * @param todayStr Current business date formatted as 'YYYY-MM-DD'.
   */
  resolveDefaultSlot(slots: DepartureSlotEntity[], todayStr: string): DepartureSlotEntity | null {
    const activeSlots = slots.filter((s) => s.status === 'available' && s.date >= todayStr)
    if (activeSlots.length === 0) return null

    // Sort by date ascending to find the closest one
    return [...activeSlots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null
  }

  /**
   * Use Case: Resolves a virtual bookable departure for catalog-priced or fallback experiences
   * where no slot is currently selected/available.
   */
  async resolveBookableDepartureWithoutSlot(experienceId: number): Promise<BookableDeparture> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    if (experience.basePriceEGP === undefined) {
      throw new Error(`[ExperienceService] Experience ${experienceId} has no available slots and no catalog price fallback.`)
    }

    return new BookableDeparture({
      experienceId: experience.id,
      experienceTitle: experience.title,
      experienceType: experience.type,
      departureId: '',
      date: '',
      startTime: '',
      basePriceEGP: experience.basePriceEGP,
      capacityAvailable: 0,
      capacityTotal: 0,
      status: 'sold_out',
    })
  }
}
