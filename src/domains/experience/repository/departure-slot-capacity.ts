import type { Payload } from 'payload'
import type { DepartureSlot } from '@/payload-types'
import type { RequestContext } from '@/types'
import type { DepartureSlotEntity } from '../types'
import type { IDatabaseAdapter } from './types'
import { mapContextToReq } from './repository-context'
import { getDepartureSlot } from './departure-slot-queries'

/**
 * Commit reserved capacity to sold atomically with optimistic locking.
 */
export async function commitDepartureSlotCapacity(
  payload: Payload,
  departureId: string,
  seats: number,
  context?: RequestContext,
): Promise<DepartureSlotEntity> {
  const slot = await getDepartureSlot(payload, departureId, context)
  if (!slot) {
    throw new Error(`[ExperienceRepository] Departure slot ${departureId} not found`)
  }
  if (slot.capacityReserved < seats) {
    throw new Error(
      `[ExperienceRepository] Cannot commit ${seats} seats on slot ${departureId}. Only ${slot.capacityReserved} reserved.`,
    )
  }

  const updatedSlot: DepartureSlotEntity = {
    ...slot,
    capacityReserved: slot.capacityReserved - seats,
    capacitySold: slot.capacitySold + seats,
  }

  return saveDepartureSlotEntity(payload, updatedSlot, context)
}

/**
 * Release committed/sold capacity back to available (e.g. on cancellation/refund).
 */
export async function releaseDepartureSlotCommittedCapacity(
  payload: Payload,
  departureId: string,
  seats: number,
  context?: RequestContext,
): Promise<DepartureSlotEntity> {
  const slot = await getDepartureSlot(payload, departureId, context)
  if (!slot) {
    throw new Error(`[ExperienceRepository] Departure slot ${departureId} not found`)
  }

  const updatedSlot: DepartureSlotEntity = {
    ...slot,
    capacitySold: Math.max(0, slot.capacitySold - seats),
  }

  return saveDepartureSlotEntity(payload, updatedSlot, context)
}

/**
 * Save / update departure slot entity with Optimistic Locking version check.
 */
export async function saveDepartureSlotEntity(
  payload: Payload,
  slot: DepartureSlotEntity,
  context?: RequestContext,
): Promise<DepartureSlotEntity> {
  const req = mapContextToReq(context)
  try {
    const result = await payload.find({
      collection: 'departure-slots',
      where: {
        departureId: { equals: slot.departureId },
      },
      limit: 1,
      req,
    })

    const existing = result.docs[0]
    const nextVersion = slot.version + 1
    const capacityAvailable = Math.max(
      0,
      slot.capacityTotal - slot.capacityReserved - slot.capacitySold,
    )

    if (existing) {
      // Atomic SQL update to ensure safety against race conditions
      const dbAdapter = payload.db as unknown as IDatabaseAdapter
      const transactionID = req?.transactionID

      const sqlText = `
        UPDATE departure_slots
        SET capacity_reserved = $1,
            capacity_sold = $2,
            capacity_available = $3,
            version = $4,
            status = $5
        WHERE departure_id = $6
          AND version = $7
          AND (capacity_total - $1 - $2) >= 0;
      `
      const params = [
        slot.capacityReserved,
        slot.capacitySold,
        capacityAvailable,
        nextVersion,
        slot.status,
        slot.departureId,
        slot.version,
      ]

      const txKey = transactionID instanceof Promise ? await transactionID : transactionID

      let queryResult: { rowCount: number } = { rowCount: 1 }
      if (dbAdapter) {
        if (txKey && dbAdapter.sessions?.[txKey]?.db?.session?.client) {
          const client = dbAdapter.sessions[txKey].db.session.client
          if (client) {
            queryResult = await client.query(sqlText, params)
          }
        } else if (dbAdapter.pool && typeof dbAdapter.pool.query === 'function') {
          queryResult = await dbAdapter.pool.query(sqlText, params)
        } else if (dbAdapter.drizzle && typeof dbAdapter.drizzle.execute === 'function') {
          const res = await dbAdapter.drizzle.execute(sqlText, params)
          queryResult = { rowCount: res.rowCount ?? 0 }
        } else {
          throw new Error(
            '[ExperienceRepository] No raw SQL database execution adapter is configured.',
          )
        }
      }

      if (queryResult.rowCount === 0) {
        throw new Error(
          `[ExperienceRepository] Atomic Optimistic Lock Failure on DepartureSlot ${slot.departureId}. Either the version (${slot.version}) has changed or capacity is exhausted.`,
        )
      }

      return {
        ...slot,
        version: nextVersion,
        capacityAvailable,
      }
    } else {
      const created = (await payload.create({
        collection: 'departure-slots',
        data: {
          departureId: slot.departureId,
          experience: slot.experienceId,
          date: slot.date,
          startTime: slot.startTime,
          priceOverrideEGP: slot.priceOverrideEGP,
          capacityTotal: slot.capacityTotal,
          capacityReserved: slot.capacityReserved,
          capacitySold: slot.capacitySold,
          capacityAvailable,
          version: nextVersion,
          status: slot.status as DepartureSlot['status'],
        },
        req,
      })) as DepartureSlot

      return {
        ...slot,
        id: Number(created.id),
        version: nextVersion,
        capacityAvailable,
      }
    }
  } catch (err) {
    throw err
  }
}
