import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function restore() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('=== RESTORING EXACT BASELINE DATA ===')

  // 1. Reset Booking #1 status to pending_admin_review
  await drizzle.execute(sql`
    UPDATE "bookings"
    SET status = 'pending_admin_review'
    WHERE id = 1;
  `)
  console.log('✅ Booking #1 status reset to "pending_admin_review".')

  // 2. Restore manifest links for Booking #1 to canonical travelers 2 and 1
  await drizzle.execute(sql`
    UPDATE "bookings_travelers"
    SET traveler_id = 2
    WHERE _parent_id = 1 AND _order = 1;
  `)
  await drizzle.execute(sql`
    UPDATE "bookings_travelers"
    SET traveler_id = 1
    WHERE _parent_id = 1 AND _order = 2;
  `)
  console.log('✅ Booking #1 manifest rows restored to traveler_id 2 and 1.')

  // 3. Restore departure slot capacity for Booking #1's slot
  await drizzle.execute(sql`
    UPDATE "departure_slots"
    SET capacity_reserved = 2, capacity_sold = 0
    WHERE departure_id = 'DEP-EXP-INT-01-20261010';
  `)
  console.log('✅ Departure slot capacity restored (reserved: 2, sold: 0).')

  // 4. Remove test canonical travelers (IDs > 4) created during test runs
  await drizzle.execute(sql`
    DELETE FROM "customer_travelers" WHERE traveler_id > 4;
  `)
  await drizzle.execute(sql`
    DELETE FROM "travelers" WHERE id > 4;
  `)
  console.log('✅ Temporary test canonical travelers removed.')

  // 4. Verify baseline state: exactly 4 canonical travelers
  const tCount = await drizzle.execute(sql`SELECT count(*)::integer as c FROM "travelers";`)
  const count = tCount?.rows?.[0]?.c ?? tCount?.[0]?.c
  console.log(`Current canonical travelers count: ${count} (Expected: 4)`)

  // 5. Verify manifest rows: exactly 6 total, 6 linked, 0 unlinked
  const mCount = await drizzle.execute(sql`
    SELECT 
      COUNT(*)::integer as total,
      COUNT(traveler_id)::integer as linked,
      COUNT(*) FILTER (WHERE traveler_id IS NULL)::integer as unlinked
    FROM "bookings_travelers";
  `)
  console.log('Manifest status:', mCount?.rows?.[0] ?? mCount?.[0])

  process.exit(0)
}

restore().catch((e) => {
  console.error(e)
  process.exit(1)
})
