import type { DashboardPolicyResult } from './types'

/**
 * Pure Dashboard Policy
 * Single source of truth for customer portal access predicates.
 */
export class DashboardPolicy {
  static canAccessPortal(customerStatus: string): DashboardPolicyResult {
    if (customerStatus === 'suspended' || customerStatus === 'deleted') {
      return {
        allowed: false,
        code: 'PORTAL_ACCESS_DENIED',
        reason: `Portal access is denied for customer account status: ${customerStatus}`,
      }
    }

    return { allowed: true }
  }
}
