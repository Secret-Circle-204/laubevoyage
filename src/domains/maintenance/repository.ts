import type { Payload } from 'payload'
import type { MaintenanceLogEntity } from './types'
import type { Booking, MaintenanceLog } from '@/payload-types'

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

  get payloadInstance(): Payload | undefined {
    return this.payload
  }

  async saveLog(log: MaintenanceLogEntity): Promise<void> {
    this.logStore.set(log.logId, log)
    if (!this.payload) {
      console.log(`[MaintenanceRepository] Persisting execution log: ${log.jobName} (status: ${log.status})`)
      return
    }
    await this.payload.create({
      collection: 'maintenance-logs',
      data: log as unknown as MaintenanceLog,
    })
  }

  async getRecentLogs(limit: number): Promise<MaintenanceLogEntity[]> {
    if (limit === undefined || limit === null) {
      throw new Error('[MaintenanceRepository] getRecentLogs: limit is required.')
    }
    return Array.from(this.logStore.values()).slice(-limit)
  }

  async findConfirmedExpiredBookings(batchSize: number): Promise<Array<{ id: number; status: string }>> {
    if (!this.payload) {
      const emptyArray: Array<{ id: number; status: string }> = []
      return emptyArray
    }
    if (batchSize === undefined || batchSize === null) {
      throw new Error('[MaintenanceRepository] findConfirmedExpiredBookings: batchSize is required.')
    }
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
      const docs = res.docs as Booking[]
      if (!docs) {
        throw new Error('[MaintenanceRepository] findConfirmedExpiredBookings: Payload find did not return docs array.')
      }
      return docs.map((doc: Booking) => {
        const id = doc.id
        const status = doc.status
        if (id === undefined || id === null) {
          throw new Error('[MaintenanceRepository] findConfirmedExpiredBookings: booking id is missing.')
        }
        if (!status) {
          throw new Error('[MaintenanceRepository] findConfirmedExpiredBookings: booking status is missing.')
        }
        return { id: Number(id), status: String(status) }
      })
    } catch (err: unknown) {
      console.error('[MaintenanceRepository] Error querying expired confirmed bookings:', err)
      throw err
    }
  }

  async findStaleDraftBookings(batchSize: number): Promise<Array<{ id: number; status: string }>> {
    if (!this.payload) {
      const emptyArray: Array<{ id: number; status: string }> = []
      return emptyArray
    }
    if (batchSize === undefined || batchSize === null) {
      throw new Error('[MaintenanceRepository] findStaleDraftBookings: batchSize is required.')
    }
    try {
      const nowIso = new Date().toISOString()
      const res = await this.payload.find({
        collection: 'bookings',
        where: {
          status: { equals: 'draft' },
        },
        limit: 100,
      })

      const docs = res.docs as Booking[]
      if (!docs) {
        throw new Error('[MaintenanceRepository] findStaleDraftBookings: Payload find did not return docs array.')
      }

      const now = new Date(nowIso)
      const staleDocs = docs.filter((doc: Booking) => {
        const hold = doc.capacityHold as Record<string, unknown> | undefined
        if (hold) {
          if (hold.status === 'active') {
            const expiresAt = hold.expiresAt as string | undefined
            if (!expiresAt) return true
            return new Date(expiresAt) <= now
          }
          return false
        }
        return true
      })

      return staleDocs.slice(0, batchSize).map((doc: Booking) => {
        const id = doc.id
        const status = doc.status
        if (id === undefined || id === null) {
          throw new Error('[MaintenanceRepository] findStaleDraftBookings: booking id is missing.')
        }
        if (!status) {
          throw new Error('[MaintenanceRepository] findStaleDraftBookings: booking status is missing.')
        }
        return { id: Number(id), status: String(status) }
      })
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
      data: { status } as unknown as Partial<Booking>,
    })
  }
}
