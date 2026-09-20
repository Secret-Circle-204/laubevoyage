import type { OccupancyType } from './types'
export type { OccupancyType }

export interface RoomAllocationItem {
  roomIndex: number
  occupancy: OccupancyType
  adults: number
  children: number
}

export interface RoomAllocationOption {
  id: string
  roomCount: number
  rooms: RoomAllocationItem[]
  isRecommended?: boolean
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

  /**
   * Generates all mathematically valid and policy-compliant room arrangements
   * for the given headcount and supported occupancies.
   * Pure combinatorial generator with deterministic canonical IDs.
   */
  static getValidAllocationOptions(params: {
    adultsCount: number
    childrenCount?: number
    supportedOccupancies: OccupancyType[]
  }): RoomAllocationOption[] {
    const adults = Math.max(0, params.adultsCount)
    const children = Math.max(0, params.childrenCount || 0)
    const supported = new Set(params.supportedOccupancies || [])

    if (adults < 1 || supported.size === 0) {
      return []
    }

    const maxCapacityMap: Record<OccupancyType, number> = {
      quad: 4,
      triple: 3,
      double: 2,
      single: 1,
    }

    // Available occupancy capacities in descending order
    const availableCapacities = (['quad', 'triple', 'double', 'single'] as OccupancyType[])
      .filter((occ) => supported.has(occ))
      .map((occ) => ({ occupancy: occ, capacity: maxCapacityMap[occ] }))

    if (availableCapacities.length === 0) {
      return []
    }

    const minRooms = this.calculateMinimumRequiredRooms({
      adultsCount: adults,
      childrenCount: children,
      supportedOccupancies: params.supportedOccupancies,
    })

    const rawPartitions: OccupancyType[][] = []

    // Helper to find combinations of room occupancies that can accommodate total headcount
    function findPartitions(
      currentRooms: OccupancyType[],
      currentCapacity: number,
      startIndex: number,
    ) {
      if (currentRooms.length > adults) {
        return
      }

      if (currentCapacity >= adults + children) {
        if (currentRooms.length >= minRooms && currentRooms.length <= adults) {
          rawPartitions.push([...currentRooms])
        }
        // Don't add unnecessary extra rooms beyond what's needed for this branch
        return
      }

      for (let i = startIndex; i < availableCapacities.length; i++) {
        const { occupancy, capacity } = availableCapacities[i]
        currentRooms.push(occupancy)
        findPartitions(currentRooms, currentCapacity + capacity, i)
        currentRooms.pop()
      }
    }

    findPartitions([], 0, 0)

    const optionsMap = new Map<string, RoomAllocationOption>()

    for (const partition of rawPartitions) {
      const roomCount = partition.length

      // Check minimum rooms and adult availability
      if (roomCount < minRooms || roomCount > adults) {
        continue
      }

      // Step 1: Initialize 1 base adult per room
      const a = partition.map(() => 1)
      const c = partition.map(() => 0)
      let remAdults = adults - roomCount
      let remChildren = children

      // Step 2: Distribute children into rooms respecting per-occupancy child limits and capacity
      for (let idx = 0; idx < partition.length; idx++) {
        if (remChildren <= 0) break
        const occ = partition[idx]
        const cap = maxCapacityMap[occ]
        const maxChildAllowed = occ === 'quad' ? 2 : 1
        const childCapacity = Math.min(cap - a[idx], maxChildAllowed)
        if (childCapacity > 0) {
          const take = Math.min(remChildren, childCapacity)
          c[idx] = take
          remChildren -= take
        }
      }

      if (remChildren > 0) {
        // Cannot cleanly fit all children in this partition
        continue
      }

      // Step 3: Distribute remaining adults into spare capacities
      for (let idx = 0; idx < partition.length; idx++) {
        if (remAdults <= 0) break
        const occ = partition[idx]
        const cap = maxCapacityMap[occ]
        const spareCapacity = cap - a[idx] - c[idx]
        if (spareCapacity > 0) {
          const take = Math.min(remAdults, spareCapacity)
          a[idx] += take
          remAdults -= take
        }
      }

      if (remAdults > 0) {
        // Cannot cleanly fit all adults in this partition
        continue
      }

      const rooms: RoomAllocationItem[] = partition.map((occ, idx) => ({
        roomIndex: idx + 1,
        occupancy: occ,
        adults: a[idx],
        children: c[idx],
      }))

      // Validate with domain validator
      const validation = this.validateCustomAllocation({
        allocation: rooms,
        adultsCount: adults,
        childrenCount: children,
        supportedOccupancies: params.supportedOccupancies,
      })

      if (!validation.valid || !validation.allocation) {
        continue
      }

      // Generate canonical ID: count occurrences of each occupancy in fixed order
      const counts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
      partition.forEach((occ) => {
        counts[occ] += 1
      })

      const idParts: string[] = []
      if (counts.quad > 0) idParts.push(`${counts.quad}xquad`)
      if (counts.triple > 0) idParts.push(`${counts.triple}xtriple`)
      if (counts.double > 0) idParts.push(`${counts.double}xdouble`)
      if (counts.single > 0) idParts.push(`${counts.single}xsingle`)
      const canonicalId = idParts.join('+')

      if (!optionsMap.has(canonicalId)) {
        optionsMap.set(canonicalId, {
          id: canonicalId,
          roomCount,
          rooms: validation.allocation,
        })
      }
    }

    let recommendedId: string | null = null

    // Also include default smart allocation if valid and not already present
    const smartResult = this.resolveSmartAllocation({
      adultsCount: adults,
      childrenCount: children,
      supportedOccupancies: params.supportedOccupancies,
    })

    if (smartResult.valid && smartResult.allocation && smartResult.allocation.length > 0) {
      const smartValidation = this.validateCustomAllocation({
        allocation: smartResult.allocation,
        adultsCount: adults,
        childrenCount: children,
        supportedOccupancies: params.supportedOccupancies,
      })

      if (smartValidation.valid && smartValidation.allocation) {
        const smartCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
        smartValidation.allocation.forEach((r) => {
          smartCounts[r.occupancy] = (smartCounts[r.occupancy] || 0) + 1
        })
        const smartIdParts: string[] = []
        if (smartCounts.quad > 0) smartIdParts.push(`${smartCounts.quad}xquad`)
        if (smartCounts.triple > 0) smartIdParts.push(`${smartCounts.triple}xtriple`)
        if (smartCounts.double > 0) smartIdParts.push(`${smartCounts.double}xdouble`)
        if (smartCounts.single > 0) smartIdParts.push(`${smartCounts.single}xsingle`)
        recommendedId = smartIdParts.join('+')

        if (!optionsMap.has(recommendedId)) {
          optionsMap.set(recommendedId, {
            id: recommendedId,
            roomCount: smartValidation.allocation.length,
            rooms: smartValidation.allocation,
          })
        }
      }
    }

    const allOptions = Array.from(optionsMap.values()).map((opt) => ({
      ...opt,
      isRecommended: recommendedId ? opt.id === recommendedId : false,
    }))

    // If no option was matched as recommended, mark the first by roomCount as recommended
    if (allOptions.length > 0 && !allOptions.some((o) => o.isRecommended)) {
      allOptions[0].isRecommended = true
    }

    // Sort options: isRecommended first (index 0), then ascending roomCount, then deterministic canonical ID
    return allOptions.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      const byRoomCount = a.roomCount - b.roomCount
      return byRoomCount !== 0 ? byRoomCount : a.id.localeCompare(b.id)
    })
  }

  /**
   * Helper to retrieve the authoritative recommended room allocation option.
   */
  static getRecommendedAllocationOption(
    options: RoomAllocationOption[],
  ): RoomAllocationOption | undefined {
    if (!options || options.length === 0) return undefined
    return options.find((opt) => opt.isRecommended) || options[0]
  }

  /**
   * Pure domain rule: Strictly validates a user-selected custom room allocation.
   * Checks room count, adult headcount, child headcount, room capacity constraints,
   * and supported hotel stay occupancies.
   */
  static validateCustomAllocation(params: {
    allocation: RoomAllocationItem[]
    adultsCount: number
    childrenCount?: number
    supportedOccupancies: OccupancyType[]
  }): RoomAllocationResult {
    const errors: string[] = []

    if (!Array.isArray(params.allocation) || params.allocation.length === 0) {
      errors.push('Room allocation cannot be empty.')
      return { valid: false, errors }
    }

    const adults = Math.max(0, params.adultsCount)
    const children = Math.max(0, params.childrenCount || 0)
    const supported = new Set(params.supportedOccupancies || [])

    if (adults < 1) {
      errors.push('At least one adult traveler is required to book a journey.')
      return { valid: false, errors }
    }

    if (supported.size === 0) {
      errors.push('No supported room occupancy options configured for this package.')
      return { valid: false, errors }
    }

    if (params.allocation.length > adults) {
      errors.push(
        `Cannot allocate ${params.allocation.length} rooms for ${adults} adult(s). Each room must contain at least 1 adult.`,
      )
      return { valid: false, errors }
    }

    const maxCapacityMap: Record<OccupancyType, number> = {
      quad: 4,
      triple: 3,
      double: 2,
      single: 1,
    }

    let totalAllocatedAdults = 0
    let totalAllocatedChildren = 0
    const normalizedAllocation: RoomAllocationItem[] = []

    for (let i = 0; i < params.allocation.length; i++) {
      const room = params.allocation[i]
      const roomNumber = i + 1

      if (!room || typeof room !== 'object') {
        errors.push(`Room #${roomNumber} is invalid or malformed.`)
        continue
      }

      if (!room.occupancy || typeof room.occupancy !== 'string' || !(room.occupancy in maxCapacityMap)) {
        errors.push(`Room #${roomNumber} has invalid occupancy "${room.occupancy}".`)
        continue
      }

      if (!supported.has(room.occupancy)) {
        errors.push(
          `Room #${roomNumber} has unsupported occupancy "${room.occupancy}" for this package.`,
        )
      }

      const rawAdults = room.adults
      const roomAdults =
        typeof rawAdults === 'number' && Number.isInteger(rawAdults)
          ? rawAdults
          : typeof rawAdults === 'string' && /^\d+$/.test(rawAdults)
            ? parseInt(rawAdults, 10)
            : NaN

      if (isNaN(roomAdults) || roomAdults < 1) {
        errors.push(`Room #${roomNumber} must contain at least 1 adult traveler.`)
      }

      const rawChildren = room.children ?? 0
      const roomChildren =
        typeof rawChildren === 'number' && Number.isInteger(rawChildren)
          ? rawChildren
          : typeof rawChildren === 'string' && /^\d+$/.test(rawChildren)
            ? parseInt(rawChildren, 10)
            : NaN

      if (isNaN(roomChildren) || roomChildren < 0) {
        errors.push(`Room #${roomNumber} has invalid children count.`)
      }

      const maxCapacity = maxCapacityMap[room.occupancy]

      if (!isNaN(roomAdults) && roomAdults > maxCapacity) {
        errors.push(
          `Room #${roomNumber} (${room.occupancy}) cannot accommodate ${roomAdults} adults (maximum ${maxCapacity}).`,
        )
      }

      // Total guest capacity check (adults + children must NOT exceed room capacity)
      if (!isNaN(roomAdults) && !isNaN(roomChildren) && roomAdults + roomChildren > maxCapacity) {
        errors.push(
          `Room #${roomNumber} (${room.occupancy}) exceeds total maximum capacity of ${maxCapacity} guests.`,
        )
      }

      // Child-specific room policies
      if (!isNaN(roomChildren)) {
        if (room.occupancy !== 'quad' && roomChildren > 1) {
          errors.push(
            `Room #${roomNumber} (${room.occupancy}) cannot accommodate more than 1 child.`,
          )
        } else if (room.occupancy === 'quad' && roomChildren > 2) {
          errors.push(
            `Room #${roomNumber} (quad) cannot accommodate more than 2 children.`,
          )
        }
      }

      if (!isNaN(roomAdults)) {
        totalAllocatedAdults += roomAdults
      }
      if (!isNaN(roomChildren)) {
        totalAllocatedChildren += roomChildren
      }

      normalizedAllocation.push({
        roomIndex: roomNumber,
        occupancy: room.occupancy,
        adults: isNaN(roomAdults) ? 1 : roomAdults,
        children: isNaN(roomChildren) ? 0 : roomChildren,
      })
    }

    if (totalAllocatedAdults !== adults) {
      errors.push(
        `Total adults across rooms (${totalAllocatedAdults}) does not match requested adults count (${adults}).`,
      )
    }

    if (totalAllocatedChildren !== children) {
      errors.push(
        `Total children across rooms (${totalAllocatedChildren}) does not match requested children count (${children}).`,
      )
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return {
      valid: true,
      errors: [],
      allocation: normalizedAllocation,
    }
  }
}
