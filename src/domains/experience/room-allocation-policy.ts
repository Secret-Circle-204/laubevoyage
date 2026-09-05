import type { OccupancyType } from './types'

export interface RoomAllocationItem {
  roomIndex: number
  occupancy: OccupancyType
  adults: number
  children: number
}

export interface RoomAllocationResult {
  valid: boolean
  errors: string[]
  allocation?: RoomAllocationItem[]
  autoAdjusted?: boolean
  suggestedRooms?: number
  minimumRequiredRooms?: number
  adjustmentReason?: string
}

export class RoomAllocationPolicy {
  /**
   * Calculates the minimum number of rooms strictly required for the given headcount
   * and supported occupancies.
   */
  static calculateMinimumRequiredRooms(params: {
    adultsCount: number
    childrenCount?: number
    supportedOccupancies: OccupancyType[]
  }): number {
    const adults = Math.max(1, params.adultsCount)
    const children = Math.max(0, params.childrenCount || 0)
    const maxCapacityMap: Record<OccupancyType, number> = {
      quad: 4,
      triple: 3,
      double: 2,
      single: 1,
    }
    const maxCapacity = Math.max(
      1,
      ...params.supportedOccupancies.map((occ) => maxCapacityMap[occ] || 1),
    )
    let minRooms = Math.max(1, Math.ceil(adults / maxCapacity))

    // Ensure children are accommodated (each room can accommodate at most 1 child unless Quad is supported)
    if (children > 0 && maxCapacity < 4) {
      minRooms = Math.max(minRooms, Math.ceil(children / 1))
      // Cannot have more rooms than adults (each room must contain at least 1 adult)
      minRooms = Math.min(minRooms, adults)
    }

    return minRooms
  }

  /**
   * Smart Room Allocation resolver (Assistant pattern).
   * 1. Attempts exact requestedRooms allocation.
   * 2. If requestedRooms is insufficient (e.g. 5 adults in 1 room), calculates the
   *    minimum valid room count and returns an auto-adjusted allocation with a friendly explanation.
   * 3. If impossible under any room count, returns helpful customer recovery guidance.
   */
  static resolveSmartAllocation(params: {
    adultsCount: number
    childrenCount?: number
    requestedRooms?: number
    supportedOccupancies: OccupancyType[]
  }): RoomAllocationResult {
    const adults = Math.max(0, params.adultsCount)
    const children = Math.max(0, params.childrenCount || 0)
    const requested = params.requestedRooms && params.requestedRooms > 0 ? params.requestedRooms : 1

    if (adults < 1) {
      return {
        valid: false,
        errors: ['At least one adult traveler is required to book a journey.'],
        minimumRequiredRooms: 1,
      }
    }

    if (!params.supportedOccupancies || params.supportedOccupancies.length === 0) {
      return {
        valid: false,
        errors: ['This package has no supported room occupancy options configured.'],
        minimumRequiredRooms: 1,
      }
    }

    const minRoomsNeeded = this.calculateMinimumRequiredRooms({
      adultsCount: adults,
      childrenCount: children,
      supportedOccupancies: params.supportedOccupancies,
    })

    // 1. Try exact requested allocation if requested >= minRoomsNeeded
    if (requested >= minRoomsNeeded) {
      const directResult = this.resolveAllocation({
        adultsCount: adults,
        childrenCount: children,
        requestedRooms: requested,
        supportedOccupancies: params.supportedOccupancies,
      })

      if (directResult.valid) {
        return {
          ...directResult,
          minimumRequiredRooms: minRoomsNeeded,
        }
      }
    }

    // 2. If requested room count is insufficient for this number of guests, find minimum valid room count >= minRoomsNeeded
    for (let r = minRoomsNeeded; r <= adults; r++) {
      const attempt = this.resolveAllocation({
        adultsCount: adults,
        childrenCount: children,
        requestedRooms: r,
        supportedOccupancies: params.supportedOccupancies,
      })
      if (attempt.valid && attempt.allocation) {
        return {
          valid: true,
          errors: [],
          allocation: attempt.allocation,
          autoAdjusted: r !== requested,
          suggestedRooms: r,
          minimumRequiredRooms: minRoomsNeeded,
          adjustmentReason:
            r !== requested
              ? `${adults} adults require at least ${r} rooms. We've updated your room selection for you.`
              : undefined,
        }
      }
    }

    // 3. Genuine impossible configuration - return clear, helpful recovery guidance
    return {
      valid: false,
      minimumRequiredRooms: minRoomsNeeded,
      errors: [
        'This accommodation cannot accommodate your group in the selected configuration.',
        'Try increasing the number of rooms, adjusting guest count, or selecting another departure date.',
      ],
    }
  }

  /**
   * Pure domain rule: Resolves customer headcount and requested room count into
   * a strict room allocation according to supported package occupancies.
   * Rejects impossible combinations without silent fallback or unauthorized room count overrides.
   */
  static resolveAllocation(params: {
    adultsCount: number
    childrenCount?: number
    requestedRooms?: number
    supportedOccupancies: OccupancyType[]
  }): RoomAllocationResult {
    const errors: string[] = []
    const adults = Math.max(0, params.adultsCount)
    const children = Math.max(0, params.childrenCount || 0)
    const supported = new Set(params.supportedOccupancies)

    if (adults < 1) {
      errors.push('At least one adult traveler is required to book a room.')
      return { valid: false, errors }
    }

    if (supported.size === 0) {
      errors.push('No supported room occupancy options configured for this package.')
      return { valid: false, errors }
    }

    const requestedRooms =
      params.requestedRooms && params.requestedRooms > 0
        ? params.requestedRooms
        : this.inferDefaultRoomCount(adults)

    // ─── Case 1: Single Room Requested ────────────────────────────────
    if (requestedRooms === 1) {
      if (adults === 1) {
        if (!supported.has('single')) {
          errors.push('Single occupancy is not supported by this package.')
          return { valid: false, errors }
        }
        return {
          valid: true,
          errors: [],
          allocation: [{ roomIndex: 1, occupancy: 'single', adults: 1, children }],
        }
      }

      if (adults === 2) {
        if (!supported.has('double')) {
          errors.push('Double occupancy is not supported by this package.')
          return { valid: false, errors }
        }
        return {
          valid: true,
          errors: [],
          allocation: [{ roomIndex: 1, occupancy: 'double', adults: 2, children }],
        }
      }

      if (adults === 3) {
        if (!supported.has('triple')) {
          errors.push('Triple occupancy is not supported. Cannot accommodate 3 adults in 1 room.')
          return { valid: false, errors }
        }
        return {
          valid: true,
          errors: [],
          allocation: [{ roomIndex: 1, occupancy: 'triple', adults: 3, children }],
        }
      }

      if (adults === 4) {
        if (!supported.has('quad')) {
          errors.push('Quad occupancy is not supported. Cannot accommodate 4 adults in 1 room.')
          return { valid: false, errors }
        }
        return {
          valid: true,
          errors: [],
          allocation: [{ roomIndex: 1, occupancy: 'quad', adults: 4, children }],
        }
      }

      errors.push(`Cannot accommodate ${adults} adults in 1 room.`)
      return { valid: false, errors }
    }

    // ─── Case 2: Multiple Rooms Requested ──────────────────────────────
    if (requestedRooms > adults) {
      errors.push(`Requested ${requestedRooms} rooms for ${adults} adult(s). Each room must have at least 1 adult.`)
      return { valid: false, errors }
    }

    const allocation: RoomAllocationItem[] = []
    let remainingAdults = adults
    let remainingChildren = children

    // Distribute adults across rooms prioritizing standard Double occupancy, then Triple/Single
    for (let r = 1; r <= requestedRooms; r++) {
      const roomsLeft = requestedRooms - r
      let adultsForThisRoom = Math.floor(remainingAdults / (roomsLeft + 1))

      // Adjust to ensure we don't leave subsequent rooms empty
      if (adultsForThisRoom < 1) adultsForThisRoom = 1
      if (remainingAdults - adultsForThisRoom < roomsLeft) {
        adultsForThisRoom = remainingAdults - roomsLeft
      }

      let occupancy: OccupancyType | null = null
      if (adultsForThisRoom === 1 && supported.has('single')) occupancy = 'single'
      else if (adultsForThisRoom === 2 && supported.has('double')) occupancy = 'double'
      else if (adultsForThisRoom === 3 && supported.has('triple')) occupancy = 'triple'
      else if (adultsForThisRoom === 4 && supported.has('quad')) occupancy = 'quad'

      if (!occupancy) {
        errors.push(`Cannot resolve a valid supported room occupancy for ${adultsForThisRoom} adult(s) in Room #${r}.`)
        return { valid: false, errors }
      }

      // Distribute children evenly across rooms (e.g. 1 per room, or up to remaining)
      const roomsLeftWithCurrent = requestedRooms - r + 1
      const childrenForThisRoom = Math.min(
        remainingChildren,
        Math.max(0, Math.ceil(remainingChildren / roomsLeftWithCurrent)),
      )
      remainingChildren -= childrenForThisRoom

      allocation.push({
        roomIndex: r,
        occupancy,
        adults: adultsForThisRoom,
        children: childrenForThisRoom,
      })

      remainingAdults -= adultsForThisRoom
    }

    if (remainingAdults !== 0) {
      errors.push(`Unable to cleanly allocate ${adults} adults across ${requestedRooms} requested rooms with current occupancy options.`)
      return { valid: false, errors }
    }

    return {
      valid: true,
      errors: [],
      allocation,
    }
  }

  private static inferDefaultRoomCount(adults: number): number {
    if (adults <= 2) return 1
    if (adults === 3) return 1 // Prefers Triple if supported, else caller must request 2
    if (adults === 4) return 2 // Prefers 2 Doubles
    return Math.ceil(adults / 2)
  }
}
