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
import type { AdminAdjustmentParams, PointLedgerRecord, TierProgress } from './types'
import type { LoyaltyTier, RequestContext } from '@/types'
import { TierPolicy } from './tier-policy'
import { LoyaltyProgramConfig } from './tier-config'
import { loyaltyProgramRegistry } from './program-registry'
import { EventBus } from '../events/event-bus'
import { EventOutboxService } from '../events/outbox'

/**
 * Loyalty Workflow Engine
 * Central deterministic orchestrator for all loyalty point lifecycle workflows.
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

  async getActiveConfig(pinnedConfig?: LoyaltyProgramConfig, context?: RequestContext): Promise<LoyaltyProgramConfig> {
    return loyaltyProgramRegistry.getProgram(this.repository, pinnedConfig, context)
  }

  calculateTierProgress(
    totalSpentEGP: number,
    currentTier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): TierProgress {
    return TierPolicy.getTierProgress(totalSpentEGP, currentTier, config)
  }

  getTierThresholds(config: LoyaltyProgramConfig): Array<{ tier: LoyaltyTier; minSpentEGP: number }> {
    const ordered = TierPolicy.getOrderedTiers(config)
    return ordered.map((t) => ({
      tier: t.tier,
      minSpentEGP: t.minSpentEGP,
    }))
  }

  async grantWelcomeBonus(userId: number, config?: LoyaltyProgramConfig, context?: RequestContext): Promise<PointLedgerRecord> {
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Received parameter config: ${!!config}, PID: ${process.pid}, Uptime: ${process.uptime()}s`)
    const activeConfig = await this.getActiveConfig(config, context)
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Config resolved:`, {
      baseEarnRate: activeConfig.baseEarnRate,
      redemptionPointsUnit: activeConfig.redemptionPointsUnit,
      redemptionValueEGP: activeConfig.redemptionValueEGP,
    })
    const record = await this.pointsEarner.grantWelcomeBonus(userId, activeConfig, context)
    await this.repository.updateCustomerProjection(userId, record.resultingBalance, record.id, context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'LOYALTY_EARNED',
      eventId: `evt_wel_${userId}_${Date.now()}`,
      correlationId: `corr_loy_${userId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId: userId,
      points: record.points,
      balance: record.resultingBalance,
    }, context)

    return record
  }

  async earnPointsForBooking(
    userId: number,
    bookingId: number,
    amountSpentEGP: number,
    bookingNumber = String(bookingId),
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const activeConfig = await this.getActiveConfig(config, context)
    const record = await this.pointsEarner.earnForBooking(userId, amountSpentEGP, bookingId, bookingNumber, activeConfig, context)
    await this.repository.updateCustomerProjection(userId, record.resultingBalance, record.id, context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'LOYALTY_EARNED',
      eventId: `evt_earn_${userId}_${bookingId}_${Date.now()}`,
      correlationId: `corr_loy_${userId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId: userId,
      points: record.points,
      balance: record.resultingBalance,
      bookingId,
    }, context)

    return record
  }

  async redeemPoints(
    userId: number,
    pointsToRedeem: number,
    bookingId: number,
    bookingTotalEGP: number,
    reason = 'Checkout discount redemption',
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const activeConfig = await this.getActiveConfig(config, context)
    const record = await this.pointsRedeemer.redeemForBooking(
      userId,
      pointsToRedeem,
      bookingId,
      bookingTotalEGP,
      activeConfig,
      reason,
      context,
    )
    await this.repository.updateCustomerProjection(userId, record.resultingBalance, record.id, context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'POINTS_REDEEMED',
      eventId: `evt_red_${userId}_${bookingId}_${Date.now()}`,
      correlationId: `corr_loy_${userId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId: userId,
      points: Math.abs(record.points),
      balance: record.resultingBalance,
      bookingId,
    }, context)

    return record
  }

  async refundPointsForCancellation(
    userId: number,
    bookingId: number,
    originalEarnedPoints: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const record = await this.pointsRefunder.reverseEarnedPoints(userId, originalEarnedPoints, bookingId, context)
    await this.repository.updateCustomerProjection(userId, record.resultingBalance, record.id, context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'POINTS_REFUNDED',
      eventId: `evt_ref_${userId}_${bookingId}_${Date.now()}`,
      correlationId: `corr_loy_${userId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId: userId,
      points: Math.abs(record.points),
      balance: record.resultingBalance,
      bookingId,
    }, context)

    return record
  }

  async processExpiredPoints(context?: RequestContext): Promise<number> {
    return this.pointsExpirer.processExpiredPoints(context)
  }

  async adminAdjustPoints(params: AdminAdjustmentParams, context?: RequestContext): Promise<PointLedgerRecord> {
    const record = await this.adminAdjustment.executeAdjustment(params, context)
    await this.repository.updateCustomerProjection(params.customerId, record.resultingBalance, record.id, context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'MANUAL_ADJUSTMENT',
      eventId: `evt_adj_${params.customerId}_${Date.now()}`,
      correlationId: `corr_loy_${params.customerId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId: params.customerId,
      points: record.points,
      balance: record.resultingBalance,
      ticket: params.ticket,
      adminId: params.adminId,
    }, context)

    return record
  }

  async evaluateAndUpgradeTier(
    userId: number,
    additionalSpentEGP = 0,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<LoyaltyTier> {
    const activeConfig = await this.getActiveConfig(config, context)
    const res = await this.tierEvaluator.evaluateAndUpgrade(userId, additionalSpentEGP, activeConfig, context)

    if (res.upgraded) {
      // Outbox Event Logging (Transaction-Bound Post-Commit event)
      const outbox = EventOutboxService.getInstance()
      await outbox.record({
        type: 'TIER_UPGRADED',
        eventId: `evt_tier_${userId}_${Date.now()}`,
        correlationId: `corr_loy_${userId}`,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: userId,
        newTier: res.newTier,
        bonusGranted: res.bonusRecord ? res.bonusRecord.points : 0,
      }, context)

      if (res.bonusRecord) {
        await this.repository.updateCustomerProjection(userId, res.bonusRecord.resultingBalance, res.bonusRecord.id, context)
      }
    }

    return res.newTier
  }

  async processBookingCancellation(
    customerId: number,
    bookingId: number,
    bookingTotalEGP: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ newTier: LoyaltyTier }> {
    const activeConfig = await this.getActiveConfig(config, context)

    // 1. Idempotency Guard: Check if a ledger entry with metadata.isBookingCancellation === true already exists
    const existingEntries = await this.repository.getBookingLedgerEntries(bookingId, context)
    const hasCancellationProcessed = existingEntries.some(
      (entry) => entry.metadata && entry.metadata.isBookingCancellation === true,
    )

    if (hasCancellationProcessed) {
      console.log(
        `[LoyaltyWorkflowEngine] Idempotency Guard: Cancellation already processed for booking #${bookingId}. Skipping.`,
      )
      const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
      return { newTier: aggregate.tier }
    }

    // 2. Retrieve Points: Sum up earned and redeemed points from ledger entries linked to this booking
    let pointsEarned = 0
    let pointsRedeemed = 0

    for (const entry of existingEntries) {
      if (entry.type === 'earn' || entry.type === 'welcome_bonus' || entry.type === 'tier_bonus') {
        pointsEarned += entry.points
      } else if (entry.type === 'redeem') {
        pointsRedeemed += Math.abs(entry.points)
      }
    }

    console.log(
      `[LoyaltyWorkflowEngine] Processing cancellation for booking #${bookingId}: deducting spent ${bookingTotalEGP} EGP, reversing earned ${pointsEarned} points, refunding redeemed ${pointsRedeemed} points.`,
    )

    // 3. Deduct booking spent from totalSpentEGP and evaluate new tier
    const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
    const newTotalSpent = Math.max(0, aggregate.totalSpentEGP - bookingTotalEGP)
    const newTier = TierPolicy.evaluateEligibleTier(newTotalSpent, activeConfig)

    // Update customer document (reduces totalSpent and updates tier if demoted)
    await this.repository.updateCustomerTier(customerId, newTier, -bookingTotalEGP, context)

    // Reclaim/reverse tier upgrade bonuses for all levels the customer has been demoted from
    const ordered = TierPolicy.getOrderedTiers(activeConfig)
    const orderedTierNames = ordered.map(t => t.tier)
    const oldTierIndex = orderedTierNames.indexOf(aggregate.tier)
    const newTierIndex = orderedTierNames.indexOf(newTier)

    if (newTierIndex < oldTierIndex && oldTierIndex !== -1 && newTierIndex !== -1) {
      const lostTiers = orderedTierNames.slice(newTierIndex + 1, oldTierIndex + 1)
      console.log(`[LoyaltyWorkflowEngine] Demotion detected. Customer lost tiers: ${lostTiers.join(', ')}`)

      for (const tier of lostTiers) {
        const bonusRef = `tier_${tier}_${customerId}`
        const reverseRef = `reverse_tier_${tier}_${customerId}`

        const existingBonus = await this.repository.findLedgerByReference('system_welcome', bonusRef, 'tier_bonus', context)
        const alreadyReversed = await this.repository.findLedgerByReference('system_welcome', reverseRef, 'reverse', context)

        if (existingBonus && !alreadyReversed) {
          const bonusAmount = existingBonus.points
          console.log(`[LoyaltyWorkflowEngine] Reversing upgrade bonus of ${bonusAmount} points for lost tier ${tier}`)

          await this.repository.appendLedgerEntry(
            customerId,
            'reverse',
            -bonusAmount,
            `Reversal of upgrade bonus for lost tier ${tier} due to booking cancellation #${bookingId}`,
            'system_welcome',
            reverseRef,
            bookingId,
            undefined,
            { isBookingCancellation: true },
            context,
          )
        }
      }
    }

    // 4. Reverse earned points if any
    if (pointsEarned > 0) {
      await this.repository.appendLedgerEntry(
        customerId,
        'reverse',
        -pointsEarned,
        `Reversal of earned points for cancelled booking #${bookingId}`,
        'booking',
        String(bookingId),
        bookingId,
        undefined,
        { isBookingCancellation: true },
        context,
      )
    }

    // 5. Refund redeemed points if any
    if (pointsRedeemed > 0) {
      await this.repository.appendLedgerEntry(
        customerId,
        'refund',
        pointsRedeemed,
        `Refund for cancelled booking #${bookingId}`,
        'booking',
        String(bookingId),
        bookingId,
        undefined,
        { isBookingCancellation: true },
        context,
      )
    }

    // 6. If both pointsEarned and pointsRedeemed are 0, and no upgrade bonuses were reversed, 
    // we still append a 0-amount reverse entry to act as the cancellation audit marker.
    if (pointsEarned === 0 && pointsRedeemed === 0) {
      let wroteTierReversal = false
      if (newTierIndex < oldTierIndex) {
        wroteTierReversal = true
      }
      if (!wroteTierReversal) {
        await this.repository.appendLedgerEntry(
          customerId,
          'reverse',
          0,
          `Cancellation audit marker for booking #${bookingId}`,
          'booking',
          String(bookingId),
          bookingId,
          undefined,
          { isBookingCancellation: true },
          context,
        )
      }
    }

    const finalBalance = await this.repository.getCurrentBalance(customerId, context)
    await this.repository.updateCustomerProjection(customerId, finalBalance, 'cancellation_sync', context)

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record({
      type: 'POINTS_REFUNDED',
      eventId: `evt_ref_cancel_${customerId}_${bookingId}_${Date.now()}`,
      correlationId: `corr_loy_${customerId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      customerId,
      points: pointsRedeemed, // points refunded
      balance: finalBalance,
      bookingId,
    }, context)

    return { newTier }
  }

  async rebuildCustomerProjection(userId: number, context?: RequestContext): Promise<number> {
    const projection = await this.projectionRebuilder.rebuildCustomerProjection(userId, context)
    return projection.balance
  }

  async getCustomerBalance(userId: number, context?: RequestContext): Promise<number> {
    return this.queries.getBalance(userId, context)
  }

  async getCustomerLedgerHistory(userId: number, limit = 50, context?: RequestContext): Promise<PointLedgerRecord[]> {
    return this.queries.getHistory(userId, limit, context)
  }
}
