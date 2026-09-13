import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

process.env.VITEST = 'true'

async function checkSeedVsDb() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { CANONICAL_EXPERIENCES } = await import('../seed/catalog/experiences.seed')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool
  const client = await pool.connect()

  try {
    const dbExps = await client.query(`SELECT id, slug, title FROM "experiences" ORDER BY id ASC;`)
    console.log(`Database has ${dbExps.rows.length} experiences. Seed file has ${CANONICAL_EXPERIENCES.length} experiences.\n`)

    for (const exp of dbExps.rows) {
      const seedMatch = CANONICAL_EXPERIENCES.find((s: any) => s.slug === exp.slug)
      const accStays = await client.query(`SELECT id, _order, property_id, nights, pricing_unit FROM "experiences_accommodations" WHERE _parent_id = $1 ORDER BY _order ASC;`, [exp.id])
      const rrCount = await client.query(`
        SELECT COUNT(*) as count FROM "experiences_accommodations_room_rates" 
        WHERE _parent_id IN (SELECT id FROM "experiences_accommodations" WHERE _parent_id = $1)
      `, [exp.id])

      console.log(`[Experience #${exp.id}] ${exp.slug}`)
      console.log(`  - Title: "${exp.title}"`)
      console.log(`  - DB Stays Count: ${accStays.rows.length}`)
      console.log(`  - DB Room Rates Total Rows: ${rrCount.rows[0].count}`)
      console.log(`  - Seed Found: ${seedMatch ? 'YES' : 'NO'}`)
      if (seedMatch) {
        console.log(`  - Seed Accommodations Defined: ${seedMatch.accommodations?.length || 0}`)
        seedMatch.accommodations?.forEach((acc: any, idx: number) => {
          console.log(`    Stay #${acc.order || idx + 1} (${acc.propertySlug}, ${acc.nights} nights, ${acc.pricingUnit}):`)
          acc.roomRates?.forEach((rr: any) => {
            console.log(`      • ${rr.occupancy}: ${rr.rateEGP} EGP (enabled: ${rr.enabled})`)
          })
        })
      }
      console.log('----------------------------------------------------')
    }
  } finally {
    client.release()
  }
  process.exit(0)
}

checkSeedVsDb().catch((err) => {
  console.error(err)
  process.exit(1)
})
