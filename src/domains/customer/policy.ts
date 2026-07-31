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
  static canDeleteAccount(
    customer: CustomerAggregate,
    checks: {
      bookingCount: number
      pointLedgerCount: number
      reviewCount: number
      paymentCount: number
    },
  ): CustomerPolicyResult {
    if (customer.status === 'deleted') {
      return {
        allowed: false,
        code: 'ALREADY_DELETED',
        reason: 'Customer account is already deleted.',
      }
    }

    const violations: string[] = []
    if (checks.bookingCount > 0) {
      violations.push(`has ${checks.bookingCount} booking(s)`)
    }
    if (checks.pointLedgerCount > 0) {
      violations.push(`has active loyalty transactions`)
    }
    if (checks.reviewCount > 0) {
      violations.push(`has review contributions`)
    }
    if (checks.paymentCount > 0) {
      violations.push(`has payment transactions`)
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        code: 'HISTORICAL_RECORDS_EXIST',
        reason: `Customer cannot be permanently deleted because they have dependencies: ${violations.join(', ')}. Archive/Soft-delete customer instead.`,
      }
    }

    return { allowed: true }
  }
}
