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
    const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'experiences_accommodations'")
    console.log('experiences_accommodations columns:', cols.rows.map((r: any) => r.column_name))

    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%accommodation%'")
    console.log('All accommodation tables:', tables.rows.map((r: any) => r.table_name))

    const sample = await client.query("SELECT * FROM experiences_accommodations WHERE _parent_id = '1954'")
    console.log('experiences_accommodations for #1954:', sample.rows)

    const oldRates = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%room_rates%'")
    console.log('All room_rate tables:', oldRates.rows.map((r: any) => r.table_name))

    for (const t of oldRates.rows) {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${t.table_name}"`)
      console.log(`Table ${t.table_name} count:`, cnt.rows[0].count)
    }

    if (tables.rows.some((r: any) => r.table_name === 'experiences_accommodations_room_rates')) {
      const oldRatesRows = await client.query("SELECT * FROM experiences_accommodations_room_rates LIMIT 5")
      console.log('Sample old room rates:', oldRatesRows.rows)
    }
  } finally {
    client.release()
  }
  process.exit(0)
}

check().catch(console.error)
