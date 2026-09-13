import type { LoyaltyProgramConfig } from './tier-config'
import type { LoyaltyRepository } from './repository'
import type { RequestContext } from '@/types'

/**
 * Loyalty Program Registry (Runtime Memory Cache Manager)
 * Pure cache manager for active published LoyaltyProgramConfig.
 * Decoupled from Payload CMS imports and mapping responsibilities.
 * Follows Single Responsibility Principle (SRP) and matches systemSettingsRegistry pattern.
 */
const LOYALTY_PROGRAM_GLOBAL_KEY = Symbol.for('laube.loyalty.program.registry.instance')

export class LoyaltyProgramRegistry {
  private cache: LoyaltyProgramConfig | null = null
  public readonly id = Math.random().toString(36).substring(2, 9)

  private constructor() {
    console.log(
      `[LoyaltyProgramRegistry] Class constructor initialized. Instance ID: ${this.id}, PID: ${process.pid}, Uptime: ${process.uptime()}s`,
    )
  }

  public static getInstance(): LoyaltyProgramRegistry {
    const globalContext = globalThis as unknown as Record<
      typeof LOYALTY_PROGRAM_GLOBAL_KEY,
      LoyaltyProgramRegistry
    >
    if (!globalContext[LOYALTY_PROGRAM_GLOBAL_KEY]) {
      globalContext[LOYALTY_PROGRAM_GLOBAL_KEY] = new LoyaltyProgramRegistry()
    }
    return globalContext[LOYALTY_PROGRAM_GLOBAL_KEY]
  }

  /**
   * Get active published LoyaltyProgramConfig.
   * If pinnedConfig is provided (e.g. from a CheckoutSession), returns pinnedConfig.
   * Otherwise returns perpetually cached config, fetching from repository on cache miss.
   */
  public async getProgram(
    repository: LoyaltyRepository,
    pinnedConfig?: LoyaltyProgramConfig,
    context?: RequestContext,
  ): Promise<LoyaltyProgramConfig> {
    if (pinnedConfig) return pinnedConfig

    if (this.cache) {
      return this.cache
    }

    const config = await repository.getActiveProgramConfig(undefined, context)
    this.cache = config
    return this.cache
  }

  /**
   * Event-driven cache invalidation (triggered by Payload afterChange hook or PG NOTIFY).
   */
  public invalidate(): void {
    console.log(
      `[LoyaltyProgramRegistry.invalidate] Invalidating cache on instance: ${this.id}, PID: ${process.pid}`,
    )
    this.cache = null
  }
}

export const loyaltyProgramRegistry = LoyaltyProgramRegistry.getInstance()
