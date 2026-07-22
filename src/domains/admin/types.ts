export type AdminRole = 'super_admin' | 'admin' | 'staff'

export type AdminPermission =
  | 'manage_bookings'
  | 'issue_refunds'
  | 'manage_experiences'
  | 'adjust_loyalty_points'
  | 'manage_customers'
  | 'trigger_maintenance'
  | 'view_financial_recon'

export interface AdminUserEntity {
  id: number
  email: string
  fullName: string
  role: AdminRole
  permissions: AdminPermission[]
  status: 'active' | 'inactive'
}

export interface AdminAuditMetadata {
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface AdminAuditLogEntity {
  auditId: string
  adminUserId: number
  adminEmail: string
  action: string
  targetDomain: 'booking' | 'payment' | 'loyalty' | 'experience' | 'customer' | 'maintenance'
  targetId: string
  reason: string
  metadata?: Record<string, unknown>
  executedAt: string
}

export interface AdminPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
