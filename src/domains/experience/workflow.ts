import type { Payload } from 'payload'
import { ExperienceRepository } from './repository'
import { InventoryManager } from './inventory'
import { ExperienceSearchService } from './search'
import { ExperienceQueries } from './queries'
import { PricingPipelineEngine, type PricingSnapshotData } from '../currency/pipeline'
import type { PricingContext, DepartureSlotEntity } from './types'
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
      type: 'PRICING_SNAPSHOT_CREATED',
      eventVersion: 'v1',
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
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    const result = await this.inventoryManager.reserveCapacity(
      departureId,
      experienceId,
      seats,
      customerId,
      bookingId,
    )

    await this.eventBus.publish({
      type: 'INVENTORY_RESERVED',
      eventVersion: 'v1',
      departureId,
      experienceId,
      seatsReserved: seats,
      holdId: result.holdId,
      timestamp: new Date().toISOString(),
    })

    return result
  }
}
