import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

async function migrate() {
  console.log('🔄 Migrating legacy accommodation stays to nested options schema...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Insert options for all unmigrated stays
    const optResult = await client.query(`
      INSERT INTO experiences_accommodations_options (
        "_order",
        "_parent_id",
        "id",
        "property_id",
        "room_category",
        "board_basis",
        "pricing_unit"
      )
      SELECT 
        1 as "_order",
        ea.id as "_parent_id",
        ea.id || '_opt' as "id",
        ea.property_id,
        ea.room_category,
        ea.board_basis::text::enum_experiences_accommodations_options_board_basis,
        COALESCE(ea.pricing_unit::text, 'per_stay')::enum_experiences_accommodations_options_pricing_unit
      FROM experiences_accommodations ea
      WHERE ea.property_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM experiences_accommodations_options eao WHERE eao._parent_id = ea.id
        )
      RETURNING id, _parent_id;
    `)
    console.log(`✅ Inserted ${optResult.rowCount} accommodation options!`)

    // 2. Insert room rates for the new options
    const ratesResult = await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates (
        "_order",
        "_parent_id",
        "id",
        "occupancy",
        "rate_e_g_p",
        "enabled"
      )
      SELECT
        ear._order,
        ear._parent_id || '_opt' as "_parent_id",
        ear.id || '_opt' as "id",
        ear.occupancy::text::enum_experiences_accommodations_options_room_rates_occupancy,
        ear.rate_e_g_p,
        COALESCE(ear.enabled, true)
      FROM experiences_accommodations_room_rates ear
      WHERE EXISTS (
        SELECT 1 FROM experiences_accommodations_options eao WHERE eao.id = ear._parent_id || '_opt'
      )
      AND NOT EXISTS (
        SELECT 1 FROM experiences_accommodations_options_room_rates eaor WHERE eaor._parent_id = ear._parent_id || '_opt'
      )
      RETURNING id;
    `)
    console.log(`✅ Inserted ${ratesResult.rowCount} room rate rows for options!`)

    await client.query('COMMIT')
    console.log('🎉 Migration completed and committed successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed and was rolled back:', err)
    process.exit(1)
  } finally {
    client.release()
  }
  process.exit(0)
}

migrate().catch(console.error)
