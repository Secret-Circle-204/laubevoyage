import type { ExperienceAvailabilityStatus } from './types'

/** Map of allowed availability transitions */
const ALLOWED_AVAILABILITY_TRANSITIONS: Record<ExperienceAvailabilityStatus, ExperienceAvailabilityStatus[]> = {
  available: ['sold_out', 'unavailable'],
  sold_out: ['available', 'unavailable'],
  coming_soon: ['available', 'unavailable'],
  unavailable: ['available', 'coming_soon'],
}

/**
 * Validate availability status transition.
 * @throws Error if transition is forbidden.
 */
export function validateAvailabilityTransition(
  from: ExperienceAvailabilityStatus,
  to: ExperienceAvailabilityStatus,
): void {
  const allowed = ALLOWED_AVAILABILITY_TRANSITIONS[from]

  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `[ExperienceStateMachine] Forbidden availability transition: "${from}" → "${to}". Allowed from "${from}": [${(allowed || []).join(', ')}]`,
    )
  }
}

/**
 * Check if an availability status transition is allowed (boolean version).
 */
export function isAvailabilityTransitionAllowed(
  from: ExperienceAvailabilityStatus,
  to: ExperienceAvailabilityStatus,
): boolean {
  const allowed = ALLOWED_AVAILABILITY_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}
