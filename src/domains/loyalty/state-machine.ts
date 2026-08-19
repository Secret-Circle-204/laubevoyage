import { LoyaltyTier } from '@/types'
import { LoyaltyProgramConfig } from './tier-config'
import { TierPolicy } from './tier-policy'

/**
 * Validate tier transition dynamically based on database configuration (upgrades only).
 * @throws Error if transition is forbidden (e.g. tier downgrade or unknown tier).
 */
export function validateTierTransition(
  from: LoyaltyTier,
  to: LoyaltyTier,
  config: LoyaltyProgramConfig,
): void {
  const allowed = isTierTransitionAllowed(from, to, config)

  if (!allowed) {
    throw new Error(
      `[LoyaltyStateMachine] Forbidden tier transition: "${from}" → "${to}". Tier downgrades are strictly forbidden.`,
    )
  }
}

/**
 * Check if a tier transition is allowed dynamically (boolean version).
 */
export function isTierTransitionAllowed(
  from: LoyaltyTier,
  to: LoyaltyTier,
  config: LoyaltyProgramConfig,
): boolean {
  try {
    const ordered = TierPolicy.getOrderedTiers(config)
    const fromIndex = ordered.findIndex((t) => t.tier.toLowerCase() === from.toLowerCase())
    const toIndex = ordered.findIndex((t) => t.tier.toLowerCase() === to.toLowerCase())

    if (fromIndex === -1 || toIndex === -1) {
      return false
    }

    // Upgrades only, no downgrades allowed
    return toIndex >= fromIndex
  } catch {
    return false
  }
}
