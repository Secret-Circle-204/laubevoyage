'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ExperienceRepository } from '@/domains/experience/repository'
import {
  DepartureSlotHelper,
  type DepartureSlotLifecycleStatus,
  type DepartureSlotLifecycleResult,
} from '@/domains/experience/departure-slot'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import { revalidatePath } from 'next/cache'

export interface AdminDepartureSlotDTO {
  id: number
  departureId: string
  experienceId: number
  date: string
  startTime: string
  priceOverrideEGP?: number
  effectivePrice: number
  capacityTotal: number
  capacityReserved: number
  capacitySold: number
  capacityAvailable: number
  version: number
  status: DepartureSlotStatus
  lifecycleStatus?: DepartureSlotLifecycleStatus
  isBookable?: boolean
  departureStartUtc?: string
  departureEndUtc?: string
  formattedTime?: string
  destinationTimezone?: string
  isCorrupted?: boolean
  corruptionReason?: string
}

export interface DepartureSlotsSummaryDTO {
  upcomingCount: number
  startedCount: number
  completedCount: number
  cancelledCount: number
  corruptedCount: number
  totalCount: number
  totalAvailableSeats: number
  totalSoldSeats: number
  totalReservedSeats: number
}

export interface GetExperienceSlotsResult {
  success: boolean
  error?: string
  experience?: {
    id: number
    title: string
    price: number
  }
  slots?: AdminDepartureSlotDTO[]
  summary?: DepartureSlotsSummaryDTO
}

export interface SlotActionResult {
  success: boolean
  error?: string
  slot?: AdminDepartureSlotDTO
}

/**
 * Server Action: Load all departure slots for an experience with authoritative summary metrics.
 */
export async function getExperienceSlotsWithSummaryAction(
  experienceId: number,
): Promise<GetExperienceSlotsResult> {
  try {
    if (!experienceId || experienceId <= 0) {
      return { success: false, error: 'Invalid experience ID.' }
    }

    const nowUtc = new Date()

    const payload = await getPayload({ config: configPromise })
    const repository = new ExperienceRepository(payload)

    const experience = await repository.findById(experienceId)
    if (!experience) {
      return { success: false, error: `Experience #${experienceId} not found.` }
    }

    const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
    const dbSlots = await repository.findSlotsByExperienceId(experienceId)

    let upcomingCount = 0
    let startedCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let corruptedCount = 0
    let totalAvailableSeats = 0
    let totalSoldSeats = 0
    let totalReservedSeats = 0

    const slots: AdminDepartureSlotDTO[] = dbSlots.map((slot) => {
      const effectivePrice = DepartureSlotHelper.calculateEffectivePrice(slot, experience.price)
      
      let lifecycle: DepartureSlotLifecycleResult
      let isCorrupted = false
      let corruptionReason: string | undefined

      try {
        lifecycle = DepartureSlotHelper.resolveLifecycle(
          slot,
          experience,
          destinationTimezone,
          nowUtc,
        )
      } catch (err: unknown) {
        isCorrupted = true
        corruptionReason = err instanceof Error ? err.message : String(err)
        lifecycle = {
          departureStartUtc: new Date(slot.date),
          departureEndUtc: new Date(slot.date),
          lifecycleStatus: 'cancelled',
          isBookable: false,
        }
      }

      if (isCorrupted) {
        corruptedCount += 1
      } else if (lifecycle.lifecycleStatus === 'upcoming') {
        upcomingCount += 1
        totalAvailableSeats += slot.capacityAvailable
      } else if (lifecycle.lifecycleStatus === 'started') {
        startedCount += 1
      } else if (lifecycle.lifecycleStatus === 'completed') {
        completedCount += 1
      } else if (lifecycle.lifecycleStatus === 'cancelled') {
        cancelledCount += 1
      }

      totalSoldSeats += slot.capacitySold
      totalReservedSeats += slot.capacityReserved

      let formattedTime = slot.startTime || ''
      if (slot.startTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime)) {
        const [h, m] = slot.startTime.split(':').map(Number)
        const period = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 === 0 ? 12 : h % 12
        formattedTime = `${h12}:${String(m).padStart(2, '0')} ${period}`
      }

      return {
        id: slot.id as number,
        departureId: slot.departureId,
        experienceId: slot.experienceId,
        date: slot.date,
        startTime: slot.startTime || '',
        priceOverrideEGP: slot.priceOverrideEGP,
        effectivePrice,
        capacityTotal: slot.capacityTotal,
        capacityReserved: slot.capacityReserved,
        capacitySold: slot.capacitySold,
        capacityAvailable: slot.capacityAvailable,
        version: slot.version,
        status: slot.status,
        lifecycleStatus: isCorrupted ? 'cancelled' : lifecycle.lifecycleStatus,
        isBookable: isCorrupted ? false : lifecycle.isBookable,
        departureStartUtc: lifecycle.departureStartUtc.toISOString(),
        departureEndUtc: lifecycle.departureEndUtc.toISOString(),
        formattedTime,
        destinationTimezone,
        isCorrupted,
        corruptionReason,
      }
    })

    return {
      success: true,
      experience: {
        id: experience.id,
        title: experience.title,
        price: experience.price,
      },
      slots,
      summary: {
        upcomingCount,
        startedCount,
        completedCount,
        cancelledCount,
        corruptedCount,
        totalCount: slots.length,
        totalAvailableSeats,
        totalSoldSeats,
        totalReservedSeats,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to load departure slots.',
    }
  }
}

/**
 * Server Action: Create a new Departure Slot with domain invariants.
 */
export async function createDepartureSlotDirectAction(params: {
  experienceId: number
  date: string
  startTime?: string
  priceOverrideEGP?: number
  capacityTotal: number
  status?: DepartureSlotStatus
}): Promise<SlotActionResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    const repository = new ExperienceRepository(payload)

    const experience = await repository.findById(params.experienceId)
    if (!experience) {
      return { success: false, error: `Experience #${params.experienceId} not found.` }
    }

    const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
    if (experience.type === 'package') {
      DepartureSlotHelper.calculateTemporalBoundary({
        date: params.date,
        startTime: params.startTime || '09:00',
        durationDays: experience.durationDays || 1,
        destinationTimezone,
      })
    }

    const createdSlot = await repository.createDepartureSlotAdmin({
      experienceId: params.experienceId,
      date: params.date,
      startTime: params.startTime,
      priceOverrideEGP: params.priceOverrideEGP,
      capacityTotal: params.capacityTotal,
      status: params.status || 'available',
    })

    const effectivePrice = DepartureSlotHelper.calculateEffectivePrice(createdSlot, experience.price)

    revalidatePath(`/admin/collections/experiences/${params.experienceId}`)
    revalidatePath(`/experiences/${experience.slug}`)

    return {
      success: true,
      slot: {
        id: createdSlot.id as number,
        departureId: createdSlot.departureId,
        experienceId: createdSlot.experienceId,
        date: createdSlot.date,
        startTime: createdSlot.startTime || '',
        priceOverrideEGP: createdSlot.priceOverrideEGP,
        effectivePrice,
        capacityTotal: createdSlot.capacityTotal,
        capacityReserved: createdSlot.capacityReserved,
        capacitySold: createdSlot.capacitySold,
        capacityAvailable: createdSlot.capacityAvailable,
        version: createdSlot.version,
        status: createdSlot.status,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to create departure slot.',
    }
  }
}

/**
 * Server Action: Update an existing Departure Slot with optimistic concurrency verification.
 */
export async function updateDepartureSlotDirectAction(params: {
  slotId: number
  date?: string
  startTime?: string
  priceOverrideEGP?: number | null
  capacityTotal?: number
  status?: DepartureSlotStatus
  version: number
}): Promise<SlotActionResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    const repository = new ExperienceRepository(payload)

    const current = await repository.getDepartureSlotById(params.slotId)
    if (!current) {
      return { success: false, error: `Departure slot #${params.slotId} not found.` }
    }

    const experience = await repository.findById(current.experienceId)
    if (experience && experience.type === 'package') {
      const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
      const newDate = params.date || current.date
      const newStartTime = params.startTime !== undefined ? (params.startTime?.trim() || '09:00') : (current.startTime || '09:00')
      DepartureSlotHelper.calculateTemporalBoundary({
        date: newDate,
        startTime: newStartTime,
        durationDays: experience.durationDays || 1,
        destinationTimezone,
      })
    }

    const updatedSlot = await repository.updateDepartureSlotAdmin(params.slotId, {
      date: params.date,
      startTime: params.startTime,
      priceOverrideEGP: params.priceOverrideEGP,
      capacityTotal: params.capacityTotal,
      status: params.status,
      version: params.version,
    })

    const effectivePrice = experience
      ? DepartureSlotHelper.calculateEffectivePrice(updatedSlot, experience.price)
      : (updatedSlot.priceOverrideEGP || 0)

    revalidatePath(`/admin/collections/experiences/${updatedSlot.experienceId}`)
    if (experience?.slug) {
      revalidatePath(`/experiences/${experience.slug}`)
    }


    return {
      success: true,
      slot: {
        id: updatedSlot.id as number,
        departureId: updatedSlot.departureId,
        experienceId: updatedSlot.experienceId,
        date: updatedSlot.date,
        startTime: updatedSlot.startTime || '',
        priceOverrideEGP: updatedSlot.priceOverrideEGP,
        effectivePrice,
        capacityTotal: updatedSlot.capacityTotal,
        capacityReserved: updatedSlot.capacityReserved,
        capacitySold: updatedSlot.capacitySold,
        capacityAvailable: updatedSlot.capacityAvailable,
        version: updatedSlot.version,
        status: updatedSlot.status,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update departure slot.',
    }
  }
}

/**
 * Server Action: Cancel a Departure Slot after checking domain policy & active bookings.
 */
export async function cancelDepartureSlotDirectAction(params: {
  slotId: number
  version: number
}): Promise<SlotActionResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    const repository = new ExperienceRepository(payload)

    const cancelledSlot = await repository.cancelDepartureSlotAdmin(params.slotId, params.version)
    const experience = await repository.findById(cancelledSlot.experienceId)

    revalidatePath(`/admin/collections/experiences/${cancelledSlot.experienceId}`)
    if (experience?.slug) {
      revalidatePath(`/experiences/${experience.slug}`)
    }

    return {
      success: true,
      slot: {
        id: cancelledSlot.id as number,
        departureId: cancelledSlot.departureId,
        experienceId: cancelledSlot.experienceId,
        date: cancelledSlot.date,
        startTime: cancelledSlot.startTime || '',
        priceOverrideEGP: cancelledSlot.priceOverrideEGP,
        effectivePrice: cancelledSlot.priceOverrideEGP || experience?.price || 0,
        capacityTotal: cancelledSlot.capacityTotal,
        capacityReserved: cancelledSlot.capacityReserved,
        capacitySold: cancelledSlot.capacitySold,
        capacityAvailable: cancelledSlot.capacityAvailable,
        version: cancelledSlot.version,
        status: cancelledSlot.status,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to cancel departure slot.',
    }
  }
}
