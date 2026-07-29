import type { LoyaltyProgramConfig } from './tier-config'
import type { LoyaltyRepository } from './repository'

/**
 * Loyalty Program Registry (Runtime Memory Cache Manager)
 * Pure cache manager for active published LoyaltyProgramConfig.
 * Decoupled from Payload CMS imports and mapping responsibilities.
 * Follows Single Responsibility Principle (SRP) and matches systemSettingsRegistry pattern.
 */
export class LoyaltyProgramRegistry {
  private static instance: LoyaltyProgramRegistry
  private cache: LoyaltyProgramConfig | null = null

  private constructor() {}

  public static getInstance(): LoyaltyProgramRegistry {
    if (!LoyaltyProgramRegistry.instance) {
      LoyaltyProgramRegistry.instance = new LoyaltyProgramRegistry()
    }
    return LoyaltyProgramRegistry.instance
  }

  /**
   * Get active published LoyaltyProgramConfig.
   * If pinnedConfig is provided (e.g. from a CheckoutSession), returns pinnedConfig.
   * Otherwise returns perpetually cached config, fetching from repository on cache miss.
   */
  public async getProgram(
    repository: LoyaltyRepository,
    pinnedConfig?: LoyaltyProgramConfig,
  ): Promise<LoyaltyProgramConfig> {
    if (pinnedConfig) return pinnedConfig

    if (this.cache) {
      return this.cache
    }

    const config = await repository.getActiveProgramConfig()
    this.cache = config
    return this.cache
  }

  /**
   * Event-driven cache invalidation (triggered by Payload afterChange hook).
   */
  public invalidate(): void {
    console.log('[LoyaltyProgramRegistry] Event-driven cache invalidated.')
    this.cache = null
  }
}

export const loyaltyProgramRegistry = LoyaltyProgramRegistry.getInstance()
