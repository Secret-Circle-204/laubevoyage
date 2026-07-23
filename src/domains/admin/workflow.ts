import type { Payload } from 'payload'
import { AdminRepository } from './repository'
import { AdminAuditLogService } from './audit-log-service'
import { AdminBookingOperations } from './booking-operations'
import { AdminPaymentOperations } from './payment-operations'
import { AdminLoyaltyOperations } from './loyalty-operations'
import { AdminExperienceOperations } from './experience-operations'
import { AdminCustomerOperations } from './customer-operations'
import { AdminMaintenanceOperations } from './maintenance-operations'
import { AdminPolicy } from './policy'
import type { AdminUserEntity, AdminPermission } from './types'

/**
 * Admin Workflow Engine
 * Central orchestrator enforcing RBAC permissions and recording immutable staff audit logs.
 */
export class AdminWorkflowEngine {
  public repository: AdminRepository
  public auditLogService: AdminAuditLogService
  public bookingOperations: AdminBookingOperations
  public paymentOperations: AdminPaymentOperations
  public loyaltyOperations: AdminLoyaltyOperations
  public experienceOperations: AdminExperienceOperations
  public customerOperations: AdminCustomerOperations
  public maintenanceOperations: AdminMaintenanceOperations

  constructor(payload: Payload) {
    this.repository = new AdminRepository(payload)
    this.auditLogService = new AdminAuditLogService(this.repository)
    this.bookingOperations = new AdminBookingOperations(payload)
    this.paymentOperations = new AdminPaymentOperations()
    this.loyaltyOperations = new AdminLoyaltyOperations(payload)
    this.experienceOperations = new AdminExperienceOperations(payload)
    this.customerOperations = new AdminCustomerOperations(payload)
    this.maintenanceOperations = new AdminMaintenanceOperations()
  }

  async executeStaffAction<T>(
    adminUser: AdminUserEntity,
    requiredPermission: AdminPermission,
    actionName: string,
    targetDomain: 'booking' | 'payment' | 'loyalty' | 'experience' | 'customer' | 'maintenance',
    targetId: string,
    reason: string,
    actionFn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    // 1. RBAC Policy check
    const policyResult = AdminPolicy.hasPermission(adminUser, requiredPermission)
    if (!policyResult.allowed) {
      throw new Error(`[AdminPolicy] Permission denied: ${policyResult.reason}`)
    }

    // 2. Execute staff action
    const result = await actionFn()

    // 3. Record immutable staff audit log
    await this.auditLogService.recordAction({
      adminUser,
      action: actionName,
      targetDomain,
      targetId,
      reason,
      metadata,
    })

    return result
  }
}
