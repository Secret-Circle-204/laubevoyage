import type { DepartureSlotEntity, AvailabilityPolicyResult } from './types'
import { DepartureSlotHelper } from './departure-slot'

/**
 * Pure Availability Policy
 * Single source of truth for inventory and departure slot availability predicates.
 */
export class AvailabilityPolicy {
  /**
   * Validate if seats can be reserved for a departure slot.
   */
  static canReserve(slot: DepartureSlotEntity, requestedSeats: number): AvailabilityPolicyResult {
    if (slot.status !== 'available' || slot.isBlackedOut) {
      return {
        allowed: false,
        code: 'SLOT_NOT_AVAILABLE',
        reason: `Departure slot for ${slot.date} is not available (Status: ${slot.status}).`,
      }
    }

    if (requestedSeats <= 0) {
      return {
        allowed: false,
        code: 'INVALID_SEATS_REQUEST',
        reason: 'Requested seats must be greater than zero.',
      }
    }

    const available = DepartureSlotHelper.calculateAvailableCapacity(slot)
    if (requestedSeats > available) {
      return {
        allowed: false,
        code: 'INSUFFICIENT_CAPACITY',
        reason: `Requested seats (${requestedSeats}) exceed available capacity (${available}).`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a departure slot can be cancelled.
   */
  static canCancelDeparture(slot: DepartureSlotEntity): AvailabilityPolicyResult {
    if (slot.capacitySold > 0) {
      return {
        allowed: false,
        code: 'HAS_SOLD_SEATS',
        reason: `Cannot cancel departure slot with ${slot.capacitySold} sold tickets. Must process refunds first.`,
      }
    }

    return { allowed: true }
  }
}
