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
  public readonly id = Math.random().toString(36).substring(2, 9)

  private constructor() {
    console.log(
      `[LoyaltyProgramRegistry] Class constructor initialized. Instance ID: ${this.id}, PID: ${process.pid}, Uptime: ${process.uptime()}s`,
    )
  }

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
    console.log(
      `[LoyaltyProgramRegistry.getProgram] Instance ID: ${this.id}, PinnedConfig passed: ${!!pinnedConfig}, PID: ${process.pid}`,
    )
    if (pinnedConfig) return pinnedConfig

    if (this.cache) {
      console.log(
        `[LoyaltyProgramRegistry.getProgram] Returning CACHED config from instance: ${this.id}. Cache data:`,
        {
          baseEarnRate: this.cache.baseEarnRate,
          redemptionPointsUnit: this.cache.redemptionPointsUnit,
          redemptionValueEGP: this.cache.redemptionValueEGP,
        },
      )
      return this.cache
    }

    const config = await repository.getActiveProgramConfig()
    console.log(
      `[LoyaltyProgramRegistry.getProgram] Cache MISS. Fetched fresh from DB. Storing in instance: ${this.id}. Data:`,
      {
        baseEarnRate: config.baseEarnRate,
        redemptionPointsUnit: config.redemptionPointsUnit,
        redemptionValueEGP: config.redemptionValueEGP,
      },
    )
    this.cache = config
    return this.cache
  }

  /**
   * Event-driven cache invalidation (triggered by Payload afterChange hook).
   */
  public invalidate(): void {
    console.log(
      `[LoyaltyProgramRegistry.invalidate] Invalidating cache on instance: ${this.id}, PID: ${process.pid}`,
    )
    this.cache = null
  }
}

export const loyaltyProgramRegistry = LoyaltyProgramRegistry.getInstance()
