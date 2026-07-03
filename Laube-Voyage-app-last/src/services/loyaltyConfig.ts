import { getPayload } from 'payload'
import config from '@/payload.config'
import type { LoyaltySetting } from '@/payload-types'

export interface LoyaltyConfig {
  earning: {
    pointsPerDollar: number
    explorerMultiplier: number
    voyagerMultiplier: number
  }
  tiers: {
    explorerThreshold: number
    voyagerThreshold: number
  }
  redemptionTiers: {
    points: number
    discountValue: number
    id?: string | null
  }[]
}

// Fallback defaults (used if Global hasn't been populated yet)
const DEFAULTS: LoyaltyConfig = {
  earning: {
    pointsPerDollar: 0.1,
    explorerMultiplier: 1.2,
    voyagerMultiplier: 1.5,
  },
  tiers: {
    explorerThreshold: 5000,
    voyagerThreshold: 15000,
  },
  redemptionTiers: [
    { points: 500, discountValue: 25 },
    { points: 1000, discountValue: 55 },
    { points: 2000, discountValue: 120 },
    { points: 5000, discountValue: 350 },
  ],
}

import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

const fetchRawLoyaltySettings = cached(
  async (): Promise<LoyaltySetting | null> => {
    try {
      const payload = await getPayload({ config })
      return (await payload.findGlobal({
        slug: 'loyalty-settings',
      })) as LoyaltySetting
    } catch {
      return null
    }
  },
  ['global-loyalty-settings'],
  { tags: [CACHE_TAGS.company] }
)

/**
 * Fetches the loyalty settings from the Global.
 * Falls back to hardcoded defaults if the Global hasn't been configured yet.
 */
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  try {
    const settings = await fetchRawLoyaltySettings()
    if (!settings) return DEFAULTS

    return {
      earning: {
        pointsPerDollar: settings.earning?.pointsPerDollar ?? DEFAULTS.earning.pointsPerDollar,
        explorerMultiplier:
          settings.earning?.explorerMultiplier ?? DEFAULTS.earning.explorerMultiplier,
        voyagerMultiplier:
          settings.earning?.voyagerMultiplier ?? DEFAULTS.earning.voyagerMultiplier,
      },
      tiers: {
        explorerThreshold: settings.tiers?.explorerThreshold ?? DEFAULTS.tiers.explorerThreshold,
        voyagerThreshold: settings.tiers?.voyagerThreshold ?? DEFAULTS.tiers.voyagerThreshold,
      },
      redemptionTiers:
        settings.redemptionTiers && settings.redemptionTiers.length > 0
          ? settings.redemptionTiers.map((t) => ({
              points: t.points,
              discountValue: t.discountValue,
              id: t.id,
            }))
          : DEFAULTS.redemptionTiers,
    }
  } catch (error) {
    console.warn('[LoyaltyConfig] Failed to load settings, using defaults:', error)
    return DEFAULTS
  }
}

/**
 * Calculates points for a booking based on admin-configured settings.
 */
export function calculatePointsFromConfig(
  bookingAmount: number,
  tier: string,
  loyaltyConfig: LoyaltyConfig,
): number {
  const basePoints = Math.floor(bookingAmount * loyaltyConfig.earning.pointsPerDollar)

  let multiplier = 1
  if (tier === 'explorer') multiplier = loyaltyConfig.earning.explorerMultiplier
  if (tier === 'voyager') multiplier = loyaltyConfig.earning.voyagerMultiplier

  return Math.floor(basePoints * multiplier)
}

/**
 * Gets the discount value for a given number of redeemed points.
 * Returns 0 if the points don't match any tier.
 */
export function getDiscountForPoints(
  points: number,
  loyaltyConfig: LoyaltyConfig,
): number {
  const tier = loyaltyConfig.redemptionTiers.find((t) => t.points === points)
  return tier?.discountValue ?? 0
}
