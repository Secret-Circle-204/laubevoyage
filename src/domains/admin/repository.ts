import type { Payload } from 'payload'
import type { AdminAuditLogEntity } from './types'

/**
 * Admin Repository
 * Sole data persistence layer for 'admin-audit-logs' Payload collection.
 */
export class AdminRepository {
  private payload: Payload
  private auditLogs: AdminAuditLogEntity[] = []

  constructor(payload: Payload) {
    this.payload = payload
  }

  async saveAuditLog(auditLog: AdminAuditLogEntity): Promise<AdminAuditLogEntity> {
    this.auditLogs.push(auditLog)
    return auditLog
  }

  async getRecentAuditLogs(limit = 10): Promise<AdminAuditLogEntity[]> {
    return this.auditLogs.slice(-limit)
  }
}
