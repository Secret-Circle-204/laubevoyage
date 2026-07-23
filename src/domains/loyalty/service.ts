import type { LoyaltyTier } from '@/types'
import { LoyaltyWorkflowEngine } from './workflow'
import { LoyaltyRepository } from './repository'
import type { AdminAdjustmentParams, PointLedgerRecord } from './types'

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

  /**
   * Grant welcome bonus to new customer email account.
   */
  async grantWelcomeBonus(userId: number): Promise<PointLedgerRecord> {
    return this.workflowEngine.grantWelcomeBonus(userId)
  }

  /**
   * Calculate and credit earned points based on paid booking amount and customer tier.
   */
  async earnPointsForBooking(
    userId: number,
    bookingId: number,
    amountSpentEGP: number,
    bookingNumber?: string,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.earnPointsForBooking(userId, bookingId, amountSpentEGP, bookingNumber)
  }

  async getBalance(userId: number): Promise<number> {
    return this.workflowEngine.getCustomerBalance(userId)
  }

  async calculatePointValueInEGP(points: number): Promise<number> {
    return points * 0.1
  }

  async calculateEarnedPoints(amountEGP: number, tier?: string): Promise<number> {
    const rate = tier === 'elite' ? 1.5 : tier === 'voyager' ? 1.2 : 1.0
    return Math.floor(amountEGP * rate)
  }

  async earn(params: { customerId: number; points: number; sourceEvent: string; referenceId: string }): Promise<PointLedgerRecord> {
    return this.workflowEngine.earnPointsForBooking(params.customerId, Number(params.referenceId) || 1, params.points * 10)
  }

  async evaluateTier(customerId: number): Promise<LoyaltyTier> {
    return this.workflowEngine.evaluateAndUpgradeTier(customerId)
  }

  /**
   * Redeem loyalty points for monetary discount on checkout.
   */
  async redeemPoints(
    userId: number,
    pointsToRedeem: number,
    bookingId: number,
    reason?: string,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.redeemPoints(userId, pointsToRedeem, bookingId, reason)
  }

  /**
   * Reverse previously awarded points upon booking cancellation.
   */
  async refundPointsForCancellation(
    userId: number,
    bookingId: number,
    originalEarnedPoints: number,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.refundPointsForCancellation(userId, bookingId, originalEarnedPoints)
  }

  /**
   * Expire unclaimed points past their 12-month rolling validity window.
   */
  async processExpiredPoints(): Promise<number> {
    return this.workflowEngine.processExpiredPoints()
  }

  /**
   * Admin manual point adjustment with compulsory reason logging.
   */
  async adminAdjustPoints(params: AdminAdjustmentParams): Promise<PointLedgerRecord> {
    return this.workflowEngine.adminAdjustPoints(params)
  }

  /**
   * Evaluate if customer qualifies for automatic tier upgrade based on total annual spending.
   */
  async evaluateAndUpgradeTier(userId: number, additionalSpentEGP = 0): Promise<LoyaltyTier> {
    return this.workflowEngine.evaluateAndUpgradeTier(userId, additionalSpentEGP)
  }

  /**
   * Rebuild cached customer point projection from append-only ledger entries.
   */
  async rebuildCustomerProjection(userId: number): Promise<number> {
    return this.workflowEngine.rebuildCustomerProjection(userId)
  }

  /**
   * Fetch live customer point balance.
   */
  async getCustomerBalance(userId: number): Promise<number> {
    return this.workflowEngine.getCustomerBalance(userId)
  }

  /**
   * Fetch customer point ledger transaction history.
   */
  async getCustomerLedgerHistory(userId: number, limit = 50): Promise<PointLedgerRecord[]> {
    return this.workflowEngine.getCustomerLedgerHistory(userId, limit)
  }
}
