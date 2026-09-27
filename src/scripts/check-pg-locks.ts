import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function checkLocks() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('=== PG_STAT_ACTIVITY (Active / Waiting Queries) ===')
  const activity = await drizzle.execute(sql`
    SELECT pid, usename, state, wait_event_type, wait_event, query_start, backend_start, LEFT(query, 120) as query_snippet
    FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
    ORDER BY query_start DESC NULLS LAST;
  `)
  console.log(JSON.stringify(activity.rows || activity, null, 2))

  console.log('=== PG_LOCKS (Waiting or Exclusive Locks) ===')
  const locks = await drizzle.execute(sql`
    SELECT 
      l.pid, 
      l.locktype, 
      l.mode, 
      l.granted, 
      c.relname,
      a.query_start,
      LEFT(a.query, 100) AS query_snippet
    FROM pg_locks l
    LEFT JOIN pg_class c ON l.relation = c.oid
    LEFT JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE l.pid <> pg_backend_pid() AND (NOT l.granted OR l.mode LIKE '%Exclusive%');
  `)
  console.log(JSON.stringify(locks.rows || locks, null, 2))

  console.log('=== BOOKING #1 STATUS & DATA ===')
  const bk = await drizzle.execute(sql`
    SELECT id, status, user_id, updated_at
    FROM "bookings"
    WHERE id = 1;
  `)
  console.log(JSON.stringify(bk.rows || bk, null, 2))

  console.log('=== BOOKING #1 MANIFEST ROWS ===')
  const bt = await drizzle.execute(sql`
    SELECT _order, traveler_id, first_name, last_name, nationality, passport_number
    FROM "bookings_travelers"
    WHERE _parent_id = 1
    ORDER BY _order ASC;
  `)
  console.log(JSON.stringify(bt.rows || bt, null, 2))

  console.log('=== DEPARTURE SLOTS COLUMNS ===')
  const cols = await drizzle.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'departure_slots';
  `)
  console.log(cols.rows?.map((c: any) => c.column_name) || cols)

  process.exit(0)
}

checkLocks().catch((e) => {
  console.error(e)
  process.exit(1)
})
