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

  describe('Tier Boundary Logic', () => {
    const repository = {} as any
    const service = new LoyaltyService(repository)
    const config = {
      tiers: {
        explorer: { minSpentEGP: 0 },
        voyager: { minSpentEGP: 5000 },
        elite: { minSpentEGP: 15000 }
      }
    } as any

    it('should correctly qualify at boundary limits', () => {
      // 4999.99 spent -> Explorer
      const progress1 = service.calculateTierProgress(4999.99, LoyaltyTier.EXPLORER, config)
      expect(progress1.currentTier).toBe(LoyaltyTier.EXPLORER)
      expect(progress1.nextTier).toBe(LoyaltyTier.VOYAGER)
      expect(progress1.remainingQualifyingSpendEGP).toBeCloseTo(0.01, 2)

      // 5000.00 spent -> Voyager
      const progress2 = service.calculateTierProgress(5000, LoyaltyTier.VOYAGER, config)
      expect(progress2.currentTier).toBe(LoyaltyTier.VOYAGER)
      expect(progress2.nextTier).toBe(LoyaltyTier.ELITE)
      expect(progress2.remainingQualifyingSpendEGP).toBe(10000)

      // 14999.99 spent -> Voyager
      const progress3 = service.calculateTierProgress(14999.99, LoyaltyTier.VOYAGER, config)
      expect(progress3.currentTier).toBe(LoyaltyTier.VOYAGER)
      expect(progress3.nextTier).toBe(LoyaltyTier.ELITE)
      expect(progress3.remainingQualifyingSpendEGP).toBeCloseTo(0.01, 2)

      // 15000.00 spent -> Elite
      const progress4 = service.calculateTierProgress(15000, LoyaltyTier.ELITE, config)
      expect(progress4.currentTier).toBe(LoyaltyTier.ELITE)
      expect(progress4.nextTier).toBeNull()
      expect(progress4.remainingQualifyingSpendEGP).toBeNull()
    })

    it('should handle highest tier achieved state correctly', () => {
      const progress = service.calculateTierProgress(25000, LoyaltyTier.ELITE, config)
      expect(progress).toEqual({
        currentTier: LoyaltyTier.ELITE,
        nextTier: null,
        currentQualifyingSpendEGP: 25000,
        nextTierMinSpentEGP: null,
        remainingQualifyingSpendEGP: null
      })
    })
  })

  describe('LoyaltySettings Global Tiers Array Validation', () => {
    it('should validate tier definitions correctly', async () => {
      const { LoyaltySettings } = await import('@/globals/LoyaltySettings')
      const tiersField = LoyaltySettings.fields.find((f: any) => f.type === 'tabs')
        ?.tabs?.find((t: any) => t.label === 'Tier Rules Matrix')
        ?.fields?.find((f: any) => f.name === 'tiers') as any

      expect(tiersField).toBeDefined()
      const validate = tiersField.validate

      // 1. Valid configuration
      const validTiers = [
        { tier: 'explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(validTiers)).toBe(true)

      // 2. Missing Explorer
      const missingExplorer = [
        { tier: 'voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(missingExplorer)).toBe('Explorer tier must be defined.')

      // 3. Explorer spend is not 0
      const invalidExplorerSpend = [
        { tier: 'explorer', minSpentEGP: 10, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 }
      ]
      expect(validate(invalidExplorerSpend)).toBe('Explorer tier min spend must be exactly 0 EGP.')

      // 4. Duplicate Tiers
      const duplicateTiers = [
        { tier: 'explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'voyager', minSpentEGP: 10000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(duplicateTiers)).toBe('Duplicate tier definition: voyager is defined multiple times.')

      // 5. Non-ascending thresholds
      const nonAscendingTiers = [
        { tier: 'explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', minSpentEGP: 15000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(nonAscendingTiers)).toContain('Tier thresholds must be strictly ascending')
    })
  })
})

