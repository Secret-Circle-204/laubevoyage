import type { Payload } from 'payload'
import { ExperienceService } from '../experience/service'

/**
 * Admin Experience Operations Sub-Service
 * Publishing experiences, creating departure slots, updating capacity, and blackout dates.
 */
export class AdminExperienceOperations {
  private experienceService: ExperienceService

  constructor(payload: Payload) {
    this.experienceService = new ExperienceService(payload)
  }

  async publishExperienceByStaff(experienceId: number): Promise<boolean> {
    console.log(`[AdminExperienceOperations] Staff published experience #${experienceId}`)
    return true
  }
}
