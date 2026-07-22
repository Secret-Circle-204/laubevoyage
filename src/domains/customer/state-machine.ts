import type { CustomerStatus } from './types'

/** Map of allowed customer status transitions */
const ALLOWED_CUSTOMER_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  pending_verification: ['active', 'suspended', 'deleted'],
  active: ['suspended', 'pending_deletion'],
  suspended: ['active', 'pending_deletion', 'deleted'],
  pending_deletion: ['deleted', 'active'],
  deleted: [], // Terminal state
}

/**
 * Validate customer status transition.
 * @throws Error if transition is forbidden.
 */
export function validateCustomerStatusTransition(from: CustomerStatus, to: CustomerStatus): void {
  const allowed = ALLOWED_CUSTOMER_TRANSITIONS[from]

  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `[CustomerStateMachine] Forbidden status transition: "${from}" → "${to}". Allowed from "${from}": [${(allowed || []).join(', ')}]`,
    )
  }
}

/**
 * Check if a status transition is allowed (boolean version).
 */
export function isCustomerStatusTransitionAllowed(from: CustomerStatus, to: CustomerStatus): boolean {
  const allowed = ALLOWED_CUSTOMER_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}
