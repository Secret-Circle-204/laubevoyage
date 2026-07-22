import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookingStatus } from '@/types'

describe('Layer 7: Idempotency & Double Confirmation Tests', () => {
  let mockPayload: any
  let workflowEngine: BookingWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    workflowEngine = new BookingWorkflowEngine(mockPayload)
  })

  it('should reject double confirmation attempt idempotently if already confirmed', async () => {
    const mockAlreadyConfirmedBooking = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'confirmed',
      user: 5,
      experience: 12,
      pricingSnapshot: { totalAmountEGP: 5000 },
      capacityHold: { holdId: 'c1', status: 'committed' },
      timeline: [{ stepKey: 'booking_confirmed' }],
      auditTrail: [{ action: 'BOOKING_CONFIRMED' }],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockAlreadyConfirmedBooking)

    // Attempt double confirmation
    await expect(workflowEngine.executeConfirmationWorkflow(101)).rejects.toThrow(
      "[BookingPolicy] Confirmation forbidden: Cannot confirm booking in 'confirmed' status. Expected 'paid'.",
    )

    // Verify update was never called a second time
    expect(mockPayload.update).not.toHaveBeenCalled()
  })
})
