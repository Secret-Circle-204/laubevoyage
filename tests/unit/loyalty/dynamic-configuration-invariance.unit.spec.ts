import { describe, it, expect } from 'vitest'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import { isTierTransitionAllowed, validateTierTransition } from '@/domains/loyalty/state-machine'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'
import type { LocaleContext } from '@/types/locale'
import { Language } from '@/types/locale'
import { LocalizationService } from '@/domains/localization/service'

describe('Dynamic Loyalty Configuration Invariance Stress Suite (Batch 8B)', () => {
  // --------------------------------------------------------------------------
  // Configuration A: Classic 3-Tier Matrix
  // --------------------------------------------------------------------------
  const configA: LoyaltyProgramConfig = {
    id: 'prog-a',
    programCode: 'MATRIX_A',
    name: 'Classic Matrix',
    version: 1,
    status: 'published',
    baseEarnRate: 1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    minRedemptionPoints: 50,
    maxRedemptionPercent: 80,
    allowPartialRedemption: true,
    welcomeBonus: 100,
    expirationMonths: 12,
    bonusNeverExpires: true,
    tiers: [
      { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
      { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
      { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 },
    ],
  }

  // --------------------------------------------------------------------------
  // Configuration B: Enterprise 5-Tier Matrix with Custom Identifiers (Diamond)
  // --------------------------------------------------------------------------
  const configB: LoyaltyProgramConfig = {
    id: 'prog-b',
    programCode: 'MATRIX_B_5_TIERS',
    name: 'Luxury 5-Tier Program',
    version: 1,
    status: 'published',
    baseEarnRate: 1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    minRedemptionPoints: 50,
    maxRedemptionPercent: 80,
    allowPartialRedemption: true,
    welcomeBonus: 250,
    expirationMonths: 24,
    bonusNeverExpires: true,
    tiers: [
      { tier: 'starter', label: 'Starter Member', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
      { tier: 'bronze', label: 'Bronze Elite', minSpentEGP: 10000, earnMultiplier: 1.25, upgradeBonus: 250 },
      { tier: 'silver', label: 'Silver Voyageur', minSpentEGP: 25000, earnMultiplier: 1.5, upgradeBonus: 500 },
      { tier: 'gold', label: 'Gold Ambassador', minSpentEGP: 50000, earnMultiplier: 2.0, upgradeBonus: 1000 },
      { tier: 'diamond', label: 'Diamond Royal', minSpentEGP: 100000, earnMultiplier: 3.0, upgradeBonus: 5000 },
    ],
  }

  // --------------------------------------------------------------------------
  // Configuration C: Minimalist 3-Tier Matrix with completely arbitrary names
  // --------------------------------------------------------------------------
  const configC: LoyaltyProgramConfig = {
    id: 'prog-c',
    programCode: 'MATRIX_C_CUSTOM',
    name: 'Minimalist Club',
    version: 1,
    status: 'published',
    baseEarnRate: 2, // 2 points per 1 EGP
    redemptionPointsUnit: 200,
    redemptionValueEGP: 20,
    minRedemptionPoints: 100,
    maxRedemptionPercent: 50,
    allowPartialRedemption: true,
    welcomeBonus: 500,
    expirationMonths: 6,
    bonusNeverExpires: false,
    tiers: [
      { tier: 'basic', label: 'Basic Club', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
      { tier: 'premium', label: 'Premium Club', minSpentEGP: 30000, earnMultiplier: 2.0, upgradeBonus: 2000 },
      { tier: 'vip', label: 'VIP Club', minSpentEGP: 80000, earnMultiplier: 4.0, upgradeBonus: 10000 },
    ],
  }

  describe('Configuration B (5-Tier Diamond Matrix) Evaluation & Invariance', () => {
    it('should evaluate tier accurately across all 5 thresholds including Diamond tier', () => {
      // 0 EGP -> starter
      expect(TierPolicy.evaluateEligibleTier(0, configB)).toBe('starter')
      expect(TierPolicy.evaluateEligibleTier(9999.99, configB)).toBe('starter')

      // 10,000 EGP -> bronze
      expect(TierPolicy.evaluateEligibleTier(10000, configB)).toBe('bronze')
      expect(TierPolicy.evaluateEligibleTier(24999.99, configB)).toBe('bronze')

      // 25,000 EGP -> silver
      expect(TierPolicy.evaluateEligibleTier(25000, configB)).toBe('silver')

      // 50,000 EGP -> gold
      expect(TierPolicy.evaluateEligibleTier(50000, configB)).toBe('gold')

      // 100,000+ EGP -> diamond
      expect(TierPolicy.evaluateEligibleTier(100000, configB)).toBe('diamond')
      expect(TierPolicy.evaluateEligibleTier(250000, configB)).toBe('diamond')
    })

    it('should calculate earned points with 3.0x multiplier on Diamond tier', () => {
      // Starter (1.0x * 1): 5000 EGP -> 5000 pts
      expect(PointsCalculator.calculateEarnedPoints(5000, 'starter', configB)).toBe(5000)

      // Gold (2.0x * 1): 5000 EGP -> 10000 pts
      expect(PointsCalculator.calculateEarnedPoints(5000, 'gold', configB)).toBe(10000)

      // Diamond (3.0x * 1): 5000 EGP -> 15000 pts
      expect(PointsCalculator.calculateEarnedPoints(5000, 'diamond', configB)).toBe(15000)
    })

    it('should allow progressive state machine upgrades from starter to diamond and reject downgrades', () => {
      expect(isTierTransitionAllowed('starter', 'bronze', configB)).toBe(true)
      expect(isTierTransitionAllowed('starter', 'diamond', configB)).toBe(true)
      expect(isTierTransitionAllowed('silver', 'gold', configB)).toBe(true)
      expect(isTierTransitionAllowed('gold', 'diamond', configB)).toBe(true)

      // Downgrades forbidden
      expect(isTierTransitionAllowed('diamond', 'gold', configB)).toBe(false)
      expect(isTierTransitionAllowed('diamond', 'starter', configB)).toBe(false)
      expect(() => validateTierTransition('diamond', 'silver', configB)).toThrowError(
        '[LoyaltyStateMachine] Forbidden tier transition',
      )
    })

    it('should calculate tier progression properly for intermediate tiers and max tier', () => {
      // Customer at 'gold' with 60,000 EGP total spend -> Next tier is 'diamond' (minSpent: 100,000 EGP)
      // Remaining = 40,000 EGP, Progress = 20% of (100k - 50k)
      const progressGold = TierPolicy.getTierProgress(60000, 'gold', configB)
      expect(progressGold).toEqual({
        currentTier: 'gold',
        nextTier: 'diamond',
        currentQualifyingSpendEGP: 60000,
        nextTierMinSpentEGP: 100000,
        remainingQualifyingSpendEGP: 40000,
        percent: 20,
      })

      // Customer at 'diamond' with 150,000 EGP total spend -> Highest tier reached
      const progressDiamond = TierPolicy.getTierProgress(150000, 'diamond', configB)
      expect(progressDiamond).toEqual({
        currentTier: 'diamond',
        nextTier: null,
        currentQualifyingSpendEGP: 150000,
        nextTierMinSpentEGP: null,
        remainingQualifyingSpendEGP: null,
        percent: 100,
      })
    })

    it('should build presentation DTO with dynamic tier labels for Diamond without runtime errors', async () => {
      const mockLocalization = {
        formatPrice: async (amount: number) => ({
          amount,
          currency: 'EGP',
          formatted: `${amount.toLocaleString()} EGP`,
          currencySymbol: 'EGP',
          currencyName: 'Egyptian Pound',
          rate: 1,
        }),
        translateText: async (text: string) => text,
        translateUiKey: (key: string) =>
          key === 'loyalty.progress.remainingToTier'
            ? 'Spend {amount} more to reach {tier}'
            : 'Highest tier achieved',
      } as unknown as LocalizationService

      const ctx = {
        language: 'en',
        currency: 'EGP',
      } as unknown as LocaleContext

      const dto = await LoyaltyProgressDTOFactory.build(
        60000,
        'gold',
        configB,
        mockLocalization,
        ctx,
      )

      expect(dto.nextTierName).toBe('Diamond Royal')
      expect(dto.nextTierProgressPercent).toBe(20)
      expect(dto.remainingQualifyingSpendEGP).toBe(40000)
      expect(dto.progressText).toBe('Spend 40,000 EGP more to reach Diamond Royal')
    })
  })

  describe('Configuration C (Arbitrary Multiplier & Custom Names) Invariance', () => {
    it('should evaluate tiers and base earn rates dynamically for Config C', () => {
      // 0 spend -> basic
      expect(TierPolicy.evaluateEligibleTier(0, configC)).toBe('basic')

      // 40,000 spend -> premium
      expect(TierPolicy.evaluateEligibleTier(40000, configC)).toBe('premium')

      // 90,000 spend -> vip
      expect(TierPolicy.evaluateEligibleTier(90000, configC)).toBe('vip')

      // VIP points: 1000 EGP * (baseEarnRate=2 * earnMultiplier=4.0) = 8000 points
      expect(PointsCalculator.calculateEarnedPoints(1000, 'vip', configC)).toBe(8000)
    })
  })
})
