import type { Payload } from 'payload'
import type { MaintenanceLogEntity } from './types'

/**
 * Maintenance Repository
 * Sole data store for maintenance queries and 'maintenance-logs' Payload collection.
 */
export class MaintenanceRepository {
  private payload?: Payload
  private logs: MaintenanceLogEntity[] = []

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async saveLog(log: MaintenanceLogEntity): Promise<MaintenanceLogEntity> {
    this.logs.push(log)
    return log
  }

  async getRecentLogs(limit = 10): Promise<MaintenanceLogEntity[]> {
    return this.logs.slice(-limit)
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
      return (res.docs || []).map((doc: any) => ({ id: Number(doc.id), status: String(doc.status) }))
    } catch (err: unknown) {
      console.error('[MaintenanceRepository] Failed querying expired confirmed bookings:', err)
      return []
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
          createdAt: { less_than: nowIso },
        },
        limit: batchSize,
      })
      return (res.docs || []).map((doc: any) => ({ id: Number(doc.id), status: String(doc.status) }))
    } catch (err: unknown) {
      console.error('[MaintenanceRepository] Failed querying stale draft bookings:', err)
      return []
    }
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<void> {
    if (!this.payload) return
    try {
      await this.payload.update({
        collection: 'bookings',
        id: bookingId,
        data: { status } as any,
      })
    } catch (err: unknown) {
      console.error(`[MaintenanceRepository] Failed updating status for booking #${bookingId}:`, err)
    }
  }
}
