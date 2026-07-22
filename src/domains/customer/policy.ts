import type { CustomerAggregate } from './aggregate'
import type { CustomerPolicyResult } from './types'

/**
 * Pure Customer Policy
 * Single source of truth for customer account validation predicates.
 */
export class CustomerPolicy {
  /**
   * Validate if customer can create bookings.
   */
  static canBook(customer: CustomerAggregate): CustomerPolicyResult {
    if (customer.status !== 'active') {
      return {
        allowed: false,
        code: 'CUSTOMER_NOT_ACTIVE',
        reason: `Customer account is not active (Status: ${customer.status}).`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if customer can claim welcome loyalty bonus.
   */
  static canClaimWelcomeBonus(customer: CustomerAggregate): CustomerPolicyResult {
    if (!customer.isEmailVerified) {
      return {
        allowed: false,
        code: 'EMAIL_NOT_VERIFIED',
        reason: 'Customer email must be verified to claim welcome bonus.',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if customer can request account deletion (GDPR).
   */
  static canDeleteAccount(customer: CustomerAggregate): CustomerPolicyResult {
    if (customer.status === 'deleted') {
      return {
        allowed: false,
        code: 'ALREADY_DELETED',
        reason: 'Customer account is already deleted.',
      }
    }

    return { allowed: true }
  }
}
