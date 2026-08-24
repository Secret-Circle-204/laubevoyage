import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingRefund } from '@/domains/booking/refund'
import { BookingStatus } from '@/types'

describe('Booking Domain: BookingRefund Unit Tests', () => {
  let mockRepo: any
  let mockExperienceService: any
  let refundService: BookingRefund

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      transitionStatus: vi.fn().mockImplementation((id, toStatus, data) => Promise.resolve({ id, ...data, status: toStatus })),
    }
    mockExperienceService = {
      getDepartureSlotByDate: vi.fn().mockResolvedValue({ departureId: 'dep_101' }),
      releaseCapacity: vi.fn(),
      releaseCommittedCapacity: vi.fn(),
    }
    refundService = new BookingRefund(mockRepo, mockExperienceService)
  })

  it('should successfully refund a CONFIRMED booking and release committed capacity', async () => {
    const mockBooking = {
      id: 999,
      status: BookingStatus.CONFIRMED,
      experienceId: 10,
      startDate: '2026-10-01',
      travelers: [{}],
      capacityHold: { status: 'committed', departureId: 'dep_101', seats: 1 },
      timeline: [],
      auditTrail: [],
    }

    mockRepo.findById.mockResolvedValue(mockBooking)

    const result = await refundService.refund(999, { id: 'admin_1', type: 'admin', name: 'Admin Refunder' })

    expect(result.status).toBe(BookingStatus.REFUNDED)
    expect(mockExperienceService.releaseCommittedCapacity).toHaveBeenCalledWith('dep_101', 1, undefined)
    expect(result.timeline.length).toBe(1)
    expect(result.timeline[0].stepKey).toBe('booking_refunded')
    expect(result.auditTrail.length).toBe(1)
    expect(result.auditTrail[0].action).toBe('BOOKING_REFUNDED')
  })

  it('should throw error if booking status is not paid or confirmed', async () => {
    const mockBooking = {
      id: 999,
      status: BookingStatus.DRAFT,
      timeline: [],
      auditTrail: [],
    }

    mockRepo.findById.mockResolvedValue(mockBooking)

    await expect(
      refundService.refund(999, { id: 'admin_1', type: 'admin', name: 'Admin Refunder' }),
    ).rejects.toThrowError('[BookingStateMachine] Forbidden transition')
  })
})
