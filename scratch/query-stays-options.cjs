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
    const stays = await client.query(`
      SELECT s.id, s._order, s.nights
      FROM experiences_accommodations s
      WHERE s._parent_id = 1955
      ORDER BY s._order
    `)
    console.log('Stays for #1955:', stays.rows)

    const options = await client.query(`
      SELECT o.id, o._order, o._parent_id as stay_id, o.property_id, o.room_category, o.board_basis, o.pricing_unit
      FROM experiences_accommodations_options o
      JOIN experiences_accommodations s ON s.id = o._parent_id
      WHERE s._parent_id = 1955
      ORDER BY s._order, o._order
    `)
    console.log('Options for #1955:', options.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
