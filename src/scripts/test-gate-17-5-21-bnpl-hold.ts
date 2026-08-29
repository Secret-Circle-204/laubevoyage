// @ts-nocheck
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { BookingStatus } from '../types'

async function run() {
  console.log('=================================================================')
  console.log('🧪 RUNNING GATE 17.5.21 — BNPL POINT HOLD LIFECYCLE VERIFICATION')
  console.log('=================================================================')

  const payload = await getPayload({ config })
  const services = await getDomainServices()
  const { booking, loyalty } = services
  const repository = booking.getRepository()
  let customerId: number | undefined

  try {
    // 1. Create a dedicated test customer with exactly 200 welcome points
    const testEmail = `gate21_test_${Date.now()}@laubevoyage.com`
    console.log(`\n[Step 1] Creating test customer: ${testEmail}`)
    const testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: testEmail,
        firstName: 'Gate21',
        lastName: 'Tester',
        password: 'Password123!',
        status: 'active',
        isVerified: true,
      },
    })
    customerId = testCustomer.id

    // Grant 200 points
    await loyalty.grantWelcomeBonus(customerId, 200)
    const initialBalance = await loyalty.getCustomerBalance(customerId)
    console.log(`✅ Customer #${customerId} initial balance: ${initialBalance} points (Expected: 200)`)
    if (initialBalance !== 200) {
      throw new Error(`Assertion failed: Expected initial balance 200, got ${initialBalance}`)
    }

    // Fetch an available experience and slot
    const experiences = await services.experience.getMany({ limit: 1 })
    if (!experiences || experiences.length === 0) {
      throw new Error('No experiences found in database.')
    }
    const exp = experiences[0]

    // -------------------------------------------------------------------------
    // TEST 1: Create BNPL Booking A with 200 points -> status: pending_admin_review
    // -------------------------------------------------------------------------
    console.log('\n--- 🧪 TEST 1: BNPL Booking Creation with 200 Points ---')
    const bookingA = await booking.createDraft({
      userId: customerId,
      experienceId: exp.id,
      slotId: 1,
      date: '2026-09-15',
      startTime: '10:00',
      adults: 1,
      travelers: [
        { firstName: 'Gate21', lastName: 'Tester', email: testEmail, phone: '+201000000000' },
      ],
      pointsToRedeem: 200,
      currency: 'EGP',
    })

    // Submit to pending_admin_review (BNPL flow)
    await booking.moveToPendingAdminReview(bookingA.id)
    const freshBookingA = await repository.findById(bookingA.id)

    const heldAfterA = await repository.getActiveHeldPointsForCustomer(customerId)
    const availableAfterA = Math.max(0, initialBalance - heldAfterA)

    console.log(`Booking #${freshBookingA.id} status: ${freshBookingA.status}`)
    console.log(`PointHold status: ${freshBookingA.pointHold?.status}`)
    console.log(`Held points: ${heldAfterA} (Expected: 200)`)
    console.log(`Available points: ${availableAfterA} (Expected: 0)`)

    if (freshBookingA.status !== 'pending_admin_review') throw new Error('Test 1 failed: status is not pending_admin_review')
    if (freshBookingA.pointHold?.status !== 'held') throw new Error('Test 1 failed: hold is not held')
    if (heldAfterA !== 200) throw new Error(`Test 1 failed: expected 200 held, got ${heldAfterA}`)
    if (availableAfterA !== 0) throw new Error(`Test 1 failed: expected 0 available, got ${availableAfterA}`)
    console.log('✅ TEST 1 PASSED: BNPL hold actively locks points to 0 available.')

    // -------------------------------------------------------------------------
    // TEST 2: Advance simulated time beyond previous 5-minute TTL
    // -------------------------------------------------------------------------
    console.log('\n--- 🧪 TEST 2: Wall-Clock TTL Persistence (Simulated 20-minute elapsed hold) ---')
    // Artificially set expiresAt on bookingA to 20 minutes in the past
    const pastDate = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    await payload.update({
      collection: 'bookings',
      id: bookingA.id,
      data: {
        pointHold: {
          ...freshBookingA.pointHold,
          expiresAt: pastDate,
        },
      },
    })

    const heldAfterTimeElapsed = await repository.getActiveHeldPointsForCustomer(customerId)
    const availableAfterTimeElapsed = Math.max(0, initialBalance - heldAfterTimeElapsed)

    console.log(`Past expiresAt: ${pastDate}`)
    console.log(`Held points after >20m elapsed: ${heldAfterTimeElapsed} (Expected: 200)`)
    console.log(`Available points after >20m elapsed: ${availableAfterTimeElapsed} (Expected: 0)`)

    if (heldAfterTimeElapsed !== 200) {
      throw new Error(`Test 2 failed: BNPL hold expired prematurely! Expected 200 held, got ${heldAfterTimeElapsed}`)
    }
    if (availableAfterTimeElapsed !== 0) {
      throw new Error(`Test 2 failed: Available points leaked! Expected 0, got ${availableAfterTimeElapsed}`)
    }
    console.log('✅ TEST 2 PASSED: BNPL hold in pending_admin_review survives past wall-clock TTL.')

    // -------------------------------------------------------------------------
    // TEST 3: Double-Spend Attempt (Booking B while Booking A is in review)
    // -------------------------------------------------------------------------
    console.log('\n--- 🧪 TEST 3: Double-Spend Concurrency Authorization ---')
    let doubleSpendBlocked = false
    try {
      console.log('Attempting to create Booking B redeeming 200 points...')
      await booking.createDraft({
        userId: customerId,
        experienceId: exp.id,
        slotId: 1,
        date: '2026-09-15',
        startTime: '10:00',
        adults: 1,
        travelers: [
          { firstName: 'Second', lastName: 'Booking', email: testEmail, phone: '+201000000000' },
        ],
        pointsToRedeem: 200,
        currency: 'EGP',
      })
    } catch (err: any) {
      console.log(`Caught expected rejection: "${err.message}"`)
      if (err.message.includes('Redemption forbidden') || err.message.includes('Insufficient available loyalty points')) {
        doubleSpendBlocked = true
      }
    }

    if (!doubleSpendBlocked) {
      throw new Error('Test 3 failed: Double spend was ALLOWED! Booking B should have been rejected.')
    }
    console.log('✅ TEST 3 PASSED: Double-spend attempt rejected by domain authorization.')

    // -------------------------------------------------------------------------
    // TEST 4: Pre-Confirmation Admin Cancellation
    // -------------------------------------------------------------------------
    console.log('\n--- 🧪 TEST 4: Pre-Confirmation Cancellation & Hold Release ---')
    await booking.cancel(
      bookingA.id,
      'Customer requested cancellation before review',
      { id: 'admin', type: 'admin', name: 'Admin Reviewer' }
    )

    const cancelledBookingA = await repository.findById(bookingA.id)
    const heldAfterCancel = await repository.getActiveHeldPointsForCustomer(customerId)
    const availableAfterCancel = Math.max(0, initialBalance - heldAfterCancel)
    const ledgerEntriesAfterCancel = await loyalty.getCustomerLedgerHistory(customerId, 10)

    console.log(`Cancelled Booking #${cancelledBookingA.id} status: ${cancelledBookingA.status}`)
    console.log(`Cancelled PointHold status: ${cancelledBookingA.pointHold?.status}`)
    console.log(`Held points: ${heldAfterCancel} (Expected: 0)`)
    console.log(`Available points: ${availableAfterCancel} (Expected: 200)`)
    console.log(`Ledger entries count: ${ledgerEntriesAfterCancel.length} (Expected: 1 - Welcome Bonus only)`)

    if (cancelledBookingA.status !== BookingStatus.CANCELLED) throw new Error('Test 4 failed: status is not cancelled')
    if (cancelledBookingA.pointHold?.status !== 'released') throw new Error('Test 4 failed: pointHold is not released')
    if (heldAfterCancel !== 0) throw new Error(`Test 4 failed: expected 0 held, got ${heldAfterCancel}`)
    if (availableAfterCancel !== 200) throw new Error(`Test 4 failed: expected 200 available, got ${availableAfterCancel}`)
    if (ledgerEntriesAfterCancel.length !== 1) {
      throw new Error(`Test 4 failed: unexpected ledger entries written: ${JSON.stringify(ledgerEntriesAfterCancel)}`)
    }
    console.log('✅ TEST 4 PASSED: Pre-confirmation cancellation releases hold without writing ledger entries.')

    // -------------------------------------------------------------------------
    // TEST 5: BNPL Confirmation Flow
    // -------------------------------------------------------------------------
    console.log('\n--- 🧪 TEST 5: BNPL Confirmation Flow & Hold Commit ---')
    const bookingC = await booking.createDraft({
      userId: customerId,
      experienceId: exp.id,
      slotId: 1,
      date: '2026-09-15',
      startTime: '10:00',
      adults: 1,
      travelers: [
        { firstName: 'Gate21', lastName: 'Tester', email: testEmail, phone: '+201000000000' },
      ],
      pointsToRedeem: 200,
      currency: 'EGP',
    })
    await booking.moveToPendingAdminReview(bookingC.id)

    console.log(`Confirming Booking #${bookingC.id}...`)
    await booking.confirm(
      bookingC.id,
      { id: 'admin', type: 'admin', name: 'Admin Reviewer' }
    )

    const confirmedBookingC = await repository.findById(bookingC.id)
    const heldAfterConfirm = await repository.getActiveHeldPointsForCustomer(customerId)
    const ledgerEntriesAfterConfirm = await loyalty.getCustomerLedgerHistory(customerId, 10)

    console.log(`Confirmed Booking #${confirmedBookingC.id} status: ${confirmedBookingC.status}`)
    console.log(`Confirmed PointHold status: ${confirmedBookingC.pointHold?.status}`)
    console.log(`Held points: ${heldAfterConfirm} (Expected: 0)`)
    console.log(`Ledger entries:`)
    for (const entry of ledgerEntriesAfterConfirm) {
      console.log(`  - Type: ${entry.type}, Points: ${entry.points}, Balance: ${entry.resultingBalance}, Reason: ${entry.reason}`)
    }

    if (confirmedBookingC.status !== BookingStatus.CONFIRMED) throw new Error('Test 5 failed: status is not confirmed')
    if (confirmedBookingC.pointHold?.status !== 'committed') throw new Error('Test 5 failed: pointHold is not committed')
    if (heldAfterConfirm !== 0) throw new Error(`Test 5 failed: expected 0 held, got ${heldAfterConfirm}`)

    const hasRedemption = ledgerEntriesAfterConfirm.some((e) => e.type === 'redeem' && e.points === -200)
    if (!hasRedemption) {
      throw new Error('Test 5 failed: -200 redeem entry missing from ledger upon confirmation')
    }
    console.log('✅ TEST 5 PASSED: Confirmation commits hold and records -200 redemption in ledger.')

    console.log('\n=================================================================')
    console.log('🎉 ALL 5 GATE 17.5.21 VERIFICATION TESTS PASSED SUCCESSFULLY!')
    console.log('=================================================================')
  } finally {
    if (customerId) {
      console.log('\n🧹 Cleaning up test artifacts (Guaranteed in finally block)...')
      try {
        await payload.delete({ collection: 'bookings', where: { user: { equals: customerId } } })
        await payload.delete({ collection: 'point-ledger', where: { user: { equals: customerId } } })
        await payload.delete({ collection: 'customers', id: customerId })
        console.log('✅ Cleanup completed.')
      } catch (cleanErr: any) {
        console.error('⚠️ Cleanup error:', cleanErr.message)
      }
    }
  }
}

run().catch((err) => {
  console.error('\n❌ GATE 17.5.21 VERIFICATION FAILED:', err)
  process.exit(1)
})
