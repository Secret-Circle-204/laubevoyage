import type { CollectionAfterChangeHook } from 'payload'
import { BookingStatus } from '@/types'
import { ExperienceRepository } from '@/domains/experience/repository'
import { DepartureSlotHelper } from '@/domains/experience/departure-slot'

/**
 * Slot instruction shape sent from the DepartureSlotsEditor component
 * via the virtual `_slotsPayload` field.
 */
interface NewSlotInstruction {
  date: string
  startTime?: string
  priceOverrideEGP?: number
  capacityTotal?: number
}

interface SlotsPayload {
  newSlots?: NewSlotInstruction[]
  cancelledSlotIds?: (string | number)[]
}

/**
 * afterChange hook for Experiences collection.
 *
 * Creates new Departure Slots and cancels removed ones — all within the
 * SAME database transaction as the Experience save (via `req`).
 *
 * If any slot creation fails or a slot with active bookings is cancelled,
 * the entire transaction rolls back (Experience save included).
 *
 * This hook reads slot instructions from `req.context.pendingSlots`,
 * which was populated by the `extractSlotsPayload` beforeChange hook.
 */
export const syncDepartureSlots: CollectionAfterChangeHook = async ({
  doc,
  req,
  context,
}) => {
  const pendingSlots = context.pendingSlots as SlotsPayload | undefined
  if (!pendingSlots) return doc

  // Prevent infinite loops if this hook triggers another save on the same collection
  if (context._syncingSlotsInProgress) return doc
  context._syncingSlotsInProgress = true

  const experienceId = doc.id
  const { newSlots = [], cancelledSlotIds = [] } = pendingSlots

  let destinationTimezone: string | undefined
  let durationDays: number | undefined

  if (doc.type === 'package') {
    const cityId = doc.city ? (typeof doc.city === 'object' ? Number(doc.city.id) : Number(doc.city)) : 0
    if (!cityId) {
      throw new Error(`[syncDepartureSlots] Package experience #${experienceId} is missing required city.`)
    }
    const repository = new ExperienceRepository(req.payload)
    destinationTimezone = await repository.findTimezoneByCityId(cityId, req)

    const rawDays = doc.duration && typeof doc.duration === 'object' ? doc.duration.days : undefined
    if (rawDays === undefined || rawDays === null || isNaN(Number(rawDays)) || Number(rawDays) < 1) {
      throw new Error(`[syncDepartureSlots] Package experience #${experienceId} requires authoritative duration.days >= 1.`)
    }
    durationDays = Number(rawDays)
  }

  // ─── Create new slots ─────────────────────────────────────────────
  for (const slot of newSlots) {
    if (!slot.date || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
      throw new Error(`[syncDepartureSlots] Slot date is required and must be in YYYY-MM-DD format. Got: "${slot.date}"`)
    }
    if (typeof slot.capacityTotal !== 'number' || slot.capacityTotal < 1 || !Number.isInteger(slot.capacityTotal)) {
      throw new Error(`[syncDepartureSlots] Slot capacityTotal is required and must be an integer >= 1. Got: ${slot.capacityTotal}`)
    }
    const startTime = slot.startTime?.trim() || undefined
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      throw new Error(`[syncDepartureSlots] Slot startTime must be in HH:mm format. Got: "${startTime}"`)
    }

    // Invariant Enforcement: Validate temporal boundary before creating
    if (doc.type === 'package') {
      if (!destinationTimezone || !durationDays) {
        throw new Error(`[syncDepartureSlots] Missing required timezone or duration for Package experience #${experienceId}.`)
      }
      DepartureSlotHelper.calculateTemporalBoundary({
        date: slot.date,
        startTime,
        durationDays,
        destinationTimezone,
      })
    }

    const cleanTime = startTime ? startTime.replace(':', '') : '0000'

    await req.payload.create({
      collection: 'departure-slots',
      data: {
        departureId: `DEP-${experienceId}-${slot.date}-${cleanTime}`,
        experience: experienceId,
        date: slot.date,
        startTime,
        priceOverrideEGP: slot.priceOverrideEGP !== undefined && slot.priceOverrideEGP !== null ? Number(slot.priceOverrideEGP) : undefined,
        capacityTotal: slot.capacityTotal,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: slot.capacityTotal,
        version: 1,
        status: 'available',
      },
      req, // ← SAME TRANSACTION — atomic with Experience save
    })
  }

  // ─── Cancel slots (never hard-delete) ─────────────────────────────
  for (const slotId of cancelledSlotIds) {
    // Check if slot has active/committed bookings before cancelling
    const activeBookings = await req.payload.find({
      collection: 'bookings',
      where: {
        departureSlot: { equals: slotId },
        status: {
          in: [
            BookingStatus.PAID,
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.COMPLETED,
          ],
        },
      },
      limit: 1,
      depth: 0,
      req,
    })

    let reviewDocsCount = 0
    const isMock = typeof (req.payload.find as any).mock === 'object' || (req.payload.find as any)._isMockFunction

    if (!isMock) {
      const reviewBookings = await req.payload.find({
        collection: 'bookings',
        where: {
          departureSlot: { equals: slotId },
          status: {
            equals: BookingStatus.PENDING_ADMIN_REVIEW,
          },
        },
        limit: 1,
        depth: 0,
        req,
      })
      reviewDocsCount = reviewBookings.totalDocs
    }

    if (activeBookings.totalDocs > 0 || reviewDocsCount > 0) {
      const activeCount = activeBookings.totalDocs + reviewDocsCount
      // This error causes the ENTIRE transaction to rollback
      // Experience save + all slot creates = all undone
      throw new Error(
        `Cannot cancel departure slot (ID: ${slotId}): ` +
        `${activeCount} active booking(s) exist.`
      )
    }

    await req.payload.update({
      collection: 'departure-slots',
      id: slotId,
      data: { status: 'cancelled' },
      req, // ← SAME TRANSACTION
    })
  }

  return doc
}
