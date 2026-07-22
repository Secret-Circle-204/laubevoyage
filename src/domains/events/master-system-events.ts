export interface SystemBootstrappedEvent {
  type: 'SYSTEM_BOOTSTRAPPED'
  eventVersion: 'v1'
  subscribersCount: number
  timestamp: string
}

export interface SystemHealthReportedEvent {
  type: 'SYSTEM_HEALTH_REPORTED'
  eventVersion: 'v1'
  healthScore: number
  status: string
  timestamp: string
}

export type MasterSystemEvent = SystemBootstrappedEvent | SystemHealthReportedEvent
