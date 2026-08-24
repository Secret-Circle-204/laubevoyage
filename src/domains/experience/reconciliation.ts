import type { Payload } from 'payload'
import type { RequestContext } from '@/types'
import type { ExperienceRepository } from './repository'
import type { DepartureSlotEntity } from './types'

export interface ContributingBookingDTO {
  bookingNumber: string
  bookingId: number
  status: string
  seats: number
  customerId: number
}

export interface ActiveHoldDTO {
  holdId: string
  bookingId: number
  seats: number
  expiresAt: string
}

export interface SlotAuditReport {
  slotId: number
  departureId: string
  experienceId: number
  date: string
  capacityTotal: number

  // Stored in Database
  storedReserved: number
  storedSold: number
  storedAvailable: number

  // Calculated Ground Truth (from Bookings & Active Holds)
  expectedSold: number
  expectedReserved: number
  expectedAvailable: number

  // Invariants & Drift
  level1InvariantPassed: boolean // Total === storedReserved + storedSold + storedAvailable
  level2SourceConsistent: boolean // storedSold === expectedSold && storedReserved === expectedReserved
  driftSold: number // storedSold - expectedSold
  driftReserved: number // storedReserved - expectedReserved
  driftAvailable: number // storedAvailable - expectedAvailable

  // Details
  contributingBookings: ContributingBookingDTO[]
  activeHolds: ActiveHoldDTO[]
}

export interface SlotReconciliationResult {
  slotId: number
  departureId: string
  reconciled: boolean
  auditBefore: SlotAuditReport
  auditAfter: SlotAuditReport
  previousVersion: number
  nextVersion: number
}

export interface SystemAuditReport {
  totalSlotsAudited: number
  slotsWithDrift: number
  slotsPassingAllInvariants: number
  reports: SlotAuditReport[]
}

export interface SystemReconciliationResult {
  totalSlotsAudited: number
  slotsReconciled: number
  slotsAlreadyClean: number
  results: SlotReconciliationResult[]
}

/**
 * Inventory Reconciliation Service
 * Strict, deterministic two-phase Audit & Reconcile engine.
 * Guarantees SSOT mathematical integrity between Bookings, Holds, and Departure Slots.
 */
export class InventoryReconciliationService {
  private payload: Payload
  private repository: ExperienceRepository

  constructor(payload: Payload, repository: ExperienceRepository) {
    this.payload = payload
    this.repository = repository
  }

  /**
   * Phase 1: Pure Read-Only Audit of a Departure Slot against underlying Bookings and Holds.
   */
  async auditSlot(slotId: number, context?: RequestContext): Promise<SlotAuditReport> {
    const slot = await this.repository.getDepartureSlotById(slotId, context)
    if (!slot) {
      throw new Error(`[InventoryReconciliationService] Departure slot #${slotId} not found.`)
    }

    const slotDateStr = new Date(slot.date).toISOString().split('T')[0]

    // Fetch all bookings attached directly to this slot, or matching experienceId + departureId/date
    const linkedBookingsRes = await this.payload.find({
      collection: 'bookings',
      where: {
        or: [
          { departureSlot: { equals: slot.id } },
          {
            and: [
              { experience: { equals: slot.experienceId } },
              { 'capacityHold.departureId': { equals: slot.departureId } },
            ],
          },
        ],
      },
      limit: 500,
      depth: 0,
    })

    const contributingBookings: ContributingBookingDTO[] = []
    const activeHolds: ActiveHoldDTO[] = []

    let expectedSold = 0
    let expectedReserved = 0

    const now = new Date()

    for (const b of linkedBookingsRes.docs as any[]) {
      const seatsCount = typeof b.capacityHold?.seats === 'number'
        ? b.capacityHold.seats
        : (Array.isArray(b.travelers) && b.travelers.length > 0 ? b.travelers.length : 1)

      const custId = typeof b.customer === 'object' && b.customer !== null ? Number(b.customer.id) : Number(b.customer || 0)

      // Rule: PAID, CONFIRMED, COMPLETED statuses contribute to Sold
      if (b.status === 'paid' || b.status === 'confirmed' || b.status === 'completed') {
        expectedSold += seatsCount
        contributingBookings.push({
          bookingNumber: b.bookingNumber,
          bookingId: Number(b.id),
          status: b.status,
          seats: seatsCount,
          customerId: custId,
        })
      }

      // Rule: DRAFT, PENDING_PAYMENT, or PENDING_ADMIN_REVIEW with unexpired active hold contribute to Reserved
      if (b.status === 'draft' || b.status === 'pending_payment' || b.status === 'pending_admin_review') {
        const hold = b.capacityHold
        if (hold && hold.status === 'active' && hold.expiresAt) {
          const expiresAtDate = new Date(hold.expiresAt)
          if (expiresAtDate > now) {
            expectedReserved += seatsCount
            activeHolds.push({
              holdId: hold.holdId || `hold_${b.id}`,
              bookingId: Number(b.id),
              seats: seatsCount,
              expiresAt: hold.expiresAt,
            })
          }
        }
      }
    }

    const expectedAvailable = Math.max(0, slot.capacityTotal - expectedReserved - expectedSold)

    const level1InvariantPassed =
      slot.capacityTotal === slot.capacityReserved + slot.capacitySold + slot.capacityAvailable

    const level2SourceConsistent =
      slot.capacitySold === expectedSold && slot.capacityReserved === expectedReserved

    const driftSold = slot.capacitySold - expectedSold
    const driftReserved = slot.capacityReserved - expectedReserved
    const driftAvailable = slot.capacityAvailable - expectedAvailable

    return {
      slotId: typeof slot.id === 'number' ? slot.id : slotId,
      departureId: slot.departureId,
      experienceId: slot.experienceId,
      date: slotDateStr,
      capacityTotal: slot.capacityTotal,
      storedReserved: slot.capacityReserved,
      storedSold: slot.capacitySold,
      storedAvailable: slot.capacityAvailable,
      expectedSold,
      expectedReserved,
      expectedAvailable,
      level1InvariantPassed,
      level2SourceConsistent,
      driftSold,
      driftReserved,
      driftAvailable,
      contributingBookings,
      activeHolds,
    }
  }

  /**
   * Phase 1 (Bulk): Audit all departure slots in the database.
   */
  async auditAllSlots(context?: RequestContext): Promise<SystemAuditReport> {
    const slotsRes = await this.payload.find({
      collection: 'departure-slots',
      limit: 1000,
      depth: 0,
    })

    const reports: SlotAuditReport[] = []
    let slotsWithDrift = 0
    let slotsPassingAllInvariants = 0

    for (const slotDoc of slotsRes.docs as any[]) {
      const report = await this.auditSlot(Number(slotDoc.id), context)
      reports.push(report)

      if (!report.level1InvariantPassed || !report.level2SourceConsistent) {
        slotsWithDrift += 1
      } else {
        slotsPassingAllInvariants += 1
      }
    }

    return {
      totalSlotsAudited: reports.length,
      slotsWithDrift,
      slotsPassingAllInvariants,
      reports,
    }
  }

  /**
   * Phase 2: Transactional Self-Healing Reconciliation of a single slot.
   */
  async reconcileSlot(slotId: number, context?: RequestContext): Promise<SlotReconciliationResult> {
    const auditBefore = await this.auditSlot(slotId, context)

    // If already 100% consistent, no-op deterministic return
    if (auditBefore.level1InvariantPassed && auditBefore.level2SourceConsistent) {
      return {
        slotId,
        departureId: auditBefore.departureId,
        reconciled: false,
        auditBefore,
        auditAfter: auditBefore,
        previousVersion: 0,
        nextVersion: 0,
      }
    }

    const slot = await this.repository.getDepartureSlotById(slotId, context)
    if (!slot) {
      throw new Error(`[InventoryReconciliationService] Slot #${slotId} disappeared during reconciliation.`)
    }

    const updatedSlot: DepartureSlotEntity = {
      ...slot,
      capacityReserved: auditBefore.expectedReserved,
      capacitySold: auditBefore.expectedSold,
      capacityAvailable: auditBefore.expectedAvailable,
    }

    const savedSlot = await this.repository.saveDepartureSlot(updatedSlot, context)

    const auditAfter = await this.auditSlot(slotId, context)

    if (!auditAfter.level1InvariantPassed || !auditAfter.level2SourceConsistent) {
      throw new Error(
        `[InventoryReconciliationService] Reconciliation failed to converge for slot #${slotId}. Drifts persist after write.`
      )
    }

    return {
      slotId,
      departureId: slot.departureId,
      reconciled: true,
      auditBefore,
      auditAfter,
      previousVersion: slot.version,
      nextVersion: savedSlot.version,
    }
  }

  /**
   * Phase 2 (Bulk): Transactional Self-Healing Reconciliation across all departure slots.
   */
  async reconcileAllSlots(context?: RequestContext): Promise<SystemReconciliationResult> {
    const audit = await this.auditAllSlots(context)
    const results: SlotReconciliationResult[] = []

    let slotsReconciled = 0
    let slotsAlreadyClean = 0

    for (const report of audit.reports) {
      const res = await this.reconcileSlot(report.slotId, context)
      results.push(res)

      if (res.reconciled) {
        slotsReconciled += 1
      } else {
        slotsAlreadyClean += 1
      }
    }

    return {
      totalSlotsAudited: audit.totalSlotsAudited,
      slotsReconciled,
      slotsAlreadyClean,
      results,
    }
  }
}
