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

  async getActiveConfig(
    pinnedConfig?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<LoyaltyProgramConfig> {
    return loyaltyProgramRegistry.getProgram(this.repository, pinnedConfig, context)
  }

  calculateTierProgress(
    totalSpentEGP: number,
    currentTier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): TierProgress {
    return TierPolicy.getTierProgress(totalSpentEGP, currentTier, config)
  }

  getTierThresholds(
    config: LoyaltyProgramConfig,
  ): Array<{ tier: LoyaltyTier; minSpentEGP: number }> {
    const ordered = TierPolicy.getOrderedTiers(config)
    return ordered.map((t) => ({
      tier: t.tier,
      minSpentEGP: t.minSpentEGP,
    }))
  }

  async grantWelcomeBonus(
    userId: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    console.log(
      `[LoyaltyWorkflowEngine.grantWelcomeBonus] Received parameter config: ${!!config}, PID: ${process.pid}, Uptime: ${process.uptime()}s`,
    )
    const activeConfig = await this.getActiveConfig(config, context)
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Config resolved:`, {
      baseEarnRate: activeConfig.baseEarnRate,
      redemptionPointsUnit: activeConfig.redemptionPointsUnit,
      redemptionValueEGP: activeConfig.redemptionValueEGP,
    })
    const record = await this.pointsEarner.grantWelcomeBonus(userId, activeConfig, context)
    await this.repository.updateCustomerProjection(
      userId,
      record.resultingBalance,
      record.id,
      context,
    )

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'LOYALTY_EARNED',
        eventId: `evt_wel_${userId}_${Date.now()}`,
        correlationId: `corr_loy_${userId}`,
        aggregateType: 'Customer',
        aggregateId: String(userId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: userId,
        points: record.points,
        balance: record.resultingBalance,
        source: 'welcome_bonus',
      },
      context,
    )

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
    const record = await this.pointsEarner.earnForBooking(
      userId,
      amountSpentEGP,
      bookingId,
      bookingNumber,
      activeConfig,
      context,
    )
    await this.repository.updateCustomerProjection(
      userId,
      record.resultingBalance,
      record.id,
      context,
    )

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'LOYALTY_EARNED',
        eventId: `evt_earn_${userId}_${bookingId}_${Date.now()}`,
        correlationId: `corr_loy_${userId}`,
        aggregateType: 'Customer',
        aggregateId: String(userId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: userId,
        points: record.points,
        balance: record.resultingBalance,
        bookingId,
        source: 'booking',
      },
      context,
    )

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
    await this.repository.updateCustomerProjection(
      userId,
      record.resultingBalance,
      record.id,
      context,
    )

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'POINTS_REDEEMED',
        eventId: `evt_red_${userId}_${bookingId}_${Date.now()}`,
        correlationId: `corr_loy_${userId}`,
        aggregateType: 'Customer',
        aggregateId: String(userId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: userId,
        points: Math.abs(record.points),
        balance: record.resultingBalance,
        bookingId,
      },
      context,
    )

    return record
  }

  async refundPointsForCancellation(
    userId: number,
    bookingId: number,
    originalEarnedPoints: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const record = await this.pointsRefunder.reverseEarnedPoints(
      userId,
      originalEarnedPoints,
      bookingId,
      context,
    )
    await this.repository.updateCustomerProjection(
      userId,
      record.resultingBalance,
      record.id,
      context,
    )

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'POINTS_REFUNDED',
        eventId: `evt_ref_${userId}_${bookingId}_${Date.now()}`,
        correlationId: `corr_loy_${userId}`,
        aggregateType: 'Customer',
        aggregateId: String(userId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: userId,
        points: Math.abs(record.points),
        balance: record.resultingBalance,
        bookingId,
      },
      context,
    )

    return record
  }

  async processExpiredPoints(context?: RequestContext): Promise<number> {
    return this.pointsExpirer.processExpiredPoints(context)
  }

  async adminAdjustPoints(
    params: AdminAdjustmentParams,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const record = await this.adminAdjustment.executeAdjustment(params, context)
    await this.repository.updateCustomerProjection(
      params.customerId,
      record.resultingBalance,
      record.id,
      context,
    )

    // Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'MANUAL_ADJUSTMENT',
        eventId: `evt_adj_${params.customerId}_${Date.now()}`,
        correlationId: `corr_loy_${params.customerId}`,
        aggregateType: 'Customer',
        aggregateId: String(params.customerId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: params.customerId,
        points: record.points,
        balance: record.resultingBalance,
        ticket: params.ticket,
        adminId: params.adminId,
      },
      context,
    )

    return record
  }

  async onAdminLedgerEntryCreated(
    params: {
      customerId: number
      points: number
      balance: number
      ledgerId: string
      type: string
      reason: string
      ticket?: string
      adminId?: string
    },
    context?: RequestContext,
  ): Promise<void> {
    // 1. Synchronize customer document projection
    await this.repository.updateCustomerProjection(
      params.customerId,
      params.balance,
      params.ledgerId,
      context,
    )

    // 2. Outbox Event Logging (Transaction-Bound Post-Commit event)
    const outbox = EventOutboxService.getInstance()
    await outbox.record(
      {
        type: 'MANUAL_ADJUSTMENT',
        eventId: `evt_adj_${params.customerId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        correlationId: `corr_loy_${params.customerId}`,
        aggregateType: 'Customer',
        aggregateId: String(params.customerId),
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: params.customerId,
        points: params.points,
        balance: params.balance,
        ticket: params.ticket || `TICK-${Date.now()}`,
        adminId: params.adminId || 'staff_admin',
      },
      context,
    )
  }

  async evaluateAndUpgradeTier(
    userId: number,
    additionalSpentEGP = 0,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<LoyaltyTier> {
    const activeConfig = await this.getActiveConfig(config, context)
    const res = await this.tierEvaluator.evaluateAndUpgrade(
      userId,
      additionalSpentEGP,
      activeConfig,
      context,
    )

    if (res.upgraded) {
      // Outbox Event Logging (Transaction-Bound Post-Commit event)
      const outbox = EventOutboxService.getInstance()
      await outbox.record(
        {
          type: 'TIER_UPGRADED',
          eventId: `evt_tier_${userId}_${Date.now()}`,
          correlationId: `corr_loy_${userId}`,
          aggregateType: 'Customer',
          aggregateId: String(userId),
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId: userId,
          newTier: res.newTier,
          bonusGranted: res.bonusRecord ? res.bonusRecord.points : 0,
        },
        context,
      )

      if (res.bonusRecord) {
        await this.repository.updateCustomerProjection(
          userId,
          res.bonusRecord.resultingBalance,
          res.bonusRecord.id,
          context,
        )
      }
    }

    return res.newTier
  }

  /**
   * Phase A: Process redemption refund and tier adjustments for cancelled booking.
   * Restores redeemed points (+200), reverses lost tier bonuses, and adjusts total spent.
   * This operation is guaranteed to succeed and must be committed independently.
   */
  /**
   * Phase A: Process redemption refund and qualifying spend adjustment for cancelled booking.
   * Restores redeemed points (+200), adjusts qualifying total spent, and re-evaluates tier projection.
   * This operation is guaranteed to succeed and must be committed independently.
   */
  async processBookingRedemptionRefund(
    customerId: number,
    bookingId: number,
    bookingTotalEGP: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ newTier: LoyaltyTier; pointsRedeemed: number }> {
    const activeConfig = await this.getActiveConfig(config, context)
    const existingEntries = await this.repository.getBookingLedgerEntries(bookingId, context)

    // Authoritative Idempotency Guard: Check if Phase A already ran for this booking
    const hasPhaseAExecuted = existingEntries.some(
      (e) =>
        e.referenceType === 'booking' &&
        e.referenceId === String(bookingId) &&
        (e.type === 'refund' || (e.metadata && (e.metadata as any).isBookingCancellation === true)),
    )

    if (hasPhaseAExecuted) {
      console.log(
        `[LoyaltyWorkflowEngine] Idempotency Guard: Phase A (Redemption Refund & Spend Adjustment) already processed for booking #${bookingId}. Skipping.`,
      )
      const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
      return { newTier: aggregate.tier, pointsRedeemed: 0 }
    }

    let qualifyingSpendContributed = 0
    let pointsRedeemed = 0

    for (const entry of existingEntries) {
      if (entry.type === 'earn' && entry.referenceType === 'booking') {
        const entrySpent = (entry.metadata as unknown as { amountSpentEGP?: number })?.amountSpentEGP
        if (typeof entrySpent === 'number' && entrySpent > 0) {
          qualifyingSpendContributed += entrySpent
        }
      } else if (entry.type === 'redeem') {
        pointsRedeemed += Math.abs(entry.points)
      }
    }

    console.log(
      `[LoyaltyWorkflowEngine] Phase A: Processing redemption refund for booking #${bookingId}: qualifying spent to deduct: ${qualifyingSpendContributed} EGP, points redeemed to refund: ${pointsRedeemed} points.`,
    )

    const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
    let newTier = aggregate.tier

    // 1. Deduct booking qualifying spend from totalSpentEGP ONLY if booking contributed qualifying spend
    if (qualifyingSpendContributed > 0) {
      const newTotalSpent = aggregate.totalSpentEGP - qualifyingSpendContributed
      newTier = TierPolicy.evaluateEligibleTier(newTotalSpent, activeConfig)

      // Update customer document (reduces totalSpent and updates tier if demoted)
      await this.repository.updateCustomerTier(customerId, newTier, -qualifyingSpendContributed, context)
    }

    // 2. Refund redeemed points if any, or record audit marker if pointsRedeemed === 0
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
    } else {
      // Zero-redemption audit marker to authoritatively record that Phase A completed for this booking
      await this.repository.appendLedgerEntry(
        customerId,
        'refund',
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

    const finalBalance = await this.repository.getCurrentBalance(customerId, context)
    await this.repository.updateCustomerProjection(
      customerId,
      finalBalance,
      'cancellation_sync',
      context,
    )

    if (pointsRedeemed > 0) {
      const outbox = EventOutboxService.getInstance()
      await outbox.record(
        {
          type: 'POINTS_REFUNDED',
          eventId: `evt_ref_cancel_${customerId}_${bookingId}_${Date.now()}`,
          correlationId: `corr_loy_${customerId}`,
          aggregateType: 'Customer',
          aggregateId: String(customerId),
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          points: pointsRedeemed,
          balance: finalBalance,
          bookingId,
        },
        context,
      )
    }

    return { newTier, pointsRedeemed }
  }

  /**
   * Phase B: Process earned points and tier bonus reversal for cancelled booking.
   * Attempts to reverse earned points (-3480) and any lost tier upgrade bonuses.
   * If customer has insufficient spendable balance, this throws FinancialInvariantException.
   */
  async processBookingEarnedReversal(
    customerId: number,
    bookingId: number,
    bookingTotalEGP: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ pointsReversed: number }> {
    const activeConfig = await this.getActiveConfig(config, context)
    const existingEntries = await this.repository.getBookingLedgerEntries(bookingId, context)

    const existingReverse = existingEntries.find(
      (e) => e.type === 'reverse' && e.referenceType === 'booking' && e.referenceId === String(bookingId),
    )

    if (existingReverse) {
      console.log(
        `[LoyaltyWorkflowEngine] Earned points already reversed for booking #${bookingId}. Skipping.`,
      )
      return { pointsReversed: Math.abs(existingReverse.points) }
    }

    let qualifyingSpendContributed = 0
    let pointsEarned = 0
    let alreadyReversed = 0

    for (const entry of existingEntries) {
      if (entry.type === 'earn' && entry.referenceType === 'booking') {
        pointsEarned += entry.points
        const entrySpent = (entry.metadata as unknown as { amountSpentEGP?: number })?.amountSpentEGP
        if (typeof entrySpent === 'number' && entrySpent > 0) {
          qualifyingSpendContributed += entrySpent
        }
      } else if (entry.type === 'reverse' && entry.referenceType === 'booking') {
        alreadyReversed += Math.abs(entry.points)
      }
    }

    const pointsToReverse = Math.max(0, pointsEarned - alreadyReversed)

    // If the booking never contributed qualifying spend and never earned points, Phase B is a clean no-op
    if (pointsToReverse === 0 && qualifyingSpendContributed === 0) {
      console.log(
        `[LoyaltyWorkflowEngine] Phase B: Booking #${bookingId} had zero qualifying spend and zero earned points. Skipping reversal.`,
      )
      return { pointsReversed: 0 }
    }

    // 1. Reclaim/reverse tier upgrade bonuses for all levels the customer has been demoted from
    const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
    const ordered = TierPolicy.getOrderedTiers(activeConfig)
    const orderedTierNames = ordered.map((t) => t.tier)
    const currentTierIndex = orderedTierNames.indexOf(aggregate.tier)

    // Determine prior tier from totalSpentEGP + qualifyingSpendContributed to identify lost tiers
    const priorEligibleTier = TierPolicy.evaluateEligibleTier(
      aggregate.totalSpentEGP + qualifyingSpendContributed,
      activeConfig,
    )
    const priorTierIndex = orderedTierNames.indexOf(priorEligibleTier)

    if (currentTierIndex < priorTierIndex && currentTierIndex !== -1 && priorTierIndex !== -1) {
      const lostTiers = orderedTierNames.slice(currentTierIndex + 1, priorTierIndex + 1)
      console.log(
        `[LoyaltyWorkflowEngine] Phase B: Demotion detected. Customer lost tiers: ${lostTiers.join(', ')}`,
      )

      for (const tier of lostTiers) {
        const bonusRef = `tier_${tier}_${customerId}`
        const reverseRef = `reverse_tier_${tier}_${customerId}`

        const existingBonus = await this.repository.findLedgerByReference(
          'system_welcome',
          bonusRef,
          'tier_bonus',
          context,
        )
        const alreadyReversedBonus = await this.repository.findLedgerByReference(
          'system_welcome',
          reverseRef,
          'reverse',
          context,
        )

        if (existingBonus && !alreadyReversedBonus) {
          const bonusAmount = existingBonus.points
          console.log(
            `[LoyaltyWorkflowEngine] Phase B: Reversing upgrade bonus of ${bonusAmount} points for lost tier ${tier}`,
          )

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

    // 2. Reverse earned points if any
    if (pointsToReverse > 0) {
      console.log(
        `[LoyaltyWorkflowEngine] Phase B: Attempting reversal of ${pointsToReverse} earned points for booking #${bookingId}...`,
      )

      await this.repository.appendLedgerEntry(
        customerId,
        'reverse',
        -pointsToReverse,
        `Reversal of earned points for cancelled booking #${bookingId}`,
        'booking',
        String(bookingId),
        bookingId,
        undefined,
        { isBookingCancellation: true },
        context,
      )

      const finalBalance = await this.repository.getCurrentBalance(customerId, context)
      await this.repository.updateCustomerProjection(
        customerId,
        finalBalance,
        'cancellation_sync',
        context,
      )

      const outbox = EventOutboxService.getInstance()
      await outbox.record(
        {
          type: 'POINTS_REFUNDED',
          eventId: `evt_rev_cancel_${customerId}_${bookingId}_${Date.now()}`,
          correlationId: `corr_loy_${customerId}`,
          aggregateType: 'Customer',
          aggregateId: String(customerId),
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          customerId,
          points: pointsToReverse,
          balance: finalBalance,
          bookingId,
        },
        context,
      )
    }

    return { pointsReversed: pointsToReverse }
  }

  /**
   * Composite booking cancellation method:
   * Executes Phase A (Redemption Refund & Spend Sync) followed by Phase B (Earned & Tier Reversal).
   */
  async processBookingCancellation(
    customerId: number,
    bookingId: number,
    bookingTotalEGP: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ newTier: LoyaltyTier }> {
    const { newTier } = await this.processBookingRedemptionRefund(customerId, bookingId, bookingTotalEGP, config, context)
    await this.processBookingEarnedReversal(customerId, bookingId, bookingTotalEGP, config, context)
    return { newTier }
  }

  async processBookingPartialRefund(
    customerId: number,
    bookingId: number,
    cumulativeRefundedEGP: number,
    originalTotalEGP: number,
    referenceId: string,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ newTier: LoyaltyTier; pointsReversed: number }> {
    const activeConfig = await this.getActiveConfig(config, context)

    // 1. Idempotency Guard
    const existingEntry = await this.repository.findLedgerByReference(
      'booking',
      referenceId,
      'reverse',
      context,
    )
    if (existingEntry) {
      const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
      return { newTier: aggregate.tier, pointsReversed: Math.abs(existingEntry.points) }
    }

    // 2. Retrieve Points: Sum original earned and already reversed points from ledger
    const existingEntries = await this.repository.getBookingLedgerEntries(bookingId, context)
    let originalPointsEarned = 0
    let alreadyReversedPoints = 0
    let alreadyAppliedRefundEGP = 0

    for (const entry of existingEntries) {
      if (entry.type === 'earn' && entry.referenceType === 'booking') {
        originalPointsEarned += entry.points
      } else if (entry.type === 'reverse' && entry.referenceType === 'booking') {
        alreadyReversedPoints += Math.abs(entry.points)
        alreadyAppliedRefundEGP +=
          (entry.metadata as unknown as { amountRefundedEGP?: number })?.amountRefundedEGP || 0
      }
    }

    if (originalPointsEarned === 0) {
      const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
      return { newTier: aggregate.tier, pointsReversed: 0 }
    }

    // 3. Compute Delta Values
    const newRefundDeltaEGP = Math.max(0, cumulativeRefundedEGP - alreadyAppliedRefundEGP)
    const refundRatio = Math.min(1.0, cumulativeRefundedEGP / originalTotalEGP)
    const expectedCumulativeReversal = Math.round(originalPointsEarned * refundRatio)
    const pointsToReverse = Math.max(0, expectedCumulativeReversal - alreadyReversedPoints)

    if (newRefundDeltaEGP === 0 && pointsToReverse === 0) {
      const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
      return { newTier: aggregate.tier, pointsReversed: 0 }
    }

    // 4. Update Customer totalSpent EGP using delta
    const { aggregate } = await this.repository.getCustomerAggregate(customerId, context)
    const newTotalSpent = Math.max(0, aggregate.totalSpentEGP - newRefundDeltaEGP)
    const newTier = TierPolicy.evaluateEligibleTier(newTotalSpent, activeConfig)

    await this.repository.updateCustomerTier(customerId, newTier, -newRefundDeltaEGP, context)

    // Reclaim/reverse tier upgrade bonuses for lost levels
    const ordered = TierPolicy.getOrderedTiers(activeConfig)
    const orderedTierNames = ordered.map((t) => t.tier)
    const oldTierIndex = orderedTierNames.indexOf(aggregate.tier)
    const newTierIndex = orderedTierNames.indexOf(newTier)

    if (newTierIndex < oldTierIndex && oldTierIndex !== -1 && newTierIndex !== -1) {
      const lostTiers = orderedTierNames.slice(newTierIndex + 1, oldTierIndex + 1)
      for (const tier of lostTiers) {
        const bonusRef = `tier_${tier}_${customerId}`
        const reverseRef = `reverse_tier_${tier}_${customerId}`

        const existingBonus = await this.repository.findLedgerByReference(
          'system_welcome',
          bonusRef,
          'tier_bonus',
          context,
        )
        const alreadyReversedBonus = await this.repository.findLedgerByReference(
          'system_welcome',
          reverseRef,
          'reverse',
          context,
        )

        if (existingBonus && !alreadyReversedBonus) {
          const bonusAmount = existingBonus.points
          await this.repository.appendLedgerEntry(
            customerId,
            'reverse',
            -bonusAmount,
            `Reversal of upgrade bonus for lost tier ${tier} due to partial refund of booking #${bookingId}`,
            'system_welcome',
            reverseRef,
            bookingId,
            undefined,
            { isPartialRefund: true, amountRefundedEGP: newRefundDeltaEGP },
            context,
          )
        }
      }
    }

    // 5. Append ledger entry for reversed points
    if (pointsToReverse > 0) {
      await this.repository.appendLedgerEntry(
        customerId,
        'reverse',
        -pointsToReverse,
        `Partial reversal of earned points due to partial refund of ${newRefundDeltaEGP} EGP for booking #${bookingId}`,
        'booking',
        referenceId,
        bookingId,
        undefined,
        { isPartialRefund: true, amountRefundedEGP: newRefundDeltaEGP },
        context,
      )
    }

    const finalBalance = await this.repository.getCurrentBalance(customerId, context)
    await this.repository.updateCustomerProjection(
      customerId,
      finalBalance,
      'partial_refund_sync',
      context,
    )

    return { newTier, pointsReversed: pointsToReverse }
  }

  async rebuildCustomerProjection(userId: number, context?: RequestContext): Promise<number> {
    const projection = await this.projectionRebuilder.rebuildCustomerProjection(userId, context)
    return projection.balance
  }

  async getCustomerBalance(userId: number, context?: RequestContext): Promise<number> {
    return this.queries.getBalance(userId, context)
  }

  async getCustomerLedgerHistory(
    userId: number,
    limit = 50,
    context?: RequestContext,
  ): Promise<PointLedgerRecord[]> {
    return this.queries.getHistory(userId, limit, context)
  }
}
