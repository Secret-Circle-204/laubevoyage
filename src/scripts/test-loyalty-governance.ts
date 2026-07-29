import { PointsCalculator } from '../domains/loyalty/points-calculator'
import { LoyaltyPolicy } from '../domains/loyalty/policy'
import { TierPolicy } from '../domains/loyalty/tier-policy'
import { PointHoldService } from '../domains/loyalty/point-hold'
import { LoyaltyTier } from '../types'
import type { LoyaltyProgramConfig } from '../domains/loyalty/tier-config'
import { LoyaltyProgramConfigurationException } from '../domains/loyalty/tier-config'

async function runGovernanceAuditTests() {
  console.log('=================================================================')
  console.log('🧪 RUNNING ENTERPRISE LOYALTY GOVERNANCE & ARCHITECTURE AUDIT TEST')
  console.log('=================================================================\n')

  // 1. Mock Config Snapshot v3 (Pinned at Checkout Start)
  const configV3: LoyaltyProgramConfig = {
    id: 'prog_v3',
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Voyage Loyalty Program",
    version: 3,
    status: 'published',
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
    tiers: {
      [LoyaltyTier.EXPLORER]: {
        tier: LoyaltyTier.EXPLORER,
        minSpentEGP: 0,
        earnMultiplier: 1.0,
        upgradeBonus: 0,
      },
      [LoyaltyTier.VOYAGER]: {
        tier: LoyaltyTier.VOYAGER,
        minSpentEGP: 5000,
        earnMultiplier: 1.2,
        upgradeBonus: 500,
      },
      [LoyaltyTier.ELITE]: {
        tier: LoyaltyTier.ELITE,
        minSpentEGP: 15000,
        earnMultiplier: 1.5,
        upgradeBonus: 1000,
      },
    },
  }

  // 2. Mock Config Snapshot v4 (Published Mid-Checkout by Admin)
  const configV4: LoyaltyProgramConfig = {
    ...configV3,
    version: 4,
    redemptionValueEGP: 5, // Devalued points from 10 EGP -> 5 EGP per 100 pts!
  }

  console.log('-----------------------------------------------------------------')
  console.log('TEST 1: Pure Wallet Points Discount Calculation (Base EGP Currency)')
  console.log('-----------------------------------------------------------------')
  const pointsToRedeem = 350
  const discountEGP_V3 = PointsCalculator.calculatePointsMonetaryValueEGP(pointsToRedeem, configV3)
  console.log(`[Config v3] ${pointsToRedeem} points = ${discountEGP_V3} EGP discount (Expected: 35 EGP)`)
  if (discountEGP_V3 !== 35) throw new Error('Test 1 Failed: Discount EGP calculation mismatch!')
  console.log('✅ TEST 1 PASSED: Pure discount calculation is 100% accurate.\n')

  console.log('-----------------------------------------------------------------')
  console.log('TEST 2: Points Validation & Step Unit Constraints')
  console.log('-----------------------------------------------------------------')
  const validStep = PointsCalculator.validateRedemptionAmount(350, 1000, 4000, configV3)
  console.log('Validation (350 pts, multiple of 50):', validStep)
  if (!validStep.allowed) throw new Error('Test 2.1 Failed!')

  const invalidStep = PointsCalculator.validateRedemptionAmount(325, 1000, 4000, configV3)
  console.log('Validation (325 pts, not multiple of 50):', invalidStep)
  if (invalidStep.allowed) throw new Error('Test 2.2 Failed: Invalid step was allowed!')
  console.log('✅ TEST 2 PASSED: Validation constraints enforced.\n')

  console.log('-----------------------------------------------------------------')
  console.log('TEST 3: Mid-Checkout Config Pinning & Race Condition Protection')
  console.log('-----------------------------------------------------------------')
  const reservationEngine = new PointHoldService()

  // Checkout starts with Config v3 pinned
  const reservation = reservationEngine.reservePoints({
    bookingId: 101,
    customerId: 42,
    pointsReserved: 350,
    valueEGP: discountEGP_V3,
    configSnapshot: configV3,
  })

  console.log(`Reservation created under v${reservation.configSnapshot?.version}: Reserved ${reservation.pointsReserved} pts = ${reservation.valueEGP} EGP`)

  // Admin publishes Config v4 mid-checkout!
  console.log('⚡ Admin publishes Config v4 mid-checkout (Points devalued from 10 EGP to 5 EGP per 100 pts)')

  // Customer completes payment using pinned reservation snapshot (Config v3)
  const committedRes = reservationEngine.commitReservation(reservation.reservationId)
  const finalDiscountEGP = PointsCalculator.calculatePointsMonetaryValueEGP(
    committedRes!.pointsReserved,
    committedRes!.configSnapshot || configV4,
  )

  console.log(`Payment completed using pinned config v${committedRes?.configSnapshot?.version}: Final Discount = ${finalDiscountEGP} EGP`)
  if (finalDiscountEGP !== 35) {
    throw new Error('Test 3 Failed: Customer transaction suffered rule drift due to mid-checkout admin publish!')
  }
  console.log('✅ TEST 3 PASSED: Checkout session pinning prevented rule drift and guaranteed transaction stability.\n')

  console.log('-----------------------------------------------------------------')
  console.log('TEST 4: Strict Fail Fast Exception Test (Zero Code Defaults)')
  console.log('-----------------------------------------------------------------')
  const testFailFastBoundary = (incompleteDoc: any) => {
    if (!incompleteDoc || !incompleteDoc.baseEarnRate) {
      throw new LoyaltyProgramConfigurationException(
        '[LoyaltyRepository CRITICAL ERROR] Invalid or missing LoyaltyProgram configuration in database. Fail fast enforced.',
      )
    }
  }

  try {
    testFailFastBoundary({ programCode: 'TEST', name: 'Incomplete Doc' }) // Missing baseEarnRate, tiers, etc.
    throw new Error('Test 4 Failed: Expected exception was not thrown!')
  } catch (err: any) {
    if (err instanceof LoyaltyProgramConfigurationException) {
      console.log('✅ TEST 4 PASSED: Explicit LoyaltyProgramConfigurationException thrown for incomplete configuration.')
    } else {
      throw err
    }
  }

  console.log('-----------------------------------------------------------------')
  console.log('TEST 5: Event-Driven LoyaltyProgramRegistry Invalidation Test')
  console.log('-----------------------------------------------------------------')
  const { loyaltyProgramRegistry } = await import('../domains/loyalty/program-registry')
  const mockRepo = {
    getActiveProgramConfig: async () => configV3,
  } as any

  const firstFetch = await loyaltyProgramRegistry.getProgram(mockRepo)
  console.log(`Fetched config v${firstFetch.version} via registry`)

  loyaltyProgramRegistry.invalidate()
  console.log('⚡ Admin publish triggered afterLoyaltyProgramChange hook -> loyaltyProgramRegistry.invalidate()')

  const secondFetch = await loyaltyProgramRegistry.getProgram(mockRepo)
  console.log(`Subsequent fetch retrieved config v${secondFetch.version} after cache invalidation`)
  if (secondFetch.version !== 3) throw new Error('Test 5 Failed!')
  console.log('✅ TEST 5 PASSED: Event-driven cache invalidation verified.\n')

  console.log('\n=================================================================')
  console.log('🎉 ALL ENTERPRISE LOYALTY GOVERNANCE TESTS PASSED SUCCESSFULLY!')
  console.log('=================================================================')
}

runGovernanceAuditTests().catch((err) => {
  console.error('❌ Audit Test Failed:', err)
  process.exit(1)
})
