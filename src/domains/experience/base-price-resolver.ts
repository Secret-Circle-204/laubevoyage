import type { ExperienceAggregate } from './aggregate'
import { PricingPolicyRegistry } from './pricing-policy-registry'
import type { DepartureSlotEntity } from './types'

/**
 * BasePriceResolver
 * Pure Domain Component responsible for determining the effective base price.
 * Chooses departure slot price overrides or falls back to experience catalog price.
 */
export class BasePriceResolver {
  /**
   * Resolves the effective base price in EGP for a given experience and slot.
   */
  resolve(experience: ExperienceAggregate, slot: DepartureSlotEntity): number {
    const pricingSource = PricingPolicyRegistry.getSource(experience.type)

    if (pricingSource === 'catalog') {
      if (experience.basePriceEGP === undefined) {
        throw new Error(`[BasePriceResolver] Experience ${experience.id} is catalog-priced but has no catalog price.`)
      }
      return experience.basePriceEGP
    }

    if (pricingSource === 'departure') {
      if (slot.basePriceEGP !== undefined && slot.basePriceEGP !== null) {
        return slot.basePriceEGP
      }
      if (experience.basePriceEGP === undefined) {
        throw new Error(`[BasePriceResolver] Experience ${experience.id} requires pricing, but neither slot override nor catalog price was found.`)
      }
      return experience.basePriceEGP
    }

    throw new Error(`[BasePriceResolver] Unknown pricing source.`)
  }
}
