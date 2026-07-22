import type { ExperienceRepository } from './repository'
import type { DepartureSlotEntity } from './types'
import { AvailabilityPolicy } from './availability-policy'
import { CapacityHoldService } from '../booking/capacity-hold'

/**
 * Inventory Manager Sub-Service
 * Manages departure slot capacity reservations, releasing, blackout checks, and seat locks.
 */
export class InventoryManager {
  private repository: ExperienceRepository
  private capacityHoldService: CapacityHoldService

  constructor(repository: ExperienceRepository) {
    this.repository = repository
    this.capacityHoldService = new CapacityHoldService()
  }

  async reserveCapacity(
    departureId: string,
    experienceId: number,
    seats: number,
    customerId: number,
    bookingId: number,
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    const slot = await this.repository.getDepartureSlot(departureId)
    if (!slot) {
      throw new Error(`[InventoryManager] Departure slot ${departureId} not found`)
    }

    // 1. Validate availability policy
    const policyResult = AvailabilityPolicy.canReserve(slot, seats)
    if (!policyResult.allowed) {
      throw new Error(`[AvailabilityPolicy] Reservation forbidden: ${policyResult.reason}`)
    }

    // 2. Reserve seat hold via CapacityHoldService
    const capacityHold = this.capacityHoldService.reserveCapacity(
      bookingId,
      customerId,
      experienceId,
      seats,
      slot.date,
    )

    // 3. Update departure slot reserved capacity & save with Optimistic Locking
    const updatedSlot: DepartureSlotEntity = {
      ...slot,
      capacityReserved: slot.capacityReserved + seats,
    }

    const savedSlot = await this.repository.saveDepartureSlot(updatedSlot)

    const holdId = capacityHold.lockId || (capacityHold as any).holdId || `hold_${Date.now()}`
    return { slot: savedSlot, holdId }
  }

  async releaseCapacity(departureId: string, seats: number): Promise<DepartureSlotEntity> {
    const slot = await this.repository.getDepartureSlot(departureId)
    if (!slot) {
      throw new Error(`[InventoryManager] Departure slot ${departureId} not found`)
    }

    const updatedSlot: DepartureSlotEntity = {
      ...slot,
      capacityReserved: Math.max(0, slot.capacityReserved - seats),
    }

    return this.repository.saveDepartureSlot(updatedSlot)
  }
}
