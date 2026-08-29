import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { SystemRepository } from '../domains/system/repository'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { sql } from '@payloadcms/db-postgres'

async function runHoldsAggregationVerification() {
  console.log('======================================================================')
  console.log('🔬 GATE 17.5.38: P0 ACTIVE HOLDS DATABASE AGGREGATION VERIFICATION')
  console.log('======================================================================\n')

  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  // Initialize System Settings
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  const domainServices = await getDomainServices()
  const bookingRepo = domainServices.booking.getRepository()

  const timestamp = Date.now()
  const testEmail = `holds_agg_${timestamp}@example.com`

  console.log(`📦 Creating isolated test customer: ${testEmail}...`)
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: testEmail,
      firstName: 'Holds',
      lastName: 'AggregatorTest',
      password: 'Password123!',
      status: 'active',
      _verified: true,
    },
  })
  const customerId = customer.id
  console.log(`✅ Test Customer created with ID: #${customerId}\n`)

  try {
    // ------------------------------------------------------------------------
    // TEST 1: ZERO HOLDS
    // ------------------------------------------------------------------------
    console.log('--- 🧪 TEST 1: Zero Holds Verification ---')
    const t0T1 = performance.now()
    const summary1 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    const d1 = performance.now() - t0T1
    console.log(`• Calculated Result: Total Points = ${summary1.totalPoints}, Count = ${summary1.count} (Duration: ${d1.toFixed(2)}ms)`)
    if (summary1.totalPoints !== 0 || summary1.count !== 0) {
      throw new Error(`TEST 1 FAILED: Expected { totalPoints: 0, count: 0 }, got ${JSON.stringify(summary1)}`)
    }
    console.log('✅ TEST 1 PASSED: Zero holds returned exact 0/0.\n')

    // ------------------------------------------------------------------------
    // TEST 2: RELEASED AND COMMITTED HOLDS EXCLUSION
    // ------------------------------------------------------------------------
    console.log('--- 🧪 TEST 2: Released & Committed Holds Exclusion ---')
    const slotRes = await payload.find({ collection: 'departure-slots', limit: 1 })
    const expRes = await payload.find({ collection: 'experiences', limit: 1 })
    const slotId = slotRes.docs[0]?.id || 1
    const expId = expRes.docs[0]?.id || 1

    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-REL-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'draft',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date().toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_rel_${timestamp}`,
          pointsHeld: 150,
          status: 'released',
          heldAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        } as any,
      },
    })

    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-COM-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'confirmed',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date().toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_com_${timestamp}`,
          pointsHeld: 250,
          status: 'committed',
          heldAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        } as any,
      },
    })

    const summary2 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    console.log(`• Calculated Result: Total Points = ${summary2.totalPoints}, Count = ${summary2.count}`)
    if (summary2.totalPoints !== 0 || summary2.count !== 0) {
      throw new Error(`TEST 2 FAILED: Expected { totalPoints: 0, count: 0 }, got ${JSON.stringify(summary2)}`)
    }
    console.log('✅ TEST 2 PASSED: Released & committed holds correctly excluded.\n')

    // ------------------------------------------------------------------------
    // TEST 3: EXPIRED DRAFT HOLDS EXCLUSION
    // ------------------------------------------------------------------------
    console.log('--- 🧪 TEST 3: Expired Draft Holds Exclusion (Past TTL) ---')
    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-EXP-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'draft',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date(Date.now() - 3600000).toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_exp_${timestamp}`,
          pointsHeld: 300,
          status: 'held',
          heldAt: new Date(Date.now() - 7200000).toISOString(),
          expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        } as any,
      },
    })

    const summary3 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    console.log(`• Calculated Result: Total Points = ${summary3.totalPoints}, Count = ${summary3.count}`)
    if (summary3.totalPoints !== 0 || summary3.count !== 0) {
      throw new Error(`TEST 3 FAILED: Expected { totalPoints: 0, count: 0 }, got ${JSON.stringify(summary3)}`)
    }
    console.log('✅ TEST 3 PASSED: Expired draft holds correctly excluded.\n')

    // ------------------------------------------------------------------------
    // TEST 4: ACTIVE DRAFT & PENDING PAYMENT HOLDS INCLUSION
    // ------------------------------------------------------------------------
    console.log('--- 🧪 TEST 4: Active Draft & Pending Payment Holds Inclusion ---')
    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-ACT1-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'draft',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_act1_${timestamp}`,
          pointsHeld: 100,
          status: 'held',
          heldAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        } as any,
      },
    })

    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-ACT2-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'pending_payment',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_act2_${timestamp}`,
          pointsHeld: 150,
          status: 'held',
          heldAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        } as any,
      },
    })

    const summary4 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    console.log(`• Calculated Result: Total Points = ${summary4.totalPoints}, Count = ${summary4.count}`)
    if (summary4.totalPoints !== 250 || summary4.count !== 2) {
      throw new Error(`TEST 4 FAILED: Expected { totalPoints: 250, count: 2 }, got ${JSON.stringify(summary4)}`)
    }
    console.log('✅ TEST 4 PASSED: Active draft/pending_payment holds correctly aggregated (250 pts, 2 holds).\n')

    // ------------------------------------------------------------------------
    // TEST 5: PENDING ADMIN REVIEW HOLDS (AUTHORITATIVE LIFECYCLE CONTRACT)
    // ------------------------------------------------------------------------
    console.log('--- 🧪 TEST 5: Pending Admin Review Holds (Lifecycle Contract with Past TTL) ---')
    await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-AGG-REV-${timestamp}`,
        user: customerId,
        experience: expId,
        departureSlot: slotId,
        status: 'pending_admin_review',
        source: 'website',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        travelers: [{ firstName: 'Holds', lastName: 'Tester', type: 'adult', email: testEmail, phone: '+201000000000' }],
        paymentWindowExpiresAt: new Date(Date.now() - 3600000).toISOString(),
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        },
        pointHold: {
          holdId: `hld_rev_${timestamp}`,
          pointsHeld: 350,
          status: 'held',
          heldAt: new Date(Date.now() - 7200000).toISOString(),
          expiresAt: new Date(Date.now() - 3600000).toISOString(), // past TTL, but active because status is pending_admin_review
        } as any,
      },
    })

    const summary5 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    console.log(`• Calculated Result: Total Points = ${summary5.totalPoints}, Count = ${summary5.count}`)
    if (summary5.totalPoints !== 600 || summary5.count !== 3) {
      throw new Error(`TEST 5 FAILED: Expected { totalPoints: 600, count: 3 }, got ${JSON.stringify(summary5)}`)
    }
    console.log('✅ TEST 5 PASSED: pending_admin_review hold correctly honored (Total: 600 pts, 3 holds).\n')

    // ------------------------------------------------------------------------
    // TEST 6: EXTREME VOLUME & ZERO TRUNCATION PROOF (1,225 ACTIVE HOLDS)
    // ------------------------------------------------------------------------
    console.log('======================================================================')
    console.log('🔬 TEST 6: EXTREME VOLUME & ZERO TRUNCATION PROOF (1,225 ACTIVE HOLDS)')
    console.log('======================================================================')
    
    // Purge previous test bookings
    await drizzle.execute(sql.raw(`DELETE FROM "bookings" WHERE "user_id" = ${customerId}`))

    console.log('   ⏳ Injecting 1,225 active holds in batches...')
    const batchSize = 100
    const totalToInject = 1225
    for (let i = 0; i < totalToInject; i += batchSize) {
      const currentBatch = Math.min(batchSize, totalToInject - i)
      const values: string[] = []
      for (let j = 0; j < currentBatch; j++) {
        const idx = i + j
        const bNum = `LBV-AGG-SCALE-${timestamp}-${idx}`
        const idemp = `idemp_agg_scale_${timestamp}_${idx}`
        const holdJson = JSON.stringify({
          holdId: `hld_scale_${idx}`,
          pointsHeld: 100,
          status: 'held',
          heldAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        })
        const pricingJson = JSON.stringify({
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
        })
        values.push(`(
          '${bNum}', '${idemp}', ${customerId}, ${expId}, ${slotId},
          'pending_admin_review', 'website', '2026-09-15', '2026-09-15', '${new Date().toISOString()}',
          1000, 1000, 1000, 'EGP', 1000, 1,
          '${holdJson}'::jsonb, NOW(), NOW()
        )`)
      }

      await drizzle.execute(sql.raw(`
        INSERT INTO "bookings" (
          "booking_number", "idempotency_key", "user_id", "experience_id", "departure_slot_id",
          "status", "source", "start_date", "end_date", "payment_window_expires_at",
          "pricing_snapshot_base_price_e_g_p", "pricing_snapshot_subtotal_e_g_p", "pricing_snapshot_total_amount_e_g_p",
          "pricing_snapshot_display_currency", "pricing_snapshot_display_amount", "pricing_snapshot_exchange_rate",
          "point_hold", "created_at", "updated_at"
        ) VALUES ${values.join(',')}
      `))
    }
    console.log('   ✅ Successfully injected 1,225 active holds.')

    const heapBefore = process.memoryUsage().heapUsed / 1024 / 1024
    const t0Scale = performance.now()
    const scaleSummary = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    const scaleDuration = performance.now() - t0Scale
    const heapAfter = process.memoryUsage().heapUsed / 1024 / 1024
    const heapDiffMB = Math.max(0, heapAfter - heapBefore)

    console.log(`\n• Total Injected Holds in PostgreSQL          : 1,225 active holds (100 pts each)`)
    console.log(`• Expected Total Points                      : 122,500 pts`)
    console.log(`• Authoritative Reported Total Points        : ${scaleSummary.totalPoints} pts`)
    console.log(`• Authoritative Reported Active Holds Count  : ${scaleSummary.count} holds`)
    console.log(`• Database Execution Latency                 : ${scaleDuration.toFixed(2)}ms`)
    console.log(`• Node.js Heap Memory Overhead               : +${heapDiffMB.toFixed(2)} MB`)
    console.log(`• Truncation Status                          : ${scaleSummary.count === 1225 ? '🟢 ZERO TRUNCATION (Exact 1,225 holds & 122,500 pts)' : '🔴 TRUNCATION DETECTED'}`)

    if (scaleSummary.count !== 1225 || scaleSummary.totalPoints !== 122500) {
      throw new Error(`TEST 6 FAILED: Expected { totalPoints: 122500, count: 1225 }, got ${JSON.stringify(scaleSummary)}`)
    }

    console.log('\n======================================================================')
    console.log('🎉 ALL 6 VERIFICATION TEST CASES PASSED WITH 100% MATHEMATICAL PRECISION')
    console.log('======================================================================\n')
  } finally {
    console.log('🧹 CLEANUP: Purging test records from database...')
    await drizzle.execute(sql.raw(`DELETE FROM "bookings" WHERE "user_id" = ${customerId}`))
    await drizzle.execute(sql.raw(`DELETE FROM "customers" WHERE "id" = ${customerId}`))
    console.log('✅ Cleanup complete: 100% isolated.\n')
  }
}

runHoldsAggregationVerification().catch((err) => {
  console.error('❌ Verification script failed:', err)
  process.exit(1)
})
