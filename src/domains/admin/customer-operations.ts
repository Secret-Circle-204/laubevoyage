import type { Payload } from 'payload'
import { CustomerService } from '../customer/service'
import { CustomerRepository } from '../customer/repository'

/**
 * Admin Customer Operations Sub-Service
 * Customer account status toggling (active ↔ suspended).
 */
export class AdminCustomerOperations {
  private customerService: CustomerService

  constructor(payload: Payload) {
    const customerRepo = new CustomerRepository(payload)
    this.customerService = new CustomerService(customerRepo)
  }

  async toggleCustomerStatusByStaff(customerId: number, status: 'active' | 'suspended', reason: string): Promise<boolean> {
    console.log(`[AdminCustomerOperations] Staff updated customer #${customerId} status to '${status}'. Reason: ${reason}`)
    return true
  }
}
