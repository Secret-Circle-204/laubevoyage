/**
 * Campaign Provider Interface
 * Strategy pattern for resolving seasonal campaigns, promotional multipliers, and partner rewards.
 */
export interface ICampaignProvider {
  getCampaignMultiplier(customerId: number, category?: string): Promise<number>
}

/**
 * Default Campaign Provider
 * Returns standard 1.0x multiplier.
 */
export class DefaultCampaignProvider implements ICampaignProvider {
  async getCampaignMultiplier(): Promise<number> {
    return 1.0
  }
}
