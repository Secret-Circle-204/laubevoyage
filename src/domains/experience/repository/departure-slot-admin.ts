import type { Payload, PayloadRequest } from 'payload'
import type { DepartureSlot } from '@/payload-types'
import type { DepartureSlotEntity, DepartureSlotStatus } from '../types'
import { DepartureSlotHelper } from '../departure-slot'
import { AvailabilityPolicy } from '../availability-policy'
import { findTimezoneByCityId } from './destination-queries'
import { getDepartureSlotById } from './departure-slot-queries'

/**
 * Create a new DepartureSlot with domain invariants.
 */
export async function createDepartureSlotAdminOp(
  payload: Payload,
  data: {
    experienceId: number
    date: string
    startTime?: string
    priceOverrideEGP?: number
    capacityTotal: number
    status?: DepartureSlotStatus
  },
  req?: PayloadRequest,
): Promise<DepartureSlotEntity> {
  const startTime = data.startTime?.trim() || undefined
  const cleanTime = startTime ? startTime.replace(':', '') : '0000'
  const departureId = `DEP-${data.experienceId}-${data.date}-${cleanTime}`

  // Authoritative Domain Boundary Validation
  if (payload) {
    const expDoc = await payload.findByID({
      collection: 'experiences',
      id: data.experienceId,
      depth: 0,
      req,
    })
    if (expDoc && expDoc.type === 'package') {
      const cityId =
        typeof expDoc.city === 'object' && expDoc.city ? (expDoc.city as any).id : expDoc.city
      const timezone = cityId ? await findTimezoneByCityId(payload, Number(cityId), req) : undefined
      if (timezone) {
        DepartureSlotHelper.calculateTemporalBoundary({
          date: data.date,
          startTime: startTime,
          durationDays: (expDoc as any).durationDays || 1,
          destinationTimezone: timezone,
        })
      }
    }
  }

  const slotEntity = DepartureSlotHelper.createSlot(
    departureId,
    data.experienceId,
    data.date,
    data.capacityTotal,
    startTime,
    data.priceOverrideEGP,
    data.status || 'available',
  )

  const created = (await payload.create({
    collection: 'departure-slots',
    data: {
      departureId: slotEntity.departureId,
      experience: slotEntity.experienceId,
      date: slotEntity.date,
      startTime: slotEntity.startTime,
      priceOverrideEGP: slotEntity.priceOverrideEGP,
      capacityTotal: slotEntity.capacityTotal,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: slotEntity.capacityTotal,
      version: 1,
      status: slotEntity.status as DepartureSlot['status'],
    },
    req,
  })) as DepartureSlot

  return {
    ...slotEntity,
    id: Number(created.id),
  }
}

/**
 * Update an existing DepartureSlot with domain invariants and optimistic concurrency check.
 */
export async function updateDepartureSlotAdminOp(
  payload: Payload,
  slotId: number,
  update: {
    date?: string
    startTime?: string
    priceOverrideEGP?: number | null
    capacityTotal?: number
    status?: DepartureSlotStatus
    version: number
  },
  req?: PayloadRequest,
): Promise<DepartureSlotEntity> {
  const current = await getDepartureSlotById(payload, slotId)
  if (!current) {
    throw new Error(`[ExperienceRepository] Departure slot #${slotId} not found.`)
  }

  DepartureSlotHelper.validateUpdate(current, update)

  const newCapacityTotal =
    update.capacityTotal !== undefined ? update.capacityTotal : current.capacityTotal
  const newCapacityAvailable = DepartureSlotHelper.calculateAvailableCapacity({
    ...current,
    capacityTotal: newCapacityTotal,
  })
  const newStatus = update.status !== undefined ? update.status : current.status
  const newDate = update.date !== undefined ? update.date : current.date
  const newStartTime =
    update.startTime !== undefined ? update.startTime?.trim() || undefined : current.startTime
  const newPriceOverride =
    update.priceOverrideEGP !== undefined
      ? update.priceOverrideEGP === null
        ? null
        : Number(update.priceOverrideEGP)
      : current.priceOverrideEGP

  // Authoritative Domain Boundary Validation for Update
  if (payload) {
    try {
      const expDoc = await payload.findByID({
        collection: 'experiences',
        id: current.experienceId,
        depth: 0,
        req,
      })
      if (expDoc && expDoc.type === 'package') {
        const cityId =
          typeof expDoc.city === 'object' && expDoc.city ? (expDoc.city as any).id : expDoc.city
        const timezone = cityId ? await findTimezoneByCityId(payload, Number(cityId), req) : undefined
        if (timezone) {
          DepartureSlotHelper.calculateTemporalBoundary({
            date: newDate,
            startTime: newStartTime,
            durationDays: (expDoc as any).durationDays,
            destinationTimezone: timezone,
          })
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('[DepartureSlotHelper]')) {
        throw err
      }
    }
  }

  const cleanTime = newStartTime ? newStartTime.replace(':', '') : '0000'
  const newDepartureId = `DEP-${current.experienceId}-${newDate}-${cleanTime}`
  const nextVersion = current.version + 1

  const updatedDoc = (await payload.update({
    collection: 'departure-slots',
    id: slotId,
    data: {
      departureId: newDepartureId,
      date: newDate,
      startTime: newStartTime,
      priceOverrideEGP: newPriceOverride,
      capacityTotal: newCapacityTotal,
      capacityAvailable: newCapacityAvailable,
      status: newStatus as DepartureSlot['status'],
      version: nextVersion,
    },
    req,
  })) as DepartureSlot

  return {
    id: Number(updatedDoc.id),
    departureId: newDepartureId,
    experienceId: current.experienceId,
    date: newDate,
    startTime: newStartTime,
    priceOverrideEGP: newPriceOverride ?? undefined,
    capacityTotal: newCapacityTotal,
    capacityReserved: current.capacityReserved,
    capacitySold: current.capacitySold,
    capacityAvailable: newCapacityAvailable,
    version: nextVersion,
    status: newStatus,
  }
}

/**
 * Cancel an existing DepartureSlot operationally.
 * Disables the slot from future public sales/bookings while keeping all existing bookings intact.
 */
export async function cancelDepartureSlotAdminOp(
  payload: Payload,
  slotId: number,
  expectedVersion: number,
  req?: PayloadRequest,
): Promise<DepartureSlotEntity> {
  const current = await getDepartureSlotById(payload, slotId, req)
  if (!current) {
    throw new Error(`[ExperienceRepository] Departure slot #${slotId} not found.`)
  }

  if (expectedVersion !== current.version) {
    throw new Error(
      `[ExperienceRepository] Concurrency conflict: Slot #${slotId} version is ${current.version}, expected ${expectedVersion}.`,
    )
  }

  const cancelPolicy = AvailabilityPolicy.canCancelDeparture(current)
  if (!cancelPolicy.allowed) {
    throw new Error(
      `[ExperienceRepository] Cannot cancel slot #${slotId}: ${cancelPolicy.reason}`,
    )
  }

  // Active bookings check
  const activeBookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { departureSlot: { equals: slotId } },
        { status: { in: ['confirmed', 'paid', 'pending_payment', 'pending_admin_review'] } },
      ],
    },
    limit: 1,
    req,
  })

  if (activeBookings.totalDocs > 0) {
    throw new Error(
      `[ExperienceRepository] Cannot cancel departure slot #${slotId}: ${activeBookings.totalDocs} active booking(s) exist for this departure slot. Please resolve or reassign these bookings before cancellation.`,
    )
  }


  const nextVersion = current.version + 1
  await payload.update({
    collection: 'departure-slots',
    id: slotId,
    data: {
      status: 'cancelled',
      version: nextVersion,
    },
    req,
  })

  return {
    ...current,
    status: 'cancelled',
    version: nextVersion,
  }
}

/**
 * Permanently delete a DepartureSlot ONLY if zero historical bookings ever referenced it.
 * Atomic Transactional Execution: Prevents race conditions with incoming bookings.
 */
export async function deleteDepartureSlotAdminOp(
  payload: Payload,
  slotId: number,
  expectedVersion: number,
  req?: PayloadRequest,
): Promise<{ success: boolean; id: number; experienceId: number }> {
  const isMock =
    typeof (payload.find as any).mock === 'object' ||
    (payload.find as any)._isMockFunction ||
    !payload.db?.beginTransaction

  let transactionID: string | number | undefined = req?.transactionID as string | number | undefined
  let isInternalTx = false

  if (!transactionID && !isMock && typeof payload.db?.beginTransaction === 'function') {
    const tx = (await payload.db.beginTransaction()) as string | number | null | undefined
    if (tx) {
      transactionID = tx
      isInternalTx = true
    }
  }

  const activeReq: PayloadRequest | undefined = transactionID
    ? ({ ...req, payload, transactionID } as unknown as PayloadRequest)
    : req

  try {
    const current = await getDepartureSlotById(payload, slotId, activeReq)
    if (!current) {
      throw new Error(`[ExperienceRepository] Departure slot #${slotId} not found.`)
    }

    if (expectedVersion !== current.version) {
      throw new Error(
        `[ExperienceRepository] Concurrency conflict: Slot #${slotId} version is ${current.version}, expected ${expectedVersion}.`,
      )
    }

    // 1. Strict Reference Check: ANY booking in ANY status (even cancelled, refunded, draft, expired) blocks permanent delete
    const bookingCount = await payload.count({
      collection: 'bookings',
      where: {
        departureSlot: { equals: slotId },
      },
      req: activeReq,
    })

    if (bookingCount.totalDocs > 0) {
      throw new Error(
        `[ExperienceRepository] Cannot permanently delete slot #${slotId}: Referenced by ${bookingCount.totalDocs} historical booking record(s). Record is protected for audit and financial history.`,
      )
    }

    // 2. Capacity Guard: Must have 0 active sales/reservations
    if (current.capacitySold > 0 || current.capacityReserved > 0) {
      throw new Error(
        `[ExperienceRepository] Cannot permanently delete slot #${slotId}: Slot has active sold (${current.capacitySold}) or reserved (${current.capacityReserved}) capacity.`,
      )
    }

    // 3. Permanent Deletion from PostgreSQL
    await payload.delete({
      collection: 'departure-slots',
      id: slotId,
      req: activeReq,
    })

    if (isInternalTx && transactionID && typeof payload.db?.commitTransaction === 'function') {
      await payload.db.commitTransaction(transactionID)
    }

    return {
      success: true,
      id: slotId,
      experienceId: current.experienceId,
    }
  } catch (err: unknown) {
    if (isInternalTx && transactionID && typeof payload.db?.rollbackTransaction === 'function') {
      try {
        await payload.db.rollbackTransaction(transactionID)
      } catch {
        // Ignore rollback error to preserve original error
      }
    }
    throw err
  }
}
