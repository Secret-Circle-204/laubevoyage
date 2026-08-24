import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingExpiration } from '@/domains/booking/expiration'
import { BookingRepository } from '@/domains/booking/repository'
import { BookingStatus } from '@/types'

describe('Layer 9: Expiration Pipeline, Retry & Dead Letter Queue (DLQ) Tests', () => {
  let mockPayload: any
  let repository: BookingRepository
  let expirationService: BookingExpiration

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('mock_tx_id'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }
    repository = new BookingRepository(mockPayload)
    expirationService = new BookingExpiration(repository, {} as any)
  })

  it('should process expired draft bookings through 7-step pipeline successfully', async () => {
    const mockExpiredDraft = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'draft',
      user: 5,
      experience: 12,
      capacityHold: { holdId: 'c1', status: 'active' },
      pointHold: { holdId: 'p1', status: 'held' },
      timeline: [],
      auditTrail: [],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      paymentWindowExpiresAt: '2026-07-22T10:15:00.000Z',
    }

    mockPayload.find.mockResolvedValue({ docs: [mockExpiredDraft] })
    mockPayload.findByID.mockResolvedValue(mockExpiredDraft)
    mockPayload.update.mockImplementation((params: any) => Promise.resolve({ ...mockExpiredDraft, ...params.data }))

    const expiredCount = await expirationService.processExpiredBookings(15)

    expect(expiredCount).toBe(1)
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'bookings',
        where: expect.objectContaining({
          and: [
            { id: { equals: 101 } },
            { status: { in: [BookingStatus.DRAFT, BookingStatus.PENDING_PAYMENT] } },
          ],
        }),
        data: expect.objectContaining({
          status: BookingStatus.EXPIRED,
        }),
      }),
    )
  })

  it('should retry 3 times on failure and push unresolvable booking to Dead Letter Queue (DLQ)', async () => {
    const mockUnresolvableDraft = {
      id: 999,
      bookingNumber: 'LBV-260723-09999',
      status: 'draft',
      user: 5,
      experience: 12,
      capacityHold: { holdId: 'c2', status: 'active' },
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      paymentWindowExpiresAt: '2026-07-22T10:15:00.000Z',
    }

    mockPayload.find.mockResolvedValue({ docs: [mockUnresolvableDraft] })
    mockPayload.findByID.mockResolvedValue(mockUnresolvableDraft)
    // Simulate persistent database error during update
    mockPayload.update.mockRejectedValue(new Error('PERSISTENT_DB_LOCK_TIMEOUT'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const expiredCount = await expirationService.processExpiredBookings(15)

    expect(expiredCount).toBe(0)
    expect(mockPayload.update).toHaveBeenCalledTimes(3) // Verified 3 retries executed

    const dlq = expirationService.getDeadLetterQueue()
    expect(dlq).toHaveLength(1)
    expect(dlq[0].id).toBe(999)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookingExpiration] CRITICAL: Max retries exceeded for booking #LBV-260723-09999. Moving to DLQ.'),
    )

    consoleSpy.mockRestore()
  })

  it('should skip expiration if booking status changes to paid/confirmed concurrently (TOCTOU guard)', async () => {
    const mockExpiredDraft = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'draft',
      user: 5,
      experience: 12,
      capacityHold: { holdId: 'c1', status: 'active' },
      pointHold: { holdId: 'p1', status: 'held' },
      timeline: [],
      auditTrail: [],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      paymentWindowExpiresAt: '2026-07-22T10:15:00.000Z',
    }

    // find returns the booking, but by the time findByID executes inside transaction, it is paid/confirmed
    mockPayload.find.mockResolvedValue({ docs: [mockExpiredDraft] })
    mockPayload.findByID.mockResolvedValue({ ...mockExpiredDraft, status: 'confirmed' })

    const expiredCount = await expirationService.processExpiredBookings(15)

    expect(expiredCount).toBe(0)
    expect(mockPayload.update).not.toHaveBeenCalled()
  })

  it('should skip expiration and rollback if conditional database status update returns 0 affected rows (atomic concurrency guard)', async () => {
    const mockExpiredDraft = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'draft',
      user: 5,
      experience: 12,
      capacityHold: { holdId: 'c1', status: 'active' },
      pointHold: { holdId: 'p1', status: 'held' },
      timeline: [],
      auditTrail: [],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      paymentWindowExpiresAt: '2026-07-22T10:15:00.000Z',
    }

    mockPayload.find.mockResolvedValue({ docs: [mockExpiredDraft] })
    mockPayload.findByID.mockResolvedValue(mockExpiredDraft)
    
    // Simulate conditional update returning no matched rows (empty docs array)
    mockPayload.update.mockResolvedValue({ docs: [] })

    const expiredCount = await expirationService.processExpiredBookings(15)

    expect(expiredCount).toBe(0)
    expect(mockPayload.db.rollbackTransaction).toHaveBeenCalledWith('mock_tx_id')
  })
})
