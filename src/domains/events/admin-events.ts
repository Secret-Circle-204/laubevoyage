export interface AdminActionRecordedEvent {
  type: 'ADMIN_ACTION_RECORDED'
  eventVersion: 'v1'
  auditId: string
  adminUserId: number
  adminEmail: string
  action: string
  targetDomain: string
  targetId: string
  timestamp: string
}

export type AdminDomainEvent = AdminActionRecordedEvent
