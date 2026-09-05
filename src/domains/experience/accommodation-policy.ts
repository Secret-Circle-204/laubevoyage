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

      // Invariant 3: Occupancy Options Validation
      if (!Array.isArray(stayRaw.occupancyOptions) || stayRaw.occupancyOptions.length === 0) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} must contain at least one occupancy option in occupancyOptions[].`)
      } else {
        const seenOccupancies = new Set<string>()
        let defaultCount = 0

        stayRaw.occupancyOptions.forEach((opt: any, optIdx: number) => {
          const optIndex = optIdx + 1

          if (!opt || typeof opt !== 'object') {
            errors.push(`[AccommodationPolicy] Stay #${stayIndex} option #${optIndex} must be a valid object.`)
            return
          }

          // Validate occupancy type enum
          if (!opt.occupancy || !VALID_OCCUPANCIES.has(opt.occupancy)) {
            errors.push(
              `[AccommodationPolicy] Stay #${stayIndex} option #${optIndex} has invalid occupancy: "${opt.occupancy}". Allowed: single, double, triple, quad.`,
            )
          } else {
            // Check for duplicates
            if (seenOccupancies.has(opt.occupancy)) {
              errors.push(
                `[AccommodationPolicy] Stay #${stayIndex} contains duplicate occupancy option: "${opt.occupancy}". Each occupancy must be unique per stay.`,
              )
            }
            seenOccupancies.add(opt.occupancy)

            // Validate guestCount if provided (must match derived guest count)
            if (opt.guestCount !== undefined && opt.guestCount !== null && opt.guestCount !== '') {
              const expectedCount = OCCUPANCY_GUEST_COUNT_MAP[opt.occupancy]
              const actualCount = Number(opt.guestCount)
              if (actualCount !== expectedCount) {
                errors.push(
                  `[AccommodationPolicy] Stay #${stayIndex} option #${optIndex} has mismatched guestCount: ${opt.guestCount} (expected ${expectedCount} for "${opt.occupancy}").`,
                )
              }
            }
          }

          // Supplement EGP must be non-negative >= 0
          const supp = Number(opt.supplementEGP)
          if (isNaN(supp) || supp < 0) {
            errors.push(
              `[AccommodationPolicy] Stay #${stayIndex} option #${optIndex} has invalid supplementEGP: ${opt.supplementEGP} (must be >= 0).`,
            )
          }

          // Count defaults
          if (opt.isDefault === true) {
            defaultCount++
          }
        })

        // Invariant 4: Exactly ONE default option required (NO silent fallback)
        if (defaultCount === 0) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has no default occupancy option. Exactly one option must have isDefault === true.`,
          )
        } else if (defaultCount > 1) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has ${defaultCount} default occupancy options. Exactly one option must have isDefault === true.`,
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
