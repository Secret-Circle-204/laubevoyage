import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MaintenanceWorkflowEngine } from '@/domains/maintenance/workflow'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'

describe('Maintenance Domain: Workflow Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: MaintenanceWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    }
    const mockBookingService = {
      complete: vi.fn(),
      processExpiredBookings: vi.fn().mockResolvedValue(0),
    }
    workflowEngine = new MaintenanceWorkflowEngine(mockPayload, mockBookingService as any)
  })

  it('should execute maintenance job workflow and record structured audit log', async () => {
    const result = await workflowEngine.executeJobWorkflow('complete_finished_bookings', 'scheduler', 'worker_integration_node')

    expect(result.success).toBe(true)
    const logs = await workflowEngine.repository.getRecentLogs(1)
    expect(logs.length).toBe(1)
    expect(logs[0].jobName).toBe('complete_finished_bookings')
    expect(logs[0].priority).toBe('medium')
  })

  it('should process expired bookings on first run and record itemsProcessed > 0', async () => {
    const mockBookings = [
      { id: 996, status: 'confirmed', completionAt: '2026-08-23T09:00:00.000Z' },
    ]

    mockPayload.find.mockResolvedValueOnce({
      docs: mockBookings,
      totalDocs: 1,
    })

    const mockBookingService = {
      complete: vi.fn().mockResolvedValue({ id: 996, status: 'completed' }),
    }

    const customEngine = new MaintenanceWorkflowEngine(mockPayload, mockBookingService as any)
    const result = await customEngine.executeJobWorkflow('complete_finished_bookings', 'scheduler', 'worker_test_1')

    expect(result.success).toBe(true)
    expect(result.itemsProcessed).toBe(1)
    expect(mockBookingService.complete).toHaveBeenCalledWith(996)

    const logs = await customEngine.repository.getRecentLogs(1)
    expect(logs[0].itemsProcessed).toBe(1)
    expect(logs[0].status).toBe('success')
  })

  it('should return itemsProcessed = 0 on second run when no expired bookings remain (Idempotency)', async () => {
    mockPayload.find.mockResolvedValueOnce({
      docs: [],
      totalDocs: 0,
    })

    const mockBookingService = {
      complete: vi.fn(),
    }

    const customEngine = new MaintenanceWorkflowEngine(mockPayload, mockBookingService as any)
    const result = await customEngine.executeJobWorkflow('complete_finished_bookings', 'scheduler', 'worker_test_2')

    expect(result.success).toBe(true)
    expect(result.itemsProcessed).toBe(0)
    expect(mockBookingService.complete).not.toHaveBeenCalled()

    const logs = await customEngine.repository.getRecentLogs(1)
    expect(logs[0].itemsProcessed).toBe(0)
  })

  it('should safely skip execution if lease lock is held by another worker', async () => {
    // Worker A acquires lease
    await MaintenanceLeaseService.acquireLease(mockPayload, 'complete_finished_bookings', 'worker_A', 60000)

    // Worker B attempts execution
    const result = await workflowEngine.executeJobWorkflow('complete_finished_bookings', 'scheduler', 'worker_B')

    expect(result.success).toBe(false)
    expect(result.itemsProcessed).toBe(0)

    // Release lease
    await MaintenanceLeaseService.releaseLease(mockPayload, 'complete_finished_bookings', 'worker_A')
  })
})

