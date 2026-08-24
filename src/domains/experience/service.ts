import { ExperienceWorkflowEngine } from './workflow'
import { ExperienceRepository } from './repository'
import type { PricingContext, DepartureSlotEntity, ExperienceSearchQueryParams } from './types'
import type { PricingSnapshotData } from '../currency/pipeline'
import type { ExperienceAggregate } from './aggregate'
import { BookableDeparture } from './bookable-departure'
import { BlackoutPolicy } from './blackout-policy'
import { ExperiencePolicy } from './policy'
import type { RequestContext } from '@/types'
import type { SlotAuditReport, SystemAuditReport, SlotReconciliationResult, SystemReconciliationResult } from './reconciliation'


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
    context?: RequestContext,
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    return this.workflowEngine.executeReserveInventoryWorkflow(
      departureId,
      experienceId,
      seats,
      customerId,
      bookingId,
      context,
    )
  }

  /**
   * Release reserved capacity for a departure slot.
   */
  async releaseCapacity(
    departureId: string,
    seats: number,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    return this.workflowEngine.executeReleaseInventoryWorkflow(departureId, seats, context)
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
    const prices = results.map((e) => e.price).filter((p): p is number => p !== null && p !== undefined)
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
   * Get multiple experience aggregates matching a list of experience IDs.
   */
  async getManyByIds(experienceIds: number[]): Promise<ExperienceAggregate[]> {
    return this.workflowEngine.queries.getManyByIds(experienceIds)
  }


  /**
   * Get experience aggregate by unique slug.
   */
  async getBySlug(slug: string): Promise<ExperienceAggregate | null> {
    return this.workflowEngine.queries.getBySlug(slug)
  }

  /**
   * Resolves the authoritative destination IANA timezone for an experience.
   * Traverses Experience ──► City ──► Country.timezone without fallbacks.
   */
  async getDestinationTimezone(experienceId: number, context?: RequestContext): Promise<string> {
    const exp = await this.getById(experienceId)
    if (!exp || !exp.cityId) {
      throw new Error(`[ExperienceService] Experience #${experienceId} is missing authoritative city reference to resolve timezone.`)
    }
    return this.repository.findTimezoneByCityId(exp.cityId, context)
  }

  /**
   * Resolves the "Starting From" price for an experience.
   * Business rules:
   * 1. If active slots exist in the future, returns the minimum resolved price among them.
   * 2. If no future slots exist, falls back to the experience catalog price.
   */
  async resolveStartingPrice(experienceId: number, todayStr: string): Promise<number> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const slots = await this.findSlotsByExperienceId(experienceId)
    const availableSlots = slots.filter((s) => s.status === 'available' && s.date >= todayStr)

    let minPrice = Number.POSITIVE_INFINITY

    for (const slot of availableSlots) {
      const price = this.workflowEngine.priceResolver.resolve(experience, slot)
      minPrice = Math.min(minPrice, price)
    }

    if (minPrice === Number.POSITIVE_INFINITY) {
      if (experience.price === undefined || experience.price === null) {
        throw new Error(`[ExperienceService] Experience ${experienceId} has no available slots and no catalog price fallback.`)
      }
      return experience.price
    }

    return minPrice
  }


  /**
   * Commit reserved capacity to sold.
   */
  async commitCapacity(departureId: string, seats: number, context?: RequestContext): Promise<DepartureSlotEntity> {
    return this.workflowEngine.inventoryManager.commitCapacity(departureId, seats, context)
  }

  /**
   * Release committed capacity from sold back to available.
   */
  async releaseCommittedCapacity(departureId: string, seats: number, context?: RequestContext): Promise<DepartureSlotEntity> {
    return this.workflowEngine.inventoryManager.releaseCommittedCapacity(departureId, seats, context)
  }

  /**
   * Get departure slot by ID.
   */
  async getDepartureSlot(departureId: string, context?: RequestContext): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlot(departureId, context)
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
  async getDepartureSlotByDate(experienceId: number, date: string, context?: RequestContext): Promise<DepartureSlotEntity | null> {
    return this.workflowEngine.queries.getDepartureSlotByDate(experienceId, date, context)
  }

  async findSlotsByExperienceId(experienceId: number): Promise<DepartureSlotEntity[]> {
    const experience = await this.getById(experienceId)
    if (!experience) return []
    return this.workflowEngine.queries.findSlotsByExperienceId(experienceId)
  }

  /**
   * Materializes or fetches a concrete DepartureSlot for a Daily Tour on a given date/time.
   */
  async getOrCreateDailyDeparture(
    experienceId: number,
    date: string,
    startTime: string,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    if (!date || !startTime) {
      throw new Error(`[ExperienceService] date and startTime are required for daily departure materialization.`)
    }

    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const existingSlots = await this.workflowEngine.queries.findSlotsByExperienceId(experienceId)
    const existing = existingSlots.find((s) => s.date === date && s.startTime === startTime)
    if (existing) {
      return existing
    }

    const cleanTime = startTime.replace(':', '')
    const departureId = `DEP-${experienceId}-${date}-${cleanTime}`

    // Check if slot with this departureId exists
    const existingById = await this.getDepartureSlot(departureId, context)
    if (existingById) {
      return existingById
    }

    // Match schedule config
    const schedule = experience.schedules?.find((s) => s.startTime === startTime)
    if (!schedule) {
      throw new Error(`[ExperienceService] Requested startTime "${startTime}" is not a configured schedule for Daily Tour #${experienceId}.`)
    }
    if (typeof schedule.defaultCapacity !== 'number' || schedule.defaultCapacity < 1) {
      throw new Error(`[ExperienceService] Daily Tour #${experienceId} schedule for "${startTime}" has invalid defaultCapacity (must be >= 1).`)
    }

    const capacityTotal = schedule.defaultCapacity

    return this.workflowEngine.repository.saveDepartureSlot(
      {
        departureId,
        experienceId,
        date,
        startTime,
        capacityTotal,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: capacityTotal,
        version: 1,
        status: 'available',
      },
      context,
    )
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
   * Pure Read-Only Preview: Resolves the bookable departure read model for a given experience, date, and startTime
   * with ZERO database mutations.
   * Leverages 3 independent bookability models (Fixed Package, Daily Tour, Flexible Package).
   */
  async resolvePreviewDepartureByDate(
    experienceId: number,
    date: string,
    startTime: string,
    now: Date = new Date(),
  ): Promise<BookableDeparture> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const destinationTimezone = await this.getDestinationTimezone(experienceId)
    const isFixedPackage = experience.type === 'package' && experience.packageMode === 'fixed_date'
    const isFlexiblePackage = experience.type === 'package' && experience.packageMode === 'flexible_date'
    const isDailyTour = experience.type === 'daily_tour'

    // ==========================================
    // PATH 1: Fixed Package (Physical Slot-Driven)
    // ==========================================
    if (isFixedPackage) {
      const slot = await this.getDepartureSlotByDate(experienceId, date)
      const cleanTime = startTime || slot?.startTime || undefined
      const effectivePrice = this.workflowEngine.priceResolver.resolve(experience, slot, date, startTime)

      let bookabilityStatus: 'available' | 'sold_out' | 'blacked_out' | 'cancelled' | 'past' = slot?.status || 'available'
      if (slot) {
        const slotCheck = ExperiencePolicy.isFixedPackageSlotBookable(
          {
            date: slot.date,
            startTime: slot.startTime || undefined,
            slotStatus: slot.status,
            capacityAvailable: slot.capacityAvailable,
            timezone: destinationTimezone,
          },
          now,
        )
        if (!slotCheck.allowed) {
          if (slotCheck.code === 'DEPARTURE_IN_PAST' || slotCheck.code === 'DEPARTURE_COMPLETED') {
            bookabilityStatus = 'past'
          } else if (slotCheck.code === 'SLOT_SOLD_OUT') {
            bookabilityStatus = 'sold_out'
          }
        }
      } else {
        bookabilityStatus = 'past'
      }

      return new BookableDeparture({
        id: slot?.id,
        experienceId: experience.id,
        experienceTitle: experience.title,
        experienceType: experience.type,
        departureId: slot?.departureId || '',
        date,
        startTime: cleanTime,
        effectiveBasePrice: effectivePrice,
        capacityAvailable: slot ? slot.capacityAvailable : undefined,
        capacityTotal: slot ? slot.capacityTotal : undefined,
        status: bookabilityStatus,
      })
    }

    // ==========================================
    // PATH 2: Flexible Package (User-Selected Start Date)
    // ==========================================
    if (isFlexiblePackage) {
      const effectivePrice = this.workflowEngine.priceResolver.resolve(experience, null, date, '')
      const blackouts = experience.blackouts || []
      const flexCheck = ExperiencePolicy.isFlexiblePackageStartDateBookable(
        {
          startDate: date,
          durationDays: experience.durationDays,
          blackouts,
          timezone: destinationTimezone,
        },
        now,
      )

      let status: 'available' | 'sold_out' | 'blacked_out' | 'cancelled' | 'past' = 'available'
      if (!flexCheck.allowed) {
        if (flexCheck.code === 'START_DATE_IN_PAST' || flexCheck.code === 'DEPARTURE_COMPLETED') {
          status = 'past'
        } else if (flexCheck.code === 'BLACKED_OUT') {
          status = 'blacked_out'
        }
      }

      return new BookableDeparture({
        experienceId: experience.id,
        experienceTitle: experience.title,
        experienceType: experience.type,
        departureId: `DEP-${experience.id}-${date}`,
        date,
        effectiveBasePrice: effectivePrice,
        status,
      })
    }

    // ==========================================
    // PATH 3: Daily Tour (Daily Schedule Occurrence)
    // ==========================================
    if (isDailyTour) {
      const effectivePrice = this.workflowEngine.priceResolver.resolve(experience, null, date, startTime)
      const blackouts = experience.blackouts || []
      const dailyCheck = ExperiencePolicy.isDailyTourDepartureBookable(
        {
          date,
          startTime,
          durationMinutes: experience.durationMinutes,
          blackouts,
          timezone: destinationTimezone,
        },
        now,
      )

      let status: 'available' | 'sold_out' | 'blacked_out' | 'cancelled' | 'past' = 'available'
      if (!dailyCheck.allowed) {
        if (dailyCheck.code === 'DEPARTURE_IN_PAST' || dailyCheck.code === 'DEPARTURE_COMPLETED') {
          status = 'past'
        } else if (dailyCheck.code === 'BLACKED_OUT') {
          status = 'blacked_out'
        }
      }

      return new BookableDeparture({
        experienceId: experience.id,
        experienceTitle: experience.title,
        experienceType: experience.type,
        departureId: `DEP-${experience.id}-${date}-${startTime.replace(':', '')}`,
        date,
        startTime,
        effectiveBasePrice: effectivePrice,
        status,
      })
    }

    throw new Error(`[ExperienceService] Unsupported experience type/mode for Experience #${experienceId}`)
  }

  /**
   * Use Case: Resolves the bookable departure read model for a given experience and date.
   * Coordinates fetching and pure domain model assembly.
   */
  async resolveBookableDepartureByDate(
    experienceId: number,
    date: string,
    startTime: string,
    now: Date = new Date(),
  ): Promise<BookableDeparture> {
    const experience = await this.getById(experienceId)
    if (!experience) {
      throw new Error(`[ExperienceService] Experience with ID ${experienceId} not found.`)
    }

    const destinationTimezone = await this.getDestinationTimezone(experienceId)
    const isFixedPackage = experience.type === 'package' && experience.packageMode === 'fixed_date'
    const isFlexiblePackage = experience.type === 'package' && experience.packageMode === 'flexible_date'
    const isDailyTour = experience.type === 'daily_tour'

    if (isFlexiblePackage) {
      const preview = await this.resolvePreviewDepartureByDate(experienceId, date, '', now)
      if (preview.status !== 'available') {
        throw new Error(`[ExperienceService] Cannot book flexible package on start date ${date}: Status is ${preview.status}`)
      }
      return preview
    }

    if (isDailyTour) {
      const preview = await this.resolvePreviewDepartureByDate(experienceId, date, startTime, now)
      if (preview.status !== 'available') {
        throw new Error(`[ExperienceService] Cannot book daily tour on ${date} at ${startTime}: Status is ${preview.status}`)
      }
      return preview
    }

    if (isFixedPackage) {
      const slot = await this.getDepartureSlotByDate(experienceId, date)
      if (!slot) {
        throw new Error(`[ExperienceService] Departure slot on date ${date} not found for experience ${experienceId}.`)
      }
      return this.workflowEngine.departureAssembler.assemble(experience, slot)
    }

    throw new Error(`[ExperienceService] Unsupported experience type for Experience #${experienceId}`)
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
   * Phase 1: Pure Read-Only Audit of a Departure Slot against Bookings & Holds.
   */
  async auditSlot(slotId: number, context?: RequestContext): Promise<SlotAuditReport> {
    return this.workflowEngine.reconciliation.auditSlot(slotId, context)
  }

  /**
   * Phase 1 (Bulk): Audit all departure slots in the database.
   */
  async auditAllSlots(context?: RequestContext): Promise<SystemAuditReport> {
    return this.workflowEngine.reconciliation.auditAllSlots(context)
  }

  /**
   * Phase 2: Transactional Self-Healing Reconciliation of a single slot.
   */
  async reconcileSlot(slotId: number, context?: RequestContext): Promise<SlotReconciliationResult> {
    return this.workflowEngine.reconciliation.reconcileSlot(slotId, context)
  }

  /**
   * Phase 2 (Bulk): Transactional Self-Healing Reconciliation across all departure slots.
   */
  async reconcileAllSlots(context?: RequestContext): Promise<SystemReconciliationResult> {
    return this.workflowEngine.reconciliation.reconcileAllSlots(context)
  }
}
