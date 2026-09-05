import type { DepartureSlotEntity, DepartureSlotStatus, ExperienceType } from './types'
import { AvailabilityPolicy } from './availability-policy'
import { ExperiencePolicy } from './policy'
import { convertZonedLocalToUtc, resolveTripCompletionInstant } from '@/domains/booking/trip-completion-resolver'
import { addDaysToDateString } from '@/lib/date'

export type DepartureSlotLifecycleStatus = 'upcoming' | 'started' | 'completed' | 'cancelled'

export interface DepartureSlotLifecycleResult {
  departureStartUtc: Date
  departureEndUtc: Date
  lifecycleStatus: DepartureSlotLifecycleStatus
  isBookable: boolean
}

/**
 * Departure Slot Entity Utilities & Domain Lifecycle Invariants
 * Single source of truth for slot creation, capacity validation, and optimistic concurrency checks.
 */
export class DepartureSlotHelper {
  /**
   * Validate and construct a clean new DepartureSlotEntity.
   * Throws explicit Fail-Fast domain errors if invariants are violated.
   */
  static createSlot(
    departureId: string,
    experienceId: number,
    date: string,
    capacityTotal: number,
    startTime?: string,
    priceOverrideEGP?: number,
    status: DepartureSlotStatus = 'available',
  ): DepartureSlotEntity {
    if (!departureId || !departureId.trim()) {
      throw new Error('[DepartureSlotHelper] departureId is required and cannot be empty.')
    }
    if (!experienceId || experienceId <= 0) {
      throw new Error(`[DepartureSlotHelper] Invalid experienceId: ${experienceId}. Must be positive integer.`)
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`[DepartureSlotHelper] Invalid slot date: "${date}". Must be in YYYY-MM-DD format.`)
    }
    if (typeof capacityTotal !== 'number' || capacityTotal < 1 || !Number.isInteger(capacityTotal)) {
      throw new Error(`[DepartureSlotHelper] Invalid capacityTotal: ${capacityTotal}. Must be an integer >= 1.`)
    }
    if (priceOverrideEGP !== undefined && priceOverrideEGP !== null) {
      if (typeof priceOverrideEGP !== 'number' || priceOverrideEGP < 0) {
        throw new Error(`[DepartureSlotHelper] Invalid priceOverrideEGP: ${priceOverrideEGP}. Must be >= 0.`)
      }
    }
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      throw new Error(`[DepartureSlotHelper] Invalid startTime: "${startTime}". Must be in HH:mm format.`)
    }

    return {
      departureId,
      experienceId,
      date,
      startTime: startTime || undefined,
      priceOverrideEGP: priceOverrideEGP !== undefined ? priceOverrideEGP : undefined,
      capacityTotal,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: capacityTotal,
      version: 1,
      status,
    }
  }

  /**
   * Calculates available capacity based on the invariant:
   * capacityAvailable = max(0, capacityTotal - capacityReserved - capacitySold)
   */
  static calculateAvailableCapacity(slot: DepartureSlotEntity): number {
    return Math.max(0, slot.capacityTotal - slot.capacityReserved - slot.capacitySold)
  }

  /**
   * Determines current status from capacity unless manually blacked_out or cancelled.
   */
  static determineStatus(slot: DepartureSlotEntity): DepartureSlotStatus {
    if (slot.status === 'blacked_out' || slot.status === 'cancelled') return slot.status
    const available = this.calculateAvailableCapacity(slot)
    if (available <= 0) return 'sold_out'
    return 'available'
  }

  /**
   * Validates an update request against current state invariants and optimistic concurrency.
   * Throws explicit Fail-Fast domain errors if invalid.
   */
  static validateUpdate(
    current: DepartureSlotEntity,
    update: {
      date?: string
      startTime?: string
      priceOverrideEGP?: number | null
      capacityTotal?: number
      status?: DepartureSlotStatus
      version: number
    },
  ): void {
    // 1. Optimistic Concurrency Invariant
    if (update.version === undefined || update.version === null) {
      throw new Error('[DepartureSlotHelper] Optimistic concurrency version is required for slot update.')
    }
    if (update.version !== current.version) {
      throw new Error(
        `[DepartureSlotHelper] Concurrency conflict: Slot #${current.id} has version ${current.version}, but update request provided version ${update.version}. Please refresh and retry.`,
      )
    }

    // 2. Date Invariant
    if (update.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(update.date)) {
      throw new Error(`[DepartureSlotHelper] Invalid update date: "${update.date}". Must be in YYYY-MM-DD format.`)
    }

    // 3. Capacity Total Invariant
    if (update.capacityTotal !== undefined) {
      if (typeof update.capacityTotal !== 'number' || update.capacityTotal < 1 || !Number.isInteger(update.capacityTotal)) {
        throw new Error(`[DepartureSlotHelper] Invalid capacityTotal: ${update.capacityTotal}. Must be an integer >= 1.`)
      }
      const minimumRequiredCapacity = current.capacityReserved + current.capacitySold
      if (update.capacityTotal < minimumRequiredCapacity) {
        throw new Error(
          `[DepartureSlotHelper] Cannot reduce capacityTotal (${update.capacityTotal}) below currently reserved (${current.capacityReserved}) + sold (${current.capacitySold}) seats (${minimumRequiredCapacity}).`,
        )
      }
    }

    // 4. Status Transition Invariant
    if (update.status !== undefined && update.status !== current.status) {
      if (update.status === 'cancelled') {
        if (current.capacitySold > 0) {
          throw new Error(
            `[DepartureSlotHelper] Cannot cancel departure slot with ${current.capacitySold} sold tickets.`,
          )
        }
        const cancelPolicy = AvailabilityPolicy.canCancelDeparture(current)
        if (!cancelPolicy.allowed) {
          throw new Error(`[DepartureSlotHelper] Cannot transition slot to cancelled: ${cancelPolicy.reason}`)
        }
      }
    }


    // 5. Price Override Invariant
    if (update.priceOverrideEGP !== undefined && update.priceOverrideEGP !== null) {
      if (typeof update.priceOverrideEGP !== 'number' || update.priceOverrideEGP < 0) {
        throw new Error(`[DepartureSlotHelper] Invalid priceOverrideEGP: ${update.priceOverrideEGP}. Must be >= 0.`)
      }
    }
  }

  /**
   * Resolves the effective price in EGP for a slot.
   */
  static calculateEffectivePrice(slot: DepartureSlotEntity, baseExperiencePrice: number): number {
    if (slot.priceOverrideEGP !== undefined && slot.priceOverrideEGP !== null) {
      return slot.priceOverrideEGP
    }
    return baseExperiencePrice
  }

  /**
   * Authoritative calculation and validation of Departure Slot temporal boundaries.
   * Single Source of Truth for computing start & end UTC instants and enforcing temporal invariant.
   */
  static calculateTemporalBoundary(params: {
    date: string
    startTime?: string
    durationDays: number
    destinationTimezone: string
  }): { departureStartUtc: Date; departureEndUtc: Date } {
    const { date, startTime, durationDays, destinationTimezone } = params

    if (!destinationTimezone || typeof destinationTimezone !== 'string' || destinationTimezone.trim().length === 0) {
      throw new Error('[DepartureSlotHelper] Missing authoritative destinationTimezone.')
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`[DepartureSlotHelper] Departure slot is missing authoritative date in YYYY-MM-DD format.`)
    }
    if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      throw new Error(
        `[DepartureSlotHelper] Departure slot is missing or has invalid startTime: "${startTime}". Expected HH:mm format.`,
      )
    }
    if (!durationDays || typeof durationDays !== 'number' || durationDays < 1) {
      throw new Error(`[DepartureSlotHelper] Package Experience is missing authoritative durationDays >= 1.`)
    }

    // 1. Calculate Authoritative Start Instant in UTC
    const departureStartUtc = convertZonedLocalToUtc(date, startTime, destinationTimezone)

    // 2. Calculate Authoritative End Instant in UTC via TripCompletionResolver SSOT
    const endDate = addDaysToDateString(date, durationDays - 1)
    const departureEndUtc = resolveTripCompletionInstant({
      type: 'package',
      startDate: date,
      endDate,
      timezone: destinationTimezone,
    })

    // 3. Validate Temporal Boundary Invariant (Fail-Fast)
    if (departureEndUtc.getTime() <= departureStartUtc.getTime()) {
      throw new Error(
        `[DepartureSlotHelper] Temporal invariant violation: departureEndUtc (${departureEndUtc.toISOString()}) must be strictly after departureStartUtc (${departureStartUtc.toISOString()}). For single-day packages, startTime must precede 12:00 local checkout time.`,
      )
    }

    return { departureStartUtc, departureEndUtc }
  }

  /**
   * Resolves the authoritative lifecycle state and bookability for a departure slot.
   * Pure Domain Operation. Single Source of Truth for slot temporal status.
   */
  static resolveLifecycle(
    slot: DepartureSlotEntity,
    experience: { id: number; type: ExperienceType; packageMode?: string; durationDays?: number },
    destinationTimezone: string,
    nowUtc: Date,
  ): DepartureSlotLifecycleResult {
    if (!destinationTimezone || typeof destinationTimezone !== 'string' || destinationTimezone.trim().length === 0) {
      throw new Error(`[DepartureSlotHelper] Missing authoritative destinationTimezone for Experience #${experience.id}.`)
    }
    if (experience.type !== 'package') {
      throw new Error(
        `[DepartureSlotHelper] Departure slots are strictly supported for package experiences. Received: "${experience.type}".`,
      )
    }
    if (experience.packageMode && experience.packageMode !== 'fixed_date') {
      throw new Error(
        `[DepartureSlotHelper] Departure slots require packageMode="fixed_date". Received: "${experience.packageMode}".`,
      )
    }
    if (!experience.durationDays || typeof experience.durationDays !== 'number' || experience.durationDays < 1) {
      throw new Error(
        `[DepartureSlotHelper] Package Experience #${experience.id} is missing authoritative durationDays >= 1.`,
      )
    }

    // 1. Calculate and validate authoritative temporal boundaries via SSOT
    const { departureStartUtc, departureEndUtc } = this.calculateTemporalBoundary({
      date: slot.date,
      startTime: slot.startTime,
      durationDays: experience.durationDays,
      destinationTimezone,
    })

    // 2. Determine Authoritative Lifecycle Status
    let lifecycleStatus: DepartureSlotLifecycleStatus
    if (slot.status === 'cancelled') {
      lifecycleStatus = 'cancelled'
    } else if (nowUtc.getTime() < departureStartUtc.getTime()) {
      lifecycleStatus = 'upcoming'
    } else if (nowUtc.getTime() >= departureStartUtc.getTime() && nowUtc.getTime() < departureEndUtc.getTime()) {
      lifecycleStatus = 'started'
    } else {
      lifecycleStatus = 'completed'
    }

    // 3. Delegate Bookability to ExperiencePolicy SSOT
    const bookabilityCheck = ExperiencePolicy.isFixedPackageSlotBookable(
      {
        date: slot.date,
        startTime: slot.startTime,
        slotStatus: slot.status,
        capacityAvailable: slot.capacityAvailable,
        timezone: destinationTimezone,
      },
      nowUtc,
    )

    return {
      departureStartUtc,
      departureEndUtc,
      lifecycleStatus,
      isBookable: bookabilityCheck.allowed,
    }
  }
}

