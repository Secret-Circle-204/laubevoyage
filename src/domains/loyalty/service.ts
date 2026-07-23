import type { Payload } from 'payload'
import { LoyaltyTier } from '@/types'
import { LoyaltyWorkflowEngine } from './workflow'
import { registerLoyaltyNotificationSubscriber } from '../events/subscribers/loyalty-notification-subscriber'
import type { AdminAdjustmentParams, PointLedgerRecord } from './types'

/**
 * Loyalty Domain Service (Enterprise Thin Facade)
 * Single entry point for all loyalty point operations.
 * Delegated to LoyaltyWorkflowEngine for single-responsibility orchestration.
 */
export class LoyaltyService {
  private workflowEngine: LoyaltyWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new LoyaltyWorkflowEngine(payload)

    // Register event subscribers
    registerLoyaltyNotificationSubscriber(payload)
  }

  /**
   * Grant welcome bonus to new customer email account.
   */
  async grantWelcomeBonus(userId: number): Promise<PointLedgerRecord> {
    return this.workflowEngine.pointsEarner.grantWelcomeBonus(userId)
  }

  /**
   * Earn points for a completed booking spend in EGP.
   */
  async earn(
    userId: number,
    amountSpentEGP: number,
    bookingId: number,
    bookingNumber: string,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.executeEarnWorkflow(userId, amountSpentEGP, bookingId, bookingNumber)
  }

  /**
   * Redeem points for a booking discount.
   */
  async redeem(
    userId: number,
    amount: number,
    bookingId: number,
    reason: string,
  ): Promise<PointLedgerRecord> {
    return this.workflowEngine.executeRedeemWorkflow(userId, amount, bookingId, reason)
  }

  /**
   * Refund redeemed points when booking is cancelled.
   */
  async refund(userId: number, amount: number, bookingId: number): Promise<PointLedgerRecord> {
    return this.workflowEngine.executeRefundWorkflow(userId, amount, bookingId)
  }

  /**
   * Reverse earned points when booking is cancelled.
   */
  async reverse(userId: number, amount: number, bookingId: number): Promise<PointLedgerRecord> {
    return this.workflowEngine.pointsRefunder.reverseEarnedPoints(userId, amount, bookingId)
  }

  /**
   * Execute manual admin point adjustment with governance tickets.
   */
  async manualAdjustment(params: AdminAdjustmentParams): Promise<PointLedgerRecord> {
    return this.workflowEngine.executeAdminAdjustmentWorkflow(params)
  }

  /**
   * Evaluate and upgrade customer tier.
   */
  async evaluateTier(userId: number, additionalSpentEGP: number = 0): Promise<LoyaltyTier> {
    const result = await this.workflowEngine.tierEvaluator.evaluateAndUpgrade(userId, additionalSpentEGP)
    return result.newTier
  }

  /**
   * Get current points balance for user from ledger (Source of Truth).
   */
  async getBalance(userId: number): Promise<number> {
    return this.workflowEngine.queries.getBalance(userId)
  }

  async getHistory(userId: number, limit = 20): Promise<PointLedgerRecord[]> {
    return this.workflowEngine.queries.getHistory(userId, limit)
  }


  async earnPoints(params: { customerId: number; points: number; sourceEvent?: string; referenceId?: string }): Promise<PointLedgerRecord> {
    return this.earn(params.customerId, params.points, Number(params.referenceId) || 0, String(params.referenceId || ''))
  }

  calculateEarnedPoints(amountEGP: number): number {
    return Math.floor(amountEGP * 0.1)
  }
}

