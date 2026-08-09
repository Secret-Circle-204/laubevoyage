import { describe, it, expect } from 'vitest'
import { LoyaltyService } from '@/domains/loyalty/service'
import { LoyaltyTier } from '@/types'
import { LoyaltyProgramConfigurationException } from '@/domains/loyalty/tier-config'

describe('Loyalty Service: Tier Thresholds & Configuration Unit Tests', () => {
  it('should return correct tier thresholds in EGP spent', () => {
    const repository = {} as any
    const service = new LoyaltyService(repository)

    const config = {
      tiers: {
        explorer: { minSpentEGP: 0 },
        voyager: { minSpentEGP: 10000 },
        elite: { minSpentEGP: 50000 }
      }
    } as any

    const thresholds = service.getTierThresholds(config)
    expect(thresholds).toEqual([
      { tier: LoyaltyTier.EXPLORER, minSpentEGP: 0 },
      { tier: LoyaltyTier.VOYAGER, minSpentEGP: 10000 },
      { tier: LoyaltyTier.ELITE, minSpentEGP: 50000 }
    ])
  })

  it('should calculate correct tier progress towards the next level', () => {
    const repository = {} as any
    const service = new LoyaltyService(repository)

    const config = {
      tiers: {
        explorer: { minSpentEGP: 0 },
        voyager: { minSpentEGP: 10000 },
        elite: { minSpentEGP: 50000 }
      }
    } as any

    // 1. Explorer with 2,000 EGP spent -> voyager is next
    const progressExplorer = service.calculateTierProgress(2000, LoyaltyTier.EXPLORER, config)
    expect(progressExplorer).toEqual({
      currentTier: LoyaltyTier.EXPLORER,
      nextTier: LoyaltyTier.VOYAGER,
      currentQualifyingSpendEGP: 2000,
      nextTierMinSpentEGP: 10000,
      remainingQualifyingSpendEGP: 8000
    })

    // 2. Voyager with 12,000 EGP spent -> elite is next
    const progressVoyager = service.calculateTierProgress(12000, LoyaltyTier.VOYAGER, config)
    expect(progressVoyager).toEqual({
      currentTier: LoyaltyTier.VOYAGER,
      nextTier: LoyaltyTier.ELITE,
      currentQualifyingSpendEGP: 12000,
      nextTierMinSpentEGP: 50000,
      remainingQualifyingSpendEGP: 38000
    })

    // 3. Elite with 60,000 EGP spent -> no next tier
    const progressElite = service.calculateTierProgress(60000, LoyaltyTier.ELITE, config)
    expect(progressElite).toEqual({
      currentTier: LoyaltyTier.ELITE,
      nextTier: null,
      currentQualifyingSpendEGP: 60000,
      nextTierMinSpentEGP: null,
      remainingQualifyingSpendEGP: null
    })
  })

  it('should throw LoyaltyProgramConfigurationException when a tier is missing from config', () => {
    const repository = {} as any
    const service = new LoyaltyService(repository)

    const invalidConfig = {
      tiers: {
        explorer: { minSpentEGP: 0 },
        // voyager is missing
        elite: { minSpentEGP: 50000 }
      }
    } as any

    expect(() => service.getTierThresholds(invalidConfig)).toThrow(
      LoyaltyProgramConfigurationException
    )
  })
})
