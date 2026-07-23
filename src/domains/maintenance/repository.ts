import type { Payload } from 'payload'
import type { MaintenanceLogEntity } from './types'

/**
 * Maintenance Domain Repository
 * Intercepts database persistence for maintenance execution logs.
 */
export class MaintenanceRepository {
  private payload?: Payload
  private logStore: Map<string, MaintenanceLogEntity> = new Map()

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async saveLog(log: MaintenanceLogEntity): Promise<void> {
    this.logStore.set(log.logId, log)
    if (!this.payload) {
      console.log(`[MaintenanceRepository] Persisting execution log: ${log.jobName} (status: ${log.status})`)
      return
    }
    await this.payload.create({
      collection: 'maintenance-logs' as any,
      data: log as any,
    })
  }

  async getRecentLogs(limit: number = 10): Promise<MaintenanceLogEntity[]> {
    return Array.from(this.logStore.values()).slice(-limit)
  }

  async findConfirmedExpiredBookings(batchSize: number = 20): Promise<Array<{ id: number; status: string }>> {
    if (!this.payload) return []
    try {
      const nowIso = new Date().toISOString()
      const res = await this.payload.find({
        collection: 'bookings',
        where: {
          status: { equals: 'confirmed' },
          endDate: { less_than: nowIso },
        },
        limit: batchSize,
      })
      return (res.docs || []).map((doc: Record<string, any>) => ({ id: Number(doc.id), status: String(doc.status) }))
    } catch (err: unknown) {
      console.error('[MaintenanceRepository] Error querying expired confirmed bookings:', err)
      throw err
    }
  }

  async findStaleDraftBookings(batchSize: number = 20): Promise<Array<{ id: number; status: string }>> {
    if (!this.payload) return []
    try {
      const nowIso = new Date().toISOString()
      const res = await this.payload.find({
        collection: 'bookings',
        where: {
          status: { equals: 'draft' },
          holdUntil: { less_than: nowIso },
        },
        limit: batchSize,
      })
      return (res.docs || []).map((doc: Record<string, any>) => ({ id: Number(doc.id), status: String(doc.status) }))
    } catch (err: unknown) {
      console.error('[MaintenanceRepository] Error querying stale draft bookings:', err)
      throw err
    }
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<void> {
    if (!this.payload) return
    await this.payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { status } as any,
    })
  }
}
