import type { CollectionAfterChangeHook } from 'payload'

/**
 * Slot instruction shape sent from the DepartureSlotsEditor component
 * via the virtual `_slotsPayload` field.
 */
interface NewSlotInstruction {
  date: string
  startTime?: string
  basePriceEGP?: number
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

  // ─── Create new slots ─────────────────────────────────────────────
  for (const slot of newSlots) {
    const capacityTotal = slot.capacityTotal ?? 20

    await req.payload.create({
      collection: 'departure-slots',
      data: {
        departureId: `DEP-${experienceId}-${slot.date}`,
        experience: experienceId,
        date: slot.date,
        startTime: slot.startTime || '09:00',
        basePriceEGP: slot.basePriceEGP ?? undefined,
        capacityTotal,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: capacityTotal,
        version: 1,
        status: 'available',
      },
      req, // ← SAME TRANSACTION — atomic with Experience save
    })
  }

  // ─── Cancel slots (never hard-delete) ─────────────────────────────
  for (const slotId of cancelledSlotIds) {
    // Check if slot has active bookings before cancelling
    const activeBookings = await req.payload.find({
      collection: 'bookings',
      where: {
        departureSlot: { equals: slotId },
        status: { in: ['paid', 'confirmed', 'pending'] },
      },
      limit: 1,
      depth: 0,
      req,
    })

    if (activeBookings.totalDocs > 0) {
      // This error causes the ENTIRE transaction to rollback
      // Experience save + all slot creates = all undone
      throw new Error(
        `Cannot cancel departure slot (ID: ${slotId}): ` +
        `${activeBookings.totalDocs} active booking(s) exist. ` +
        `Cancel or refund the bookings first.`
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
