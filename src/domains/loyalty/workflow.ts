import type { Payload } from 'payload'
import { LoyaltyRepository } from './repository'
import { PointsEarnProcessor } from './points-earner'
import { PointsRedeemProcessor } from './points-redeemer'
import { PointsRefundProcessor } from './points-refunder'
import { PointsExpirationProcessor } from './points-expirer'
import { AdminAdjustmentService } from './admin-adjustment'
import { TierEvaluator } from './tier-evaluator'
import { ProjectionRebuilder } from './projection-rebuilder'
import { LoyaltyQueries } from './queries'
import { PointHoldService } from './point-hold'
import type { AdminAdjustmentParams, PointLedgerRecord } from './types'
import type { LoyaltyTier } from '@/types'
import type { LoyaltyProgramConfig } from './tier-config'
import { loyaltyProgramRegistry } from './program-registry'
import { EventBus } from '../events/event-bus'

/**
 * Loyalty Workflow Engine
 * Central deterministic orchestrator for all loyalty point lifecycle workflows.
 * Fetches active published program policy via LoyaltyProgramRegistry.
 */
export class LoyaltyWorkflowEngine {
  public repository: LoyaltyRepository
  public pointsEarner: PointsEarnProcessor
  public pointsRedeemer: PointsRedeemProcessor
  public pointsRefunder: PointsRefundProcessor
  public pointsExpirer: PointsExpirationProcessor
  public adminAdjustment: AdminAdjustmentService
  public tierEvaluator: TierEvaluator
  public projectionRebuilder: ProjectionRebuilder
  public queries: LoyaltyQueries
  public pointHoldService: PointHoldService
  private eventBus: EventBus

  constructor(repository?: LoyaltyRepository | Payload) {
    if (repository && 'appendLedgerEntry' in repository) {
      this.repository = repository as LoyaltyRepository
    } else {
      this.repository = new LoyaltyRepository(repository as Payload)
    }
    this.pointsEarner = new PointsEarnProcessor(this.repository)
    this.pointsRedeemer = new PointsRedeemProcessor(this.repository)
    this.pointsRefunder = new PointsRefundProcessor(this.repository)
    this.pointsExpirer = new PointsExpirationProcessor(this.repository)
    this.adminAdjustment = new AdminAdjustmentService(this.repository)
    this.tierEvaluator = new TierEvaluator(this.repository)
    this.projectionRebuilder = new ProjectionRebuilder(this.repository)
    this.queries = new LoyaltyQueries(this.repository)
    this.pointHoldService = new PointHoldService()
    this.eventBus = EventBus.getInstance()
  }

  async getActiveConfig(pinnedConfig?: LoyaltyProgramConfig): Promise<LoyaltyProgramConfig> {
    return loyaltyProgramRegistry.getProgram(this.repository, pinnedConfig)
  }

  async grantWelcomeBonus(userId: number, config?: LoyaltyProgramConfig): Promise<PointLedgerRecord> {
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Received parameter config: ${!!config}, PID: ${process.pid}, Uptime: ${process.uptime()}s`)
    const activeConfig = await this.getActiveConfig(config)
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Config resolved:`, {
      baseEarnRate: activeConfig.baseEarnRate,
      redemptionPointsUnit: activeConfig.redemptionPointsUnit,
      redemptionValueEGP: activeConfig.redemptionValueEGP,
    })
    return this.pointsEarner.grantWelcomeBonus(userId, activeConfig)
  }

  async earnPointsForBooking(
    userId: number,
    bookingId: number,
    amountSpentEGP: number,
    bookingNumber = String(bookingId),
    config?: LoyaltyProgramConfig,
  ): Promise<PointLedgerRecord> {
    const activeConfig = await this.getActiveConfig(config)
    return this.pointsEarner.earnForBooking(userId, amountSpentEGP, bookingId, bookingNumber, activeConfig)
  }

  async redeemPoints(
    userId: number,
    pointsToRedeem: number,
    bookingId: number,
    bookingTotalEGP: number,
    reason = 'Checkout discount redemption',
    config?: LoyaltyProgramConfig,
  ): Promise<PointLedgerRecord> {
    const activeConfig = await this.getActiveConfig(config)
    return this.pointsRedeemer.redeemForBooking(
      userId,
      pointsToRedeem,
      bookingId,
      bookingTotalEGP,
      activeConfig,
      reason,
    )
  }

  async refundPointsForCancellation(
    userId: number,
    bookingId: number,
    originalEarnedPoints: number,
  ): Promise<PointLedgerRecord> {
    return this.pointsRefunder.reverseEarnedPoints(userId, originalEarnedPoints, bookingId)
  }

  async processExpiredPoints(): Promise<number> {
    return this.pointsExpirer.processExpiredPoints()
  }

  async adminAdjustPoints(params: AdminAdjustmentParams): Promise<PointLedgerRecord> {
    return this.adminAdjustment.executeAdjustment(params)
  }

  async evaluateAndUpgradeTier(
    userId: number,
    additionalSpentEGP = 0,
    config?: LoyaltyProgramConfig,
  ): Promise<LoyaltyTier> {
    const activeConfig = await this.getActiveConfig(config)
    const res = await this.tierEvaluator.evaluateAndUpgrade(userId, additionalSpentEGP, activeConfig)
    return res.newTier
  }

  async rebuildCustomerProjection(userId: number): Promise<number> {
    const projection = await this.projectionRebuilder.rebuildCustomerProjection(userId)
    return projection.balance
  }

  async getCustomerBalance(userId: number): Promise<number> {
    return this.queries.getBalance(userId)
  }

  async getCustomerLedgerHistory(userId: number, limit = 50): Promise<PointLedgerRecord[]> {
    return this.queries.getHistory(userId, limit)
  }
}
