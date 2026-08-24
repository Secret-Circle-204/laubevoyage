import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingConfirmation } from '@/domains/booking/confirmation'
import { BookingStatus, type BookingAggregate } from '@/domains/booking/types'

describe('BATCH 18: BookingConfirmation Fail-Fast & Non-Bypassable Inventory Commit', () => {
  let mockRepo: any
  let mockExpService: any
  let confirmation: BookingConfirmation

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      update: vi.fn(),
      transitionStatus: vi.fn().mockImplementation((id, toStatus, data) => Promise.resolve({ id, ...data, status: toStatus })),
      save: vi.fn(),
      recordOutboxEvent: vi.fn(),
    }
    mockExpService = {
      commitCapacity: vi.fn(),
      getDepartureSlotById: vi.fn(),
      getDepartureSlotByDate: vi.fn(),
    }
    confirmation = new BookingConfirmation(mockRepo as any, mockExpService as any)
  })

  it('fails fast and throws fatal error if departure slot cannot be resolved', async () => {
    const bookingWithoutSlot: BookingAggregate = {
      id: 999,
      bookingNumber: 'BK-FATAL-1',
      status: BookingStatus.PAID,
      customerId: 10,
      experienceId: 5,
      source: 'website',
      version: 1,
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      completionAt: '2026-09-25T12:00:00.000Z',
      paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      pricingSnapshot: { displayCurrency: 'EGP' } as any,
      travelers: [{} as any, {} as any],
      capacityHold: null,
      pointHold: null,
      pointsEarned: 0,
      paymentAttempts: [],
      documents: {},
      timeline: [],
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departureSlot: 100,
    }

    mockRepo.findById.mockResolvedValue(bookingWithoutSlot)
    mockExpService.getDepartureSlotById.mockResolvedValue(null)
    mockExpService.getDepartureSlotByDate.mockResolvedValue(null)

    await expect(confirmation.confirm(999)).rejects.toThrow(
      /Cannot confirm Booking #999 without resolving authoritative departureId/i
    )

    expect(mockRepo.save).not.toHaveBeenCalled()
    expect(mockExpService.commitCapacity).not.toHaveBeenCalled()
  })

  it('resolves departureId via departureSlotId relation if capacityHold.departureId is missing', async () => {
    const bookingWithSlotRelation: BookingAggregate = {
      id: 998,
      bookingNumber: 'BK-RESOLVE-1',
      status: BookingStatus.PAID,
      customerId: 10,
      experienceId: 9,
      departureSlot: 12, // Relation ID
      source: 'website',
      version: 1,
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      completionAt: '2026-09-25T12:00:00.000Z',
      paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      pricingSnapshot: { displayCurrency: 'EGP' } as any,
      travelers: [{} as any, {} as any], // 2 seats
      capacityHold: null,
      pointHold: null,
      pointsEarned: 0,
      paymentAttempts: [],
      documents: {},
      timeline: [],
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockRepo.findById.mockResolvedValue(bookingWithSlotRelation)
    mockExpService.getDepartureSlotById.mockResolvedValue({
      id: 12,
      departureId: 'DEP-9-2026-09-25',
      experienceId: 9,
      date: '2026-09-25',
      capacityTotal: 20,
      capacityReserved: 2,
      capacitySold: 0,
      capacityAvailable: 18,
      version: 1,
      status: 'available',
    })
    mockExpService.commitCapacity.mockResolvedValue({})
    mockRepo.update.mockImplementation(async (id: number, data: any) => ({ ...bookingWithSlotRelation, ...data, id }))

    const confirmed = await confirmation.confirm(998)

    expect(mockExpService.commitCapacity).toHaveBeenCalledWith('DEP-9-2026-09-25', 2, undefined)
    expect(confirmed.status).toBe('confirmed')
  })

  it('bubbles up error and blocks confirmation if commitCapacity throws', async () => {
    const booking: BookingAggregate = {
      id: 997,
      bookingNumber: 'BK-ERR-1',
      status: BookingStatus.PAID,
      customerId: 10,
      experienceId: 9,
      departureSlot: 12,
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      completionAt: '2026-09-25T12:00:00.000Z',
      paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      capacityHold: {
        departureId: 'DEP-9-2026-09-25',
        seats: 3,
        status: 'active',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      } as any,
      pointHold: null,
      pointsEarned: 0,
      paymentAttempts: [],
      source: 'website',
      version: 1,
      pricingSnapshot: { displayCurrency: 'EGP' } as any,
      travelers: [{} as any, {} as any, {} as any],
      documents: {},
      timeline: [],
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockRepo.findById.mockResolvedValue(booking)
    mockExpService.commitCapacity.mockRejectedValue(new Error('Optimistic Lock Concurrency Failure on departure slot'))

    await expect(confirmation.confirm(997)).rejects.toThrow(/Optimistic Lock Concurrency Failure/i)
    expect(mockRepo.save).not.toHaveBeenCalled()
  })
})
