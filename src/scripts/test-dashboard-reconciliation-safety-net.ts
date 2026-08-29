import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { BookingRepository } from '../domains/booking/repository'
import { BookingWorkflowEngine } from '../domains/booking/workflow'
import { DashboardProjectionRepository } from '../domains/dashboard/repository'
import { DashboardQueryBus } from '../domains/dashboard/query-bus'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../domains/customer/repositories/session-repository'
import { DashboardOverviewAggregator } from '../domains/dashboard/overview-aggregator'
import { MaintenanceService } from '../domains/maintenance/service'
import { MaintenanceRepository } from '../domains/maintenance/repository'
import { CustomerPortalLoader } from '../application/dashboard/loaders'
import { CustomerLoyaltyLoader } from '../application/loyalty/loaders'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { SystemRepository } from '../domains/system/repository'
import { registerDashboardProjectionSubscribers } from '../domains/events/subscribers/dashboard-subscriber'
import { registerPresentationSubscriber } from '../domains/events/subscribers/presentation-subscriber'
import { BookingService } from '../domains/booking/service'
import { ExperienceService } from '../domains/experience/service'
import { ExperienceRepository } from '../domains/experience/repository'
import { ExperienceWorkflowEngine } from '../domains/experience/workflow'
import { PricingPipeline } from '../domains/currency/pipeline'
import { LoyaltyService } from '../domains/loyalty/service'

async function runReconciliationSafetyNetVerification() {
  console.log('================================================================================')
  console.log('🧪 GATE: DASHBOARD PROJECTION RECONCILIATION SAFETY NET INTEGRATION SUITE')
  console.log('================================================================================\n')

  const payload = await getPayload({ config })
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  const loyaltyRepo = new LoyaltyRepository(payload)
  const customerRepo = new CustomerRepository(payload)
  const sessionRepo = new DeviceSessionRepository(payload)
  const bookingRepo = new BookingRepository(payload)
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const maintenanceRepo = new MaintenanceRepository(payload)
  const expRepo = new ExperienceRepository(payload)

  const pricingPipeline = new PricingPipeline(
    { getExchangeRate: async () => 1 } as any,
    { getSettings: async () => ({ vatRate: 0.14, vatEnabled: true, pricesIncludeVat: true }) } as any,
  )
  const expEngine = new ExperienceWorkflowEngine(expRepo, pricingPipeline)
  const expService = new ExperienceService(expRepo, expEngine)
  const loyaltyService = new LoyaltyService(loyaltyRepo)
  const bookingService = new BookingService(bookingRepo, customerRepo, expService, loyaltyService, pricingPipeline)
  const bookingEngine = new BookingWorkflowEngine(payload)
  const maintenanceService = new MaintenanceService(maintenanceRepo, bookingService)

  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const overviewAggregator = new DashboardOverviewAggregator(queryBus)

  registerDashboardProjectionSubscribers(payload)
  registerPresentationSubscriber()

  const testEmail = `reconcile_test_${Date.now()}@example.com`
  let testCustomer: any
  let testBooking: any
  const createdCustomerIds: number[] = []
  const createdBookingIds: number[] = []

  let passedTests = 0
  const totalTests = 5

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Historical Stale Drift Detection & Repair (The Customer #642 Case)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Historical Stale Drift Detection & Repair (200 Stale -> 0 Repaired) ---')
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Drift',
        lastName: 'Tester',
        status: 'active',
        loyalty: {
          tier: 'explorer',
          points: 200,
          totalSpent: 0,
        },
      },
    })
    createdCustomerIds.push(testCustomer.id)

    // Append 200 points in ledger
    await loyaltyRepo.appendLedgerEntry(
      testCustomer.id,
      'earn',
      200,
      'Welcome bonus',
      'system_welcome',
      '100999',
    )

    const exp = await payload.find({ collection: 'experiences', limit: 1 })
    const slot = await payload.find({ collection: 'departure-slots', limit: 1 })
    const expId = exp.docs[0]?.id || 1
    const slotId = slot.docs[0]?.id || 1

    // Create booking with 200 held points
    testBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-DRIFT-${Date.now()}`,
        user: testCustomer.id,
        experience: expId,
        departureSlot: slotId,
        status: 'pending_admin_review',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        outstandingBalance: 3480,
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [{ firstName: 'Drift', lastName: 'Tester', email: testEmail, phone: '000' }],
        pointHold: {
          holdId: `p_hold_${Date.now()}`,
          pointsHeld: 200,
          valueEGP: 20,
          status: 'held',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        pricingSnapshot: {
          version: 1,
          pricingVersion: 1,
          basePriceEGP: 3500,
          totalAmountEGP: 3480,
          taxes: 0,
          fees: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 20,
          subtotalEGP: 3480,
          displayCurrency: 'EGP',
          displayAmount: 3480,
          exchangeRate: 1,
        },
      } as any,
    })
    createdBookingIds.push(testBooking.id)

    // Intentionally inject historical STALE projection (pointsBalance = 200)
    await dashboardRepo.saveProjection({
      projectionId: `proj_${testCustomer.id}_test`,
      customerId: testCustomer.id,
      customer: {
        customerId: testCustomer.id,
        email: testEmail,
        fullName: 'Drift Tester',
        isEmailVerified: false,
        status: 'active',
        preferredCurrency: 'EGP',
      },
      loyalty: {
        tier: 'explorer',
        pointsBalance: 200, // 👈 STALE (Should be 0)
        activeHoldsCount: 0, // 👈 STALE (Should be 1)
        totalSpentEGP: 0,
      },
      trips: {
        upcomingCount: 0, // 👈 STALE (Should be 1)
        activeBookingsCount: 0,
      },
      security: {
        activeDeviceCount: 0,
      },
      metrics: {
        cacheHit: true,
        aggregationDurationMs: 5,
        projectionVersion: 'v1.0.0',
        lastRefreshAt: new Date().toISOString(),
      },
      version: 1,
      updatedAt: new Date().toISOString(),
    })

    const initialProj = await dashboardRepo.findByCustomerId(testCustomer.id)
    console.log(`   ↳ Pre-Reconciliation Stale Projection in DB: ${initialProj?.loyalty?.pointsBalance} Pts (Expected SSOT: 0)`)

    // Run reconciliation job
    const jobResult = await maintenanceService.triggerJob(
      'reconcile_dashboard_projections',
      'scheduler',
      'test_worker_1',
    )

    const healedProj = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageData = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })
    const ledgerBal = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const activeHolds = await bookingRepo.getActiveHeldPointsSummaryForCustomer(testCustomer.id)
    const availablePoints = Math.max(0, ledgerBal - activeHolds.totalPoints)

    console.log(`   ↳ Post-Reconciliation Repaired Projection in DB: ${healedProj?.loyalty?.pointsBalance} Pts`)
    console.log(`   ↳ Active Holds Count in DB: ${healedProj?.loyalty?.activeHoldsCount}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageData.points} Pts`)
    console.log(`   ↳ Authoritative SSOT Available: ${availablePoints} Pts`)

    if (
      jobResult.success &&
      healedProj?.loyalty?.pointsBalance === 0 &&
      healedProj?.loyalty?.activeHoldsCount === 1 &&
      dashPageData.points === 0 &&
      availablePoints === 0
    ) {
      console.log('✅ [PASS] TEST 1: Historical stale drift detected and 100% repaired to SSOT (0 Available Pts).')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 1: Failed to repair historical stale drift!')
    }

    // -------------------------------------------------------------------------
    // TEST 2: Zero-Write Verification on Clean Projections (Idempotent No-Op)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Zero-Write Verification on Clean Projections (No Mutation on Clean State) ---')
    
    const preRunProj = await dashboardRepo.findByCustomerId(testCustomer.id)
    const preVersion = preRunProj?.version

    const rerunResult = await maintenanceService.triggerJob(
      'reconcile_dashboard_projections',
      'scheduler',
      'test_worker_1',
    )

    const postRunProj = await dashboardRepo.findByCustomerId(testCustomer.id)
    const postVersion = postRunProj?.version

    console.log(`   ↳ Projection Version Pre-Run: ${preVersion}, Post-Run: ${postVersion}`)
    console.log(`   ↳ Version Difference: ${Number(postVersion) - Number(preVersion)} (Expected: 0 Writes)`)

    if (rerunResult.success && preVersion === postVersion) {
      console.log('✅ [PASS] TEST 2: Zero DB writes executed for already-clean projections (Clean state preserved).')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 2: Unnecessary writes performed on clean projections!')
    }

    // -------------------------------------------------------------------------
    // TEST 3: Path 5.1 Real World Expiration Safety Net (Hold Expiration -> Reconcile)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Path 5.1 Real World Expiration Safety Net (expire_stale_holds -> Reconcile) ---')

    // Simulate hold expiration by marking pointHold and booking status as expired directly in DB (simulating expire_stale_holds)
    await payload.update({
      collection: 'bookings',
      id: testBooking.id,
      data: {
        status: 'expired',
        pointHold: {
          ...testBooking.pointHold,
          status: 'expired',
        },
      } as any,
    })

    // At this moment, NO event was emitted, so dashboard_projections still has 0 points!
    const staleAfterExpiry = await dashboardRepo.findByCustomerId(testCustomer.id)
    console.log(`   ↳ Projection before reconciliation (Unnotified Expiration): ${staleAfterExpiry?.loyalty?.pointsBalance} Pts (Stale: 0, SSOT: 200)`)

    // Run reconciliation
    await maintenanceService.triggerJob(
      'reconcile_dashboard_projections',
      'scheduler',
      'test_worker_1',
    )

    const restoredAfterReconcile = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageAfterExpiry = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    console.log(`   ↳ Projection after reconciliation: ${restoredAfterReconcile?.loyalty?.pointsBalance} Pts`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageAfterExpiry.points} Pts`)

    if (restoredAfterReconcile?.loyalty?.pointsBalance === 200 && dashPageAfterExpiry.points === 200) {
      console.log('✅ [PASS] TEST 3: Path 5.1 hold expiration drift successfully caught and restored to 200 Available Pts.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 3: Path 5.1 expiration drift was not repaired!')
    }

    // -------------------------------------------------------------------------
    // TEST 4: Concurrency & Advisory Lock Safety
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Concurrency & Advisory Lock Safety (Concurrent Execution) ---')

    // Fire reconciliation and full overview aggregation concurrently
    const [concurrentReconcile, concurrentAggregate] = await Promise.all([
      maintenanceService.triggerJob('reconcile_dashboard_projections', 'scheduler', 'worker_concurrent_1'),
      overviewAggregator.aggregatePortalOverview(testCustomer.id),
    ])

    const concurrentFinalProj = await dashboardRepo.findByCustomerId(testCustomer.id)
    console.log(`   ↳ Concurrent Final Projection: ${concurrentFinalProj?.loyalty?.pointsBalance} Pts`)

    if (concurrentReconcile.success && concurrentFinalProj?.loyalty?.pointsBalance === 200) {
      console.log('✅ [PASS] TEST 4: Concurrent execution completed with 100% data consistency.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 4: Concurrency conflict detected!')
    }

    // -------------------------------------------------------------------------
    // TEST 5: Structured Maintenance Logging Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Structured Maintenance Logging Verification ---')
    const maintenanceLogs = await payload.find({
      collection: 'maintenance-logs' as any,
      where: { jobName: { equals: 'reconcile_dashboard_projections' } },
      limit: 1,
      sort: '-executedAt',
    })

    const latestLog = maintenanceLogs.docs[0] as any
    console.log(`   ↳ Latest Maintenance Log ID: ${latestLog?.id}`)
    console.log(`   ↳ Status: ${latestLog?.status}`)
    console.log(`   ↳ Items Processed: ${latestLog?.itemsProcessed}`)
    console.log(`   ↳ Duration: ${latestLog?.durationMs}ms`)

    if (latestLog && latestLog.status === 'success' && typeof latestLog.durationMs === 'number') {
      console.log('✅ [PASS] TEST 5: Maintenance audit log correctly recorded in database.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 5: Maintenance log missing or invalid!')
    }

  } finally {
    // Teardown
    console.log('\n--- Teardown Test Fixtures ---')
    for (const bId of createdBookingIds) {
      await payload.delete({ collection: 'bookings', id: bId }).catch(() => null)
    }
    for (const cId of createdCustomerIds) {
      await payload.delete({
        collection: 'event-outbox' as any,
        where: { aggregateId: { equals: String(cId) } },
      }).catch(() => null)
      await payload.delete({
        collection: 'point-ledger' as any,
        where: { user: { equals: cId } },
      }).catch(() => null)
      await payload.delete({
        collection: 'dashboard-projections' as any,
        where: { customer: { equals: cId } },
      }).catch(() => null)
      await payload.delete({ collection: 'customers', id: cId }).catch(() => null)
    }
    console.log(`Cleaned up test customers (${createdCustomerIds.join(', ')}) and bookings (${createdBookingIds.join(', ')})`)
  }

  console.log('\n================================================================================')
  console.log(`FINAL RESULTS: Passed: ${passedTests} / ${totalTests}, Failed: ${totalTests - passedTests}`)
  console.log('================================================================================')

  if (passedTests === totalTests) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

runReconciliationSafetyNetVerification()
