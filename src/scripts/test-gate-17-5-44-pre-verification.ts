import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyWorkflowEngine } from '../domains/loyalty/workflow'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { NotificationRepository } from '../domains/notification/repository'
import { NotificationWorker } from '../domains/notification/worker'
import { NotificationQueue } from '../domains/notification/queue'
import { NotificationDispatcher } from '../domains/notification/dispatcher'

async function runPreImplementationVerification() {
  console.log('=====================================================================')
  console.log('🧪 PRE-IMPLEMENTATION VERIFICATION SUITE')
  console.log('=====================================================================\n')

  const payload = await getPayload({ config })
  const { SystemRepository } = await import('../domains/system/repository')
  const { systemSettingsRegistry } = await import('../domains/system/settings-registry')
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  const drizzle = (payload.db as any).drizzle
  const { sql } = await import('@payloadcms/db-postgres')

  // -------------------------------------------------------------------------
  // 1. OUTBOX AGGREGATE IDENTITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('--- 🔎 1. OUTBOX AGGREGATE IDENTITY VERIFICATION ---')
  const testCustomer = await payload.create({
    collection: 'customers',
    data: {
      email: `test_outbox_contract_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Outbox',
      lastName: 'ContractTest',
      status: 'active',
      role: 'customer',
      emailVerified: true,
    } as any,
  })
  const customerId = testCustomer.id
  console.log(`Created test customer ID: ${customerId}`)

  try {
    const loyaltyRepo = new LoyaltyRepository(payload)
    const loyaltyEngine = new LoyaltyWorkflowEngine(loyaltyRepo)

    // Trigger Admin Adjustment via onAdminLedgerEntryCreated
    console.log('Emitting MANUAL_ADJUSTMENT via onAdminLedgerEntryCreated...')
    await loyaltyEngine.onAdminLedgerEntryCreated({
      customerId: Number(customerId),
      points: 100,
      balance: 100,
      ledgerId: 'test_led_contract_1',
      type: 'manual_credit',
      reason: 'Contract verification test',
    })

    // Trigger Welcome Bonus
    console.log('Emitting LOYALTY_EARNED (Welcome Bonus)...')
    await loyaltyEngine.grantWelcomeBonus(Number(customerId))

    // Trigger Tier Upgrade
    console.log('Emitting TIER_UPGRADED...')
    await loyaltyEngine.evaluateAndUpgradeTier(Number(customerId), 100000)

    // Query Outbox table directly
    const outboxRows = await drizzle.execute(sql`
      SELECT id, event_id, event_type, aggregate_type, aggregate_id, status, payload->>'customerId' as customer_id
      FROM "event_outbox"
      WHERE aggregate_id = ${String(customerId)}
      ORDER BY id ASC;
    `)

    console.log(`\nDirect SQL Query result from event_outbox (Found: ${outboxRows.rows.length} events):`)
    console.table(outboxRows.rows)

    if (outboxRows.rows.length < 3) {
      throw new Error(`Expected at least 3 outbox events with aggregate_id = ${customerId}, found ${outboxRows.rows.length}`)
    }

    for (const row of outboxRows.rows) {
      if (row.aggregate_type !== 'Customer' || row.aggregate_id !== String(customerId)) {
        throw new Error(`Aggregate Contract Violation: row ${row.id} has aggregate_type=${row.aggregate_type}, aggregate_id=${row.aggregate_id}`)
      }
    }
    console.log('✅ 100% of generated loyalty outbox events have explicit aggregateType="Customer" and aggregateId=customerId.')

    // -------------------------------------------------------------------------
    // 2. NOTIFICATION WORKER ATOMIC REAP & CONCURRENCY VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 🔎 2. NOTIFICATION WORKER ATOMIC REAP & CONCURRENCY VERIFICATION ---')
    const notifRepo = new NotificationRepository(payload)

    // Create 3 stale processing notification jobs
    const notifA = await payload.create({
      collection: 'notification-logs',
      data: {
        notificationId: `job_stale_a_${Date.now()}`,
        referenceType: 'booking',
        referenceId: 'ref_1',
        recipient: 'test_a@example.com',
        channel: 'email',
        category: 'booking',
        priority: 'normal',
        templateId: 'booking_confirmation',
        status: 'processing',
        attempts: 1,
      } as any,
    })

    const notifB = await payload.create({
      collection: 'notification-logs',
      data: {
        notificationId: `job_stale_b_${Date.now()}`,
        referenceType: 'booking',
        referenceId: 'ref_2',
        recipient: 'test_b@example.com',
        channel: 'email',
        category: 'booking',
        priority: 'normal',
        templateId: 'booking_confirmation',
        status: 'processing',
        attempts: 3, // Should route to DLQ
      } as any,
    })

    console.log(`Created stale jobs: ID ${notifA.id} (attempts=1) and ID ${notifB.id} (attempts=3)`)

    console.log('Executing notifRepo.reapStaleProcessingJobs(50)...')
    const reapedCount = await notifRepo.reapStaleProcessingJobs(50)
    console.log(`Reaped count: ${reapedCount}`)

    const updatedA = await drizzle.execute(sql`SELECT id, status, attempts, last_error, next_attempt_at FROM "notification_logs" WHERE id = ${notifA.id};`)
    const updatedB = await drizzle.execute(sql`SELECT id, status, attempts, last_error, next_attempt_at FROM "notification_logs" WHERE id = ${notifB.id};`)

    console.log('State of Job A after reap:')
    console.table(updatedA.rows)
    console.log('State of Job B after reap (DLQ expected):')
    console.table(updatedB.rows)

    if (updatedA.rows[0].status !== 'failed' || Number(updatedA.rows[0].attempts) !== 1) {
      throw new Error(`Job A state machine violation: status=${updatedA.rows[0].status}, attempts=${updatedA.rows[0].attempts}`)
    }
    if (updatedB.rows[0].status !== 'dlq' || Number(updatedB.rows[0].attempts) !== 3) {
      throw new Error(`Job B DLQ threshold violation: status=${updatedB.rows[0].status}, attempts=${updatedB.rows[0].attempts}`)
    }
    console.log('✅ Notification State Machine preserved 100%: attempts unchanged, DLQ threshold respected.')

    // Concurrency No-Op Test: Run reap again on already-transitioned jobs
    console.log('\nTesting Concurrency Zero-Row No-Op Behavior...')
    const secondReap = await notifRepo.reapStaleProcessingJobs(50)
    console.log(`Second reap (expecting 0 rows reaped without throwing): ${secondReap}`)
    if (secondReap !== 0) {
      throw new Error(`Expected 0 reaped jobs on second pass, got ${secondReap}`)
    }
    console.log('✅ Zero-Row concurrency outcome handled cleanly as a no-op with zero exceptions.')

    // Clean up test notifications
    await drizzle.execute(sql`DELETE FROM "notification_logs" WHERE id IN (${notifA.id}, ${notifB.id});`)

    // -------------------------------------------------------------------------
    // 2b. FIND RECOVERABLE JOBS & CONCURRENT DELETION RESILIENCE
    // -------------------------------------------------------------------------
    console.log('\n--- 🔎 2b. FIND RECOVERABLE JOBS RESILIENCE & ZERO-LOSS PROOF ---')
    const rec1 = await payload.create({
      collection: 'notification-logs',
      data: {
        notificationId: `job_rec_1_${Date.now()}`,
        referenceType: 'customer',
        referenceId: String(customerId),
        recipient: 'rec1@example.com',
        channel: 'email',
        category: 'security',
        priority: 'high',
        templateId: 'verification_email',
        templateData: { name: 'User 1', verificationUrl: 'https://example.com/v1' },
        status: 'queued',
        attempts: 0,
      } as any,
    })

    const rec2 = await payload.create({
      collection: 'notification-logs',
      data: {
        notificationId: `job_rec_2_${Date.now()}`,
        referenceType: 'customer',
        referenceId: String(customerId),
        recipient: 'rec2@example.com',
        channel: 'email',
        category: 'security',
        priority: 'high',
        templateId: 'verification_email',
        templateData: { name: 'User 2', verificationUrl: 'https://example.com/v2' },
        status: 'queued',
        attempts: 0,
      } as any,
    })

    console.log(`Created 2 valid recoverable jobs: ID ${rec1.id} and ID ${rec2.id}`)

    // Verify recovery finds both
    const recoveredBatch1 = await notifRepo.findRecoverableJobs(50)
    const found1 = recoveredBatch1.some((j) => j.jobId === rec1.notificationId)
    const found2 = recoveredBatch1.some((j) => j.jobId === rec2.notificationId)
    if (!found1 || !found2) {
      throw new Error(`Zero-Loss Violation: Expected both rec1 and rec2 to be recovered. Found1=${found1}, Found2=${found2}`)
    }
    console.log('✅ Proof of Zero Loss: 100% of valid recoverable jobs were discovered.')

    // Simulate concurrent hard deletion of rec2 while worker processes
    await drizzle.execute(sql`DELETE FROM "notification_logs" WHERE id = ${rec2.id};`)
    console.log(`Simulated concurrent deletion of job ID ${rec2.id}`)

    // Re-run recovery: must not throw TypeError and must return rec1 safely
    const recoveredBatch2 = await notifRepo.findRecoverableJobs(50)
    const found1AfterDelete = recoveredBatch2.some((j) => j.jobId === rec1.notificationId)
    const found2AfterDelete = recoveredBatch2.some((j) => j.jobId === rec2.notificationId)

    if (!found1AfterDelete) {
      throw new Error(`Resilience Violation: Valid job rec1 was lost after concurrent deletion of rec2!`)
    }
    if (found2AfterDelete) {
      throw new Error(`Ghost Job Violation: Deleted job rec2 was unexpectedly returned!`)
    }
    console.log('✅ Concurrent Deletion Handled Safely: Zero TypeError, zero lost valid jobs, zero ghost jobs.')

    // Clean up rec1
    await drizzle.execute(sql`DELETE FROM "notification_logs" WHERE id = ${rec1.id};`)

  } finally {
    // -------------------------------------------------------------------------
    // 3. ATOMIC TEARDOWN TRANSACTION VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 🔎 3. ATOMIC TEARDOWN TRANSACTION VERIFICATION ---')
    await drizzle.transaction(async (tx: any) => {
      const bRes = await tx.execute(sql`DELETE FROM "bookings" WHERE "user_id" = ${customerId};`)
      const pRes = await tx.execute(sql`DELETE FROM "point_ledger" WHERE "user_id" = ${customerId};`)
      const oRes = await tx.execute(sql`
        DELETE FROM "event_outbox" 
        WHERE "aggregate_id" = ${String(customerId)} 
           OR "payload"->>'customerId' = ${String(customerId)};
      `)
      const iRes = await tx.execute(sql`DELETE FROM "event_inbox" WHERE "idempotency_key" LIKE ${`%${customerId}%`};`)
      const dRes = await tx.execute(sql`DELETE FROM "dashboard_projections" WHERE "customer_id" = ${customerId};`)
      const cRes = await tx.execute(sql`DELETE FROM "customers" WHERE "id" = ${customerId};`)
      console.log(`Atomic Cleanup Summary: Bookings (${bRes.rowCount || 0}), Ledger (${pRes.rowCount || 0}), Outbox (${oRes.rowCount || 0}), Inbox (${iRes.rowCount || 0}), Projections (${dRes.rowCount || 0}), Customers (${cRes.rowCount || 0})`)
    })

    // Verify zero orphaned outbox events remain
    const remainingOutbox = await drizzle.execute(sql`
      SELECT id FROM "event_outbox" WHERE aggregate_id = ${String(customerId)};
    `)
    if (remainingOutbox.rows.length > 0) {
      throw new Error(`Teardown Failed: ${remainingOutbox.rows.length} orphaned outbox events remained!`)
    }
    console.log('✅ Teardown verified: ZERO orphaned outbox events remain.')
  }

  console.log('\n=====================================================================')
  console.log('🎉 ALL PRE-IMPLEMENTATION VERIFICATION TESTS PASSED (100% GREEN)')
  console.log('=====================================================================\n')
}

runPreImplementationVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Pre-Implementation Verification Failed:', err)
    process.exit(1)
  })
