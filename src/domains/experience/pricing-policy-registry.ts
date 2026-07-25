import type { ExperienceType } from './types'

export type PricingSource = 'catalog' | 'departure'

export class PricingPolicyRegistry {
  private static readonly POLICY_MAP: Record<ExperienceType, PricingSource> = {
    daily_tour: 'catalog',
    package: 'departure',
  }

  static getSource(type: ExperienceType): PricingSource {
    const source = this.POLICY_MAP[type]
    if (!source) {
      throw new Error(`[PricingPolicyRegistry] No pricing source registered for experience type: ${type}`)
    }
    return source
  }
}
