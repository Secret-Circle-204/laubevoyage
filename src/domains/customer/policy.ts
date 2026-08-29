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
   * Validate if a customer is eligible to receive an email verification link.
   * Operates purely on customer domain state without touching raw credentials.
   */
  static canDispatchVerification(
    customer: CustomerAggregate | null,
    state: { hasToken: boolean; isExpired: boolean },
  ): CustomerPolicyResult {
    if (!customer) {
      return { allowed: false, code: 'CUSTOMER_NOT_FOUND', reason: 'Customer record does not exist.' }
    }
    if (customer.status !== 'pending_verification' || customer.isEmailVerified) {
      return { allowed: false, code: 'ALREADY_VERIFIED', reason: 'Customer email is already verified.' }
    }
    if (!state.hasToken) {
      return { allowed: false, code: 'TOKEN_CONSUMED', reason: 'Verification token is not available or already consumed.' }
    }
    if (state.isExpired) {
      return { allowed: false, code: 'TOKEN_EXPIRED', reason: 'Verification token has expired.' }
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
      pendingOutboxCount?: number
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
    if (checks.pendingOutboxCount && checks.pendingOutboxCount > 0) {
      violations.push(`has ${checks.pendingOutboxCount} pending/in-flight outbox event(s)`)
    }

    if (violations.length > 0) {
      const isPendingOnly =
        checks.pendingOutboxCount &&
        checks.pendingOutboxCount > 0 &&
        violations.length === 1

      return {
        allowed: false,
        code: isPendingOnly ? 'PENDING_EVENTS_EXIST' : 'HISTORICAL_RECORDS_EXIST',
        reason: `Customer cannot be permanently deleted because they ${violations.join(', ')}. Archive/Soft-delete customer instead.`,
      }
    }

    return { allowed: true }
  }
}
