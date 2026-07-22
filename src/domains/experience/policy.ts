import type { ExperienceAggregate } from './aggregate'
import type { AvailabilityPolicyResult } from './types'

/**
 * Pure Experience Policy
 * Single source of truth for pure business validation rules in the Experience Domain.
 */
export class ExperiencePolicy {
  /**
   * Validate if an experience is active and published for booking.
   */
  static canBookExperience(experience: ExperienceAggregate): AvailabilityPolicyResult {
    if (!experience.isActive) {
      return {
        allowed: false,
        code: 'EXPERIENCE_INACTIVE',
        reason: `Experience '${experience.title}' is currently inactive.`,
      }
    }

    if (experience.availability !== 'available') {
      return {
        allowed: false,
        code: 'EXPERIENCE_UNAVAILABLE',
        reason: `Experience '${experience.title}' availability status is '${experience.availability}'.`,
      }
    }

    return { allowed: true }
  }
}
