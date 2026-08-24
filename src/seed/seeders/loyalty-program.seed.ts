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
          label: 'Explorer',
          minSpentEGP: 0,
          earnMultiplier: 1.0,
          upgradeBonus: 0,
        },
        {
          tier: 'voyager',
          label: 'Voyager',
          minSpentEGP: 5000,
          earnMultiplier: 1.2,
          upgradeBonus: 500,
        },
        {
          tier: 'elite',
          label: 'Elite',
          minSpentEGP: 15000,
          earnMultiplier: 1.5,
          upgradeBonus: 1000,
        },
      ],
    },
  })

  // Seed translation cache for Explorer, Voyager, Elite
  const translations = [
    { originalHash: 'Explorer', sourceText: 'Explorer', language: 'ar', translatedText: 'المستكشف' },
    { originalHash: 'Voyager', sourceText: 'Voyager', language: 'ar', translatedText: 'المسافر' },
    { originalHash: 'Elite', sourceText: 'Elite', language: 'ar', translatedText: 'النخبة' },
  ]

  for (const trans of translations) {
    try {
      // Clean up any existing incorrect translation to overwrite it
      await payload.delete({
        collection: 'translation-cache',
        where: {
          and: [
            { originalHash: { equals: trans.originalHash } },
            { language: { equals: trans.language } },
          ],
        },
      })

      await payload.create({
        collection: 'translation-cache',
        data: {
          originalHash: trans.originalHash,
          sourceText: trans.sourceText,
          language: trans.language,
          translatedText: trans.translatedText,
          provider: 'seeder',
          version: 1,
        },
      })
      console.log(`   ✅ Seeded translation cache for ${trans.originalHash} -> ${trans.translatedText}`)
    } catch (err: any) {
      console.log(`   ⚠️ Failed seeding translation cache for ${trans.originalHash}:`, err.message)
    }
  }

  console.log('✅ LoyaltySettings global configuration seeded successfully.')
}
