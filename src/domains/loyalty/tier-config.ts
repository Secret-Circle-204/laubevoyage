import { LoyaltyTier } from '@/types'

export interface TierDefinition {
  tier: LoyaltyTier
  minSpentEGP: number
  earnMultiplier: number
  upgradeBonus: number
}

/**
 * Tier Configuration Matrix
 * Zero magic numbers in domain code.
 */
export const TIER_CONFIG: Record<LoyaltyTier, TierDefinition> = {
  [LoyaltyTier.EXPLORER]: {
    tier: LoyaltyTier.EXPLORER,
    minSpentEGP: 0,
    earnMultiplier: 1.0,
    upgradeBonus: 100, // Welcome bonus
  },
  [LoyaltyTier.VOYAGER]: {
    tier: LoyaltyTier.VOYAGER,
    minSpentEGP: 5000,
    earnMultiplier: 1.2,
    upgradeBonus: 500,
  },
  [LoyaltyTier.ELITE]: {
    tier: LoyaltyTier.ELITE,
    minSpentEGP: 15000,
    earnMultiplier: 1.5,
    upgradeBonus: 1000,
  },
} as const
