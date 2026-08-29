import 'dotenv/config'
process.env.NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
import { getPayload } from 'payload'
import config from '../payload.config'
import { DashboardWorkflowEngine } from '../domains/dashboard/workflow'
import { DashboardProjectionRepository } from '../domains/dashboard/repository'
import { DashboardQueryBus } from '../domains/dashboard/query-bus'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../domains/customer/repositories/session-repository'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { BookingRepository } from '../domains/booking/repository'
import { EventBus } from '../domains/events/event-bus'
import { SystemRepository } from '../domains/system/repository'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { registerDashboardProjectionSubscribers } from '../domains/events/subscribers/dashboard-subscriber'
import { registerPresentationSubscriber } from '../domains/events/subscribers/presentation-subscriber'
import { LoyaltyService } from '../domains/loyalty/service'
import { PointHoldService } from '../domains/loyalty/point-hold'

interface PerfMetric {
  name: string
  durationMs: number
  details?: Record<string, any>
}

async function runPerformanceAudit() {
  console.log('======================================================================')
  console.log('🔬 GATE 17.5.35: RUNTIME PERFORMANCE, CACHE SCOPE & INVALIDATION AUDIT')
  console.log('======================================================================\n')

  const metrics: PerfMetric[] = []
  const payload = await getPayload({ config })

  // Initialize SystemSettingsRegistry
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  // Register event subscribers
  registerDashboardProjectionSubscribers(payload)
  registerPresentationSubscriber()

  const dashboardRepo = new DashboardProjectionRepository(payload)
  const customerRepo = new CustomerRepository(payload)
  const sessionRepo = new DeviceSessionRepository(payload)
  const loyaltyRepo = new LoyaltyRepository(payload)
  const bookingRepo = new BookingRepository(payload)
  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const workflowEngine = new DashboardWorkflowEngine(dashboardRepo, queryBus)
  const loyaltyService = new LoyaltyService(payload)

  // 1. SELECT OR CREATE TWO TEST CUSTOMERS FROM DB
  console.log('📦 STEP 0: Fetching or creating two test customers (Customer A & Customer B)...')
  const custFind = await payload.find({
    collection: 'customers',
    limit: 2,
  })

  let custDocA: any
  let custDocB: any

  if (custFind.docs.length >= 1) {
    custDocA = custFind.docs[0]
  } else {
    custDocA = await payload.create({
      collection: 'customers',
      data: {
        email: `perf_test_a_${Date.now()}@example.com`,
        firstName: 'PerfA',
        lastName: 'Test',
        password: 'Password123!',
        status: 'active',
        _verified: true,
      },
    })
  }

  if (custFind.docs.length >= 2) {
    custDocB = custFind.docs[1]
  } else {
    custDocB = await payload.create({
      collection: 'customers',
      data: {
        email: `perf_test_b_${Date.now()}@example.com`,
        firstName: 'PerfB',
        lastName: 'Test',
        password: 'Password123!',
        status: 'active',
        _verified: true,
      },
    })
  }

  console.log(`✅ Using Customer A ID: #${custDocA.id} (${custDocA.email})`)
  console.log(`✅ Using Customer B ID: #${custDocB.id} (${custDocB.email})\n`)

  // Ensure Customer A has 200 base points for testing
  const currentBalA = await loyaltyService.getCustomerBalance(custDocA.id)
  if (currentBalA < 200) {
    const topUp = 200 - currentBalA
    await payload.create({
      collection: 'point-ledger',
      data: {
        user: custDocA.id,
        type: 'earn',
        amount: topUp,
        balance: 200,
        reason: 'Perf Audit Baseline Topup',
        ledgerVersion: 1,
        referenceType: 'system_welcome',
        referenceId: `init_topup_${Date.now()}`,
      },
      context: { eventSource: 'domain' },
    })
  }

  // Pre-seed projection for Customer A
  await workflowEngine.executePortalOverviewWorkflow(custDocA.id)

  try {
    // ------------------------------------------------------------------------
    // TEST 1: NORMAL DASHBOARD READ (CACHE MISS THEN CACHE HIT)
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 1: Normal Dashboard Read Latency (Cache Miss vs Cache Hit)')
    console.log('----------------------------------------------------------------------')

    // 1.1 Cache Miss (First Assembly)
    const t0Miss = performance.now()
    const projMiss = await workflowEngine.executePortalOverviewWorkflow(custDocA.id)
    const tMiss = performance.now() - t0Miss
    metrics.push({ name: 'Test 1.1: Dashboard Read (Cache Miss / Full Aggregation)', durationMs: tMiss })
    console.log(`⏱️ [Cache Miss] Full Aggregation Duration: ${tMiss.toFixed(2)}ms`)
    console.log(`   Result: pointsBalance = ${projMiss.loyalty.pointsBalance}, tier = ${projMiss.loyalty.tier}`)

    // 1.2 Cache Hit (Subsequent Read)
    const t0Hit = performance.now()
    const projHit = await workflowEngine.executePortalOverviewWorkflow(custDocA.id)
    const tHit = performance.now() - t0Hit
    metrics.push({ name: 'Test 1.2: Dashboard Read (Cache Hit / Single Key Read)', durationMs: tHit })
    console.log(`⏱️ [Cache Hit] Pre-compiled Projection Read Duration: ${tHit.toFixed(2)}ms`)
    console.log(`   Speedup Factor: ${(tMiss / Math.max(0.1, tHit)).toFixed(1)}x faster on Cache Hit\n`)

    // ------------------------------------------------------------------------
    // TEST 2: ADMIN POINT ADJUSTMENT BREAKDOWN (MEASURING SYNCHRONOUS VS ASYNC)
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 2: Admin Direct Point Adjustment Breakdown')
    console.log('----------------------------------------------------------------------')

    const t0Admin = performance.now()
    // Admin creates Reverse -50 entry via payload.create (triggering hooks)
    const adminLedgerEntry = await payload.create({
      collection: 'point-ledger',
      data: {
        user: custDocA.id,
        type: 'reverse',
        amount: -50,
        balance: 150, // Should be recomputed authoritatively by beforePointLedgerChange
        reason: 'Admin Perf Test Reverse -50',
        ledgerVersion: 1,
        referenceType: 'admin_ticket',
        referenceId: `adm_perf_${Date.now()}`,
      },
    })
    const tAdminTotal = performance.now() - t0Admin
    metrics.push({ name: 'Test 2.1: Admin CREATE Request Wall-Clock Time', durationMs: tAdminTotal })
    console.log(`⏱️ [Admin Request] Total payload.create Wall-Clock: ${tAdminTotal.toFixed(2)}ms`)
    console.log(`   Result: Ledger Entry #${adminLedgerEntry.id}, Server Authoritative Balance: ${adminLedgerEntry.balance}`)

    // Wait for asynchronous outbox event processing
    console.log('   Waiting for outbox/subscriber projection rebuild...')
    const t0AsyncWait = performance.now()
    let updatedProjA: any = null
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const p = await dashboardRepo.findByCustomerId(custDocA.id)
      if (p && p.loyalty.pointsBalance === 150) {
        updatedProjA = p
        break
      }
    }
    const tAsyncTotal = performance.now() - t0AsyncWait
    metrics.push({ name: 'Test 2.2: End-to-End Consistency Latency', durationMs: tAsyncTotal })
    console.log(`⏱️ [Consistency Latency] Time until projection updated to 150 pts: ${tAsyncTotal.toFixed(2)}ms`)
    console.log(`   Updated Projection Points: ${updatedProjA?.loyalty?.pointsBalance}\n`)

    // ------------------------------------------------------------------------
    // TEST 3: POST-ADJUSTMENT NAVIGATION SIMULATION
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 3: Post-Adjustment Customer Navigation Latency')
    console.log('----------------------------------------------------------------------')

    const t0NavDash = performance.now()
    const navDash = await workflowEngine.executePortalOverviewWorkflow(custDocA.id)
    const tNavDash = performance.now() - t0NavDash
    metrics.push({ name: 'Test 3.1: Post-Adjustment /dashboard Read', durationMs: tNavDash })
    console.log(`⏱️ [/dashboard] Read Time after adjustment: ${tNavDash.toFixed(2)}ms (Points: ${navDash.loyalty.pointsBalance})`)

    const t0NavLoyalty = performance.now()
    const settledBal = await loyaltyService.getCustomerBalance(custDocA.id)
    const activeHolds = await bookingRepo.getActiveHeldPointsForCustomer(custDocA.id)
    const availLoyalty = Math.max(0, settledBal - activeHolds)
    const tNavLoyalty = performance.now() - t0NavLoyalty
    metrics.push({ name: 'Test 3.2: Post-Adjustment /dashboard/loyalty Live Derivation', durationMs: tNavLoyalty })
    console.log(`⏱️ [/dashboard/loyalty] Live Derivation Time: ${tNavLoyalty.toFixed(2)}ms (Available: ${availLoyalty})`)
    console.log(`   Consistency Check: /dashboard (${navDash.loyalty.pointsBalance}) === /dashboard/loyalty (${availLoyalty}): ${navDash.loyalty.pointsBalance === availLoyalty ? '✅ MATCH' : '❌ MISMATCH'}\n`)

    // ------------------------------------------------------------------------
    // TEST 4: BOOKING POINT-HOLD & RELEASE LIFECYCLE
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 4: Normal Booking Point-Hold & Release Lifecycle Latency')
    console.log('----------------------------------------------------------------------')

    const { getApplicationServices } = await import('../application/factory')
    const appServices = await getApplicationServices()

    // Find an experience and departure slot
    const slotRes = await payload.find({ collection: 'departure-slots', limit: 1 })
    if (slotRes.docs.length === 0) {
      throw new Error('No departure slots found')
    }
    const slot = slotRes.docs[0]
    const rawExp = slot.experience as any
    const expId = typeof rawExp === 'object' && rawExp !== null ? rawExp.id : rawExp
    const departure = await appServices.experience.resolveBookableDepartureBySlot(expId, slot.id)

    // Step 4.1: Create Booking with 100 points held
    const t0Hold = performance.now()
    const bookingId = await appServices.booking.create({
      userId: custDocA.id,
      departure,
      travelers: [
        { firstName: 'PerfA', lastName: 'Test', email: custDocA.email, phone: '+201000000000' },
      ],
      pointsToRedeem: 100,
      currency: 'EGP',
      source: 'website',
    })

    // Wait for projection update (available points should be 150 - 100 = 50, active holds = 1)
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const p = await dashboardRepo.findByCustomerId(custDocA.id)
      if (p && p.loyalty.activeHoldsCount === 1) {
        break
      }
    }
    const tHoldTotal = performance.now() - t0Hold
    metrics.push({ name: 'Test 4.1: Point-Hold Creation & Projection Update', durationMs: tHoldTotal })
    const projHeld = await dashboardRepo.findByCustomerId(custDocA.id)
    console.log(`⏱️ [Hold Created] Time to deduct hold: ${tHoldTotal.toFixed(2)}ms`)
    console.log(`   Projection: pointsBalance = ${projHeld?.loyalty.pointsBalance}, activeHoldsCount = ${projHeld?.loyalty.activeHoldsCount}`)

    // Step 4.2: Cancel Booking (Release Hold)
    const t0Cancel = performance.now()
    await appServices.booking.cancel(bookingId, 'Perf Test Cancellation')

    // Wait for projection update (available points should return to 150, active holds = 0)
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const p = await dashboardRepo.findByCustomerId(custDocA.id)
      if (p && p.loyalty.activeHoldsCount === 0) {
        break
      }
    }
    const tCancelTotal = performance.now() - t0Cancel
    metrics.push({ name: 'Test 4.2: Point-Hold Release & Projection Restoration', durationMs: tCancelTotal })
    const projRestored = await dashboardRepo.findByCustomerId(custDocA.id)
    console.log(`⏱️ [Hold Released] Time to restore hold: ${tCancelTotal.toFixed(2)}ms`)
    console.log(`   Projection: pointsBalance = ${projRestored?.loyalty.pointsBalance}, activeHoldsCount = ${projRestored?.loyalty.activeHoldsCount}\n`)

    // ------------------------------------------------------------------------
    // TEST 5: CROSS-CUSTOMER ISOLATION AUDIT
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 5: Cross-Customer Isolation Verification (Customer A vs B)')
    console.log('----------------------------------------------------------------------')

    // Pre-seed Customer B projection
    await workflowEngine.executePortalOverviewWorkflow(custDocB.id)
    const projB_Before = await dashboardRepo.findByCustomerId(custDocB.id)
    const projA_Before = await dashboardRepo.findByCustomerId(custDocA.id)

    console.log(`   Customer A Before: Points = ${projA_Before?.loyalty.pointsBalance}, UpdatedAt = ${projA_Before?.updatedAt}`)
    console.log(`   Customer B Before: Points = ${projB_Before?.loyalty.pointsBalance}, UpdatedAt = ${projB_Before?.updatedAt}`)

    // Mutate Customer A
    await payload.create({
      collection: 'point-ledger',
      data: {
        user: custDocA.id,
        type: 'earn',
        amount: 25,
        balance: 175,
        reason: 'Isolation Test Mutation on A',
        ledgerVersion: 1,
        referenceType: 'admin_ticket',
        referenceId: `iso_test_${Date.now()}`,
      },
    })

    // Wait 500ms
    await new Promise((r) => setTimeout(r, 500))

    const projA_After = await dashboardRepo.findByCustomerId(custDocA.id)
    const projB_After = await dashboardRepo.findByCustomerId(custDocB.id)

    const customerA_Changed = projA_After?.loyalty.pointsBalance === 175 && projA_After?.updatedAt !== projA_Before?.updatedAt
    const customerB_Untouched = projB_After?.loyalty.pointsBalance === 500 && projB_After?.updatedAt === projB_Before?.updatedAt

    console.log(`   Customer A After: Points = ${projA_After?.loyalty.pointsBalance} (Changed: ${customerA_Changed ? '✅ YES' : '❌ NO'})`)
    console.log(`   Customer B After: Points = ${projB_After?.loyalty.pointsBalance} (Untouched: ${customerB_Untouched ? '✅ YES' : '❌ NO'})`)
    console.log(`   Cross-Customer Isolation Status: ${customerA_Changed && customerB_Untouched ? '🟢 100% ISOLATED' : '🔴 LEAK DETECTED'}\n`)

    // ------------------------------------------------------------------------
    // TEST 6: BURST CONCURRENT EVENTS TEST
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------')
    console.log('🧪 TEST 6: Burst Concurrency & Idempotency Test (5 Rapid Events)')
    console.log('----------------------------------------------------------------------')

    const t0Burst = performance.now()
    const burstPromises = []
    for (let i = 1; i <= 5; i++) {
      burstPromises.push(
        payload.create({
          collection: 'point-ledger',
          data: {
            user: custDocA.id,
            type: 'earn',
            amount: 10,
            balance: 175 + i * 10,
            reason: `Burst Test Step ${i}`,
            ledgerVersion: 1,
            referenceType: 'admin_ticket',
            referenceId: `burst_${i}_${Date.now()}`,
          },
        })
      )
    }

    const burstResults = await Promise.all(burstPromises)
    const tBurstCreation = performance.now() - t0Burst
    metrics.push({ name: 'Test 6: Burst 5 Concurrent Admin Mutations', durationMs: tBurstCreation })
    console.log(`⏱️ [Burst Mutations] Created 5 concurrent ledger entries in: ${tBurstCreation.toFixed(2)}ms (Avg: ${(tBurstCreation / 5).toFixed(2)}ms/entry)`)

    // Wait for all burst events to settle in projection
    let finalProjA: any = null
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const p = await dashboardRepo.findByCustomerId(custDocA.id)
      if (p && p.loyalty.pointsBalance === 225) { // 175 + 50 = 225
        finalProjA = p
        break
      }
    }
    console.log(`   Final Settled Projection Balance: ${finalProjA?.loyalty.pointsBalance} (Expected 225: ${finalProjA?.loyalty.pointsBalance === 225 ? '✅ CORRECT' : '❌ CONVERGENCE FAILED'})\n`)

    // ------------------------------------------------------------------------
    // SUMMARY OF EMPIRICAL MEASUREMENTS
    // ------------------------------------------------------------------------
    console.log('======================================================================')
    console.log('📊 GATE 17.5.35 EMPIRICAL METRICS SUMMARY')
    console.log('======================================================================')
    for (const m of metrics) {
      console.log(`• ${m.name.padEnd(55)}: ${m.durationMs.toFixed(2)}ms`)
    }
    console.log('======================================================================\n')

  } finally {
    // CLEANUP TEST DATA
    console.log('🧹 Cleaning up test bookings and test ledger entries...')
    await payload.delete({ collection: 'bookings', where: { bookingNumber: { contains: 'TEST-PERF-' } } })
    await payload.delete({ collection: 'point-ledger', where: { referenceId: { contains: '_perf_' } } })
    await payload.delete({ collection: 'point-ledger', where: { referenceId: { contains: 'burst_' } } })
    await payload.delete({ collection: 'point-ledger', where: { referenceId: { contains: 'iso_test_' } } })
    console.log('✅ Cleanup completed.')
  }
}

runPerformanceAudit().catch(console.error)
