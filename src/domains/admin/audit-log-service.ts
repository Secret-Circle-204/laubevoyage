import type { AdminRepository } from './repository'
import type { AdminAuditLogEntity, AdminUserEntity } from './types'

/**
 * Immutable Staff Audit Log Service
 * Records every administrative action with zero `any` metadata.
 */
export class AdminAuditLogService {
  private repository: AdminRepository

  constructor(repository: AdminRepository) {
    this.repository = repository
  }

  async recordAction(params: {
    adminUser: AdminUserEntity
    action: string
    targetDomain: 'booking' | 'payment' | 'loyalty' | 'experience' | 'customer' | 'maintenance'
    targetId: string
    reason: string
    metadata?: Record<string, unknown>
  }): Promise<AdminAuditLogEntity> {
    const auditLog: AdminAuditLogEntity = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminUserId: params.adminUser.id,
      adminEmail: params.adminUser.email,
      action: params.action,
      targetDomain: params.targetDomain,
      targetId: params.targetId,
      reason: params.reason,
      metadata: params.metadata,
      executedAt: new Date().toISOString(),
    }

    return this.repository.saveAuditLog(auditLog)
  }
}
