import { describe, it, expect } from 'vitest'
import { LoyaltyService } from '@/domains/loyalty/service'
import { LoyaltyTier } from '@/types'
import { LoyaltyProgramConfigurationException } from '@/domains/loyalty/tier-config'
import type { LoyaltyRepository } from '@/domains/loyalty/repository'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'
import type { TabsField, ArrayField } from 'payload'

describe('Loyalty Service: Tier Thresholds & Configuration Unit Tests', () => {
  it('should return correct tier thresholds in EGP spent', () => {
    const repository = {} as unknown as LoyaltyRepository
    const service = new LoyaltyService(repository)

    const config = {
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 10000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 50000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
    } as unknown as LoyaltyProgramConfig

    const thresholds = service.getTierThresholds(config)
    expect(thresholds).toEqual([
      { tier: 'explorer', minSpentEGP: 0 },
      { tier: 'voyager', minSpentEGP: 10000 },
      { tier: 'elite', minSpentEGP: 50000 }
    ])
  })

  it('should calculate correct tier progress towards the next level', () => {
    const repository = {} as unknown as LoyaltyRepository
    const service = new LoyaltyService(repository)

    const config = {
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 10000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 50000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
    } as unknown as LoyaltyProgramConfig

    // 1. Explorer with 2,000 EGP spent -> voyager is next
    const progressExplorer = service.calculateTierProgress(2000, 'explorer', config)
    expect(progressExplorer).toEqual({
      currentTier: 'explorer',
      nextTier: 'voyager',
      currentQualifyingSpendEGP: 2000,
      nextTierMinSpentEGP: 10000,
      remainingQualifyingSpendEGP: 8000,
      percent: 20,
    })

    // 2. Voyager with 12,000 EGP spent -> elite is next
    const progressVoyager = service.calculateTierProgress(12000, 'voyager', config)
    expect(progressVoyager).toEqual({
      currentTier: 'voyager',
      nextTier: 'elite',
      currentQualifyingSpendEGP: 12000,
      nextTierMinSpentEGP: 50000,
      remainingQualifyingSpendEGP: 38000,
      percent: 5,
    })

    // 3. Elite with 60,000 EGP spent -> no next tier
    const progressElite = service.calculateTierProgress(60000, 'elite', config)
    expect(progressElite).toEqual({
      currentTier: 'elite',
      nextTier: null,
      currentQualifyingSpendEGP: 60000,
      nextTierMinSpentEGP: null,
      remainingQualifyingSpendEGP: null,
      percent: 100,
    })
  })

  it('should throw LoyaltyProgramConfigurationException when a tier is missing from config', () => {
    const repository = {} as unknown as LoyaltyRepository
    const service = new LoyaltyService(repository)

    const invalidConfig = {
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 100, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 50000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
    } as unknown as LoyaltyProgramConfig

    expect(() => service.getTierThresholds(invalidConfig)).toThrow(
      LoyaltyProgramConfigurationException
    )
  })

  describe('Tier Boundary Logic', () => {
    const repository = {} as unknown as LoyaltyRepository
    const service = new LoyaltyService(repository)
    const config = {
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
    } as unknown as LoyaltyProgramConfig

    it('should correctly qualify at boundary limits', () => {
      // 4999.99 spent -> Explorer
      const progress1 = service.calculateTierProgress(4999.99, 'explorer', config)
      expect(progress1.currentTier).toBe('explorer')
      expect(progress1.nextTier).toBe('voyager')
      expect(progress1.remainingQualifyingSpendEGP).toBeCloseTo(0.01, 2)

      // 5000.00 spent -> Voyager
      const progress2 = service.calculateTierProgress(5000, 'voyager', config)
      expect(progress2.currentTier).toBe('voyager')
      expect(progress2.nextTier).toBe('elite')
      expect(progress2.remainingQualifyingSpendEGP).toBe(10000)

      // 14999.99 spent -> Voyager
      const progress3 = service.calculateTierProgress(14999.99, 'voyager', config)
      expect(progress3.currentTier).toBe('voyager')
      expect(progress3.nextTier).toBe('elite')
      expect(progress3.remainingQualifyingSpendEGP).toBeCloseTo(0.01, 2)

      // 15000.00 spent -> Elite
      const progress4 = service.calculateTierProgress(15000, 'elite', config)
      expect(progress4.currentTier).toBe('elite')
      expect(progress4.nextTier).toBeNull()
      expect(progress4.remainingQualifyingSpendEGP).toBeNull()
    })

    it('should handle highest tier achieved state correctly', () => {
      const progress = service.calculateTierProgress(25000, 'elite', config)
      expect(progress).toEqual({
        currentTier: 'elite',
        nextTier: null,
        currentQualifyingSpendEGP: 25000,
        nextTierMinSpentEGP: null,
        remainingQualifyingSpendEGP: null,
        percent: 100,
      })
    })
  })

  describe('LoyaltySettings Global Tiers Array Validation', () => {
    it('should validate tier definitions correctly', async () => {
      const { LoyaltySettings } = await import('@/globals/LoyaltySettings')
      const tabsField = LoyaltySettings.fields.find((f): f is TabsField => f.type === 'tabs')
      const tab = tabsField?.tabs?.find((t) => 'label' in t && t.label === 'Tier Rules Matrix')
      const tiersField = tab && 'fields' in tab
        ? tab.fields.find((f): f is ArrayField => 'name' in f && f.name === 'tiers')
        : undefined

      expect(tiersField).toBeDefined()
      const validateRaw = tiersField?.validate
      if (typeof validateRaw !== 'function') {
        throw new Error('validate is not a function on tiersField')
      }
      const validate = validateRaw as (val: unknown) => string | boolean | Promise<string | boolean>

      // 1. Valid configuration
      const validTiers = [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(validTiers)).toBe(true)

      // 2. Missing Explorer (Lowest starts at 5000)
      const missingExplorer = [
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(missingExplorer)).toBe('The lowest tier [voyager] must have minSpentEGP = 0 (found 5000).')

      // 3. Explorer spend is not 0
      const invalidExplorerSpend = [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 10, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 }
      ]
      expect(validate(invalidExplorerSpend)).toBe('The lowest tier [explorer] must have minSpentEGP = 0 (found 10).')

      // 4. Duplicate Tiers
      const duplicateTiers = [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'voyager', label: 'Voyager Copy', minSpentEGP: 10000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(duplicateTiers)).toBe('Duplicate tier definition: voyager is defined multiple times.')

      // 5. Non-ascending thresholds
      const nonAscendingTiers = [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 15000, earnMultiplier: 1.2, upgradeBonus: 500 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 1000 }
      ]
      expect(validate(nonAscendingTiers)).toContain('Tier thresholds must be strictly ascending')
    })
  })
})
