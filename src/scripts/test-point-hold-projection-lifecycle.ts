import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { LoyaltyWorkflowEngine } from '../domains/loyalty/workflow'
import { BookingWorkflowEngine } from '../domains/booking/workflow'
import { DashboardWorkflowEngine } from '../domains/dashboard/workflow'
import { DashboardProjectionRepository } from '../domains/dashboard/repository'
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
import { getApplicationServices } from '../application/factory'

async function runHoldLifecycleVerification() {
  console.log('================================================================================')
  console.log('🧪 GATE: POINT HOLD -> OUTBOX -> DASHBOARD PROJECTION FULL LIFECYCLE')
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
  const bookingEngine = new BookingWorkflowEngine(payload)
  const dashboardRepo = new DashboardProjectionRepository(payload)
  const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
  const dashboardEngine = new DashboardWorkflowEngine(dashboardRepo, queryBus)
  const outboxRepo = new PayloadOutboxRepository(payload)
  const outboxWorker = new OutboxPublisherWorker(outboxRepo)

  registerDashboardProjectionSubscribers(payload)

  const testEmail = `hold_lifecycle_${Date.now()}@example.com`
  let testCustomer: any
  let testBooking: any
  const createdCustomerIds: number[] = []
  const createdBookingIds: number[] = []

  let passedTests = 0
  const totalTests = 5

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Baseline Initial State (Welcome Bonus: 200 pts)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Baseline Initial State (200 Pts in Ledger, 0 Holds, 200 Available) ---')
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Hold',
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

    // Append initial 200 welcome bonus to point-ledger
    await loyaltyRepo.appendLedgerEntry(
      testCustomer.id,
      'earn',
      200,
      'Welcome bonus for registering email account',
      'system_welcome',
      '100999',
    )

    // Build initial projection
    await dashboardEngine.executePortalOverviewWorkflow(testCustomer.id)

    const ledgerBal1 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const heldPointsSummary1 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(testCustomer.id)
    const projDoc1 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageData1 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal1 = projDoc1?.loyalty?.pointsBalance ?? -1
    const dashPageBal1 = dashPageData1.points

    console.log(`   ↳ Point Ledger Total: ${ledgerBal1}`)
    console.log(`   ↳ Active Point Holds: ${heldPointsSummary1.totalPoints}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal1}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal1}`)

    if (ledgerBal1 === 200 && heldPointsSummary1.totalPoints === 0 && projBal1 === 200 && dashPageBal1 === 200) {
      console.log('✅ [PASS] TEST 1: Initial baseline is 100% synchronized at 200 available points across all surfaces.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 1: Initial baseline desynchronization!')
    }

    // -------------------------------------------------------------------------
    // TEST 2: Create BNPL Booking with 200 pts Hold -> BOOKING_PENDING_ADMIN_REVIEW
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: BNPL Booking with 200 Pts Hold -> Event -> Projection = 0 ---')
    
    const exp = await payload.find({ collection: 'experiences', limit: 1 })
    const slot = await payload.find({ collection: 'departure-slots', limit: 1 })
    const expId = exp.docs[0]?.id || 1
    const slotId = slot.docs[0]?.id || 1

    // 1. Create Draft Booking with 200 pts held
    const draftBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-BNPL-${Date.now()}`,
        user: testCustomer.id,
        experience: expId,
        departureSlot: slotId,
        status: 'draft',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        outstandingBalance: 3480,
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [{ firstName: 'Hold', lastName: 'Tester', email: testEmail, phone: '000' }],
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
    createdBookingIds.push(draftBooking.id)
    testBooking = draftBooking

    // 2. Transition to BNPL Pending Admin Review
    const bnplBooking = await bookingEngine.executePendingAdminReviewWorkflow(draftBooking.id)

    // 3. Process Outbox worker to publish BOOKING_PENDING_ADMIN_REVIEW to DashboardSubscriber
    await outboxWorker.publishPendingEvents()

    const ledgerBal2 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const heldPointsSummary2 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(testCustomer.id)
    const projDoc2 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageData2 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal2 = projDoc2?.loyalty?.pointsBalance ?? -1
    const dashPageBal2 = dashPageData2.points

    console.log(`   ↳ Point Ledger Total: ${ledgerBal2}`)
    console.log(`   ↳ Active Point Holds: ${heldPointsSummary2.totalPoints}`)
    console.log(`   ↳ Available Points (Calculated): ${ledgerBal2 - heldPointsSummary2.totalPoints}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal2}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal2}`)

    if (
      ledgerBal2 === 200 &&
      heldPointsSummary2.totalPoints === 200 &&
      projBal2 === 0 &&
      dashPageBal2 === 0
    ) {
      console.log('✅ [PASS] TEST 2: PointHold accurately deducted from available points; Dashboard Projection updated to 0.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 2: PointHold failed to update Dashboard Projection to 0!')
    }

    // -------------------------------------------------------------------------
    // TEST 3: BNPL Isolation & State Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: BNPL Architectural Isolation & State Verification ---')
    console.log(`   ↳ Booking Status: ${bnplBooking.status}`)
    console.log(`   ↳ Payment Status: ${bnplBooking.paymentStatus}`)
    console.log(`   ↳ Has PointHold: ${!!bnplBooking.pointHold}`)
    console.log(`   ↳ PointHold Points: ${bnplBooking.pointHold?.pointsHeld}`)

    if (
      bnplBooking.status === 'pending_admin_review' &&
      bnplBooking.paymentStatus === 'unpaid' &&
      bnplBooking.pointHold?.pointsHeld === 200
    ) {
      console.log('✅ [PASS] TEST 3: BNPL isolation verified: status is pending_admin_review, paymentStatus unpaid, hold attached.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 3: BNPL isolation violation!')
    }

    // -------------------------------------------------------------------------
    // TEST 4: Release PointHold (Booking Cancellation) -> Projection Restores to 200
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Release PointHold (Cancel Booking) -> Event -> Projection = 200 ---')

    // Cancel booking
    await bookingEngine.executeCancellationWorkflow(
      testBooking.id,
      undefined,
      'Customer cancelled pending review request',
    )

    // Process Outbox worker to publish BOOKING_CANCELLED to DashboardSubscriber
    await outboxWorker.publishPendingEvents()

    const ledgerBal4 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const heldPointsSummary4 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(testCustomer.id)
    const projDoc4 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageData4 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal4 = projDoc4?.loyalty?.pointsBalance ?? -1
    const dashPageBal4 = dashPageData4.points

    console.log(`   ↳ Point Ledger Total: ${ledgerBal4}`)
    console.log(`   ↳ Active Point Holds: ${heldPointsSummary4.totalPoints}`)
    console.log(`   ↳ Available Points (Calculated): ${ledgerBal4 - heldPointsSummary4.totalPoints}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal4}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal4}`)

    if (
      ledgerBal4 === 200 &&
      heldPointsSummary4.totalPoints === 0 &&
      projBal4 === 200 &&
      dashPageBal4 === 200
    ) {
      console.log('✅ [PASS] TEST 4: PointHold successfully released; Dashboard Projection restored to 200.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 4: PointHold release failed to restore Dashboard Projection to 200!')
    }

    // -------------------------------------------------------------------------
    // TEST 5: Confirm Booking & Point Redemption (Ledger = 0, Holds = 0, Available = 0)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Confirm Booking & Redeem Points -> Projection = 0 ---')

    // Create a new booking with 200 pts hold
    const confirmTestBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-CONFIRM-${Date.now()}`,
        user: testCustomer.id,
        experience: expId,
        departureSlot: slotId,
        status: 'draft',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        outstandingBalance: 3480,
        startDate: '2026-10-05',
        endDate: '2026-10-06',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [{ firstName: 'Hold', lastName: 'Tester', email: testEmail, phone: '000' }],
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
    createdBookingIds.push(confirmTestBooking.id)

    // Transition to pending_admin_review (Admin review stage)
    await bookingEngine.executePendingAdminReviewWorkflow(confirmTestBooking.id)

    // Admin approves & confirms the BNPL booking
    await bookingEngine.executeConfirmationWorkflow(confirmTestBooking.id, {
      id: 'admin_1',
      type: 'admin',
      name: 'Test Administrator',
    })

    // Execute point redemption for the confirmed booking
    await loyaltyEngine.redeemPoints(testCustomer.id, 200, confirmTestBooking.id, 3480)

    // Process Outbox worker
    await outboxWorker.publishPendingEvents()

    const ledgerBal5 = await loyaltyRepo.getCurrentBalance(testCustomer.id)
    const heldPointsSummary5 = await bookingRepo.getActiveHeldPointsSummaryForCustomer(testCustomer.id)
    const projDoc5 = await dashboardRepo.findByCustomerId(testCustomer.id)
    const dashPageData5 = await CustomerPortalLoader.loadOverview(testCustomer.id, { locale: 'en', currency: 'EGP' })

    const projBal5 = projDoc5?.loyalty?.pointsBalance ?? -1
    const dashPageBal5 = dashPageData5.points

    console.log(`   ↳ Point Ledger Total: ${ledgerBal5}`)
    console.log(`   ↳ Active Point Holds: ${heldPointsSummary5.totalPoints}`)
    console.log(`   ↳ Database dashboard_projections row: ${projBal5}`)
    console.log(`   ↳ /dashboard Page Loader: ${dashPageBal5}`)

    if (
      ledgerBal5 === 0 &&
      heldPointsSummary5.totalPoints === 0 &&
      projBal5 === 0 &&
      dashPageBal5 === 0
    ) {
      console.log('✅ [PASS] TEST 5: Booking confirmation and redemption committed; all surfaces strictly 0.')
      passedTests++
    } else {
      console.error('❌ [FAIL] TEST 5: Booking confirmation desynchronization!')
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

runHoldLifecycleVerification()
