import type { ExperienceRepository } from './repository'
import type { DepartureSlotEntity } from './types'
import { AvailabilityPolicy } from './availability-policy'
import { CapacityHoldService } from '../booking/capacity-hold'
import type { RequestContext } from '@/types'

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
    context?: RequestContext,
  ): Promise<{ slot: DepartureSlotEntity; holdId: string }> {
    const slot = await this.repository.getDepartureSlot(departureId, context)
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

    const savedSlot = await this.repository.saveDepartureSlot(updatedSlot, context)

    const holdId = capacityHold.holdId || `hold_${Date.now()}`
    return { slot: savedSlot, holdId }
  }


  async commitCapacity(departureId: string, seats: number, context?: RequestContext): Promise<DepartureSlotEntity> {
    return this.repository.commitCapacity(departureId, seats, context)
  }

  async releaseCommittedCapacity(departureId: string, seats: number, context?: RequestContext): Promise<DepartureSlotEntity> {
    return this.repository.releaseCommittedCapacity(departureId, seats, context)
  }

  async releaseCapacity(departureId: string, seats: number, context?: RequestContext): Promise<DepartureSlotEntity> {
    const slot = await this.repository.getDepartureSlot(departureId, context)
    if (!slot) {
      throw new Error(`[InventoryManager] Departure slot ${departureId} not found`)
    }

    const updatedSlot: DepartureSlotEntity = {
      ...slot,
      capacityReserved: Math.max(0, slot.capacityReserved - seats),
    }

    return this.repository.saveDepartureSlot(updatedSlot, context)
  }
}
