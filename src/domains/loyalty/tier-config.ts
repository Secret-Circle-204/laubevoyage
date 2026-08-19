import { LoyaltyTier } from '@/types'

export interface TierDefinitionConfig {
  tier: LoyaltyTier
  label: string
  minSpentEGP: number
  earnMultiplier: number
  upgradeBonus: number
}

export type LoyaltyTierDefinition = TierDefinitionConfig

export interface LoyaltyProgramConfig {
  id: string
  programCode: string
  name: string
  version: number
  status: 'draft' | 'review' | 'published' | 'archived'
  baseEarnRate: number
  redemptionPointsUnit: number
  redemptionValueEGP: number
  minRedemptionPoints: number
  maxRedemptionPercent: number
  maxRedemptionFixedEGP?: number
  allowPartialRedemption: boolean
  redemptionStepUnit?: number
  welcomeBonus: number
  expirationMonths: number
  bonusNeverExpires: boolean
  tiers: TierDefinitionConfig[]
}

export interface LeanRulesSnapshot {
  baseEarnRate: number
  tierMultiplier: number
  redemptionPointsUnit: number
  redemptionValueEGP: number
  welcomeBonus: number
  upgradeBonus?: number
  bonusNeverExpires?: boolean
}

export class LoyaltyProgramConfigurationException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoyaltyProgramConfigurationException'
  }
}
