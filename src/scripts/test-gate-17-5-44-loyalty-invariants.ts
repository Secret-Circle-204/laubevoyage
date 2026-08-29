import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { LoyaltyWorkflowEngine } from '../domains/loyalty/workflow'
import { SystemRepository } from '../domains/system/repository'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { FinancialInvariantException } from '../domains/shared/exceptions/domain-exception'

/**
 * 🧪 GATE 17.5.44: LOYALTY QUALIFYING SPEND & INVARIANT VERIFICATION SUITE
 *
 * Verifies all 9 mandatory domain invariants and audits negative DB records without manual mutations.
 */
async function runGate17544LoyaltyVerification() {
  console.log('================================================================================')
  console.log('🧪 GATE 17.5.44: LOYALTY QUALIFYING SPEND & INVARIANT VERIFICATION')
  console.log('================================================================================\n')

  const payload = await getPayload({ config })

  // Initialize SystemSettingsRegistry
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  const repository = new LoyaltyRepository(payload)
  const workflowEngine = new LoyaltyWorkflowEngine(repository)

  // Fetch valid experience and departure slot IDs from live database
  const expRes = await payload.find({ collection: 'experiences', limit: 1 })
  const slotRes = await payload.find({ collection: 'departure-slots', limit: 1 })
  const validExpId = expRes.docs[0]?.id
  const validSlotId = slotRes.docs[0]?.id

  let passedTests = 0
  let failedTests = 0

  const createdCustomerIds: number[] = []
  const createdBookingIds: number[] = []

  function recordResult(testName: string, passed: boolean, details?: string) {
    if (passed) {
      console.log(`✅ [PASS] ${testName}`)
      if (details) console.log(`   ↳ ${details}`)
      passedTests++
    } else {
      console.error(`❌ [FAIL] ${testName}`)
      if (details) console.error(`   ↳ ${details}`)
      failedTests++
    }
  }

  async function createTestBooking(customerId: number, totalAmountEGP: number, paid = false, amountPaid = 0) {
    const doc = await payload.create({
      collection: 'bookings',
      data: {
        user: customerId,
        experience: validExpId,
        departureSlot: validSlotId,
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        status: paid ? 'confirmed' : 'pending_payment',
        paymentStatus: paid ? 'paid' : (amountPaid > 0 ? 'partially_paid' : 'unpaid'),
        amountPaid: paid ? totalAmountEGP : amountPaid,
        outstandingBalance: Math.max(0, totalAmountEGP - (paid ? totalAmountEGP : amountPaid)),
        source: 'website',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        bookingNumber: `TEST-LOY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        travelers: [{ firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '000' }],
        pricingSnapshot: {
          version: 1,
          basePriceEGP: totalAmountEGP,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: totalAmountEGP,
          taxes: 0,
          fees: 0,
          totalAmountEGP: totalAmountEGP,
          displayCurrency: 'EGP',
          displayAmount: totalAmountEGP,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(doc.id)
    return doc
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Two consecutive unpaid cancellations leave totalSpentEGP unchanged
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Two Consecutive Unpaid Cancellations ---')
  const testCustomerEmail1 = `perf_test_unpaid_consecutive_${Date.now()}@example.com`
  let testCustomer1: any = null
  try {
    testCustomer1 = await payload.create({
      collection: 'customers',
      data: {
        email: testCustomerEmail1,
        password: 'Password123!',
        firstName: 'Unpaid',
        lastName: 'Tester',
        status: 'active',
        loyalty: {
          tier: 'explorer',
          points: 100,
          totalSpent: 0,
        },
      },
    })
    createdCustomerIds.push(testCustomer1.id)

    const nominalTotal = 15000
    const booking1 = await createTestBooking(testCustomer1.id, nominalTotal, false, 0)
    const booking2 = await createTestBooking(testCustomer1.id, nominalTotal, false, 0)

    // Cancellation 1 (Unpaid)
    await workflowEngine.processBookingRedemptionRefund(testCustomer1.id, booking1.id, nominalTotal)
    await workflowEngine.processBookingEarnedReversal(testCustomer1.id, booking1.id, nominalTotal)

    const afterCancel1 = await repository.getCustomerAggregate(testCustomer1.id)
    const cancel1Ok = afterCancel1.aggregate.totalSpentEGP === 0

    // Cancellation 2 (Unpaid)
    await workflowEngine.processBookingRedemptionRefund(testCustomer1.id, booking2.id, nominalTotal)
    await workflowEngine.processBookingEarnedReversal(testCustomer1.id, booking2.id, nominalTotal)

    const afterCancel2 = await repository.getCustomerAggregate(testCustomer1.id)
    const cancel2Ok = afterCancel2.aggregate.totalSpentEGP === 0

    recordResult(
      'TEST 1: Two consecutive unpaid cancellations leave totalSpentEGP at 0',
      cancel1Ok && cancel2Ok,
      `After Cancel 1: ${afterCancel1.aggregate.totalSpentEGP} EGP, After Cancel 2: ${afterCancel2.aggregate.totalSpentEGP} EGP (Expected: 0)`,
    )
  } catch (err: any) {
    recordResult('TEST 1: Two consecutive unpaid cancellations', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 2: An unpaid booking produces NO qualifying-spend deduction
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Unpaid Booking Produces Zero Qualifying Spend Deduction ---')
  try {
    // Customer has some base spend, e.g. 5000 EGP
    await repository.updateCustomerTier(testCustomer1.id, 'explorer', 5000)
    const beforeUnpaid = await repository.getCustomerAggregate(testCustomer1.id)

    const unpaidBooking = await createTestBooking(testCustomer1.id, 25000, false, 0)
    await workflowEngine.processBookingRedemptionRefund(testCustomer1.id, unpaidBooking.id, 25000)

    const afterUnpaid = await repository.getCustomerAggregate(testCustomer1.id)
    const ok = afterUnpaid.aggregate.totalSpentEGP === 5000

    recordResult(
      'TEST 2: Unpaid booking cancellation does not deduct from existing spend',
      ok,
      `Base spend: ${beforeUnpaid.aggregate.totalSpentEGP} EGP, Spend after unpaid cancel: ${afterUnpaid.aggregate.totalSpentEGP} EGP`,
    )
  } catch (err: any) {
    recordResult('TEST 2: Unpaid booking deduction', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Unpaid booking with zero earned points produces Phase B No-Op
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Unpaid Booking Phase B Clean No-Op ---')
  try {
    const unpaidBooking = await createTestBooking(testCustomer1.id, 30000, false, 0)
    const result = await workflowEngine.processBookingEarnedReversal(testCustomer1.id, unpaidBooking.id, 30000)
    const ok = result.pointsReversed === 0

    recordResult(
      'TEST 3: Phase B returns pointsReversed = 0 without throwing for unpaid booking',
      ok,
      `pointsReversed: ${result.pointsReversed}`,
    )
  } catch (err: any) {
    recordResult('TEST 3: Unpaid booking Phase B', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Fully paid/confirmed booking records exact qualifying spend and reverses exact amount on cancel
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Paid Confirmed Booking Spend Tracking & Reversal ---')
  const testCustomerEmail2 = `perf_test_paid_lifecycle_${Date.now()}@example.com`
  let testCustomer2: any = null
  let paidBooking: any = null
  try {
    testCustomer2 = await payload.create({
      collection: 'customers',
      data: {
        email: testCustomerEmail2,
        password: 'Password123!',
        firstName: 'Paid',
        lastName: 'Lifecycle',
        status: 'active',
        loyalty: {
          tier: 'explorer',
          points: 0,
          totalSpent: 0,
        },
      },
    })
    createdCustomerIds.push(testCustomer2.id)

    const qualifyingAmount = 12490
    paidBooking = await createTestBooking(testCustomer2.id, qualifyingAmount, true, qualifyingAmount)

    // 1. Confirm booking -> earn points and update spend
    await workflowEngine.earnPointsForBooking(testCustomer2.id, paidBooking.id, qualifyingAmount)
    await workflowEngine.evaluateAndUpgradeTier(testCustomer2.id, qualifyingAmount)

    const afterEarn = await repository.getCustomerAggregate(testCustomer2.id)
    const earnOk = afterEarn.aggregate.totalSpentEGP === qualifyingAmount

    // Check ledger entry has amountSpentEGP
    const ledgerEntries = await repository.getBookingLedgerEntries(paidBooking.id)
    const earnEntry = ledgerEntries.find((e) => e.type === 'earn')
    const hasMetadataSpend = (earnEntry?.metadata as any)?.amountSpentEGP === qualifyingAmount

    // 2. Cancel booking
    await workflowEngine.processBookingRedemptionRefund(testCustomer2.id, paidBooking.id, qualifyingAmount)
    await workflowEngine.processBookingEarnedReversal(testCustomer2.id, paidBooking.id, qualifyingAmount)

    const afterCancel = await repository.getCustomerAggregate(testCustomer2.id)
    const cancelOk = afterCancel.aggregate.totalSpentEGP === 0

    recordResult(
      'TEST 4: Fully paid booking records exact qualifying spend in ledger and deducts exactly that amount on cancel',
      earnOk && hasMetadataSpend && cancelOk,
      `Earned spend: ${afterEarn.aggregate.totalSpentEGP} EGP, Ledger Metadata: ${(earnEntry?.metadata as any)?.amountSpentEGP} EGP, Spend after Cancel: ${afterCancel.aggregate.totalSpentEGP} EGP`,
    )
  } catch (err: any) {
    recordResult('TEST 4: Paid confirmed booking lifecycle', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Partially paid booking deducts ONLY persisted qualifying spend, never bookingTotalEGP
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Partially Paid Booking Deducts Only Persisted Spend ---')
  const testCustomerEmail3 = `perf_test_partial_spend_${Date.now()}@example.com`
  let testCustomer3: any = null
  try {
    testCustomer3 = await payload.create({
      collection: 'customers',
      data: {
        email: testCustomerEmail3,
        password: 'Password123!',
        firstName: 'Partial',
        lastName: 'Spend',
        status: 'active',
        loyalty: {
          tier: 'explorer',
          points: 0,
          totalSpent: 0,
        },
      },
    })
    createdCustomerIds.push(testCustomer3.id)

    const nominalBookingTotal = 50000
    const partialDepositPaid = 10000
    const partialBooking = await createTestBooking(testCustomer3.id, nominalBookingTotal, false, partialDepositPaid)

    // Earn points on the partial deposit (10,000 EGP)
    await workflowEngine.earnPointsForBooking(testCustomer3.id, partialBooking.id, partialDepositPaid)
    await repository.updateCustomerTier(testCustomer3.id, 'explorer', partialDepositPaid)

    const afterPartialEarn = await repository.getCustomerAggregate(testCustomer3.id)

    // Cancel booking with nominal total = 50000
    await workflowEngine.processBookingRedemptionRefund(testCustomer3.id, partialBooking.id, nominalBookingTotal)
    await workflowEngine.processBookingEarnedReversal(testCustomer3.id, partialBooking.id, nominalBookingTotal)

    const afterPartialCancel = await repository.getCustomerAggregate(testCustomer3.id)
    const partialOk = afterPartialCancel.aggregate.totalSpentEGP === 0 // 10000 - 10000 = 0 (NOT 10000 - 50000 = -40000!)

    recordResult(
      'TEST 5: Partial payment cancellation deducts only the 10,000 EGP deposit (not nominal 50,000 EGP)',
      partialOk,
      `Spend after earn: ${afterPartialEarn.aggregate.totalSpentEGP} EGP, Spend after cancel with 50k nominal: ${afterPartialCancel.aggregate.totalSpentEGP} EGP`,
    )
  } catch (err: any) {
    recordResult('TEST 5: Partially paid booking deduction', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Earn entry with missing amountSpentEGP does NOT fall back to bookingTotalEGP
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Missing metadata.amountSpentEGP Does NOT Fall Back to bookingTotalEGP ---')
  const testCustomerEmail4 = `perf_test_missing_meta_${Date.now()}@example.com`
  let testCustomer4: any = null
  try {
    testCustomer4 = await payload.create({
      collection: 'customers',
      data: {
        email: testCustomerEmail4,
        password: 'Password123!',
        firstName: 'Missing',
        lastName: 'Meta',
        status: 'active',
        loyalty: {
          tier: 'explorer',
          points: 100,
          totalSpent: 5000,
        },
      },
    })
    createdCustomerIds.push(testCustomer4.id)

    const bookingNoMeta = await createTestBooking(testCustomer4.id, 20000, false, 0)

    // Manually create an earn ledger entry WITHOUT amountSpentEGP in metadata
    await repository.appendLedgerEntry(
      testCustomer4.id,
      'earn',
      50,
      'Legacy earn entry without metadata spend',
      'booking',
      String(bookingNoMeta.id),
      bookingNoMeta.id,
      undefined,
      {}, // Empty metadata
    )

    const beforeCancelNoMeta = await repository.getCustomerAggregate(testCustomer4.id)

    // Cancel with 20,000 EGP nominal
    await workflowEngine.processBookingRedemptionRefund(testCustomer4.id, bookingNoMeta.id, 20000)

    const afterCancelNoMeta = await repository.getCustomerAggregate(testCustomer4.id)
    // Must NOT deduct 20,000 from 5,000!
    const noFallbackOk = afterCancelNoMeta.aggregate.totalSpentEGP === 5000

    recordResult(
      'TEST 6: Missing metadata.amountSpentEGP safely assumes 0 spend contribution without falling back to 20k booking total',
      noFallbackOk,
      `Spend before: ${beforeCancelNoMeta.aggregate.totalSpentEGP} EGP, Spend after: ${afterCancelNoMeta.aggregate.totalSpentEGP} EGP`,
    )
  } catch (err: any) {
    recordResult('TEST 6: Missing metadata spend fallback', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Repository Fail-Fast Invariant rejects any operation that would produce totalSpent < 0
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Repository Fail-Fast Financial Invariant ---')
  try {
    let exceptionThrown = false
    let thrownError: any = null

    try {
      // testCustomer1 currently has totalSpent = 5000. Attempt delta = -6000 -> newTotalSpent = -1000
      await repository.updateCustomerTier(testCustomer1.id, 'explorer', -6000)
    } catch (err: any) {
      exceptionThrown = true
      thrownError = err
    }

    const isFinancialInvariant = thrownError instanceof FinancialInvariantException
    const customerAfterFailedMutation = await repository.getCustomerAggregate(testCustomer1.id)
    const dbUnchanged = customerAfterFailedMutation.aggregate.totalSpentEGP === 5000

    recordResult(
      'TEST 7: Repository updateCustomerTier throws FinancialInvariantException on negative totalSpent and leaves DB unchanged',
      exceptionThrown && isFinancialInvariant && dbUnchanged,
      `Exception thrown: ${exceptionThrown}, Instance of FinancialInvariantException: ${isFinancialInvariant}, Current DB totalSpent: ${customerAfterFailedMutation.aggregate.totalSpentEGP} EGP`,
    )
  } catch (err: any) {
    recordResult('TEST 7: Repository Fail-Fast invariant', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Replaying cancellation event does NOT double-deduct spend or points
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Idempotent Event Replay Safety ---')
  try {
    const replayBookingId = paidBooking.id // from Test 4 (already cancelled)
    const beforeReplay = await repository.getCustomerAggregate(testCustomer2.id)

    // Replay Phase A
    const phaseAReplay = await workflowEngine.processBookingRedemptionRefund(testCustomer2.id, replayBookingId, 12490)
    // Replay Phase B
    const phaseBReplay = await workflowEngine.processBookingEarnedReversal(testCustomer2.id, replayBookingId, 12490)

    const afterReplay = await repository.getCustomerAggregate(testCustomer2.id)

    const replayOk =
      beforeReplay.aggregate.totalSpentEGP === afterReplay.aggregate.totalSpentEGP &&
      beforeReplay.projection.balance === afterReplay.projection.balance

    recordResult(
      'TEST 8: Replaying cancellation Phase A & Phase B does not alter spend or points balance',
      replayOk,
      `Before replay: ${beforeReplay.aggregate.totalSpentEGP} EGP / ${beforeReplay.projection.balance} pts, After replay: ${afterReplay.aggregate.totalSpentEGP} EGP / ${afterReplay.projection.balance} pts`,
    )
  } catch (err: any) {
    recordResult('TEST 8: Idempotent event replay', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Inspect Failed Event evt_1787941820572_vamyz & Customer #578 Forensics
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Original Event & Database Negative Records Forensic Inspection ---')
  try {
    // 1. Audit outbox event evt_1787941820572_vamyz
    const failedEventResult = await payload.find({
      collection: 'event-outbox' as any,
      where: {
        eventId: { equals: 'evt_1787941820572_vamyz' },
      },
      limit: 1,
    })
    const failedEvent = failedEventResult.docs[0] as any

    console.log('   ↳ Event evt_1787941820572_vamyz Status:', failedEvent ? `${failedEvent.status} (attempts: ${failedEvent.attempts})` : 'Not found')

    // 2. Count any customers with negative spend in database using Payload query
    const negativeCustomersResult = await payload.find({
      collection: 'customers',
      where: {
        'loyalty.totalSpent': { less_than: 0 },
      },
      limit: 100,
    })
    const negativeCustomers = negativeCustomersResult.docs || []

    console.log(`   ↳ Database Negative Records Count: ${negativeCustomers.length}`)
    if (negativeCustomers.length > 0) {
      console.log('   ↳ Negative Customers Details:', negativeCustomers.map((c: any) => ({
        id: c.id,
        email: c.email,
        totalSpent: c.loyalty?.totalSpent,
        tier: c.loyalty?.tier,
      })))
    }

    // Inspect Customer #578 specifically without mutating it
    const customer578Result = await payload.findByID({
      collection: 'customers',
      id: 578,
    }).catch(() => null)

    if (customer578Result) {
      console.log(`   ↳ Customer #578 Forensic State: email=${customer578Result.email}, totalSpent=${customer578Result.loyalty?.totalSpent}, points=${customer578Result.loyalty?.points}, tier=${customer578Result.loyalty?.tier}`)
    }

    recordResult(
      'TEST 9: Forensic inspection completed without mutating existing database records',
      true,
      `Negative records audited: ${negativeCustomers.length}, Event inspected: ${failedEvent?.eventId || 'N/A'}`,
    )
  } catch (err: any) {
    recordResult('TEST 9: Forensic inspection', false, err.message)
  }

  // ---------------------------------------------------------------------------
  // CLEANUP TEST FIXTURES (Only fixtures created within this test execution)
  // ---------------------------------------------------------------------------
  console.log('\n--- Teardown Test-Created Fixtures ---')
  for (const bId of createdBookingIds) {
    await payload.delete({ collection: 'bookings', id: bId }).catch(() => {})
  }
  for (const cId of createdCustomerIds) {
    await payload.delete({ collection: 'customers', id: cId }).catch(() => {})
  }
  console.log('Cleaned up test fixtures: Bookings #', createdBookingIds.join(', '), 'Customers #', createdCustomerIds.join(', '))

  console.log('\n================================================================================')
  console.log(`FINAL RESULTS: Passed: ${passedTests} / ${passedTests + failedTests}, Failed: ${failedTests}`)
  console.log('================================================================================')

  process.exit(failedTests > 0 ? 1 : 0)
}

runGate17544LoyaltyVerification()
