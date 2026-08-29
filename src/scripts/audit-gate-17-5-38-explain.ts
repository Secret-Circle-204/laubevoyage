import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { sql } from '@payloadcms/db-postgres'

async function runExplainPlanAudit() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('======================================================================')
  console.log('🔍 FORENSIC AUDIT: EXPLAIN (ANALYZE, BUFFERS) FOR ACTIVE HOLDS QUERY')
  console.log('======================================================================\n')

  const explainQuery = sql`
    EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
    SELECT id, status, completion_at
    FROM "bookings"
    WHERE "status" = 'confirmed'
      AND "completion_at" <= NOW()
    ORDER BY "completion_at" ASC
    LIMIT 20;
  `

  const result = await drizzle.execute(explainQuery)
  const rows = result?.rows || result || []
  for (const r of rows) {
    console.log(r['QUERY PLAN'] || Object.values(r)[0])
  }
}

runExplainPlanAudit().catch(console.error)
