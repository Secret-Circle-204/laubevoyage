import type { LoyaltyRepository } from './repository'
import type { AdminAdjustmentParams, PointLedgerRecord } from './types'
import type { RequestContext } from '@/types'

/**
 * Admin Adjustment Service
 * Governs all manual admin loyalty point modifications.
 * Direct balance edits are forbidden. All adjustments write an append-only 'manual_adjustment' ledger entry.
 */
export class AdminAdjustmentService {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async executeAdjustment(params: AdminAdjustmentParams, context?: RequestContext): Promise<PointLedgerRecord> {
    if (!params.reason || !params.ticket) {
      throw new Error('[AdminAdjustmentService] Manual adjustment requires valid reason and support ticket number.')
    }

    const signedPoints = params.adjustmentType === 'deduct' || params.adjustmentType === 'fraud_reversal'
      ? -Math.abs(params.points)
      : Math.abs(params.points)

    return this.repository.appendLedgerEntry(
      params.customerId,
      'manual_adjustment',
      signedPoints,
      `[Admin Adjustment] ${params.reason} (Ticket #${params.ticket})`,
      'admin_ticket',
      params.ticket,
      undefined,
      undefined,
      {
        adminId: params.adminId,
        approvalId: params.approvalId,
        notes: params.notes,
        adjustmentType: params.adjustmentType,
      },
      context,
    )
  }
}
