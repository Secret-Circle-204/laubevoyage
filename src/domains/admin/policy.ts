import type { AdminUserEntity, AdminPermission, AdminPolicyResult } from './types'

/**
 * Pure Admin RBAC Policy
 * Single source of truth for staff permission predicates.
 */
export class AdminPolicy {
  static hasPermission(adminUser: AdminUserEntity, requiredPermission: AdminPermission): AdminPolicyResult {
    if (adminUser.status !== 'active') {
      return {
        allowed: false,
        code: 'ADMIN_ACCOUNT_INACTIVE',
        reason: `Admin user ${adminUser.email} is inactive.`,
      }
    }

    if (adminUser.role === 'super_admin') {
      return { allowed: true } // Super Admin holds all permissions
    }

    if (!adminUser.permissions.includes(requiredPermission)) {
      return {
        allowed: false,
        code: 'PERMISSION_DENIED',
        reason: `Admin user ${adminUser.email} lacks required permission: ${requiredPermission}`,
      }
    }

    return { allowed: true }
  }
}
