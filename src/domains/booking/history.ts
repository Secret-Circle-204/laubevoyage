import type { Actor, CustomerTimelineEntry, SystemAuditEntry } from './types'

/**
 * Booking History Service
 * Manages Customer Timeline (public lifecycle progress) and System Audit Trail (internal security log).
 */
export class BookingHistoryService {
  /**
   * Append a customer-facing timeline progress entry.
   */
  static appendTimelineEntry(
    existingTimeline: CustomerTimelineEntry[] = [],
    params: {
      stepKey: string
      title: string
      description: string
      icon?: string
    },
  ): CustomerTimelineEntry[] {
    const entry: CustomerTimelineEntry = {
      stepKey: params.stepKey,
      title: params.title,
      description: params.description,
      icon: params.icon,
      timestamp: new Date().toISOString(),
    }

    return [...existingTimeline, entry]
  }

  /**
   * Append a system security audit trail entry.
   */
  static appendAuditEntry(
    existingAudit: SystemAuditEntry[] = [],
    params: {
      actor: Actor
      action: string
      reason?: string
      previousValue?: string
      newValue?: string
      metadata?: Record<string, unknown>
    },
  ): SystemAuditEntry[] {
    const entry: SystemAuditEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor: params.actor,
      action: params.action,
      reason: params.reason,
      previousValue: params.previousValue,
      newValue: params.newValue,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    }

    return [...existingAudit, entry]
  }
}
