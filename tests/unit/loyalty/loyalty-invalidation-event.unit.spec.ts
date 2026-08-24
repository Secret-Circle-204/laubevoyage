import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoyaltyProgramRegistry } from '@/domains/loyalty/program-registry'
import { EventBus } from '@/domains/events/event-bus'
import { registerSystemCacheSubscriber } from '@/domains/events/subscribers/cache-subscribers'
import { afterLoyaltySettingsChange } from '@/globals/hooks/afterLoyaltySettingsChange'

describe('Event-Driven LoyaltyProgramRegistry Invalidation Test', () => {
  let registry: LoyaltyProgramRegistry
  let eventBus: EventBus

  const initialConfig = {
    version: 1,
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Voyage Loyalty Program",
    baseEarnRate: 0.1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    tiers: [],
  }

  const updatedConfig = {
    version: 2,
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Voyage Loyalty Program (Updated)",
    baseEarnRate: 0.2, // Changed!
    redemptionPointsUnit: 100,
    redemptionValueEGP: 20,
    tiers: [],
  }

  beforeEach(() => {
    registry = LoyaltyProgramRegistry.getInstance()
    registry.invalidate()
    registerSystemCacheSubscriber()
  })

  it('should return cached config on subsequent calls, then return fresh config immediately upon CMS hook and event propagation', async () => {
    const mockRepo = {
      getActiveProgramConfig: vi.fn().mockResolvedValueOnce(initialConfig).mockResolvedValueOnce(updatedConfig),
    }

    // 1. Initial Fetch -> Cache Miss
    const config1 = await registry.getProgram(mockRepo as any)
    expect(config1.baseEarnRate).toBe(0.1)
    expect(mockRepo.getActiveProgramConfig).toHaveBeenCalledTimes(1)

    // 2. Second Fetch -> Cache Hit (no repo call)
    const config2 = await registry.getProgram(mockRepo as any)
    expect(config2.baseEarnRate).toBe(0.1)
    expect(mockRepo.getActiveProgramConfig).toHaveBeenCalledTimes(1)

    // 3. CMS Global Update: afterLoyaltySettingsChange hook executes
    await afterLoyaltySettingsChange({
      doc: {
        baseEarnRate: 0.2,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 20,
      },
      previousDoc: initialConfig,
      data: {
        baseEarnRate: 0.2,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 20,
      },
      req: {} as any,
      context: {},
      global: {} as any,
    })

    // 4. Next Fetch -> Cache Miss -> Fetches Fresh Configuration
    const config3 = await registry.getProgram(mockRepo as any)
    expect(config3.baseEarnRate).toBe(0.2)
    expect(config3.version).toBe(2)
    expect(mockRepo.getActiveProgramConfig).toHaveBeenCalledTimes(2)
  })
})
