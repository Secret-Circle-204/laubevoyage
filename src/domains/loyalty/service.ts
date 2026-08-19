import type { RequestContext } from '@/types'
import { LoyaltyTier } from '@/types'
import { LoyaltyWorkflowEngine } from './workflow'
import { LoyaltyRepository } from './repository'
import { PointCalculationPolicy } from './points-calculation-policy'
import { TierPolicy } from './tier-policy'
import type { AdminAdjustmentParams, PointLedgerRecord, TierProgress } from './types'
import type { LoyaltyProgramConfig } from './tier-config'

/**
 * Loyalty Domain Service (Enterprise Thin Facade)
 * Single entry point for all loyalty point operations via Constructor Dependency Injection.
 * Delegated to LoyaltyWorkflowEngine for single-responsibility orchestration.
 */
export class LoyaltyService {
  private workflowEngine: LoyaltyWorkflowEngine

  constructor(repository: LoyaltyRepository) {
    this.workflowEngine = new LoyaltyWorkflowEngine(repository)
  }

  async getActiveConfig(config?: LoyaltyProgramConfig): Promise<LoyaltyProgramConfig> {
    return this.workflowEngine.getActiveConfig(config)
  }

  calculateTierProgress(
    totalSpentEGP: number,
    currentTier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): TierProgress {
    return this.workflowEngine.calculateTierProgress(totalSpentEGP, currentTier, config)
  }

  getTierThresholds(config: LoyaltyProgramConfig): Array<{ tier: LoyaltyTier; minSpentEGP: number }> {
    return this.workflowEngine.getTierThresholds(config)
  }

  /**
   * Grant welcome bonus to new customer email account.
   */
  async grantWelcomeBonus(userId: number, config?: LoyaltyProgramConfig, context?: RequestContext): Promise<PointLedgerRecord> {
    return this.workflowEngine.grantWelcomeBonus(userId, config, context)
  }

  /**
   * Calculate and credit earned points based on paid booking amount and customer tier.
   */
  async earnPointsForBooking(
    userId: number,
    bookingId: number,
    amountSpentEGP: number,
    bookingNumber?: string,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.earnPointsForBooking(userId, bookingId, amountSpentEGP, bookingNumber, config, context)
  }

  async getBalance(userId: number, context?: RequestContext): Promise<number> {
    return this.workflowEngine.getCustomerBalance(userId, context)
  }

  async calculatePointValueInEGP(points: number, config?: LoyaltyProgramConfig): Promise<number> {
    const activeConfig = await this.workflowEngine.getActiveConfig(config)
    return PointCalculationPolicy.calculatePointsValueEGP(points, activeConfig)
  }

  async calculateEarnedPoints(amountEGP: number, tier?: LoyaltyTier, config?: LoyaltyProgramConfig): Promise<number> {
    const activeConfig = await this.workflowEngine.getActiveConfig(config)
    const effectiveTier = tier || TierPolicy.getOrderedTiers(activeConfig)[0].tier
    return PointCalculationPolicy.calculateEarnedPoints(amountEGP, effectiveTier, activeConfig)
  }

  async earn(params: { customerId: number; points: number; sourceEvent: string; referenceId: string }, config?: LoyaltyProgramConfig, context?: RequestContext): Promise<PointLedgerRecord> {
    return this.workflowEngine.earnPointsForBooking(params.customerId, Number(params.referenceId) || 1, params.points * 10, undefined, config, context)
  }

  async evaluateTier(customerId: number, config?: LoyaltyProgramConfig, context?: RequestContext): Promise<LoyaltyTier> {
    return this.workflowEngine.evaluateAndUpgradeTier(customerId, 0, config, context)
  }

  /**
   * Redeem loyalty points for monetary discount on checkout.
   */
  async redeemPoints(
    userId: number,
    pointsToRedeem: number,
    bookingId: number,
    bookingTotalEGP: number = 0,
    reason?: string,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.redeemPoints(userId, pointsToRedeem, bookingId, bookingTotalEGP, reason, config, context)
  }

  /**
   * Reverse previously awarded points upon booking cancellation.
   */
  async refundPointsForCancellation(
    userId: number,
    bookingId: number,
    originalEarnedPoints: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.refundPointsForCancellation(userId, bookingId, originalEarnedPoints, context)
  }

  /**
   * Process booking cancellation: deduct qualifying spend, evaluate tier demotion, reverse earned points, refund redeemed points.
   */
  async processBookingCancellation(
    customerId: number,
    bookingId: number,
    bookingTotalEGP: number,
    config?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<{ newTier: LoyaltyTier }> {
    return this.workflowEngine.processBookingCancellation(customerId, bookingId, bookingTotalEGP, config, context)
  }

  /**
   * Expire unclaimed points past their 12-month rolling validity window.
   */
  async processExpiredPoints(context?: RequestContext): Promise<number> {
    return this.workflowEngine.processExpiredPoints(context)
  }

  /**
   * Admin manual point adjustment with compulsory reason logging.
   */
  async adminAdjustPoints(params: AdminAdjustmentParams, context?: RequestContext): Promise<PointLedgerRecord> {
    return this.workflowEngine.adminAdjustPoints(params, context)
  }

  /**
   * Evaluate if customer qualifies for automatic tier upgrade based on total annual spending.
   */
  async evaluateAndUpgradeTier(userId: number, additionalSpentEGP = 0, config?: LoyaltyProgramConfig, context?: RequestContext): Promise<LoyaltyTier> {
    return this.workflowEngine.evaluateAndUpgradeTier(userId, additionalSpentEGP, config, context)
  }

  /**
   * Rebuild cached customer point projection from append-only ledger entries.
   */
  async rebuildCustomerProjection(userId: number, context?: RequestContext): Promise<number> {
    return this.workflowEngine.rebuildCustomerProjection(userId, context)
  }

  /**
   * Fetch live customer point balance.
   */
  async getCustomerBalance(userId: number, context?: RequestContext): Promise<number> {
    console.log(`[LoyaltyService] getCustomerBalance START (userId: ${userId})`)
    const balance = await this.workflowEngine.getCustomerBalance(userId, context)
    console.log(`[LoyaltyService] getCustomerBalance END (balance: ${balance})`)
    return balance
  }

  /**
   * Fetch customer point ledger transaction history.
   */
  async getCustomerLedgerHistory(userId: number, limit = 50, context?: RequestContext): Promise<PointLedgerRecord[]> {
    return this.workflowEngine.getCustomerLedgerHistory(userId, limit, context)
  }

  /**
   * Fetch point ledger transaction records linked to a specific booking.
   */
  async getBookingLedgerEntries(bookingId: number, context?: RequestContext): Promise<PointLedgerRecord[]> {
    return this.workflowEngine.repository.getBookingLedgerEntries(bookingId, context)
  }
}

