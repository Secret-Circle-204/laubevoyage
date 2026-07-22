import type { Payload } from 'payload'
import { AdminWorkflowEngine } from './workflow'
import type { AdminUserEntity } from './types'
import type { MaintenanceJobName } from '../maintenance/types'

/**
 * Admin Domain Service (Enterprise Thin Facade)
 * Single entry point for all administrative control panel actions.
 */
export class AdminService {
  private workflowEngine: AdminWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new AdminWorkflowEngine(payload)
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
