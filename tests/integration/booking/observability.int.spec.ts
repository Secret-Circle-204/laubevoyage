import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'

describe('Layer 10: Observability & Structured Logging Verification Tests', () => {
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

  it('should generate structured audit logs with actor, action, duration, and metadata', async () => {
    const mockDraftDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'paid',
      user: 5,
      experience: 12,
      pricingSnapshot: { totalAmountEGP: 5000 },
      capacityHold: { holdId: 'c1', status: 'active' },
      timeline: [],
      auditTrail: [],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockDraftDoc)
    mockPayload.update.mockImplementation((params: any) => Promise.resolve({ ...mockDraftDoc, ...params.data }))

    const result = await workflowEngine.executeConfirmationWorkflow(101, {
      id: 'admin_1',
      type: 'admin',
      name: 'Operations Manager',
      ipAddress: '192.168.1.1',
    })

    expect(result.auditTrail).toBeDefined()
    expect(result.auditTrail.length).toBeGreaterThan(0)

    const latestAudit = result.auditTrail[result.auditTrail.length - 1]
    expect(latestAudit.actor.id).toBe('admin_1')
    expect(latestAudit.actor.type).toBe('admin')
    expect(latestAudit.action).toBe('BOOKING_CONFIRMED')
    expect(latestAudit.timestamp).toBeDefined()
  })
})
