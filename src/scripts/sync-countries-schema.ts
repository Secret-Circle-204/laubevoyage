import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function run() {
  console.log('🛠️ Syncing Postgres countries table schema with Payload DB adapter...')
  const payload = await getPayload({ config })

  try {
    const db = payload.db as any
    if (db.pool) {
      await db.pool.query(`
        ALTER TABLE "countries" 
        ADD COLUMN IF NOT EXISTS "currency_id" integer REFERENCES "currencies"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "timezone" varchar,
        ADD COLUMN IF NOT EXISTS "measurement_system" varchar DEFAULT 'metric',
        ADD COLUMN IF NOT EXISTS "week_start" numeric DEFAULT 1;
      `)
      console.log('   ✅ Postgres countries table schema updated successfully!')
    } else if (db.drizzle && db.drizzle.execute) {
      // Fallback
      await db.drizzle.execute(`
        ALTER TABLE "countries" 
        ADD COLUMN IF NOT EXISTS "currency_id" integer REFERENCES "currencies"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "timezone" varchar,
        ADD COLUMN IF NOT EXISTS "measurement_system" varchar DEFAULT 'metric',
        ADD COLUMN IF NOT EXISTS "week_start" numeric DEFAULT 1;
      `)
      console.log('   ✅ Postgres countries table schema updated successfully!')
    }
  } catch (err) {
    console.error('❌ Error executing SQL migration:', err)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Migration Error:', err)
  process.exit(1)
})
