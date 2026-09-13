import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

process.env.VITEST = 'true'

async function inspect() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool
  const client = await pool.connect()

  try {
    console.log('--- 1. Querying Package #1839 directly from Payload API ---')
    try {
      const exp1839 = await payload.findByID({
        collection: 'experiences',
        id: 1839,
        depth: 2,
      })
      console.log('Package #1839 Title:', exp1839?.title)
      console.log('Package #1839 Slug:', exp1839?.slug)
      console.log('Package #1839 Accommodations Count:', exp1839?.accommodations?.length)
      console.log('Package #1839 Accommodations:', JSON.stringify(exp1839?.accommodations, null, 2))
    } catch (err: any) {
      console.error('Error finding by ID 1839:', err.message)
    }

    console.log('\n--- 2. Querying PostgreSQL tables directly for Package #1839 ---')
    const expRow = await client.query(`SELECT id, title, slug FROM "experiences" WHERE id = 1839 OR slug = 'transcontinental-grand-horizon-cairo-dubai-paris-11d';`)
    console.log('Experience rows:', expRow.rows)

    const accRows = await client.query(`SELECT * FROM "experiences_accommodations" WHERE _parent_id = 1839 ORDER BY _order ASC;`)
    console.log('Accommodations rows in DB:', accRows.rows)

    if (accRows.rows.length > 0) {
      const accIds = accRows.rows.map((r: any) => `'${r.id}'`).join(',')
      const roomRatesRows = await client.query(`SELECT * FROM "experiences_accommodations_room_rates" WHERE _parent_id IN (${accIds});`)
      console.log('Room rates rows in DB:', roomRatesRows.rows)

      // Also check if legacy occupancy_options table exists and has rows!
      try {
        const legacyOccupancy = await client.query(`SELECT * FROM "experiences_accommodations_occupancy_options" WHERE _parent_id IN (${accIds});`)
        console.log('Legacy occupancy_options rows in DB:', legacyOccupancy.rows)
      } catch (err: any) {
        console.log('Legacy occupancy_options table query result:', err.message)
      }
    }

    console.log('\n--- 3. Checking all experiences in DB for missing roomRates ---')
    const allExpAcc = await client.query(`
      SELECT 
        e.id as experience_id,
        e.slug,
        e.title,
        ea.id as accommodation_id,
        ea._order as stay_order,
        ea.nights,
        ea.pricing_unit,
        (SELECT COUNT(*) FROM "experiences_accommodations_room_rates" rr WHERE rr._parent_id = ea.id) as room_rates_count
      FROM "experiences" e
      JOIN "experiences_accommodations" ea ON ea._parent_id = e.id
      ORDER BY e.id, ea._order;
    `)
    console.log('All accommodation stays across all experiences:')
    console.table(allExpAcc.rows)

  } finally {
    client.release()
  }
  process.exit(0)
}

inspect().catch((err) => {
  console.error('Inspection failed:', err)
  process.exit(1)
})
