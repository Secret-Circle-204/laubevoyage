import { describe, it, expect } from 'vitest'
import { AdminPolicy } from '@/domains/admin/policy'
import type { AdminUserEntity } from '@/domains/admin/types'

describe('Admin Domain: Performance Budget & RBAC Guard Tests', () => {
  it('should enforce RBAC permission check duration < 5ms budget', () => {
    const adminUser: AdminUserEntity = {
      id: 1,
      email: 'admin@laube.com',
      fullName: 'Admin',
      role: 'admin',
      permissions: ['manage_bookings', 'issue_refunds'],
      status: 'active',
    }

    const startTime = performance.now()
    const result = AdminPolicy.hasPermission(adminUser, 'issue_refunds')
    const duration = performance.now() - startTime

    expect(result.allowed).toBe(true)
    expect(duration).toBeLessThan(5) // Performance budget < 5ms
  })
})
