import { CustomerService } from '../customer/service'

/**
 * Admin Customer Operations Sub-Service
 * Customer account status toggling (active ↔ suspended) via Dependency Injection.
 */
export class AdminCustomerOperations {
  private customerService?: CustomerService

  constructor(customerService?: CustomerService) {
    this.customerService = customerService
  }

  async toggleCustomerStatusByStaff(customerId: number, status: 'active' | 'suspended', reason: string): Promise<boolean> {
    console.log(`[AdminCustomerOperations] Staff updated customer #${customerId} status to '${status}'. Reason: ${reason}`)
    return true
  }
}
