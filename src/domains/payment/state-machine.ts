import type { PaymentStatusType } from './types'

/** Map of allowed payment state transitions */
const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatusType, PaymentStatusType[]> = {
  initiated: ['processing', 'successful', 'failed'],
  processing: ['successful', 'failed'],
  successful: ['refunded', 'partially_refunded'],
  failed: [],
  refunded: [],
  partially_refunded: ['refunded'],
}

/**
 * Validate whether a payment status transition is permitted.
 * @throws Error if transition is forbidden.
 */
export function validatePaymentTransition(from: PaymentStatusType, to: PaymentStatusType): void {
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[from]

  if (!allowed.includes(to)) {
    throw new Error(
      `[PaymentStateMachine] Forbidden transition: "${from}" → "${to}". Allowed from "${from}": [${allowed.join(', ')}]`,
    )
  }
}

/**
 * Check if a payment transition is valid (boolean version).
 */
export function isPaymentTransitionAllowed(from: PaymentStatusType, to: PaymentStatusType): boolean {
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[from]
  return allowed.includes(to)
}
