import { LoyaltyTier } from '@/types'

/** Map of allowed tier progression transitions (Upgrades only) */
const ALLOWED_TIER_TRANSITIONS: Record<LoyaltyTier, LoyaltyTier[]> = {
  [LoyaltyTier.EXPLORER]: [LoyaltyTier.VOYAGER, LoyaltyTier.ELITE],
  [LoyaltyTier.VOYAGER]: [LoyaltyTier.ELITE],
  [LoyaltyTier.ELITE]: [],
}

/**
 * Validate tier transition.
 * @throws Error if transition is forbidden (e.g. tier downgrade).
 */
export function validateTierTransition(from: LoyaltyTier, to: LoyaltyTier): void {
  const allowed = ALLOWED_TIER_TRANSITIONS[from]

  if (!allowed || !allowed.includes(to)) {
    throw new Error(`[LoyaltyStateMachine] Forbidden tier transition: "${from}" → "${to}". Tier downgrades are strictly forbidden.`)
  }
}

/**
 * Check if a tier transition is allowed (boolean version).
 */
export function isTierTransitionAllowed(from: LoyaltyTier, to: LoyaltyTier): boolean {
  const allowed = ALLOWED_TIER_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}
