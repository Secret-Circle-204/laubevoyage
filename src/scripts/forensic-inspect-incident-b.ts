import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { sql } from '@payloadcms/db-postgres'

async function inspectIncidentB() {
  console.log('\n=====================================================================')
  console.log('🔬 FORENSIC INVESTIGATION: INCIDENT B (CUSTOMER #578, BOOKING #2482)')
  console.log('=====================================================================\n')

  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  // 1. Inspect Outbox Event evt_1787941820572_vamyz
  console.log('--- 1. OUTBOX EVENT DETAILS ---')
  const outboxEvt = await drizzle.execute(sql`
    SELECT *
    FROM "event_outbox"
    WHERE "event_id" = 'evt_1787941820572_vamyz';
  `)
  console.log('Outbox Row:')
  console.table(outboxEvt.rows)
  if (outboxEvt.rows.length > 0) {
    console.log('Event Payload JSON:')
    console.dir(outboxEvt.rows[0].payload, { depth: null })
  }

  // 2. Inspect Customer #578
  console.log('\n--- 2. CUSTOMER #578 DATABASE RECORD ---')
  const custRes = await drizzle.execute(sql`
    SELECT *
    FROM "customers"
    WHERE "id" = 578;
  `)
  console.table(custRes.rows)

  // 3. Inspect Booking #2482
  console.log('\n--- 3. BOOKING #2482 DATABASE RECORD ---')
  const bookRes = await drizzle.execute(sql`
    SELECT *
    FROM "bookings"
    WHERE "id" = 2482;
  `)
  console.table(bookRes.rows)

  // 4. Inspect ALL Bookings for Customer #578
  console.log('\n--- 4. ALL BOOKINGS FOR CUSTOMER #578 ---')
  const allBookings = await drizzle.execute(sql`
    SELECT *
    FROM "bookings"
    WHERE "user_id" = 578;
  `)
  console.table(allBookings.rows)

  // 5. Inspect Point Ledger Entries for Customer #578
  console.log('\n--- 5. POINT LEDGER ENTRIES FOR CUSTOMER #578 ---')
  const ledgerEntries = await drizzle.execute(sql`
    SELECT *
    FROM "point_ledger"
    WHERE "user_id" = 578
    ORDER BY id ASC;
  `)
  console.table(ledgerEntries.rows)

  // 6. Inspect Event Inbox Entries for Customer #578 / Booking #2482
  console.log('\n--- 6. EVENT INBOX ENTRIES FOR CUSTOMER #578 / BOOKING #2482 ---')
  const inboxEntries = await drizzle.execute(sql`
    SELECT *
    FROM "event_inbox"
    WHERE "idempotency_key" LIKE '%578%' OR "idempotency_key" LIKE '%2482%' OR "event_id" = 'evt_1787941820572_vamyz';
  `)
  console.table(inboxEntries.rows)

  // 7. Inspect all events in outbox for customer 578 or booking 2482
  console.log('\n--- 7. ALL OUTBOX EVENTS FOR CUSTOMER #578 OR BOOKING #2482 ---')
  const relatedOutbox = await drizzle.execute(sql`
    SELECT *
    FROM "event_outbox"
    WHERE "aggregate_id" = '578' OR "aggregate_id" = '2482' OR "payload"->>'customerId' = '578' OR "payload"->>'bookingId' = '2482';
  `)
  console.table(relatedOutbox.rows)
}

inspectIncidentB()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Forensic inspection error:', err)
    process.exit(1)
  })
