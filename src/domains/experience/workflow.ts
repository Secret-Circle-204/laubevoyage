import type { Payload } from 'payload'
import { ExperienceRepository } from './repository'
import { InventoryManager } from './inventory'
import { ExperienceSearchService } from './search'
import { ExperienceQueries } from './queries'
import { PricingPipelineEngine, type PricingSnapshotData } from '../currency/pipeline'
import type { PricingContext, DepartureSlotEntity } from './types'
import type { RequestContext } from '@/types'
import { EventBus } from '../events/event-bus'
import { BasePriceResolver } from './base-price-resolver'
import { BookableDepartureAssembler } from './bookable-departure-assembler'

/**
 * Experience Workflow Engine
 * Central deterministic orchestrator for Experience & Destination workflows.
 * Symmetrical architecture with BookingWorkflowEngine, PaymentWorkflowEngine, and LoyaltyWorkflowEngine.
 */
export class ExperienceWorkflowEngine {
  public repository: ExperienceRepository
  public pipelineEngine: PricingPipelineEngine
  public inventoryManager: InventoryManager
  public searchService: ExperienceSearchService
  public queries: ExperienceQueries
  public priceResolver: BasePriceResolver
  public departureAssembler: BookableDepartureAssembler
  private eventBus: EventBus

  constructor(repository: ExperienceRepository | Payload, pipelineEngine?: PricingPipelineEngine) {
    const activePayload = repository && 'find' in repository ? (repository as Payload) : undefined
    const isRepo = repository && typeof repository === 'object' && 'findById' in repository

    if (isRepo) {
      this.repository = repository as unknown as ExperienceRepository
    } else {
      this.repository = new ExperienceRepository(activePayload!)
    }
    this.pipelineEngine = pipelineEngine || new (PricingPipelineEngine as any)()
    this.inventoryManager = new InventoryManager(this.repository)
    this.searchService = new ExperienceSearchService(this.repository)
    this.queries = new ExperienceQueries(this.repository)
    this.priceResolver = new BasePriceResolver()
    this.departureAssembler = new BookableDepartureAssembler(this.priceResolver)
    this.eventBus = EventBus.getInstance()
  }

  /**
   * Deterministic Pricing Workflow:
   * PricingRuleEngine -> PromotionEngine -> TaxEngine -> Currency Conversion -> Versioned PricingSnapshotData
   */
  async executePricingWorkflow(
    basePriceEGP: number,
    context: PricingContext,
  ): Promise<PricingSnapshotData> {
    const snapshot = await this.pipelineEngine.calculatePricingSnapshot(basePriceEGP, context)

    await this.eventBus.publish({
      eventId: `evt_snap_${snapshot.snapshotId}_${Date.now()}`,
      correlationId: `corr_${context.experienceId}`,
      occurredAt: new Date().toISOString(),
      type: 'PRICING_SNAPSHOT_CREATED',
      eventVersion: 1,
      snapshotId: snapshot.snapshotId,
      experienceId: context.experienceId,
      departureId: context.departureId,
      basePriceEGP: snapshot.basePriceEGP,
      displayCurrency: snapshot.displayCurrency,
      displayAmount: snapshot.displayAmount,
      timestamp: new Date().toISOString(),
    })

    return snapshot
  }

  /**
   * Deterministic Reserve Inventory Workflow:
   * Policy Check -> Capacity Hold -> Optimistic Lock Save -> Emit InventoryReservedEvent
   */
  async executeReserveInventoryWorkflow(
    departureId: string,
    experienceId: number,
    seats: number,
    customerId: number,
    bookingId: number,
    context?: RequestContext,
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    const result = await this.inventoryManager.reserveCapacity(
      departureId,
      experienceId,
      seats,
      customerId,
      bookingId,
      context,
    )

    await this.eventBus.publish({
      eventId: `evt_inv_res_${result.holdId}_${Date.now()}`,
      correlationId: `corr_${bookingId}`,
      occurredAt: new Date().toISOString(),
      type: 'INVENTORY_RESERVED',
      eventVersion: 1,
      departureId,
      experienceId,
      seatsReserved: seats,
      holdId: result.holdId,
      timestamp: new Date().toISOString(),
    })

    return result
  }

  /**
   * Deterministic Release Inventory Workflow:
   * Release Capacity -> Emit InventoryReleasedEvent
   */
  async executeReleaseInventoryWorkflow(
    departureId: string,
    seats: number,
    context?: RequestContext,
  ): Promise<DepartureSlotEntity> {
    const slot = await this.inventoryManager.releaseCapacity(departureId, seats, context)

    await this.eventBus.publish({
      eventId: `evt_inv_rel_${departureId}_${Date.now()}`,
      correlationId: `corr_release_${departureId}`,
      occurredAt: new Date().toISOString(),
      type: 'INVENTORY_RELEASED',
      eventVersion: 1,
      departureId,
      seatsReleased: seats,
      timestamp: new Date().toISOString(),
    })

    return slot
  }
}
