import { describe, it, expect } from 'vitest'
import { validateTierTransition, isTierTransitionAllowed } from '@/domains/loyalty/state-machine'
import { LoyaltyTier } from '@/types'

describe('Loyalty Domain: State Machine Unit Tests', () => {
  it('should allow valid tier progression upgrades', () => {
    expect(isTierTransitionAllowed(LoyaltyTier.EXPLORER, LoyaltyTier.VOYAGER)).toBe(true)
    expect(isTierTransitionAllowed(LoyaltyTier.EXPLORER, LoyaltyTier.ELITE)).toBe(true)
    expect(isTierTransitionAllowed(LoyaltyTier.VOYAGER, LoyaltyTier.ELITE)).toBe(true)
  })

  it('should forbid tier downgrades', () => {
    expect(isTierTransitionAllowed(LoyaltyTier.ELITE, LoyaltyTier.VOYAGER)).toBe(false)
    expect(isTierTransitionAllowed(LoyaltyTier.VOYAGER, LoyaltyTier.EXPLORER)).toBe(false)
    expect(() => validateTierTransition(LoyaltyTier.ELITE, LoyaltyTier.VOYAGER)).toThrowError(
      '[LoyaltyStateMachine] Forbidden tier transition',
    )
  })
})
