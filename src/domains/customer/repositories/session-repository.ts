import type { Payload, PayloadRequest } from 'payload'
import type { DeviceSessionEntity } from '../types'

/**
 * Device Session Repository
 * Sole data persistence layer for the 'customer-device-sessions' Payload collection.
 */
export class DeviceSessionRepository {
  private payload?: Payload

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async findActiveByCustomerId(customerId: number, req?: PayloadRequest): Promise<DeviceSessionEntity[]> {
    if (!this.payload) return []
    const result = await this.payload.find({
      collection: 'customer-device-sessions',
      where: {
        customer: { equals: customerId },
        isRevoked: { equals: false },
      },
      limit: 50,
      req,
    })

    return result.docs.map((doc: any) => ({
      sessionId: doc.sessionId || String(doc.id),
      customerId: typeof doc.customer === 'object' ? Number(doc.customer.id) : Number(doc.customer),
      deviceName: doc.deviceName,
      ipAddress: doc.ipAddress,
      lastActiveAt: doc.lastActiveAt ? new Date(doc.lastActiveAt).toISOString() : new Date().toISOString(),
      isRevoked: doc.isRevoked ?? false,
    }))
  }

  async createSession(session: DeviceSessionEntity, req?: PayloadRequest): Promise<DeviceSessionEntity> {
    if (!this.payload) throw new Error('[DeviceSessionRepository] Payload instance not initialized.')
    const doc = await this.payload.create({
      collection: 'customer-device-sessions',
      data: {
        customer: session.customerId,
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        lastActiveAt: session.lastActiveAt,
        isRevoked: false,
      },
      req,
    })

    return {
      sessionId: doc.sessionId || String(doc.id),
      customerId: session.customerId,
      deviceName: doc.deviceName,
      ipAddress: doc.ipAddress,
      lastActiveAt: doc.lastActiveAt ? new Date(doc.lastActiveAt).toISOString() : new Date().toISOString(),
      isRevoked: doc.isRevoked ?? false,
    }
  }

  async revokeSession(sessionId: string, req?: PayloadRequest): Promise<boolean> {
    if (!this.payload) return false
    const result = await this.payload.find({
      collection: 'customer-device-sessions',
      where: {
        sessionId: { equals: sessionId },
      },
      limit: 1,
      req,
    })

    if (!result.docs[0]) return false

    await this.payload.update({
      collection: 'customer-device-sessions',
      id: result.docs[0].id,
      data: {
        isRevoked: true,
      },
      req,
    })

    return true
  }
}
