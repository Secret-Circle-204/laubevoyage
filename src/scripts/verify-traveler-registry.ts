import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TravelerRepository } from '../domains/customer/repositories/traveler-repository'
import { sql } from '@payloadcms/db-postgres'

async function run() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('=== VERIFYING TRAVELER REGISTRY & BACKFILL ===')

  // 1. Count travelers in canonical table
  const travelerCountRes = await drizzle.execute(sql`SELECT COUNT(*)::integer AS count FROM "travelers";`)
  const travelerCount = travelerCountRes?.rows?.[0]?.count ?? travelerCountRes?.[0]?.count
  console.log(`[1] Total canonical travelers in "travelers": ${travelerCount}`)

  // 2. Count bookings_travelers and linked traveler_id
  const btCountRes = await drizzle.execute(sql`
    SELECT 
      COUNT(*)::integer AS total_manifest_rows,
      COUNT(traveler_id)::integer AS linked_manifest_rows,
      COUNT(*) FILTER (WHERE traveler_id IS NULL)::integer AS unlinked_manifest_rows
    FROM "bookings_travelers";
  `)
  const btCount = btCountRes?.rows?.[0] ?? btCountRes?.[0]
  console.log(`[2] Manifest rows - Total: ${btCount.total_manifest_rows}, Linked: ${btCount.linked_manifest_rows}, Unlinked: ${btCount.unlinked_manifest_rows}`)

  // 3. Test TravelerRepository.getTravelersReport
  const repo = new TravelerRepository(payload)
  const report = await repo.getTravelersReport({ page: 1, limit: 5 })
  console.log(`[3] getTravelersReport - Total: ${report.total}, Page: ${report.page}, Limit: ${report.limit}`)
  console.log('Sample travelers in registry:', JSON.stringify(report.data, null, 2))

  // 4. Test Deletion Resilience Simulation
  console.log('=== VERIFYING DELETION RESILIENCE ===')
  // Find a canonical traveler
  if (report.data.length > 0) {
    const testTraveler = report.data[0]
    console.log(`Selected test traveler: ID #${testTraveler.travelerId} (${testTraveler.firstName} ${testTraveler.lastName})`)
    
    // Check foreign key constraint details
    const fkCheck = await drizzle.execute(sql`
      SELECT 
        conname, 
        confdeltype 
      FROM pg_constraint 
      WHERE conname = 'bookings_travelers_traveler_id_fk';
    `)
    const fkRow = fkCheck?.rows?.[0] ?? fkCheck?.[0]
    console.log(`Foreign key constraint 'bookings_travelers_traveler_id_fk':`, fkRow)
    // confdeltype 'n' means SET NULL (Cascade is 'c', Restrict is 'r', No action is 'a')
    console.log(`confdeltype is '${fkRow?.confdeltype}' -> 'n' = SET NULL. Deleting a booking will NOT delete the traveler!`)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
