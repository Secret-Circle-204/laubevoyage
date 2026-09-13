import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

process.env.VITEST = 'true'

async function audit() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { CANONICAL_EXPERIENCES } = await import('../seed/catalog/experiences.seed')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool
  const client = await pool.connect()

  try {
    console.log('====================================================')
    console.log('1. CANONICAL_EXPERIENCES IN SEED FILE:')
    console.log(`Total count: ${CANONICAL_EXPERIENCES.length}`)
    CANONICAL_EXPERIENCES.forEach((exp: any, idx: number) => {
      const staysCount = exp.accommodations?.length || 0
      const totalRates = exp.accommodations?.reduce((acc: number, s: any) => acc + (s.roomRates?.length || 0), 0) || 0
      console.log(`  [${idx + 1}] slug: '${exp.slug}' | type: '${exp.type}' | stays: ${staysCount} | roomRates: ${totalRates} | title: "${exp.title}"`)
    })

    console.log('\n====================================================')
    console.log('2. EXPERIENCES IN DATABASE:')
    const dbExps = await client.query(`SELECT id, slug, title, type FROM "experiences" ORDER BY id ASC;`)
    console.log(`Total count in DB: ${dbExps.rows.length}`)
    dbExps.rows.forEach((r: any, idx: number) => {
      console.log(`  [${idx + 1}] id: ${r.id} | slug: '${r.slug}' | type: '${r.type}' | title: "${r.title}"`)
    })

    console.log('\n====================================================')
    console.log('3. DEPARTURE SLOTS & BOOKING RELATIONS:')
    const totalSlots = await client.query(`SELECT COUNT(*) as count FROM "departure_slots";`)
    console.log(`Total departure_slots in DB: ${totalSlots.rows[0].count}`)

    const totalBookings = await client.query(`SELECT COUNT(*) as count FROM "bookings";`)
    console.log(`Total bookings in DB: ${totalBookings.rows[0].count}`)

    if (Number(totalBookings.rows[0].count) > 0) {
      const linkedBookings = await client.query(`
        SELECT 
          b.id as booking_id, 
          b.booking_number,
          b.experience_id,
          b.departure_slot_id,
          e.slug as experience_slug,
          e.title as experience_title
        FROM "bookings" b
        LEFT JOIN "experiences" e ON e.id = b.experience_id
        ORDER BY b.id ASC;
      `)
      console.log('Linked Bookings:')
      console.table(linkedBookings.rows)
    } else {
      console.log('No bookings currently in DB.')
    }

    console.log('\n====================================================')
    console.log('4. LEGACY TABLE DEPENDENCIES CHECK:')
    const fkQuery = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'experiences_accommodations_occupancy_options' OR ccu.table_name = 'experiences_accommodations_occupancy_options');
    `)
    console.log('Foreign keys on experiences_accommodations_occupancy_options:', fkQuery.rows)

    const viewsQuery = await client.query(`
      SELECT table_name, view_definition 
      FROM information_schema.views 
      WHERE view_definition ILIKE '%experiences_accommodations_occupancy_options%';
    `)
    console.log('Views referencing legacy table:', viewsQuery.rows)

  } finally {
    client.release()
  }
  process.exit(0)
}

audit().catch((err) => {
  console.error(err)
  process.exit(1)
})
