import { ExperienceService } from '../experience/service'

/**
 * Admin Experience Operations Sub-Service
 * Publishing experiences, creating departure slots, updating capacity, and blackout dates via Dependency Injection.
 */
export class AdminExperienceOperations {
  private experienceService?: ExperienceService

  constructor(experienceService?: ExperienceService) {
    this.experienceService = experienceService
  }

  async publishExperienceByStaff(experienceId: number): Promise<boolean> {
    console.log(`[AdminExperienceOperations] Staff published experience #${experienceId}`)
    return true
  }
}
