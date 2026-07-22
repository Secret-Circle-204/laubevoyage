import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookingStatus } from '@/types'

describe('Layer 6: Transaction Failure & Atomic Rollback Tests', () => {
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

  it('should ensure atomic rollback when database error occurs during confirmation update', async () => {
    const mockPaidBooking = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'paid',
      user: 5,
      experience: 12,
      pricingSnapshot: { totalAmountEGP: 5000 },
      capacityHold: { holdId: 'cap_1', status: 'active' },
      pointHold: { holdId: 'pt_1', status: 'held', pointsHeld: 100 },
      paymentAttempts: [{ attemptId: 'pay_1', status: 'successful' }],
      timeline: [{ stepKey: 'payment_received' }],
      auditTrail: [{ action: 'PAYMENT_SUCCESSFUL' }],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockPaidBooking)

    // Simulate catastrophic database failure during update step
    mockPayload.update.mockRejectedValue(new Error('DATABASE_TRANSACTION_ROLLBACK: Connection failure'))

    await expect(workflowEngine.executeConfirmationWorkflow(101)).rejects.toThrow(
      'DATABASE_TRANSACTION_ROLLBACK: Connection failure',
    )

    // Verify original record state was untouched due to exception
    expect(mockPaidBooking.status).toBe(BookingStatus.PAID)
    expect(mockPaidBooking.capacityHold.status).toBe('active') // NOT committed
    expect(mockPaidBooking.pointHold.status).toBe('held') // NOT committed
    expect(mockPaidBooking.timeline).toHaveLength(1) // Timeline entry unwritten
    expect(mockPaidBooking.auditTrail).toHaveLength(1) // Audit entry unwritten
  })
})
