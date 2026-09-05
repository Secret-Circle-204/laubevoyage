'use server'

import { getDomainServices } from '@/domains/factory'
import type { BookingService } from '@/domains/booking/service'
import {
  DepartureSlotHelper,
  type DepartureSlotLifecycleStatus,
  type DepartureSlotLifecycleResult,
} from '@/domains/experience/departure-slot'
import type { DepartureSlotEntity, DepartureSlotStatus } from '@/domains/experience/types'
import { getBusinessDateString, addDaysToDateString } from '@/lib/date'
import { revalidatePath } from 'next/cache'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Graceful no-op in CLI / test runner environments
  }
}

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
  hasReferencedBookings?: boolean
  hasActiveBookings?: boolean
  referencedBookingsCount?: number
  isDeletable?: boolean
  canCancel?: boolean
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

export interface GetHistoricalSlotsOptions {
  scope: 'completed' | 'cancelled' | 'all'
  page?: number
  limit?: number
  fromDate?: string
  toDate?: string
}

export interface GetHistoricalSlotsResult {
  success: boolean
  error?: string
  slots?: AdminDepartureSlotDTO[]
  pagination?: {
    totalDocs: number
    limit: number
    totalPages: number
    page: number
    hasPrevPage: boolean
    hasNextPage: boolean
  }
}

/**
 * Shared helper to map DepartureSlotEntity to AdminDepartureSlotDTO via authoritative DepartureSlotHelper.resolveLifecycle() SSOT.
 */
function mapSlotToAdminDTO(
  slot: DepartureSlotEntity,
  experience: { id: number; price: number; type: any; packageMode?: any; durationDays?: number },
  destinationTimezone: string,
  nowUtc: Date,
): {
  dto: AdminDepartureSlotDTO
  lifecycleStatus: DepartureSlotLifecycleStatus
  isCorrupted: boolean
} {
  const effectivePrice = DepartureSlotHelper.calculateEffectivePrice(slot, experience.price)
  let lifecycle: DepartureSlotLifecycleResult
  let isCorrupted = false
  let corruptionReason: string | undefined

  try {
    lifecycle = DepartureSlotHelper.resolveLifecycle(slot, experience, destinationTimezone, nowUtc)
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

  let formattedTime = slot.startTime || ''
  if (slot.startTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime)) {
    const [h, m] = slot.startTime.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    formattedTime = `${h12}:${String(m).padStart(2, '0')} ${period}`
  }

  return {
    dto: {
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
    },
    lifecycleStatus: lifecycle.lifecycleStatus,
    isCorrupted,
  }
}

/**
 * Efficient batch enrichment helper to compute booking reference metadata for AdminDepartureSlotDTO.
 * Executes a single indexed query on 'bookings' across all returned slot IDs.
 */
async function enrichSlotsWithBookingMetadata(
  bookingService: BookingService,
  dtos: AdminDepartureSlotDTO[],
): Promise<AdminDepartureSlotDTO[]> {
  if (dtos.length === 0) return dtos

  const slotIds = dtos.map((s) => s.id)
  const summariesMap = await bookingService.getSlotBookingSummaries(slotIds)

  return dtos.map((dto) => {
    const summary = summariesMap.get(dto.id) || { referencedCount: 0, hasActiveBookings: false }
    const referencedBookingsCount = summary.referencedCount
    const hasReferencedBookings = referencedBookingsCount > 0
    const hasActiveBookings = summary.hasActiveBookings

    // Deletable: ONLY if ZERO bookings ever referenced it, and capacity sold & reserved are 0, and status is upcoming or cancelled
    const isDeletable =
      !hasReferencedBookings &&
      dto.capacitySold === 0 &&
      dto.capacityReserved === 0 &&
      (dto.lifecycleStatus === 'upcoming' || dto.status === 'cancelled')

    // CanCancel: Allowed for any non-cancelled upcoming slot (disables slot while keeping bookings intact for manual review)
    const canCancel = dto.lifecycleStatus === 'upcoming' && dto.status !== 'cancelled'

    return {
      ...dto,
      hasReferencedBookings,
      hasActiveBookings,
      referencedBookingsCount,
      isDeletable,
      canCancel,
    }
  })
}

/**
 * Server Action: Load bounded operational departure slots for an experience with authoritative summary metrics.
 * Uses a safe mathematical cutoff window in the destination timezone to exclude historical completed records from payload bloat.
 */
export async function getExperienceSlotsWithSummaryAction(
  experienceId: number,
): Promise<GetExperienceSlotsResult> {
  try {
    if (!experienceId || experienceId <= 0) {
      return { success: false, error: 'Invalid experience ID.' }
    }

    const nowUtc = new Date()
    const { experience: experienceService, booking: bookingService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const experience = await repository.findOperationalMetadataById(experienceId)
    if (!experience) {
      return { success: false, error: `Experience #${experienceId} not found.` }
    }

    const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)

    // Coarse-Grained Safe Operational Boundary:
    // Derives local date in destination timezone. Slots strictly before (localDate - durationDays - 1 day margin)
    // are guaranteed to be completed and can never be upcoming or started.
    const localDateStr = getBusinessDateString(destinationTimezone, nowUtc)
    const durationDays = experience.durationDays || 1
    const safeCutoffDate = addDaysToDateString(localDateStr, -(durationDays + 1))

    // 1. Fetch only operational candidate slots from database
    const dbSlots = await repository.findSlotsByExperienceId(experienceId, {
      minDate: safeCutoffDate,
      sort: 'date',
      limit: 100,
    })

    let upcomingCount = 0
    let startedCount = 0
    let corruptedCount = 0
    let totalAvailableSeats = 0
    let totalSoldSeats = 0
    let totalReservedSeats = 0

    const slots: AdminDepartureSlotDTO[] = []

    for (const slot of dbSlots) {
      const { dto, lifecycleStatus, isCorrupted } = mapSlotToAdminDTO(
        slot,
        experience,
        destinationTimezone,
        nowUtc,
      )

      if (isCorrupted) {
        corruptedCount += 1
      } else if (lifecycleStatus === 'upcoming') {
        upcomingCount += 1
        totalAvailableSeats += slot.capacityAvailable
      } else if (lifecycleStatus === 'started') {
        startedCount += 1
      }

      totalSoldSeats += slot.capacitySold
      totalReservedSeats += slot.capacityReserved
      slots.push(dto)
    }

    // 2. Compute accurate historical counts via database count aggregation
    const totalCount = await experienceService.countDepartureSlots(experienceId)
    const cancelledCount = await experienceService.countDepartureSlots(experienceId, 'cancelled')

    // Completed slots are the remainder of non-corrupted, non-cancelled slots that are neither upcoming nor started
    const completedCount = Math.max(
      0,
      totalCount - upcomingCount - startedCount - cancelledCount - corruptedCount,
    )

    const enrichedSlots = await enrichSlotsWithBookingMetadata(bookingService, slots)

    return {
      success: true,
      experience: {
        id: experience.id,
        title: experience.title,
        price: experience.price,
      },
      slots: enrichedSlots,
      summary: {
        upcomingCount,
        startedCount,
        completedCount,
        cancelledCount,
        corruptedCount,
        totalCount,
        totalAvailableSeats,
        totalSoldSeats,
        totalReservedSeats,
      },
    }
  } catch (err: any) {
    console.error('[getExperienceSlotsWithSummaryAction] Error:', err)
    return {
      success: false,
      error: err?.message || 'Failed to load departure slots.',
    }
  }
}

/**
 * Server Action: Load paginated historical departure slots (completed, cancelled, or all) on demand.
 * Every returned slot is passed through DepartureSlotHelper.resolveLifecycle() SSOT.
 */
export async function getHistoricalExperienceSlotsAction(
  experienceId: number,
  options: GetHistoricalSlotsOptions,
): Promise<GetHistoricalSlotsResult> {
  try {
    if (!experienceId || experienceId <= 0) {
      return { success: false, error: 'Invalid experience ID.' }
    }

    const nowUtc = new Date()
    const { experience: experienceService, booking: bookingService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const experience = await repository.findOperationalMetadataById(experienceId)
    if (!experience) {
      return { success: false, error: `Experience #${experienceId} not found.` }
    }

    const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
    const localDateStr = getBusinessDateString(destinationTimezone, nowUtc)
    const durationDays = experience.durationDays || 1
    const safeCutoffDate = addDaysToDateString(localDateStr, -(durationDays + 1))

    const queryOptions: any = {
      page: options.page,
      limit: options.limit,
      sort: '-date',
    }

    if (options.scope === 'completed') {
      queryOptions.maxDate = safeCutoffDate
      queryOptions.notStatus = 'cancelled'
    } else if (options.scope === 'cancelled') {
      queryOptions.status = 'cancelled'
    }

    if (options.fromDate) {
      queryOptions.minDate = options.fromDate
    }
    if (options.toDate) {
      queryOptions.maxDate = options.toDate
    }

    const paginatedRes = await repository.findSlotsByExperienceIdPaginated(
      experienceId,
      queryOptions,
    )

    const rawSlots: AdminDepartureSlotDTO[] = paginatedRes.docs.map((slot) => {
      const { dto } = mapSlotToAdminDTO(slot, experience, destinationTimezone, nowUtc)
      return dto
    })

    const enrichedSlots = await enrichSlotsWithBookingMetadata(bookingService, rawSlots)

    return {
      success: true,
      slots: enrichedSlots,
      pagination: {
        totalDocs: paginatedRes.totalDocs,
        limit: paginatedRes.limit,
        totalPages: paginatedRes.totalPages,
        page: paginatedRes.page,
        hasPrevPage: paginatedRes.hasPrevPage,
        hasNextPage: paginatedRes.hasNextPage,
      },
    }
  } catch (err: any) {
    console.error('[getHistoricalExperienceSlotsAction] Error:', err)
    return {
      success: false,
      error: err?.message || 'Failed to load historical departure slots.',
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
    const { experience: experienceService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const experience = await repository.findOperationalMetadataById(params.experienceId)
    if (!experience) {
      return { success: false, error: `Experience #${params.experienceId} not found.` }
    }

    const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
    if (experience.type === 'package') {
      DepartureSlotHelper.calculateTemporalBoundary({
        date: params.date,
        startTime: params.startTime,
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
      status: params.status,
    })

    const effectivePrice = DepartureSlotHelper.calculateEffectivePrice(
      createdSlot,
      experience.price,
    )

    safeRevalidatePath(`/admin/collections/experiences/${params.experienceId}`)
    safeRevalidatePath(`/experiences/${experience.slug}`)

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
    const { experience: experienceService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const current = await repository.getDepartureSlotById(params.slotId)
    if (!current) {
      return { success: false, error: `Departure slot #${params.slotId} not found.` }
    }

    const experience = await repository.findOperationalMetadataById(current.experienceId)
    if (experience && experience.type === 'package') {
      const destinationTimezone = await repository.findTimezoneByCityId(experience.cityId)
      const newDate = params.date || current.date
      const newStartTime =
        params.startTime !== undefined
          ? params.startTime?.trim() || '09:00'
          : current.startTime || '09:00'
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
      : updatedSlot.priceOverrideEGP || 0

    safeRevalidatePath(`/admin/collections/experiences/${updatedSlot.experienceId}`)
    if (experience?.slug) {
      safeRevalidatePath(`/experiences/${experience.slug}`)
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
    const { experience: experienceService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const cancelledSlot = await repository.cancelDepartureSlotAdmin(params.slotId, params.version)
    const experience = await repository.findOperationalMetadataById(cancelledSlot.experienceId)

    safeRevalidatePath(`/admin/collections/experiences/${cancelledSlot.experienceId}`)
    if (experience?.slug) {
      safeRevalidatePath(`/experiences/${experience.slug}`)
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

/**
 * Server Action: Permanently delete an unreferenced Departure Slot after authoritative server-side checks.
 */
export async function deleteDepartureSlotDirectAction(params: {
  slotId: number
  version: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { experience: experienceService } = await getDomainServices()
    const repository = experienceService.getRepository()

    const result = await repository.deleteDepartureSlotAdmin(params.slotId, params.version)
    const experience = await repository.findOperationalMetadataById(result.experienceId)

    safeRevalidatePath(`/admin/collections/experiences/${result.experienceId}`)
    if (experience?.slug) {
      safeRevalidatePath(`/experiences/${experience.slug}`)
    }

    return {
      success: true,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to permanently delete departure slot.',
    }
  }
}

export interface AdminRelatedBookingDTO {
  id: number
  bookingNumber: string
  status: string
  paymentStatus: string
  amountPaid: number
  outstandingBalance: number
  totalAmountEGP: number
  travelersCount: number
  customerName: string
  customerEmail: string
  createdAt: string
}

export interface GetRelatedBookingsResult {
  success: boolean
  error?: string
  slotId?: number
  bookings?: AdminRelatedBookingDTO[]
  pagination?: {
    totalDocs: number
    limit: number
    totalPages: number
    page: number
    hasPrevPage: boolean
    hasNextPage: boolean
  }
}

/**
 * Server Action: Load paginated related bookings for a specific departure slot on demand.
 * Single indexed query on 'bookings' where departureSlot = slotId with server-side pagination.
 */
export async function getDepartureSlotRelatedBookingsAction(
  slotId: number,
  options?: { page?: number; limit?: number },
): Promise<GetRelatedBookingsResult> {
  try {
    if (!slotId || slotId <= 0) {
      return { success: false, error: 'Invalid departure slot ID.' }
    }

    const { booking } = await getDomainServices()

    const page = options?.page || 1
    const limit = options?.limit || 20

    const bookingsRes = await booking.getBookingsByDepartureSlotIdPaginated(slotId, page, limit)

    const bookings: AdminRelatedBookingDTO[] = bookingsRes.data.map((aggregate: any) => {
      const customer = aggregate.user && typeof aggregate.user === 'object' ? aggregate.user : null
      const customerName = customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
        : 'Customer'
      const customerEmail = customer?.email

      return {
        id: aggregate.id,
        bookingNumber: aggregate.bookingNumber || `BK-${aggregate.id}`,
        status: aggregate.status,
        paymentStatus: aggregate.paymentStatus,
        amountPaid: Number(aggregate.amountPaid),
        outstandingBalance: Number(aggregate.outstandingBalance),
        totalAmountEGP: Number(aggregate.pricingSnapshot?.totalAmountEGP),
        travelersCount: Array.isArray(aggregate.travelers) ? aggregate.travelers.length : 1,
        customerName,
        customerEmail,
        createdAt: aggregate.createdAt ? new Date(aggregate.createdAt).toISOString() : '',
      }
    })

    return {
      success: true,
      slotId,
      bookings,
      pagination: {
        totalDocs: bookingsRes.total,
        limit: bookingsRes.limit,
        totalPages: bookingsRes.totalPages,
        page: bookingsRes.page,
        hasPrevPage: bookingsRes.page > 1,
        hasNextPage: bookingsRes.page < bookingsRes.totalPages,
      },
    }
  } catch (err: any) {
    console.error('[getDepartureSlotRelatedBookingsAction] Error:', err)
    return {
      success: false,
      error: err?.message || 'Failed to load related bookings for departure slot.',
    }
  }
}
