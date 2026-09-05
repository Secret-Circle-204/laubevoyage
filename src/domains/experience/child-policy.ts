export type TravelerAgeCategory = 'infant' | 'child' | 'adult'
export type ChildBeddingMode = 'sharing_bed' | 'extra_bed'

export interface ChildPolicyValidationResult {
  valid: boolean
  errors: string[]
}

export class ChildPolicy {
  /**
   * Pure domain rule: Classifies traveler age into non-overlapping standard categories.
   * - Infant: age < 2
   * - Child:  2 <= age <= 11
   * - Adult:  age >= 12
   */
  static classifyAge(age: number): TravelerAgeCategory {
    if (age === undefined || age === null || isNaN(age) || age < 0) {
      throw new Error(`[ChildPolicy] Invalid traveler age: ${age}. Age must be a non-negative number.`)
    }
    if (age < 2) {
      return 'infant'
    }
    if (age <= 11) {
      return 'child'
    }
    return 'adult'
  }

  /**
   * Validates children configuration against experience commercial rules.
   * Pure invariant verification (zero monetary calculations).
   */
  static validate(params: {
    childrenAllowed: boolean
    childAges: number[]
    childBeddingModes?: ChildBeddingMode[]
  }): ChildPolicyValidationResult {
    const errors: string[] = []

    if (params.childAges.length > 0 && !params.childrenAllowed) {
      errors.push('[ChildPolicy] Children are not permitted on this package experience.')
      return { valid: false, errors }
    }

    params.childAges.forEach((age, idx) => {
      const childIndex = idx + 1
      if (typeof age !== 'number' || isNaN(age) || age < 0 || !Number.isFinite(age)) {
        errors.push(`[ChildPolicy] Child #${childIndex} has invalid age: ${age} (must be a non-negative number).`)
        return
      }

      const category = this.classifyAge(age)
      if (category === 'adult') {
        errors.push(
          `[ChildPolicy] Child #${childIndex} age (${age}) qualifies as an Adult (12+). Must be booked as an Adult traveler.`,
        )
      }

      if (params.childBeddingModes && params.childBeddingModes[idx]) {
        const mode = params.childBeddingModes[idx]
        if (mode !== 'sharing_bed' && mode !== 'extra_bed') {
          errors.push(
            `[ChildPolicy] Child #${childIndex} has invalid bedding mode: "${mode}". Allowed: sharing_bed, extra_bed.`,
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
