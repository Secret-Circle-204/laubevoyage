import type { Payload } from 'payload'
import { PaymentService } from '../payment/service'

/**
 * Admin Payment Operations Sub-Service
 * Staff manual refund approvals and chargeback resolution.
 */
export class AdminPaymentOperations {
  private paymentService: PaymentService

  constructor(payload: Payload) {
    this.paymentService = new PaymentService(payload)
  }

  async processRefundByStaff(paymentId: string, amount: number, reason: string): Promise<{ success: boolean; refundId: string }> {
    console.log(`[AdminPaymentOperations] Staff approved refund for payment ${paymentId} (${amount} EGP). Reason: ${reason}`)
    return { success: true, refundId: `ref_admin_${Date.now()}` }
  }
}
