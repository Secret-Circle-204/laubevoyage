import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function checkDeadlocks() {
  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  console.log('=== BLOCKING AND WAITING PROCESSES ===')
  const blockers = await drizzle.execute(sql`
    SELECT 
      blocked_locks.pid AS blocked_pid,
      blocked_activity.usename AS blocked_user,
      blocking_locks.pid AS blocking_pid,
      blocking_activity.usename AS blocking_user,
      blocked_activity.query AS blocked_statement,
      blocking_activity.query AS current_statement_in_blocking_process,
      blocked_activity.state AS blocked_state,
      blocking_activity.state AS blocking_state,
      blocked_activity.wait_event_type,
      blocked_activity.wait_event,
      blocked_activity.query_start AS blocked_query_start,
      blocking_activity.query_start AS blocking_query_start
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
  `)

  console.log('BLOCKERS COUNT:', (blockers.rows || blockers).length)
  console.log(JSON.stringify(blockers.rows || blockers, null, 2))

  console.log('=== ALL ACTIVE QUERIES WITH BLOCKING PIDS ===')
  const allActive = await drizzle.execute(sql`
    SELECT 
      pid,
      state,
      wait_event_type,
      wait_event,
      pg_blocking_pids(pid) AS blocked_by,
      query_start,
      query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND (state <> 'idle' OR cardinality(pg_blocking_pids(pid)) > 0);
  `)
  console.log(JSON.stringify(allActive.rows || allActive, null, 2))

  process.exit(0)
}

checkDeadlocks().catch((e) => {
  console.error(e)
  process.exit(1)
})
