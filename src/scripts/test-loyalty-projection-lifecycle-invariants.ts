import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { LoyaltyWorkflowEngine } from '../domains/loyalty/workflow'
import { DashboardWorkflowEngine } from '../domains/dashboard/workflow'
import { DashboardProjectionRepository } from '../domains/dashboard/repository'
import { DashboardOverviewAggregator } from '../domains/dashboard/overview-aggregator'
import { DashboardQueryBus } from '../domains/dashboard/query-bus'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../domains/customer/repositories/session-repository'
import { BookingRepository } from '../domains/booking/repository'
import { PayloadOutboxRepository } from '../domains/events/repositories/payload-outbox-repository'
import { OutboxPublisherWorker } from '../domains/events/outbox-publisher'
import { registerDashboardProjectionSubscribers } from '../domains/events/subscribers/dashboard-subscriber'
import { CustomerLoyaltyLoader } from '../application/loyalty/loaders'
import { CustomerPortalLoader } from '../application/dashboard/loaders'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { SystemRepository } from '../domains/system/repository'
import type { Booking } from '../payload-types'

async function runVerification() {
  console.log('================================================================================')
  console.log('🧪 GATE: LOYALTY SSOT -> OUTBOX -> PROJECTION CONSISTENCY VERIFICATION')
  console.log('================================================================================\n')

  const payload = await getPayload({ config })
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()
  const loyaltyRepo = new LoyaltyRepository(payload)
  const loyaltyEngine = new LoyaltyWorkflowEngine(payload)
  const customerRepo = new CustomerRepository(payload)
  const sessionRepo = new DeviceSessionRepository(payload)
  const bookingRepo = new BookingRepository(payload)
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const dashboardEngine = new DashboardWorkflowEngine(dashboardRepo, queryBus)
  const outboxRepo = new PayloadOutboxRepository(payload)
  const outboxWorker = new OutboxPublisherWorker(outboxRepo)

  // Register subscribers
  registerDashboardProjectionSubscribers(payload)

  const testEmail = `lifecycle_test_${Date.now()}@example.com`
  let testCustomer: any
  let testBooking: any
  const createdCustomerIds: number[] = []
  const createdBookingIds: number[] = []

  let passedTests = 0
  let totalTests = 5

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Baseline Initial State (All 4 Surfaces = 0)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Baseline Initial Synchronization (0 Points) ---')
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Lifecycle',
        lastName: 'Tester',
        role: 'customer',
        loyalty: {
          tier: 'explorer',
          points: 0,
          totalSpent: 0,
        },
      },
    })
    createdCustomerIds.push(testCustomer.id)

    // Build initial projection
    await dashboardEngine.executePortalOverviewWorkflow(testCustomer.id)

    const ledgerBal1 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const projDoc1 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const portalOverview1 = await dashboardEngine.executePortalOverviewWorkflow(testCustomer.id)
    const dashPageData1 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal1 = projDoc1?.loyalty?.pointsBalance ?? -1
    const overviewBal1 = portalOverview1.loyalty.pointsBalance
    const dashPageBal1 = dashPageData1.points

    console.log(`   ↳ Point Ledger SSOT: ${ledgerBal1}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal1}`)
    console.log(`   ↳ Domain Portal Overview: ${overviewBal1}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal1}`)

    if (ledgerBal1 === 0 && projBal1 === 0 && overviewBal1 === 0 && dashPageBal1 === 0) {
      console.log('✅ [PASS] TEST 1: Initial baseline is 100% synchronized at 0 points across all surfaces.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 1: Initial baseline desynchronization!')
    }

    // -------------------------------------------------------------------------
    // TEST 2: Earn 2000 Points & Verify All Surfaces = 2000
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Earn Points -> Outbox Event -> Projection Update (2000 Points) ---')
    
    // Create test booking
    const exp = await payload.find({ collection: 'experiences', limit: 1 })
    const slot = await payload.find({ collection: 'departure-slots', limit: 1 })
    const expId = exp.docs[0]?.id || 1
    const slotId = slot.docs[0]?.id || 1

    testBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-TEST-${Date.now()}`,
        user: testCustomer.id,
        experience: expId,
        departureSlot: slotId,
        status: 'confirmed',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        pointsEarned: 2000,
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [{ firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '000' }],
        pricingSnapshot: {
          version: 1,
          pricingVersion: 1,
          basePriceEGP: 2000,
          totalAmountEGP: 2000,
          taxes: 0,
          fees: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 2000,
          displayCurrency: 'EGP',
          displayAmount: 2000,
          exchangeRate: 1,
        },
      } as any,
    })
    createdBookingIds.push(testBooking.id)

    // Earn points
    await loyaltyEngine.earnPointsForBooking(testCustomer.id, testBooking.id, 2000, testBooking.bookingNumber)
    
    // Process outbox
    await outboxWorker.publishPendingEvents()

    const ledgerBal2 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const projDoc2 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const portalOverview2 = await dashboardEngine.executePortalOverviewWorkflow(testCustomer.id)
    const dashPageData2 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal2 = projDoc2?.loyalty?.pointsBalance ?? -1
    const overviewBal2 = portalOverview2.loyalty.pointsBalance
    const dashPageBal2 = dashPageData2.points

    console.log(`   ↳ Point Ledger SSOT: ${ledgerBal2}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal2}`)
    console.log(`   ↳ Domain Portal Overview: ${overviewBal2}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal2}`)

    if (ledgerBal2 === 2000 && projBal2 === 2000 && overviewBal2 === 2000 && dashPageBal2 === 2000) {
      console.log('✅ [PASS] TEST 2: Earned points accurately published and reflected across all surfaces (2000 pts).')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 2: Earned points desynchronization!')
    }

    // -------------------------------------------------------------------------
    // TEST 3: Cancel & Reverse Points -> Transactional Outbox -> All Surfaces = 0
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Earn Reversal -> POINTS_REFUNDED Outbox Event -> Projection = 0 ---')

    // Execute Phase B Reversal
    await loyaltyEngine.processBookingEarnedReversal(testCustomer.id, testBooking.id, 2000)

    // Verify outbox recorded the event
    const outboxEvents = await payload.find({
      collection: 'event-outbox' as any,
      where: {
        and: [
          { eventType: { equals: 'POINTS_REFUNDED' } },
          { aggregateId: { equals: String(testCustomer.id) } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
    })

    const hasOutboxEvent = outboxEvents.docs.length > 0
    console.log(`   ↳ POINTS_REFUNDED Outbox Event Recorded: ${hasOutboxEvent ? '✅ YES' : '❌ NO'}`)

    // Process Outbox worker to publish event to DashboardSubscriber
    await outboxWorker.publishPendingEvents()

    const ledgerBal3 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const projDoc3 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const portalOverview3 = await dashboardEngine.executePortalOverviewWorkflow(testCustomer.id)
    const dashPageData3 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal3 = projDoc3?.loyalty?.pointsBalance ?? -1
    const overviewBal3 = portalOverview3.loyalty.pointsBalance
    const dashPageBal3 = dashPageData3.points

    console.log(`   ↳ Point Ledger SSOT: ${ledgerBal3}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal3}`)
    console.log(`   ↳ Domain Portal Overview: ${overviewBal3}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal3}`)

    if (hasOutboxEvent && ledgerBal3 === 0 && projBal3 === 0 && overviewBal3 === 0 && dashPageBal3 === 0) {
      console.log('✅ [PASS] TEST 3: Earn reversal published POINTS_REFUNDED and brought all surfaces to exact 0.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 3: Earn reversal failed to bring all surfaces to 0!')
    }

    // -------------------------------------------------------------------------
    // TEST 4: Zero Invariant in LoyaltyRepository.getCustomerAggregate
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Repository getCustomerAggregate Zero Invariant Verification ---')

    // Simulate stale points in customers.loyalty.points (e.g. 500) while ledger is 0
    await payload.update({
      collection: 'customers',
      id: testCustomer.id,
      data: {
        loyalty: {
          tier: 'explorer',
          points: 500, // Stale cache
          totalSpent: 0,
        },
      },
    })

    const aggResult = await loyaltyRepo.getCustomerAggregate(testCustomer.id)
    const aggProjectionBal = aggResult.projection.balance

    console.log(`   ↳ Customer document points cache: 500`)
    console.log(`   ↳ Point Ledger authoritative balance: 0`)
    console.log(`   ↳ getCustomerAggregate projection balance: ${aggProjectionBal}`)

    if (aggProjectionBal === 0) {
      console.log('✅ [PASS] TEST 4: getCustomerAggregate strictly respects authoritative 0 and rejects stale 500 cache.')
      passedTests++
    } else {
      console.error(`❌ [FAIL] TEST 4: getCustomerAggregate resurrected stale cache: ${aggProjectionBal}!`)
    }

    // -------------------------------------------------------------------------
    // TEST 5: Idempotent Event Replay Safety
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Idempotent Event Replay Safety ---')
    await outboxWorker.publishPendingEvents()

    const ledgerBal5 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const projDoc5 = await dashboardRepo.findByCustomerId(testCustomer.id)

    if (ledgerBal5 === 0 && projDoc5?.loyalty?.pointsBalance === 0) {
      console.log('✅ [PASS] TEST 5: Replay safe, balances and projections remain strictly 0.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 5: Replay altered balance or projection!')
    }

  } finally {
    // Teardown test fixtures
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

runVerification()
