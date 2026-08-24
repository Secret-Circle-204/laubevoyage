import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InventoryReconciliationService } from '@/domains/experience/reconciliation'
import type { ExperienceRepository } from '@/domains/experience/repository'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('BATCH 18: Inventory ↔ Bookings Reconciliation & Lifecycle Integrity', () => {
  let mockPayload: any
  let mockRepo: any
  let reconciliationService: InventoryReconciliationService

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
    }
    mockRepo = {
      getDepartureSlotById: vi.fn(),
      saveDepartureSlot: vi.fn(),
      payload: mockPayload,
    }
    reconciliationService = new InventoryReconciliationService(mockPayload as any, mockRepo as any)
  })

  it('Phase 1 (Audit): accurately computes Level 1 and Level 2 invariants on a clean slot', async () => {
    const mockSlot: DepartureSlotEntity = {
      id: 12,
      departureId: 'DEP-9-2026-09-25',
      experienceId: 9,
      date: '2026-09-25',
      startTime: '11:00',
      capacityTotal: 20,
      capacityReserved: 2,
      capacitySold: 6,
      capacityAvailable: 12,
      version: 1,
      status: 'available',
    }

    mockRepo.getDepartureSlotById.mockResolvedValue(mockSlot)

    // Bookings matching the stored numbers: 6 sold seats, 2 reserved seats
    mockPayload.find.mockResolvedValue({
      docs: [
        {
          id: 1,
          bookingNumber: 'BK-1',
          status: 'confirmed',
          capacityHold: { seats: 3 },
          customer: 10,
        },
        {
          id: 2,
          bookingNumber: 'BK-2',
          status: 'paid',
          travelers: [{}, {}, {}], // 3 seats
          customer: 11,
        },
        {
          id: 3,
          bookingNumber: 'BK-3',
          status: 'pending_payment',
          capacityHold: {
            status: 'active',
            seats: 2,
            expiresAt: new Date(Date.now() + 600000).toISOString(), // unexpired
          },
          customer: 12,
        },
        {
          id: 4,
          bookingNumber: 'BK-4',
          status: 'refunded', // Should not count as sold
          capacityHold: { seats: 4 },
          customer: 13,
        },
      ],
      totalDocs: 4,
    })

    const audit = await reconciliationService.auditSlot(12)

    expect(audit.slotId).toBe(12)
    expect(audit.storedSold).toBe(6)
    expect(audit.expectedSold).toBe(6)
    expect(audit.storedReserved).toBe(2)
    expect(audit.expectedReserved).toBe(2)
    expect(audit.storedAvailable).toBe(12)
    expect(audit.expectedAvailable).toBe(12)
    expect(audit.level1InvariantPassed).toBe(true)
    expect(audit.level2SourceConsistent).toBe(true)
    expect(audit.driftSold).toBe(0)
    expect(audit.driftReserved).toBe(0)
    expect(audit.driftAvailable).toBe(0)
  })

  it('Phase 1 (Audit): detects exact Sold Drift when confirmed bookings exceed stored capacitySold', async () => {
    // Slot #12 real scenario: Stored Sold is 6, but confirmed bookings sum to 8
    const mockSlot: DepartureSlotEntity = {
      id: 12,
      departureId: 'DEP-9-2026-09-25',
      experienceId: 9,
      date: '2026-09-25',
      startTime: '11:00',
      capacityTotal: 20,
      capacityReserved: 6, // Stale holds
      capacitySold: 6, // Mismatched sold
      capacityAvailable: 8,
      version: 12,
      status: 'available',
    }

    mockRepo.getDepartureSlotById.mockResolvedValue(mockSlot)

    // The 4 actual confirmed bookings in the DB
    mockPayload.find.mockResolvedValue({
      docs: [
        { id: 323, bookingNumber: 'LBV-260819-54253', status: 'confirmed', capacityHold: { seats: 2 } },
        { id: 265, bookingNumber: 'LBV-260819-57503', status: 'confirmed', capacityHold: { seats: 3 } },
        { id: 260, bookingNumber: 'LBV-260819-74227', status: 'confirmed', capacityHold: { seats: 1 } },
        { id: 203, bookingNumber: 'LBV-260818-39171', status: 'confirmed', capacityHold: { seats: 2 } },
      ],
      totalDocs: 4,
    })

    const audit = await reconciliationService.auditSlot(12)

    expect(audit.storedSold).toBe(6)
    expect(audit.expectedSold).toBe(8) // 2 + 3 + 1 + 2
    expect(audit.driftSold).toBe(-2) // Stored is 2 less than ground truth
    expect(audit.storedReserved).toBe(6)
    expect(audit.expectedReserved).toBe(0) // No active holds
    expect(audit.driftReserved).toBe(6)
    expect(audit.level2SourceConsistent).toBe(false)
  })

  it('Phase 1 (Audit): excludes REFUNDED, CANCELLED, and EXPIRED holds from Sold and Reserved', async () => {
    const mockSlot: DepartureSlotEntity = {
      id: 7,
      departureId: '9-9',
      experienceId: 9,
      date: '2026-07-27',
      startTime: '09:00',
      capacityTotal: 20,
      capacityReserved: 3, // Stale from manual seed
      capacitySold: 0,
      capacityAvailable: 17,
      version: 3,
      status: 'available',
    }

    mockRepo.getDepartureSlotById.mockResolvedValue(mockSlot)

    // Only cancelled, refunded, or expired records
    mockPayload.find.mockResolvedValue({
      docs: [
        { id: 10, bookingNumber: 'BK-REF', status: 'refunded', capacityHold: { seats: 2 } },
        { id: 11, bookingNumber: 'BK-CAN', status: 'cancelled', capacityHold: { seats: 2 } },
        {
          id: 12,
          bookingNumber: 'BK-EXP',
          status: 'expired',
          capacityHold: { status: 'expired', seats: 3, expiresAt: '2026-01-01T00:00:00Z' },
        },
      ],
      totalDocs: 3,
    })

    const audit = await reconciliationService.auditSlot(7)

    expect(audit.expectedSold).toBe(0)
    expect(audit.expectedReserved).toBe(0)
    expect(audit.expectedAvailable).toBe(20)
    expect(audit.driftReserved).toBe(3) // Stored 3, Expected 0
    expect(audit.level2SourceConsistent).toBe(false)
  })

  it('Phase 2 (Reconcile): self-heals drifts deterministically and converges cleanly', async () => {
    const initialSlot: DepartureSlotEntity = {
      id: 12,
      departureId: 'DEP-9-2026-09-25',
      experienceId: 9,
      date: '2026-09-25',
      startTime: '11:00',
      capacityTotal: 20,
      capacityReserved: 6,
      capacitySold: 6,
      capacityAvailable: 8,
      version: 12,
      status: 'available',
    }

    const savedSlot: DepartureSlotEntity = {
      ...initialSlot,
      capacityReserved: 0,
      capacitySold: 8,
      capacityAvailable: 12,
      version: 13,
    }

    // First call: returns initialSlot; after save: returns savedSlot
    mockRepo.getDepartureSlotById
      .mockResolvedValueOnce(initialSlot)
      .mockResolvedValueOnce(initialSlot)
      .mockResolvedValue(savedSlot)

    mockRepo.saveDepartureSlot.mockResolvedValue(savedSlot)

    // Bookings sum to 8 sold seats, 0 reserved
    mockPayload.find.mockResolvedValue({
      docs: [
        { id: 323, bookingNumber: 'LBV-260819-54253', status: 'confirmed', capacityHold: { seats: 2 } },
        { id: 265, bookingNumber: 'LBV-260819-57503', status: 'confirmed', capacityHold: { seats: 3 } },
        { id: 260, bookingNumber: 'LBV-260819-74227', status: 'confirmed', capacityHold: { seats: 1 } },
        { id: 203, bookingNumber: 'LBV-260818-39171', status: 'confirmed', capacityHold: { seats: 2 } },
      ],
      totalDocs: 4,
    })

    // 1st Execution: Reconciles the slot
    const result1 = await reconciliationService.reconcileSlot(12)

    expect(result1.reconciled).toBe(true)
    expect(result1.previousVersion).toBe(12)
    expect(result1.nextVersion).toBe(13)
    expect(result1.auditAfter.expectedSold).toBe(8)
    expect(result1.auditAfter.storedSold).toBe(8)
    expect(result1.auditAfter.expectedReserved).toBe(0)
    expect(result1.auditAfter.storedReserved).toBe(0)
    expect(result1.auditAfter.level1InvariantPassed).toBe(true)
    expect(result1.auditAfter.level2SourceConsistent).toBe(true)

    // 2nd Execution (Determinism Check): Calling reconcile again on clean slot is a no-op
    mockRepo.getDepartureSlotById.mockResolvedValue(savedSlot)
    const result2 = await reconciliationService.reconcileSlot(12)

    expect(result2.reconciled).toBe(false)
    expect(mockRepo.saveDepartureSlot).toHaveBeenCalledTimes(1) // Not called again!
  })
})
