import { BookingStatus } from '@/types'

/**
 * Booking State Machine
 *
 * Enforces strict, unidirectional state transitions.
 * Direct transitions that skip states are forbidden and throw exceptions.
 *
 * Valid transitions:
 *   Draft → PendingPayment → Paid → Confirmed → Completed → Archived
 *   PendingPayment → Cancelled
 *   Confirmed → Cancelled
 *   Paid → Refunded
 *   Confirmed → Refunded
 */

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.DRAFT]: [BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.CANCELLED, BookingStatus.PENDING_ADMIN_REVIEW],
  [BookingStatus.PENDING_PAYMENT]: [BookingStatus.PAID, BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.PENDING_ADMIN_REVIEW],
  [BookingStatus.PENDING_ADMIN_REVIEW]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.PAID]: [BookingStatus.CONFIRMED, BookingStatus.REFUNDED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REFUNDED]: [],
  [BookingStatus.EXPIRED]: [BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY, BookingStatus.CANCELLED],
  [BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY]: [BookingStatus.CANCELLED],
}

/**
 * Validate whether a state transition is allowed.
 * @throws Error if the transition is forbidden.
 */
export function validateTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from]

  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `[BookingStateMachine] Forbidden transition: "${from}" → "${to}". ` +
      `Allowed transitions from "${from}": [${(allowed || []).join(', ')}]`
    )
  }
}

/**
 * Check if a transition is valid (boolean version, does not throw).
 */
export function isTransitionAllowed(from: BookingStatus, to: BookingStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}

/**
 * Get the list of valid next states from the current state.
 */
export function getNextStates(current: BookingStatus): BookingStatus[] {
  return ALLOWED_TRANSITIONS[current] || []
}
