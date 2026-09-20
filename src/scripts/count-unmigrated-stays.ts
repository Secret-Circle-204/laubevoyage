import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

async function check() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool

  const client = await pool.connect()
  try {
    const res = await client.query(`
      SELECT ea._parent_id as experience_id, ea.id as stay_id, ea.order, ea.nights, ea.property_id, ea.room_category
      FROM experiences_accommodations ea
      WHERE NOT EXISTS (
        SELECT 1 FROM experiences_accommodations_options eao WHERE eao._parent_id = ea.id
      )
    `)
    console.log(`Found ${res.rows.length} stays needing migration across experiences:`)
    console.log(res.rows)
  } finally {
    client.release()
  }
  process.exit(0)
}

check().catch(console.error)
