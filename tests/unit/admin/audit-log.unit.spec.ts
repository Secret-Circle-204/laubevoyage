import { describe, it, expect } from 'vitest'
import { AdminAuditLogService } from '@/domains/admin/audit-log-service'
import type { AdminUserEntity } from '@/domains/admin/types'

describe('Admin Domain: Audit Log Service Unit Tests', () => {
  it('should record immutable staff action with Record<string, unknown> metadata', async () => {
    const mockRepo: any = {
      saveAuditLog: (log: any) => Promise.resolve(log),
    }

    const service = new AdminAuditLogService(mockRepo)
    const adminUser: AdminUserEntity = {
      id: 1,
      email: 'admin@laube.com',
      fullName: 'Admin User',
      role: 'admin',
      permissions: ['manage_bookings'],
      status: 'active',
    }

    const metadata: Record<string, unknown> = { overrideReason: 'Customer request via phone call' }

    const log = await service.recordAction({
      adminUser,
      action: 'cancel_booking',
      targetDomain: 'booking',
      targetId: '101',
      reason: 'Customer cancelled by phone',
      metadata,
    })

    expect(log.adminEmail).toBe('admin@laube.com')
    expect(log.action).toBe('cancel_booking')
    expect(log.metadata?.overrideReason).toBe('Customer request via phone call')
  })
})
