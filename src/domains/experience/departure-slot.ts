import type { DepartureSlotEntity, DepartureSlotStatus } from './types'

/**
 * Departure Slot Entity Utilities
 * Handles dynamic capacity calculations and availability state for departure slots.
 */
export class DepartureSlotHelper {
  static createSlot(
    departureId: string,
    experienceId: number,
    date: string,
    basePriceEGP: number,
    capacityTotal: number,
    startTime?: string,
  ): DepartureSlotEntity {
    return {
      departureId,
      experienceId,
      date,
      startTime,
      basePriceEGP,
      capacityTotal,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: capacityTotal,
      version: 1,
      status: 'available',
    }
  }

  static calculateAvailableCapacity(slot: DepartureSlotEntity): number {
    return Math.max(0, slot.capacityTotal - slot.capacityReserved - slot.capacitySold)
  }

  static determineStatus(slot: DepartureSlotEntity): DepartureSlotStatus {
    if (slot.status === 'blacked_out' || slot.status === 'cancelled') return slot.status
    const available = this.calculateAvailableCapacity(slot)
    if (available <= 0) return 'sold_out'
    return 'available'
  }
}
