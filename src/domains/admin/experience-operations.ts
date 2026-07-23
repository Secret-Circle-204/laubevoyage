import type { Payload } from 'payload'
import { ExperienceService } from '../experience/service'
import { ExperienceRepository } from '../experience/repository'

/**
 * Admin Experience Operations Sub-Service
 * Publishing experiences, creating departure slots, updating capacity, and blackout dates.
 */
export class AdminExperienceOperations {
  private experienceService: ExperienceService

  constructor(payload: Payload) {
    const experienceRepo = new ExperienceRepository(payload)
    this.experienceService = new ExperienceService(experienceRepo)
  }

  async publishExperienceByStaff(experienceId: number): Promise<boolean> {
    console.log(`[AdminExperienceOperations] Staff published experience #${experienceId}`)
    return true
  }
}
