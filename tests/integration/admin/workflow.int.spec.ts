import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdminWorkflowEngine } from '@/domains/admin/workflow'
import type { AdminUserEntity } from '@/domains/admin/types'

describe('Admin Domain: Workflow Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: AdminWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    }
    workflowEngine = new AdminWorkflowEngine(mockPayload)
  })

  it('should execute staff action with RBAC check and record immutable audit log', async () => {
    const adminUser: AdminUserEntity = {
      id: 1,
      email: 'admin@laube.com',
      fullName: 'Admin',
      role: 'super_admin',
      permissions: ['manage_bookings'],
      status: 'active',
    }

    const result = await workflowEngine.executeStaffAction(
      adminUser,
      'manage_bookings',
      'cancel_booking',
      'booking',
      '101',
      'Customer requested cancellation',
      () => Promise.resolve(true),
    )

    expect(result).toBe(true)

    const logs = await workflowEngine.repository.getRecentAuditLogs(1)
    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('cancel_booking')
    expect(logs[0].adminEmail).toBe('admin@laube.com')
  })
})
