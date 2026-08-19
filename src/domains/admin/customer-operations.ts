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

  async toggleCustomerStatusByStaff(
    customerId: number,
    status: 'active' | 'suspended',
    reason: string,
  ): Promise<boolean> {
    if (!reason || reason.trim() === '') {
      throw new Error('[AdminCustomerOperations] Mandatory audit reason required for staff status update.')
    }

    if (!this.customerService) {
      throw new Error('[AdminCustomerOperations] CustomerService dependency is required. Cannot toggle customer status.')
    }

    await this.customerService.updateStatus(customerId, status, reason)
    console.log(`[AdminCustomerOperations] Staff updated customer #${customerId} status to '${status}'. Reason: ${reason}`)
    return true
  }
}
