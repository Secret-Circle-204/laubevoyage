import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function terminateHangingBackends() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('Terminating leaked hanging backend processes...')
  const pidsToKill = [7508, 30072, 30140, 9840]
  for (const pid of pidsToKill) {
    try {
      const res = await drizzle.execute(sql`SELECT pg_terminate_backend(${pid});`)
      console.log(`pg_terminate_backend(${pid}):`, res)
    } catch (e: any) {
      console.log(`Failed to terminate ${pid}:`, e.message)
    }
  }

  // Verify no waiting locks remaining
  const remaining = await drizzle.execute(sql`
    SELECT pid, state, wait_event_type, wait_event, query_start, LEFT(query, 80) as q
    FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid() AND state <> 'idle';
  `)
  console.log('Remaining active queries:', JSON.stringify(remaining.rows || remaining, null, 2))

  process.exit(0)
}

terminateHangingBackends().catch(e => {
  console.error(e)
  process.exit(1)
})
