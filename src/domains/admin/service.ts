import { AdminWorkflowEngine } from './workflow'
import { AdminRepository } from './repository'
import type { AdminUserEntity } from './types'
import type { MaintenanceJobName } from '../maintenance/types'
import type { CustomerService } from '../customer/service'
import type { LoyaltyService } from '../loyalty/service'
import type { BookingService } from '../booking/service'

/**
 * Admin Domain Service (Enterprise Thin Facade)
 * Single entry point for all administrative control panel actions via Constructor Dependency Injection.
 */
export class AdminService {
  private workflowEngine: AdminWorkflowEngine

  constructor(
    repository: AdminRepository,
    customerService?: CustomerService,
    loyaltyService?: LoyaltyService,
    bookingService?: BookingService,
  ) {
    this.workflowEngine = new AdminWorkflowEngine(
      repository,
      customerService,
      loyaltyService,
      bookingService,
    )
  }

  async cancelBookingByStaff(adminUser: AdminUserEntity, bookingId: number, reason: string): Promise<boolean> {
    return this.workflowEngine.executeStaffAction(
      adminUser,
      'manage_bookings',
      'cancel_booking_staff',
      'booking',
      String(bookingId),
      reason,
      () => this.workflowEngine.bookingOperations.cancelBookingByStaff(bookingId, reason),
    )
  }

  async toggleCustomerStatusByStaff(
    adminUser: AdminUserEntity,
    customerId: number,
    status: 'active' | 'suspended',
    reason: string,
  ): Promise<boolean> {
    return this.workflowEngine.executeStaffAction(
      adminUser,
      'manage_customers',
      'toggle_customer_status_staff',
      'customer',
      String(customerId),
      reason,
      () => this.workflowEngine.customerOperations.toggleCustomerStatusByStaff(customerId, status, reason),
      { status },
    )
  }

  async adjustCustomerPointsByStaff(
    adminUser: AdminUserEntity,
    customerId: number,
    pointsDelta: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    return this.workflowEngine.executeStaffAction(
      adminUser,
      'adjust_loyalty_points',
      'adjust_points_staff',
      'loyalty',
      String(customerId),
      reason,
      () => this.workflowEngine.loyaltyOperations.adjustCustomerPointsByStaff(customerId, pointsDelta, reason),
      { pointsDelta },
    )
  }

  async triggerMaintenanceJobByStaff(
    adminUser: AdminUserEntity,
    jobName: MaintenanceJobName,
    reason: string,
  ): Promise<{ success: boolean; itemsProcessed: number }> {
    return this.workflowEngine.executeStaffAction(
      adminUser,
      'trigger_maintenance',
      'trigger_maintenance_staff',
      'maintenance',
      jobName,
      reason,
      () => this.workflowEngine.maintenanceOperations.triggerMaintenanceJobByStaff(jobName),
    )
  }
}
