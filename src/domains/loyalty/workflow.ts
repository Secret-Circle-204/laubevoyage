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
import type { AdminAdjustmentParams, PointLedgerRecord } from './types'
import type { LoyaltyTier } from '@/types'
import { EventBus } from '../events/event-bus'

/**
 * Loyalty Workflow Engine
 * Central deterministic orchestrator for all loyalty point lifecycle workflows.
 * Symmetrical architecture with BookingWorkflowEngine and PaymentWorkflowEngine.
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
  private eventBus: EventBus

  constructor(repository: LoyaltyRepository | Payload, payload?: Payload) {
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
    this.eventBus = EventBus.getInstance()
  }

  /**
   * Deterministic Earn Points Workflow:
   * Earn Points -> Evaluate Tier Upgrade -> DB Commit -> Emit Events
   */
  async executeEarnWorkflow(
    customerId: number,
    amountSpentEGP: number,
    bookingId: number,
    bookingNumber: string,
  ): Promise<PointLedgerRecord> {
    const record = await this.pointsEarner.earnForBooking(customerId, amountSpentEGP, bookingId, bookingNumber)

    // Evaluate tier upgrade
    const tierResult = await this.tierEvaluator.evaluateAndUpgrade(customerId, amountSpentEGP)

    // Emit LoyaltyEarnedEvent
    await this.eventBus.publish({
      type: 'LOYALTY_EARNED',
      eventVersion: 'v1',
      customerId,
      points: record.points,
      balance: record.resultingBalance,
      bookingId,
      timestamp: new Date().toISOString(),
    })

    if (tierResult.upgraded) {
      await this.eventBus.publish({
        type: 'TIER_UPGRADED',
        eventVersion: 'v1',
        customerId,
        newTier: tierResult.newTier,
        bonusGranted: tierResult.bonusRecord?.points || 0,
        timestamp: new Date().toISOString(),
      })
    }

    return record
  }

  /**
   * Deterministic Redeem Points Workflow:
   * Policy -> Drift Guard -> Append Ledger -> DB Commit -> Emit PointsRedeemedEvent
   */
  async executeRedeemWorkflow(
    customerId: number,
    pointsToRedeem: number,
    bookingId: number,
    reason: string,
  ): Promise<PointLedgerRecord> {
    const record = await this.pointsRedeemer.redeemForBooking(customerId, pointsToRedeem, bookingId, reason)

    await this.eventBus.publish({
      type: 'POINTS_REDEEMED',
      eventVersion: 'v1',
      customerId,
      points: Math.abs(record.points),
      balance: record.resultingBalance,
      bookingId,
      timestamp: new Date().toISOString(),
    })

    return record
  }

  /**
   * Deterministic Refund Points Workflow:
   * Append Refund Ledger -> DB Commit -> Emit PointsRefundedEvent
   */
  async executeRefundWorkflow(
    customerId: number,
    pointsToRefund: number,
    bookingId: number,
  ): Promise<PointLedgerRecord> {
    const record = await this.pointsRefunder.refundRedeemedPoints(customerId, pointsToRefund, bookingId)

    await this.eventBus.publish({
      type: 'POINTS_REFUNDED',
      eventVersion: 'v1',
      customerId,
      points: record.points,
      balance: record.resultingBalance,
      bookingId,
      timestamp: new Date().toISOString(),
    })

    return record
  }

  /**
   * Deterministic Admin Adjustment Workflow:
   * Governance Validation -> Append Ledger -> DB Commit -> Emit ManualAdjustmentEvent
   */
  async executeAdminAdjustmentWorkflow(params: AdminAdjustmentParams): Promise<PointLedgerRecord> {
    const record = await this.adminAdjustment.executeAdjustment(params)

    await this.eventBus.publish({
      type: 'MANUAL_ADJUSTMENT',
      eventVersion: 'v1',
      customerId: params.customerId,
      points: record.points,
      balance: record.resultingBalance,
      ticket: params.ticket,
      adminId: params.adminId,
      timestamp: new Date().toISOString(),
    })

    return record
  }
}
