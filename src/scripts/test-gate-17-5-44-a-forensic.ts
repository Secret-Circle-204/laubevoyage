import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function runReadOnlyForensic() {
  console.log('=====================================================================')
  console.log('🔍 READ-ONLY FORENSIC INVESTIGATION (SECTIONS A & B)')
  console.log('=====================================================================\n')

  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle
  const { sql } = await import('@payloadcms/db-postgres')

  // -------------------------------------------------------------------------
  // SECTION A: OUTBOX AGGREGATE_ID & CLEANUP SCHEMA AUDIT
  // -------------------------------------------------------------------------
  console.log('--- 🔎 SECTION A: EVENT OUTBOX SCHEMA & RECENT RECORDS ---')
  const outboxSample = await drizzle.execute(sql`
    SELECT id, event_id, event_type, aggregate_type, aggregate_id, status, created_at
    FROM "event_outbox"
    ORDER BY id DESC
    LIMIT 10;
  `)
  console.log('Recent 10 Outbox Records in DB:')
  console.table(outboxSample.rows)

  // Check how aggregate_id is populated for MANUAL_ADJUSTMENT vs other events
  const manualAdjustments = await drizzle.execute(sql`
    SELECT id, event_id, event_type, aggregate_type, aggregate_id, status, payload->>'customerId' as customer_id
    FROM "event_outbox"
    WHERE event_type = 'MANUAL_ADJUSTMENT'
    ORDER BY id DESC
    LIMIT 5;
  `)
  console.log('\nMANUAL_ADJUSTMENT Outbox Records in DB:')
  console.table(manualAdjustments.rows)

  // -------------------------------------------------------------------------
  // SECTION B: NOTIFICATION LOGS & REAP STALE JOBS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 🔎 SECTION B: NOTIFICATION LOGS & STALE PROCESSING JOBS ---')
  const notifSample = await drizzle.execute(sql`
    SELECT id, notification_id, recipient, status, attempts, created_at
    FROM "notification_logs"
    ORDER BY id DESC
    LIMIT 10;
  `)
  console.log('Recent 10 Notification Log Records in DB:')
  console.table(notifSample.rows)

  const processingNotifs = await drizzle.execute(sql`
    SELECT id, notification_id, recipient, status, attempts, created_at
    FROM "notification_logs"
    WHERE status = 'processing';
  `)
  console.log(`\nCurrently Processing Notification Records (Total: ${processingNotifs.rows.length}):`)
  console.table(processingNotifs.rows)

  // -------------------------------------------------------------------------
  // 1. FORENSIC TEST FOR findRecoverableJobs()
  // -------------------------------------------------------------------------
  console.log('\n--- 🔬 1. TESTING findRecoverableJobs() EXECUTION ---')
  try {
    const { NotificationRepository } = await import('../domains/notification/repository')
    const notifRepo = new NotificationRepository(payload)
    console.log('Invoking notifRepo.findRecoverableJobs(50)...')
    const jobs = await notifRepo.findRecoverableJobs(50)
    console.log(`✅ findRecoverableJobs executed successfully. Returned ${jobs.length} jobs.`)
  } catch (err: any) {
    console.error('💥 CAUGHT ERROR IN findRecoverableJobs:')
    console.error('Name:', err.name)
    console.error('Message:', err.message)
    console.error('Stack:\n', err.stack)
  }

  // -------------------------------------------------------------------------
  // 2. FORENSIC TEST FOR seedInitialProjection SQL
  // -------------------------------------------------------------------------
  console.log('\n--- 🔬 2. TESTING seedInitialProjection SQL & CONSTRAINTS ---')
  const tableInfo = await drizzle.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'dashboard_projections'
    ORDER BY ordinal_position;
  `)
  console.log('dashboard_projections Table Schema:')
  console.table(tableInfo.rows)

  const indexes = await drizzle.execute(sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'dashboard_projections';
  `)
  console.log('\ndashboard_projections Indexes in PostgreSQL:')
  console.table(indexes.rows)

  // Try the exact INSERT from seedInitialProjection
  try {
    const testCustId = 999888
    const testProjId = `proj_${testCustId}_${Date.now()}`
    const testJson = JSON.stringify({ test: true })
    console.log('\nTesting direct seedInitialProjection SQL query with test customer...')
    const query = sql`
      INSERT INTO "dashboard_projections" (
        "projection_id", "customer_id", "projection_json", "version", "created_at", "updated_at"
      ) VALUES (
        ${testProjId}, ${testCustId}, ${testJson}::jsonb, 1, NOW(), NOW()
      )
      ON CONFLICT ("customer_id") DO NOTHING
      RETURNING "version", "projection_json";
    `
    const insertRes = await drizzle.execute(query)
    console.log('Insert Result Rows:', insertRes.rows)
  } catch (sqlErr: any) {
    console.error('💥 Direct SQL INSERT Error:', sqlErr.message)
  }
}

runReadOnlyForensic()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Forensic Execution Error:', err)
    process.exit(1)
  })
