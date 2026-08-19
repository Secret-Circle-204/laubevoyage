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
import type { CustomerService } from '../customer/service'
import type { LoyaltyService } from '../loyalty/service'
import type { BookingService } from '../booking/service'

/**
 * Admin Workflow Engine
 * Central orchestrator enforcing RBAC permissions and recording immutable staff audit logs via Constructor Dependency Injection.
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

  constructor(
    repository?: AdminRepository | Payload,
    customerService?: CustomerService,
    loyaltyService?: LoyaltyService,
    bookingService?: BookingService,
  ) {
    if (repository && 'saveAuditLog' in repository) {
      this.repository = repository as AdminRepository
    } else {
      this.repository = new AdminRepository(repository as Payload)
    }
    this.auditLogService = new AdminAuditLogService(this.repository)
    this.bookingOperations = new AdminBookingOperations(bookingService)
    this.paymentOperations = new AdminPaymentOperations()
    this.loyaltyOperations = new AdminLoyaltyOperations(loyaltyService)
    this.experienceOperations = new AdminExperienceOperations()
    this.customerOperations = new AdminCustomerOperations(customerService)
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
