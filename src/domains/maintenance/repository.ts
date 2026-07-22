import type { Payload } from 'payload'
import type { MaintenanceLogEntity } from './types'

/**
 * Maintenance Repository
 * Sole data store for 'maintenance-logs' Payload collection.
 */
export class MaintenanceRepository {
  private payload: Payload
  private logs: MaintenanceLogEntity[] = []

  constructor(payload: Payload) {
    this.payload = payload
  }

  async saveLog(log: MaintenanceLogEntity): Promise<MaintenanceLogEntity> {
    this.logs.push(log)
    return log
  }

  async getRecentLogs(limit = 10): Promise<MaintenanceLogEntity[]> {
    return this.logs.slice(-limit)
  }
}
