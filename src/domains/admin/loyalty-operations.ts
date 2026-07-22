import type { Payload } from 'payload'
import { LoyaltyService } from '../loyalty/service'

/**
 * Admin Loyalty Operations Sub-Service
 * Staff manual points adjustments with mandatory audit reason payload.
 */
export class AdminLoyaltyOperations {
  private loyaltyService: LoyaltyService

  constructor(payload: Payload) {
    this.loyaltyService = new LoyaltyService(payload)
  }

  async adjustCustomerPointsByStaff(
    customerId: number,
    pointsDelta: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    if (!reason || reason.trim() === '') {
      throw new Error('[AdminLoyaltyOperations] Mandatory audit reason required for staff points adjustment.')
    }

    const updatedLedger = await this.loyaltyService.earnPoints({
      customerId,
      points: Math.abs(pointsDelta),
      sourceEvent: 'manual_admin_grant',
      referenceId: `admin_adj_${Date.now()}`,
    })

    return { success: true, newBalance: updatedLedger.balance }
  }
}
