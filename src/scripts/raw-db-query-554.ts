import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function rawInspect() {
  console.log("=== RAW POSTGRESQL DIRECT QUERY FOR BOOKING #554 ===")
  const payload = await getPayload({ config: configPromise })
  const pool = (payload.db as any).pool

  // 1. PostgreSQL Database Server Timezone & Current Time
  const tzRes = await pool.query(`SHOW TIMEZONE;`)
  const nowRes = await pool.query(`SELECT NOW() as now_pg, CURRENT_TIMESTAMP as current_timestamp_pg, TIMEOFDAY() as timeofday_pg;`)
  console.log("\n[POSTGRESQL SERVER CONFIGURATION]")
  console.log(`PostgreSQL Server Timezone: ${tzRes.rows[0].TimeZone}`)
  console.log(`PostgreSQL NOW(): ${nowRes.rows[0].now_pg}`)
  console.log(`PostgreSQL TIMEOFDAY(): ${nowRes.rows[0].timeofday_pg}`)

  // 2. Raw table columns & types in PostgreSQL for 'bookings'
  const colRes = await pool.query(`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name IN ('created_at', 'updated_at', 'start_date', 'end_date', 'capacity_hold', 'booking_number');
  `)
  console.log("\n[POSTGRESQL COLUMN TYPES]")
  console.table(colRes.rows)

  // 3. Raw SQL Row from 'bookings' table for ID 554
  const bookingRaw = await pool.query(`
    SELECT 
      id, 
      booking_number, 
      created_at, 
      created_at::text as created_at_raw_text,
      updated_at, 
      updated_at::text as updated_at_raw_text,
      start_date, 
      start_date::text as start_date_raw_text,
      end_date, 
      end_date::text as end_date_raw_text,
      capacity_hold,
      payment_attempts
    FROM bookings 
    WHERE id = 554;
  `)
  console.log("\n[RAW SQL ROW FOR BOOKING #554]")
  console.log(JSON.stringify(bookingRaw.rows[0], null, 2))

  // 4. Raw SQL Row from 'point_ledger' for booking 554
  const ledgerRaw = await pool.query(`
    SELECT 
      id, 
      user_id, 
      type, 
      amount, 
      balance, 
      reason, 
      created_at,
      created_at::text as created_at_raw_text
    FROM point_ledger 
    WHERE booking_id = 554 OR reference_id = '554';
  `)
  console.log("\n[RAW SQL ROW FOR POINT_LEDGER FOR BOOKING #554]")
  console.table(ledgerRaw.rows)

  process.exit(0)
}

rawInspect().catch(err => {
  console.error("RAW DB Inspection error:", err)
  process.exit(1)
})
