export interface NotificationEnqueuedEvent {
  type: 'NOTIFICATION_ENQUEUED'
  eventVersion: 'v1'
  jobId: string
  referenceType: string
  referenceId: string
  channel: string
  recipient: string
  priority: string
  timestamp: string
}

export interface NotificationDeliveredEvent {
  type: 'NOTIFICATION_DELIVERED'
  eventVersion: 'v1'
  jobId: string
  recipient: string
  deliveredAt: string
  timestamp: string
}

export type NotificationDomainEvent =
  | NotificationEnqueuedEvent
  | NotificationDeliveredEvent
