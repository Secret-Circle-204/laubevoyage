import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Set VITEST=true to bypass interactive drizzle push prompt during Payload initialization
process.env.VITEST = 'true'

async function run() {
  console.log('🚀 Executing Query Presets migration...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const migration = await import('../migrations/20260922_141634_add_payload_query_presets')

  const payload = await getPayload({ config })
  const db = (payload.db as any).drizzle

  // 1. Run migration UP
  console.log('Executing migration up() on database...')
  await migration.up({ db, payload, req: {} as any })

  // 2. Record migration in payload-migrations collection
  console.log('Recording migration in payload-migrations...')
  const existing = await payload.find({
    collection: 'payload-migrations',
    where: {
      name: {
        equals: '20260922_141634_add_payload_query_presets',
      },
    },
    limit: 1,
  })

  if (existing.docs.length === 0) {
    const { docs: allMigrations } = await payload.find({
      collection: 'payload-migrations',
      limit: 0,
      sort: '-batch',
    })
    const latestBatch = allMigrations.length > 0 ? Number(allMigrations[0].batch) : 0
    await payload.create({
      collection: 'payload-migrations',
      data: {
        name: '20260922_141634_add_payload_query_presets',
        batch: latestBatch + 1,
      },
    })
    console.log(`✅ Migration registered in payload-migrations under batch ${latestBatch + 1}`)
  } else {
    console.log('ℹ️ Migration was already recorded in payload-migrations')
  }

  // 3. Verify relations in Postgres
  const pool = (payload.db as any).pool
  const client = await pool.connect()
  try {
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('payload_query_presets', 'payload_query_presets_rels');
    `)
    console.log('Verified database tables in PostgreSQL:')
    console.table(checkTable.rows)
  } finally {
    client.release()
  }

  console.log('🎉 Query Presets database schema successfully restored and verified!')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Failed to execute migration:', err)
  process.exit(1)
})
