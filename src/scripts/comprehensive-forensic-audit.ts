import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { sql } from '@payloadcms/db-postgres'

async function comprehensiveForensicAudit() {
  console.log('\n=====================================================================')
  console.log('🔬 COMPREHENSIVE READ-ONLY FORENSIC AUDIT MATRIX')
  console.log('=====================================================================\n')

  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  // 1. Database Corruption Scope: All Customers with loyalty_total_spent < 0
  console.log('--- 1. DATABASE CORRUPTION SCOPE (CUSTOMERS WITH loyalty_total_spent < 0) ---')
  const negativeCust = await drizzle.execute(sql`
    SELECT id, email, first_name, last_name, loyalty_tier, loyalty_points, loyalty_total_spent, created_at, updated_at
    FROM "customers"
    WHERE CAST("loyalty_total_spent" AS numeric) < 0
    ORDER BY id ASC;
  `)
  console.table(negativeCust.rows)

  // 2. All Outbox Events with status = 'failed' or event_type = 'BOOKING_CANCELLED'
  console.log('\n--- 2. ALL OUTBOX EVENTS: BOOKING_CANCELLED OR STATUS = failed ---')
  const outboxFailures = await drizzle.execute(sql`
    SELECT id, event_id, event_type, aggregate_type, aggregate_id, status, retry_count, next_retry_at, error_message, created_at, updated_at
    FROM "event_outbox"
    WHERE "status" = 'failed' OR "event_type" = 'BOOKING_CANCELLED'
    ORDER BY id DESC
    LIMIT 20;
  `)
  console.table(outboxFailures.rows)

  // 3. Inspect Event Inbox for Customer #578 and Bookings #2481 & #2482
  console.log('\n--- 3. EVENT INBOX RECORDS FOR #578, #2481, #2482 ---')
  const inboxRecords = await drizzle.execute(sql`
    SELECT *
    FROM "event_inbox"
    WHERE "idempotency_key" LIKE '%578%' OR "idempotency_key" LIKE '%2481%' OR "idempotency_key" LIKE '%2482%' OR "idempotency_key" LIKE '%evt_1787941820572_vamyz%';
  `)
  console.table(inboxRecords.rows)

  // 4. Exact details of Bookings #2481 and #2482
  console.log('\n--- 4. FULL BOOKING DETAILS FOR #2481 AND #2482 ---')
  const bookingsFull = await drizzle.execute(sql`
    SELECT id, booking_number, user_id, status, payment_status, amount_paid, pricing_snapshot_total_amount_e_g_p, points_earned, notes, source, created_at, updated_at
    FROM "bookings"
    WHERE "id" IN (2481, 2482);
  `)
  console.table(bookingsFull.rows)

  // 5. Point Ledger Entries for Bookings #2481 and #2482
  console.log('\n--- 5. POINT LEDGER FOR BOOKINGS #2481 AND #2482 ---')
  const ledgerFull = await drizzle.execute(sql`
    SELECT id, user_id, type, amount, balance, reason, booking_id, reference_type, reference_id, metadata, created_at
    FROM "point_ledger"
    WHERE "booking_id" IN (2481, 2482) OR "user_id" = 578
    ORDER BY id ASC;
  `)
  console.table(ledgerFull.rows)

  // 6. Inspect Outbox Event for #2481
  console.log('\n--- 6. OUTBOX EVENT FOR BOOKING #2481 ---')
  const outbox2481 = await drizzle.execute(sql`
    SELECT id, event_id, event_type, aggregate_type, aggregate_id, status, retry_count, error_message, created_at, updated_at
    FROM "event_outbox"
    WHERE "payload"->'booking'->>'id' = '2481' OR "aggregate_id" = '2481';
  `)
  console.table(outbox2481.rows)
}

comprehensiveForensicAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Audit failure:', err)
    process.exit(1)
  })
