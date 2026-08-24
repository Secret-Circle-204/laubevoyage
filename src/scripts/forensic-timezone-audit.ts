import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function timezoneAudit() {
  console.log("=== STRICT FORENSIC TIMEZONE & RENDERING INVESTIGATION ===")
  const payload = await getPayload({ config: configPromise })
  const pool = (payload.db as any).pool

  // 1. Node.js runtime environment timezone
  console.log("\n1. NODE.JS RUNTIME ENVIRONMENT:")
  console.log(`process.env.TZ: ${process.env.TZ || 'UNDEFINED (system default)'}`)
  console.log(`Intl resolved timeZone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
  console.log(`new Date().getTimezoneOffset(): ${new Date().getTimezoneOffset()} minutes`)
  console.log(`Current new Date().toString(): ${new Date().toString()}`)
  console.log(`Current new Date().toISOString(): ${new Date().toISOString()}`)

  // 2. PostgreSQL Server Timezone & Column Information
  console.log("\n2. POSTGRESQL CONFIGURATION & SCHEMAS:")
  const tzRes = await pool.query(`SHOW timezone;`)
  console.log(`PostgreSQL SHOW timezone: ${tzRes.rows[0].TimeZone}`)

  const colInfo = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('bookings', 'departure_slots', 'point_ledger')
      AND column_name IN ('created_at', 'updated_at', 'start_date', 'end_date', 'date');
  `)
  console.table(colInfo.rows)

  // 3. Raw booking #554 timestamps
  console.log("\n3. RAW DATABASE VALUES FOR BOOKING #554:")
  const bRes = await pool.query(`
    SELECT 
      id,
      booking_number,
      created_at,
      created_at::text as created_at_text,
      created_at AT TIME ZONE 'UTC' as created_at_utc,
      created_at AT TIME ZONE 'Africa/Cairo' as created_at_cairo,
      created_at AT TIME ZONE 'America/Los_Angeles' as created_at_la,
      created_at AT TIME ZONE 'Etc/GMT+9' as created_at_gmt_minus_9,
      start_date,
      start_date::text as start_date_text,
      start_date AT TIME ZONE 'UTC' as start_date_utc,
      start_date AT TIME ZONE 'Africa/Cairo' as start_date_cairo,
      end_date,
      end_date::text as end_date_text,
      end_date AT TIME ZONE 'UTC' as end_date_utc
    FROM bookings
    WHERE id = 554;
  `)
  console.table(bRes.rows)

  // 4. Payload Document Representation (API level)
  console.log("\n4. PAYLOAD API REST/LOCAL OUTPUT FOR BOOKING #554:")
  const payloadDoc = await payload.findByID({
    collection: 'bookings',
    id: 554,
    depth: 0,
  })
  console.log(`payloadDoc.createdAt: ${payloadDoc.createdAt} (type: ${typeof payloadDoc.createdAt})`)
  console.log(`payloadDoc.startDate: ${payloadDoc.startDate} (type: ${typeof payloadDoc.startDate})`)
  console.log(`payloadDoc.endDate: ${payloadDoc.endDate} (type: ${typeof payloadDoc.endDate})`)

  // 5. Simulate Date Formats across various timezones for createdAt
  console.log("\n5. DATE FORMAT SIMULATION (Testing standard formatters for created_at):")
  const dateObj = new Date(payloadDoc.createdAt)
  const timezonesToTest = [
    'UTC',
    'Africa/Cairo',
    'America/Los_Angeles',
    'America/New_York',
    'America/Anchorage', // UTC-9 / UTC-8
    'Pacific/Honolulu', // UTC-10
  ]

  for (const tz of timezonesToTest) {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(dateObj)
    console.log(`Timezone [${tz}]: ${formatted}`)
  }

  process.exit(0)
}

timezoneAudit().catch(err => {
  console.error("Timezone audit error:", err)
  process.exit(1)
})
