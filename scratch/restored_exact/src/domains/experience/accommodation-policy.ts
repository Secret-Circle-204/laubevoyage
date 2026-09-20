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

      // Nights must be positive integer >= 1
      const nights = Number(stayRaw.nights)
      if (isNaN(nights) || nights < 1 || !Number.isInteger(nights)) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} has invalid nights: ${stayRaw.nights} (must be integer >= 1).`)
      }

      // Resolve options array (supporting transitional legacy shape during development)
      let optionsRaw: any[] = []
      if (Array.isArray(stayRaw.options)) {
        optionsRaw = stayRaw.options
      } else if (stayRaw.property !== undefined || stayRaw.propertyId !== undefined) {
        // Transitional legacy single-hotel adapter: wrap stay into single option
        optionsRaw = [stayRaw]
      }

      // Stay Invariant: options.length >= 1
      if (optionsRaw.length === 0) {
        errors.push(`[AccommodationPolicy] Stay #${stayIndex} must contain at least one accommodation option in options[].`)
        return
      }

      // Option Invariants across options in this Stay
      const seenProperties = new Set<number>()

      optionsRaw.forEach((optionRaw: any, optIdx: number) => {
        const optionIndex = optIdx + 1
        const optionLabel = `Stay #${stayIndex} option #${optionIndex}`

        if (!optionRaw || typeof optionRaw !== 'object') {
          errors.push(`[AccommodationPolicy] ${optionLabel} must be a structured object.`)
          return
        }

        // Property Reference validation (property ID or populated property object)
        const propertyId = optionRaw.property
          ? typeof optionRaw.property === 'object'
            ? Number(optionRaw.property.id)
            : Number(optionRaw.property)
          : Number(optionRaw.propertyId)

        if (!propertyId || isNaN(propertyId) || propertyId <= 0 || !Number.isInteger(propertyId)) {
          errors.push(`[AccommodationPolicy] ${optionLabel} is missing valid property reference (must be a valid Accommodation ID).`)
        } else {
          // Stay Invariant: The same property must not appear in multiple Options within a single Stay
          if (seenProperties.has(propertyId)) {
            errors.push(
              `[AccommodationPolicy] Stay #${stayIndex} contains duplicate property #${propertyId} across multiple options.`,
            )
          }
          seenProperties.add(propertyId)
        }

        // Board basis if provided must be valid enum
        if (optionRaw.boardBasis !== undefined && optionRaw.boardBasis !== null && optionRaw.boardBasis !== '') {
          if (!VALID_BOARD_BASIS.has(optionRaw.boardBasis)) {
            errors.push(
              `[AccommodationPolicy] ${optionLabel} has invalid boardBasis: "${optionRaw.boardBasis}". Allowed: bed_and_breakfast, half_board, full_board, all_inclusive.`,
            )
          }
        }

        // Pricing unit validation (strict enum: per_stay | per_night)
        const pricingUnit = optionRaw.pricingUnit || 'per_stay'
        if (!VALID_PRICING_UNITS.has(pricingUnit)) {
          errors.push(
            `[AccommodationPolicy] ${optionLabel} has invalid pricingUnit: "${optionRaw.pricingUnit}". Allowed: per_stay, per_night.`,
          )
        }

        // Invariant 3: Room Rates Validation
        if (!Array.isArray(optionRaw.roomRates) || optionRaw.roomRates.length === 0) {
          errors.push(`[AccommodationPolicy] ${optionLabel} must contain at least one room rate configuration in roomRates[].`)
        } else {
          const seenOccupancies = new Set<string>()
          let enabledCount = 0

          optionRaw.roomRates.forEach((rateObj: any, rateIdx: number) => {
            const rateIndex = rateIdx + 1

            if (!rateObj || typeof rateObj !== 'object') {
              errors.push(`[AccommodationPolicy] ${optionLabel} room rate #${rateIndex} must be a valid object.`)
              return
            }

            // Validate occupancy type enum
            if (!rateObj.occupancy || !VALID_OCCUPANCIES.has(rateObj.occupancy)) {
              errors.push(
                `[AccommodationPolicy] ${optionLabel} room rate #${rateIndex} has invalid occupancy: "${rateObj.occupancy}". Allowed: single, double, triple, quad.`,
              )
            } else {
              // Option Invariant: occupancy types must remain unique per option
              if (seenOccupancies.has(rateObj.occupancy)) {
                errors.push(
                  `[AccommodationPolicy] ${optionLabel} contains duplicate room rate for occupancy: "${rateObj.occupancy}". Each occupancy must be unique per option.`,
                )
              }
              seenOccupancies.add(rateObj.occupancy)
            }

            // Rate EGP must be a valid non-negative number >= 0
            if (rateObj.rateEGP === undefined || rateObj.rateEGP === null || rateObj.rateEGP === '') {
              errors.push(
                `[AccommodationPolicy] ${optionLabel} option "${rateObj.occupancy}" is missing rateEGP (must be a valid number >= 0).`,
              )
            } else {
              const rateVal = Number(rateObj.rateEGP)
              if (isNaN(rateVal) || rateVal < 0 || !Number.isFinite(rateVal)) {
                errors.push(
                  `[AccommodationPolicy] ${optionLabel} option "${rateObj.occupancy}" has invalid rateEGP: ${rateObj.rateEGP} (must be a non-negative number >= 0).`,
                )
              }
            }

            if (rateObj.enabled !== false) {
              enabledCount++
            }
          })

          if (enabledCount === 0) {
            errors.push(
              `[AccommodationPolicy] ${optionLabel} has no enabled room rates. At least one room occupancy must have enabled === true.`,
            )
          }
        }
      })

      // Invariant 4: Authoritative Default Option Validation across options in this Stay
      if (optionsRaw.length > 1) {
        const defaultCount = optionsRaw.filter((opt: any) => opt && opt.isDefault === true).length
        if (defaultCount === 0) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has ${optionsRaw.length} accommodation options, but no default option is designated (isDefault: true). Exactly one option must be marked as the default.`,
          )
        } else if (defaultCount > 1) {
          errors.push(
            `[AccommodationPolicy] Stay #${stayIndex} has ${defaultCount} accommodation options marked as default. Only one option can be designated as the default.`,
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Resolves the authoritative default accommodation option for each stay.
   * Pure Domain Function (SSOT).
   * Throws an explicit Domain Error if any stay has multiple options but no authoritative default.
   */
  static resolveAuthoritativeDefaults(
    accommodations?: Array<{ order: number; options?: Array<{ id?: string; isDefault?: boolean }> }>,
  ): Record<number, string> {
    if (!accommodations || !Array.isArray(accommodations)) return {}
    const defaults: Record<number, string> = {}

    for (const stay of accommodations) {
      const options = Array.isArray(stay.options) ? stay.options : []
      if (options.length === 0) continue

      if (options.length === 1) {
        const singleId = options[0].id
        if (singleId) {
          defaults[stay.order] = String(singleId)
        }
      } else {
        const defaultOptions = options.filter((o) => o && o.isDefault === true)
        if (defaultOptions.length === 0) {
          throw new Error(
            `[AccommodationPolicy] Stay #${stay.order} has ${options.length} accommodation options, but no authoritative default is designated. Please configure a default option in the Experience.`,
          )
        }
        if (defaultOptions.length > 1) {
          throw new Error(
            `[AccommodationPolicy] Stay #${stay.order} has multiple options (${defaultOptions.length}) designated as default. Only one option can be the default.`,
          )
        }
        const defaultId = defaultOptions[0].id
        if (!defaultId) {
          throw new Error(
            `[AccommodationPolicy] Stay #${stay.order} default accommodation option is missing an authoritative ID.`,
          )
        }
        defaults[stay.order] = String(defaultId)
      }
    }

    return defaults
  }
}
