import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity } from './types'

/**
 * BasePriceResolver
 * Pure Domain Component responsible for determining the effective base price.
 * Chooses departure slot price override, sparse date/time override, or falls back to experience catalog price.
 */
export class BasePriceResolver {
  /**
   * Resolves the effective base price in EGP for a given experience and optional slot or date/time.
   */
  resolve(
    experience: ExperienceAggregate,
    slot?: DepartureSlotEntity | null,
    date?: string,
    startTime?: string,
  ): number {
    // 1. Direct Slot Price Override (Fixed Packages)
    if (slot?.priceOverrideEGP !== undefined && slot?.priceOverrideEGP !== null) {
      return slot.priceOverrideEGP
    }

    // 2. Sparse Date/Time Price Override (Daily Tours & Flexible Packages)
    const targetDate = date || slot?.date
    if (targetDate && experience.priceOverrides && Array.isArray(experience.priceOverrides)) {
      const cleanDate = targetDate.split('T')[0]
      const targetTime = startTime || slot?.startTime
      const override = experience.priceOverrides.find((o) => {
        const oDate = o.date ? o.date.split('T')[0] : ''
        if (oDate !== cleanDate) return false
        if (!o.startTime || o.startTime === 'all') return true
        return targetTime ? o.startTime === targetTime : true
      })
      if (override && typeof override.priceEGP === 'number' && override.priceEGP >= 0) {
        return override.priceEGP
      }
    }

    // 3. Fallback to Catalog Base Price
    if (experience.price !== undefined && experience.price !== null) {
      return experience.price
    }

    if (slot?.id) {
      throw new Error(`[BasePriceResolver] Experience #${experience.id} has no base price and slot #${slot.id} has no priceOverrideEGP.`)
    }

    throw new Error(`[BasePriceResolver] Experience #${experience.id} has no base price and no price override found.`)
  }
}

