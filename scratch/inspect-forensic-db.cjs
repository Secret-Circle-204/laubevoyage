const fs = require('fs')
const { Pool } = require('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/node_modules/.pnpm/pg@8.20.0/node_modules/pg')

const envContent = fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/.env', 'utf8')
let dbUrl = ''
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).trim()
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
      dbUrl = dbUrl.slice(1, -1)
    }
    break
  }
}

const pool = new Pool({ connectionString: dbUrl })

async function run() {
  const client = await pool.connect()
  try {
    const props = await client.query('SELECT id, name FROM accommodations ORDER BY id')
    console.log('All Properties in DB:')
    console.table(props.rows)

    const exp1952 = await client.query(`
      SELECT s.id as stay_id, s._order as stay_order, s.nights, o.id as opt_id, o._order as opt_order, o.property_id, a.name as prop_name
      FROM experiences_accommodations s
      JOIN experiences_accommodations_options o ON o._parent_id = s.id
      JOIN accommodations a ON a.id = o.property_id
      WHERE s._parent_id = 1952
      ORDER BY s._order, o._order
    `)
    console.log('\nExperience #1952 (Royal Upper Egypt Heritage):')
    console.table(exp1952.rows)

    const exp1955 = await client.query(`
      SELECT s.id as stay_id, s._order as stay_order, s.nights, o.id as opt_id, o._order as opt_order, o.property_id, a.name as prop_name
      FROM experiences_accommodations s
      JOIN experiences_accommodations_options o ON o._parent_id = s.id
      JOIN accommodations a ON a.id = o.property_id
      WHERE s._parent_id = 1955
      ORDER BY s._order, o._order
    `)
    console.log('\nExperience #1955 (The Transcontinental Grand Horizon):')
    console.table(exp1955.rows)

    const rates1955 = await client.query(`
      SELECT r.id as rate_id, r._parent_id as opt_id, r.occupancy, r.rate_e_g_p, r.enabled
      FROM experiences_accommodations_options_room_rates r
      JOIN experiences_accommodations_options o ON o.id = r._parent_id
      JOIN experiences_accommodations s ON s.id = o._parent_id
      WHERE s._parent_id = 1955
      ORDER BY s._order, o._order, r.occupancy
    `)
    console.log('\nRoom Rates for Experience #1955:')
    console.table(rates1955.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
