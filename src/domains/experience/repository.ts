import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'
import type { ExperienceAggregate } from './aggregate'
import type {
  DepartureSlotEntity,
  DepartureSlotStatus,
  ExperienceAvailabilityStatus,
  ExperienceSearchQueryParams,
  ExperienceOperationalMetadata,
} from './types'
import type { Experience } from '@/payload-types'

import {
  type FindSlotsQueryOptions,
  type PaginatedDepartureSlotsResult,
  mapExperienceDocToAggregate,
  findTimezoneByCityId as findTimezoneByCityIdOp,
  findExperienceById,
  findExperienceOperationalMetadataById,
  findExperiencesByIds,
  findExperienceBySlug,
  updateExperienceAvailability,
  findFilteredExperiences,
  findRelatedExperiences,
  findDepartureSlotsByExperienceId,
  findDepartureSlotsByExperienceIdPaginated,
  getDepartureSlotById as getDepartureSlotByIdOp,
  findDepartureSlotsByIds as findDepartureSlotsByIdsOp,
  getDepartureSlot as getDepartureSlotOp,
  getDepartureSlotByDate as getDepartureSlotByDateOp,
  countDepartureSlots as countDepartureSlotsOp,
  findStartingPriceCandidateSlots as findStartingPriceCandidateSlotsOp,
  findStartingPriceCandidateSlotsBatchOp,
  commitDepartureSlotCapacity,

  releaseDepartureSlotCommittedCapacity,
  saveDepartureSlotEntity,
  createDepartureSlotAdminOp,
  updateDepartureSlotAdminOp,
  cancelDepartureSlotAdminOp,
  deleteDepartureSlotAdminOp,
} from './repository/index'

export type { FindSlotsQueryOptions, PaginatedDepartureSlotsResult }

/**
 * Experience Repository
 * Sole data persistence layer for the Experience Domain.
 * Intercepts all database queries for 'experiences', 'cities', and 'countries' collections.
 */
export class ExperienceRepository {
  public payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Find experience aggregate by ID.
   */
  async findById(experienceId: number, req?: PayloadRequest): Promise<ExperienceAggregate> {
    return findExperienceById(this.payload, experienceId, req)
  }

  /**
   * Find lightweight operational metadata by ID without hydrating heavy sub-models (e.g. Accommodations).
   */
  async findOperationalMetadataById(
    experienceId: number,
    req?: PayloadRequest,
  ): Promise<ExperienceOperationalMetadata> {
    return findExperienceOperationalMetadataById(this.payload, experienceId, req)
  }

  /**
   * Find multiple experience aggregates matching a list of experience IDs in a single query.
   */
  async findManyByIds(
    experienceIds: number[],
    req?: PayloadRequest,
  ): Promise<ExperienceAggregate[]> {
    return findExperiencesByIds(this.payload, experienceIds, req)
  }

  /**
   * Find experience aggregate by unique slug.
   */
  async findBySlug(slug: string, req?: PayloadRequest): Promise<ExperienceAggregate | null> {
    return findExperienceBySlug(this.payload, slug, req)
  }

  /**
   * Update experience availability status exclusively with State Machine validation.
   */
  async updateAvailability(
    experienceId: number,
    newStatus: ExperienceAvailabilityStatus,
    req?: PayloadRequest,
  ): Promise<ExperienceAggregate> {
    return updateExperienceAvailability(this.payload, experienceId, newStatus, req)
  }

  /**
   * Find experiences using filters with server-side pagination.
   */
  async findFiltered(
    params: ExperienceSearchQueryParams,
    req?: PayloadRequest,
  ): Promise<{
    docs: ExperienceAggregate[]
    totalDocs: number
    totalPages: number
    page: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    return findFilteredExperiences(this.payload, params, req)
  }

  /**
   * Resolve authoritative destination IANA timezone for a given city ID.
   * Traverses City ──► Country.timezone without fallbacks.
   */
  async findTimezoneByCityId(
    cityId: number,
    context?: RequestContext | PayloadRequest,
  ): Promise<string> {
    return findTimezoneByCityIdOp(this.payload, cityId, context)
  }

  /**
   * Find departure slots for a specific experience ID from database with optional date/pagination options.
   */
  async findSlotsByExperienceId(
    experienceId: number,
    optionsOrReq?: FindSlotsQueryOptions | PayloadRequest,
    req?: PayloadRequest,
  ): Promise<DepartureSlotEntity[]> {
    return findDepartureSlotsByExperienceId(this.payload, experienceId, optionsOrReq, req)
  }

  /**
   * Find starting price candidate departure slots for an experience.
   * Bounded query (returns at most 2-3 candidate slot entities).
   */
  async findStartingPriceCandidateSlots(
    experienceId: number,
    minDate: string,
    cheaperOverrideDates: string[] = [],
    context?: RequestContext,
  ) {
    return findStartingPriceCandidateSlotsOp(
      this.payload,
      experienceId,
      minDate,
      cheaperOverrideDates,
      context,
    )
  }

  /**
   * Find candidate departure slots for multiple package experiences in a single bounded SQL query.
   * Returns a Map of experienceId -> DepartureSlotEntity[] (at most 2 candidates per package).
   */
  async findStartingPriceCandidateSlotsBatch(
    packageExperienceIds: number[],
    minDate: string,
    context?: RequestContext,
  ): Promise<Map<number, DepartureSlotEntity[]>> {
    return findStartingPriceCandidateSlotsBatchOp(
      this.payload,
      packageExperienceIds,
      minDate,
      context,
    )
  }

  /**
   * Find related experiences for a given experience based on shared city or type.
   * Bounded showcase contract (limit: 3).
   */
  async findRelated(
    experienceId: number,
    cityId: number,
    type: string,
    limit: number = 3,
    req?: PayloadRequest,
  ): Promise<ExperienceAggregate[]> {
    return findRelatedExperiences(this.payload, experienceId, cityId, type, limit, req)
  }


  /**
   * Find departure slots for a specific experience ID with full database-level pagination metadata.
   */
  async findSlotsByExperienceIdPaginated(
    experienceId: number,
    options?: FindSlotsQueryOptions,
    req?: PayloadRequest,
  ): Promise<PaginatedDepartureSlotsResult> {
    return findDepartureSlotsByExperienceIdPaginated(this.payload, experienceId, options, req)
  }

  /**
   * Fetch departure slot entity by slot ID (number) and optional experience ID, RequestContext, or PayloadRequest.
   */
  async getDepartureSlotById(
    slotId: number,
    experienceIdOrContextOrReq?: number | RequestContext | PayloadRequest,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity | null> {
    return getDepartureSlotByIdOp(this.payload, slotId, experienceIdOrContextOrReq, context)
  }

  /**
   * Batch-fetch multiple departure slot entities by slot IDs (True Database Batch Query).
   */
  async findDepartureSlotsByIds(
    slotIds: number[],
    context?: RequestContext,
  ): Promise<DepartureSlotEntity[]> {
    return findDepartureSlotsByIdsOp(this.payload, slotIds, context)
  }

  /**
   * Fetch departure slot entity by departure ID.
   */
  async getDepartureSlot(
    departureId: string,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity | null> {
    return getDepartureSlotOp(this.payload, departureId, context)
  }

  /**
   * Fetch departure slot entity by date and experience ID.
   */
  async getDepartureSlotByDate(
    experienceId: number,
    date: string,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity | null> {
    return getDepartureSlotByDateOp(this.payload, experienceId, date, context)
  }

  /**
   * Count departure slots for an experience with optional status filter.
   */
  async countDepartureSlots(
    experienceId: number,
    status?: string,
    context?: RequestContext,
  ): Promise<number> {
    return countDepartureSlotsOp(this.payload, experienceId, status, context)
  }

  /**
   * Commit reserved capacity to sold atomically with optimistic locking.
   */
  async commitCapacity(
    departureId: string,
    seats: number,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    return commitDepartureSlotCapacity(this.payload, departureId, seats, context)
  }

  /**
   * Release committed/sold capacity back to available (e.g. on cancellation/refund).
   */
  async releaseCommittedCapacity(
    departureId: string,
    seats: number,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    return releaseDepartureSlotCommittedCapacity(this.payload, departureId, seats, context)
  }

  /**
   * Save / update departure slot entity with Optimistic Locking version check.
   */
  async saveDepartureSlot(
    slot: DepartureSlotEntity,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    return saveDepartureSlotEntity(this.payload, slot, context)
  }

  /**
   * Create a new DepartureSlot with domain invariants.
   */
  async createDepartureSlotAdmin(
    data: {
      experienceId: number
      date: string
      startTime?: string
      priceOverrideEGP?: number
      capacityTotal: number
      status?: DepartureSlotStatus
    },
    req?: PayloadRequest,
  ): Promise<DepartureSlotEntity> {
    return createDepartureSlotAdminOp(this.payload, data, req)
  }

  /**
   * Update an existing DepartureSlot with domain invariants and optimistic concurrency check.
   */
  async updateDepartureSlotAdmin(
    slotId: number,
    update: {
      date?: string
      startTime?: string
      priceOverrideEGP?: number | null
      capacityTotal?: number
      status?: DepartureSlotStatus
      version: number
    },
    req?: PayloadRequest,
  ): Promise<DepartureSlotEntity> {
    return updateDepartureSlotAdminOp(this.payload, slotId, update, req)
  }

  /**
   * Cancel an existing DepartureSlot operationally.
   * Disables the slot from future public sales/bookings while keeping all existing bookings intact.
   */
  async cancelDepartureSlotAdmin(
    slotId: number,
    expectedVersion: number,
    req?: PayloadRequest,
  ): Promise<DepartureSlotEntity> {
    return cancelDepartureSlotAdminOp(this.payload, slotId, expectedVersion, req)
  }

  /**
   * Permanently delete a DepartureSlot ONLY if zero historical bookings ever referenced it.
   * Atomic Transactional Execution: Prevents race conditions with incoming bookings.
   */
  async deleteDepartureSlotAdmin(
    slotId: number,
    expectedVersion: number,
    req?: PayloadRequest,
  ): Promise<{ success: boolean; id: number; experienceId: number }> {
    return deleteDepartureSlotAdminOp(this.payload, slotId, expectedVersion, req)
  }

  /**
   * Pure data transformation & strict schema invariant validation from Payload Experience doc to domain ExperienceAggregate.
   */
  public mapDocToAggregate(doc: Experience | Record<string, unknown>): ExperienceAggregate {
    return mapExperienceDocToAggregate(doc)
  }
}
