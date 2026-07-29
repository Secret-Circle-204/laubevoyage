import type { Payload } from 'payload'

/**
 * Seeder for initial LoyaltySettings global business policy configuration.
 */
export async function seedLoyaltyProgram(payload: Payload): Promise<void> {
  console.log('📦 Seeding LoyaltySettings global business policy configuration...')

  await payload.updateGlobal({
    slug: 'loyalty-settings',
    data: {
      programCode: 'LAUBE_LOYALTY',
      name: 'L\'Aube Voyage Loyalty Program',
      version: 1,
      baseEarnRate: 1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 50,
      maxRedemptionPercent: 80,
      maxRedemptionFixedEGP: 5000,
      allowPartialRedemption: true,
      redemptionStepUnit: 50,
      welcomeBonus: 100,
      expirationMonths: 12,
      bonusNeverExpires: true,
      tiers: [
        {
          tier: 'explorer',
          minSpentEGP: 0,
          earnMultiplier: 1.0,
          upgradeBonus: 0,
        },
        {
          tier: 'voyager',
          minSpentEGP: 5000,
          earnMultiplier: 1.2,
          upgradeBonus: 500,
        },
        {
          tier: 'elite',
          minSpentEGP: 15000,
          earnMultiplier: 1.5,
          upgradeBonus: 1000,
        },
      ],
    },
  })

  console.log('✅ LoyaltySettings global configuration seeded successfully.')
}
