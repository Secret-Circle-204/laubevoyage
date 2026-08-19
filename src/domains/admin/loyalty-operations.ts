import { LoyaltyService } from '../loyalty/service'

/**
 * Admin Loyalty Operations Sub-Service
 * Staff manual points adjustments with mandatory audit reason payload.
 */
export class AdminLoyaltyOperations {
  private loyaltyService?: LoyaltyService

  constructor(loyaltyService?: LoyaltyService) {
    this.loyaltyService = loyaltyService
  }

  async adjustCustomerPointsByStaff(
    customerId: number,
    pointsDelta: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    if (!reason || reason.trim() === '') {
      throw new Error('[AdminLoyaltyOperations] Mandatory audit reason required for staff points adjustment.')
    }

    if (!this.loyaltyService) {
      throw new Error('[AdminLoyaltyOperations] LoyaltyService dependency is required. Cannot adjust customer points.')
    }

    const updatedLedger = await this.loyaltyService.adminAdjustPoints({
      customerId,
      points: Math.abs(pointsDelta),
      adjustmentType: pointsDelta >= 0 ? 'grant' : 'deduct',
      reason,
      ticket: `TICK-${Date.now()}`,
      adminId: 'staff_admin',
    })
    return { success: true, newBalance: updatedLedger.resultingBalance }
  }
}
