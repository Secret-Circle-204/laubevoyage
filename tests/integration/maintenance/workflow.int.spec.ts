import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MaintenanceWorkflowEngine } from '@/domains/maintenance/workflow'

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
    workflowEngine = new MaintenanceWorkflowEngine(mockPayload)
  })

  it('should execute maintenance job workflow and record structured audit log', async () => {
    const result = await workflowEngine.executeJobWorkflow('complete_finished_bookings', 'scheduler', 'worker_integration_node')

    expect(result.success).toBe(true)
    const logs = await workflowEngine.repository.getRecentLogs(1)
    expect(logs.length).toBe(1)
    expect(logs[0].jobName).toBe('complete_finished_bookings')
    expect(logs[0].priority).toBe('medium')
  })
})
