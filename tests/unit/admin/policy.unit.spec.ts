import { describe, it, expect } from 'vitest'
import { AdminPolicy } from '@/domains/admin/policy'
import type { AdminUserEntity } from '@/domains/admin/types'

describe('Admin Domain: RBAC Policy Unit Tests', () => {
  it('should grant super_admin all permissions and enforce permission checks for staff', () => {
    const superAdmin: AdminUserEntity = {
      id: 1,
      email: 'super@laube.com',
      fullName: 'Super Admin',
      role: 'super_admin',
      permissions: [],
      status: 'active',
    }

    const staff: AdminUserEntity = {
      id: 2,
      email: 'staff@laube.com',
      fullName: 'Staff User',
      role: 'staff',
      permissions: ['manage_bookings'],
      status: 'active',
    }

    expect(AdminPolicy.hasPermission(superAdmin, 'adjust_loyalty_points').allowed).toBe(true)
    expect(AdminPolicy.hasPermission(staff, 'manage_bookings').allowed).toBe(true)
    expect(AdminPolicy.hasPermission(staff, 'adjust_loyalty_points').allowed).toBe(false)
  })
})
