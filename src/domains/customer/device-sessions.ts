import { DeviceSessionRepository } from './repositories/session-repository'
import type { DeviceSessionEntity } from './types'

/**
 * Device Session Manager Sub-Service
 * Manages trusted device session tracking and active session revocation.
 */
export class DeviceSessionManager {
  private sessionRepo: DeviceSessionRepository

  constructor(sessionRepo: DeviceSessionRepository) {
    this.sessionRepo = sessionRepo
  }

  async getActiveSessions(customerId: number): Promise<DeviceSessionEntity[]> {
    return this.sessionRepo.findActiveByCustomerId(customerId)
  }

  async createSession(customerId: number, deviceName: string, ipAddress: string): Promise<DeviceSessionEntity> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return this.sessionRepo.createSession({
      sessionId,
      customerId,
      deviceName,
      ipAddress,
      lastActiveAt: new Date().toISOString(),
      isRevoked: false,
    })
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    return this.sessionRepo.revokeSession(sessionId)
  }
}
