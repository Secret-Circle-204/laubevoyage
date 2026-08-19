import { describe, it, expect } from 'vitest'
import { validateTierTransition, isTierTransitionAllowed } from '@/domains/loyalty/state-machine'
import { LoyaltyTier } from '@/types'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'

const mockConfig: LoyaltyProgramConfig = {
  id: 'test',
  programCode: 'TEST',
  name: 'Test Program',
  version: 1,
  status: 'published',
  baseEarnRate: 1,
  redemptionPointsUnit: 100,
  redemptionValueEGP: 10,
  minRedemptionPoints: 100,
  maxRedemptionPercent: 20,
  allowPartialRedemption: true,
  welcomeBonus: 0,
  expirationMonths: 12,
  bonusNeverExpires: true,
  tiers: [
    { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
    { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 0 },
    { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 0 },
  ]
}

describe('Loyalty Domain: State Machine Unit Tests', () => {
  it('should allow valid tier progression upgrades', () => {
    expect(isTierTransitionAllowed('explorer', 'voyager', mockConfig)).toBe(true)
    expect(isTierTransitionAllowed('explorer', 'elite', mockConfig)).toBe(true)
    expect(isTierTransitionAllowed('voyager', 'elite', mockConfig)).toBe(true)
  })

  it('should forbid tier downgrades', () => {
    expect(isTierTransitionAllowed('elite', 'voyager', mockConfig)).toBe(false)
    expect(isTierTransitionAllowed('voyager', 'explorer', mockConfig)).toBe(false)
    expect(() => validateTierTransition('elite', 'voyager', mockConfig)).toThrowError(
      '[LoyaltyStateMachine] Forbidden tier transition',
    )
  })
})
