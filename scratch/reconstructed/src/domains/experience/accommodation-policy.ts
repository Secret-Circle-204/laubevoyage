import type { ExperienceType } from './types'

export interface AccommodationValidationResult {
  valid: boolean
  errors: string[]
}

export const OCCUPANCY_GUEST_COUNT_MAP: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
}

const VALID_OCCUPANCIES = new Set(['single', 'double', 'triple', 'quad'])
const VALID_BOARD_BASIS = new Set(['bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive'])
const VALID_PRICING_UNITS = new Set(['per_stay', 'per_night'])

export class AccommodationPolicy {
  /**
   * Validates accommodation configuration against strict domain invariants.
   * Pure domain rule function (zero side effects, zero DB dependencies).
   */
  static validate(
    experienceType: ExperienceType,
    accommodations?: unknown[],
  ): AccommodationValidationResult {
    const errors: string[] = []

    if (!accommodations || accommodations.length === 0) {
      return { valid: true, errors: [] }
    }

    // Invariant 1: Package-Only Scope (Daily Tours strictly forbidden)
    if (experienceType === 'daily_tour') {
      errors.push('[AccommodationPolicy] Daily Tours cannot contain accommodation stays.')
      return { valid: false, errors }
    }

    // Invariant 2: Validate each Stay entity
    accommodations.forEach((stayRaw: any, idx: number) => {
      const stayIndex = idx + 1

      if (!stayRaw || typeof stayRaw !== 'object') {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} must be a structured object.`)
        return
      }

      // Order must be positive integer >= 1
      const order = Number(stayRaw.order)
      if (isNaN(order) || order < 1 || !Number.isInteger(order)) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} has invalid order: ${stayRaw.order} (must be integer >= 1).`)
      }

      // Property Reference validation (property ID or populated property object)
      const propertyId = stayRaw.property
        ? typeof stayRaw.property === 'object'
          ? Number(stayRaw.property.id)
          : Number(stayRaw.property)
        : Number(stayRaw.propertyId)

      if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} is missing valid property reference (must be a valid Accommodation ID).`)
      }

      // Nights must be positive integer >= 1
      const nights = Number(stayRaw.nights)
      if (isNaN(nights) || nights < 1 || !Number.isInteger(nights)) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} has invalid nights: ${stayRaw.nights} (must be integer >= 1).`)
      }

      // Board basis if provided must be valid enum
      if (stayRaw.boardBasis !== undefined && stayRaw.boardBasis !== null && stayRaw.boardBasis !== '') {
        if (!VALID_BOARD_BASIS.has(stayRaw.boardBasis)) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has invalid boardBasis: "${stayRaw.boardBasis}". Allowed: bed_and_breakfast, half_board, full_board, all_inclusive.`,
          )
        }
      }

      // Pricing unit validation (strict enum: per_stay | per_night)
      const pricingUnit = stayRaw.pricingUnit || 'per_stay'
      if (!VALID_PRICING_UNITS.has(pricingUnit)) {
        errors.push(
          `[AccommodationPolicy] Stay #${stayIndex} has invalid pricingUnit: "${stayRaw.pricingUnit}". Allowed: per_stay, per_night.`,
        )
      }

      // Invariant 3: Room Rates Validation
      if (!Array.isArray(stayRaw.roomRates) || stayRaw.roomRates.length === 0) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} must contain at least one room rate configuration in roomRates[].`)
      } else {
        const seenOccupancies = new Set<string>()
        let enabledCount = 0

        stayRaw.roomRates.forEach((rateObj: any, rateIdx: number) => {
          const rateIndex = rateIdx + 1

          if (!rateObj || typeof rateObj !== 'object') {
            errors.push(`[AccommodationPolicy] Stay #${stayIndex} room rate #${rateIndex} must be a valid object.`)
            return
          }

          // Validate occupancy type enum
          if (!rateObj.occupancy || !VALID_OCCUPANCIES.has(rateObj.occupancy)) {
            errors.push(
              `[AccommodationPolicy] Stay #${stayIndex} room rate #${rateIndex} has invalid occupancy: "${rateObj.occupancy}". Allowed: single, double, triple, quad.`,
            )
          } else {
            // Check for duplicates
            if (seenOccupancies.has(rateObj.occupancy)) {
              errors.push(
                `[AccommodationPolicy] Stay #${stayIndex} contains duplicate room rate for occupancy: "${rateObj.occupancy}". Each occupancy must be unique per stay.`,
              )
            }
            seenOccupancies.add(rateObj.occupancy)
          }

          // Rate EGP must be a valid non-negative number >= 0
          if (rateObj.rateEGP === undefined || rateObj.rateEGP === null || rateObj.rateEGP === '') {
            errors.push(
              `[AccommodationPolicy] Stay #${stayIndex} option "${rateObj.occupancy}" is missing rateEGP (must be a valid number >= 0).`,
            )
          } else {
            const rateVal = Number(rateObj.rateEGP)
            if (isNaN(rateVal) || rateVal < 0 || !Number.isFinite(rateVal)) {
              errors.push(
                `[AccommodationPolicy] Stay #${stayIndex} option "${rateObj.occupancy}" has invalid rateEGP: ${rateObj.rateEGP} (must be a non-negative number >= 0).`,
              )
            }
          }

          if (rateObj.enabled !== false) {
            enabledCount++
          }
        })

        if (enabledCount === 0) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has no enabled room rates. At least one room occupancy must have enabled === true.`,
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
