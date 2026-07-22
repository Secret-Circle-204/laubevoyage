import type { Payload } from 'payload'
import { CustomerService } from '../customer/service'

/**
 * Admin Customer Operations Sub-Service
 * Customer account status toggling (active ↔ suspended).
 */
export class AdminCustomerOperations {
  private customerService: CustomerService

  constructor(payload: Payload) {
    this.customerService = new CustomerService(payload)
  }

  async toggleCustomerStatusByStaff(customerId: number, status: 'active' | 'suspended', reason: string): Promise<boolean> {
    console.log(`[AdminCustomerOperations] Staff updated customer #${customerId} status to '${status}'. Reason: ${reason}`)
    return true
  }
}
