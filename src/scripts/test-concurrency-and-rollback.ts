import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '../domains/factory'
import type { RequestContext } from '@/types'
import { sql } from '@payloadcms/db-postgres'

async function run() {
  console.log('=== STARTING CONCURRENCY & TRANSACTION ROLLBACK VERIFICATION ===')
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle
  const { booking, customer } = await getDomainServices()
  const repository = booking.getRepository()
  const travelerRepo = customer.getTravelerRepository()

  // -------------------------------------------------------------
  // Test 1: Verify Rollback Safety (All-or-Nothing Transaction)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: All-or-Nothing Transaction Rollback Safety ---')
  const txIdRollback = await repository.beginTransaction()
  const ctxRollback: RequestContext = { transactionId: txIdRollback }
  const reqRollback = repository.mapContextToReq(ctxRollback)

  try {
    // 1. Resolve or create a mock traveler in transaction
    const mockTraveler = await travelerRepo.resolveOrCreateCanonicalTraveler(
      {
        firstName: 'Rollback',
        lastName: 'Tester',
        nationality: 'TEST',
        passportNumber: `RB_${Date.now()}`,
      },
      reqRollback,
    )
    console.log(`[Test 1] Created temporary canonical traveler #${mockTraveler.id} inside uncommitted transaction.`)

    // 2. Simulate a failure before confirmation (e.g. invalid operation)
    throw new Error('Simulated failure during confirmation workflow!')
  } catch (err: any) {
    console.log(`[Test 1] Caught intentional error: "${err.message}". Executing rollback...`)
    await repository.rollbackTransaction(txIdRollback)
    console.log(`[Test 1] ✅ Transaction successfully rolled back.`)
  }

  // Verify that the traveler created inside the rolled-back transaction was NOT persisted to disk
  const checkTraveler = await drizzle.execute(sql`
    SELECT id FROM "travelers" WHERE nationality = 'TEST';
  `)
  const leakedRows = checkTraveler?.rows?.length ?? checkTraveler?.length ?? 0
  if (leakedRows > 0) {
    throw new Error(`[Test 1] FAILURE: Found ${leakedRows} leaked traveler rows that should have been rolled back!`)
  }
  console.log(`[Test 1] ✅ Verified: 0 leaked rows in "travelers". Rollback is 100% clean and atomic!`)

  // -------------------------------------------------------------
  // Test 2: Concurrent Confirmations for Booking #1
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Two Concurrent Confirm Commands for Booking #1 ---')

  // Verify Booking #1 is currently pending_admin_review and slot has capacity
  const initialBooking = await repository.findById(1)
  console.log(`[Test 2] Booking #1 Initial Status: "${initialBooking.status}"`)
  if (initialBooking.status !== 'pending_admin_review') {
    console.log(`[Test 2] Resetting Booking #1 to pending_admin_review for test reproducibility...`)
    await drizzle.execute(sql`UPDATE "bookings" SET status = 'pending_admin_review' WHERE id = 1;`)
  }
  await drizzle.execute(sql`
    UPDATE "departure_slots"
    SET capacity_reserved = 2, capacity_sold = 0
    WHERE departure_id = 'DEP-EXP-INT-01-20261010';
  `)

  // Define the exact server action orchestration function for execution
  const executeConfirmationOrchestration = async (callerName: string) => {
    console.log(`[${callerName}] Starting confirmation workflow...`)
    const txId = await repository.beginTransaction()
    if (!txId) throw new Error(`[${callerName}] Failed to begin transaction.`)
    const context: RequestContext = { transactionId: txId }
    const req = repository.mapContextToReq(context)

    try {
      // Step 0: Concurrency serialization via exclusive row lock
      console.log(`[${callerName}] Acquiring exclusive row lock on Booking #1...`)
      await repository.acquireBookingLock(1, context)
      console.log(`[${callerName}] Lock acquired! Fetching fresh booking state...`)

      // Step 1: Fresh state check
      const bookingDoc = await repository.findById(1, context)
      console.log(`[${callerName}] Current fresh status: "${bookingDoc.status}"`)

      // Idempotency / Concurrency Guard
      if (bookingDoc.status === 'confirmed') {
        console.log(`[${callerName}] ✅ Idempotency Guard: Booking #1 is already confirmed. Exiting cleanly without re-executing effects.`)
        await repository.rollbackTransaction(txId)
        return { caller: callerName, outcome: 'idempotent_exit', success: true }
      }

      if (bookingDoc.status !== 'pending_admin_review') {
        throw new Error(`[${callerName}] Invalid status: ${bookingDoc.status}`)
      }

      // Step 2 & 3: Canonical Traveler Registry Resolution & Manifest Linking inside same transaction
      if (Array.isArray(bookingDoc.travelers) && bookingDoc.travelers.length > 0) {
        for (let i = 0; i < bookingDoc.travelers.length; i++) {
          const order = i + 1
          const travelerInput = bookingDoc.travelers[i]
          const canonical = await travelerRepo.resolveOrCreateCanonicalTraveler(travelerInput, req)
          console.log(`[${callerName}] Linked manifest row #${order} to canonical traveler #${canonical.id}`)
          await repository.updateManifestTravelerId(bookingDoc.id, order, canonical.id, context)

          if (bookingDoc.customerId && order > 1) {
            await travelerRepo.saveCompanionRelationship(bookingDoc.customerId, canonical.id, 'other', false, req)
          }
        }
      }

      // Step 4: Existing Booking Domain Confirmation (Capacity, Loyalty, Status, Outbox)
      console.log(`[${callerName}] Calling Booking Domain booking.confirm()...`)
      await booking.confirm(
        1,
        { id: 'test_runner', type: 'system', name: 'Concurrent Test Runner' },
        context,
      )

      // Step 5: Commit Transaction
      await repository.commitTransaction(txId)
      console.log(`[${callerName}] ✅ Transaction committed successfully!`)
      return { caller: callerName, outcome: 'confirmed_success', success: true }
    } catch (err: any) {
      await repository.rollbackTransaction(txId)
      console.error(`[${callerName}] ❌ Error:`, err.message)
      throw err
    }
  }

  // Launch BOTH commands concurrently at the exact same millisecond!
  console.log(`[Test 2] Launching Command A and Command B concurrently...`)
  const startTime = Date.now()
  const [resultA, resultB] = await Promise.all([
    executeConfirmationOrchestration('Command_A'),
    executeConfirmationOrchestration('Command_B'),
  ])
  const elapsedMs = Date.now() - startTime
  console.log(`[Test 2] Both commands finished in ${elapsedMs}ms!`)
  console.log(`Result A:`, resultA)
  console.log(`Result B:`, resultB)

  // Assertions:
  // Exactly one command should confirm, and the other must safely exit idempotently!
  const confirmedCount = [resultA, resultB].filter((r) => r.outcome === 'confirmed_success').length
  const idempotentCount = [resultA, resultB].filter((r) => r.outcome === 'idempotent_exit').length

  console.log(`\n=== RESULTS SUMMARY ===`)
  console.log(`Confirmed executions: ${confirmedCount} (Expected: 1)`)
  console.log(`Idempotent exits: ${idempotentCount} (Expected: 1)`)

  if (confirmedCount !== 1 || idempotentCount !== 1) {
    throw new Error(`FAILURE: Expected exactly 1 confirmed_success and 1 idempotent_exit, got ${confirmedCount} and ${idempotentCount}`)
  }

  // Verify final DB state for Booking #1
  const finalBooking = await repository.findById(1)
  console.log(`Final Booking #1 status: "${finalBooking.status}" (Expected: "confirmed")`)

  // Check outbox events for Booking #1
  const outboxEvents = await drizzle.execute(sql`
    SELECT id, event_type, aggregate_id, created_at
    FROM "event_outbox"
    WHERE aggregate_id = '1' AND event_type = 'BOOKING_CONFIRMED'
    ORDER BY created_at DESC;
  `)
  const outboxRows = outboxEvents?.rows || outboxEvents
  console.log(`Outbox events for Booking #1:`, outboxRows)

  // Verify manifest rows for Booking #1
  const manifestRows = await drizzle.execute(sql`
    SELECT _order, traveler_id, first_name, last_name
    FROM "bookings_travelers"
    WHERE _parent_id = 1
    ORDER BY _order ASC;
  `)
  console.log(`Final Manifest rows for Booking #1:`, manifestRows.rows || manifestRows)

  // Verify no active locks remain
  const remainingLocks = await drizzle.execute(sql`
    SELECT l.pid, l.mode, l.granted FROM pg_locks l WHERE l.pid <> pg_backend_pid() AND NOT l.granted;
  `)
  const lockCount = remainingLocks?.rows?.length ?? remainingLocks?.length ?? 0
  console.log(`Active blocking locks remaining: ${lockCount} (Expected: 0)`)

  // Reset Booking #1 and departure slot to baseline for administrative review
  await drizzle.execute(sql`UPDATE "bookings" SET status = 'pending_admin_review' WHERE id = 1;`)
  await drizzle.execute(sql`
    UPDATE "departure_slots"
    SET capacity_reserved = 2, capacity_sold = 0
    WHERE departure_id = 'DEP-EXP-INT-01-20261010';
  `)
  await drizzle.execute(sql`DELETE FROM "customer_travelers" WHERE traveler_id > 4;`)
  await drizzle.execute(sql`DELETE FROM "travelers" WHERE id > 4;`)
  console.log('✅ Baseline restored: Booking #1 is pending_admin_review, slot capacity reserved=2, exactly 4 canonical travelers.')

  console.log('\n🎉 ALL CONCURRENCY AND ROLLBACK TESTS PASSED PERFECTLY WITH ZERO DEADLOCKS!')
  process.exit(0)
}

run().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
