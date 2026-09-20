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

async function check() {
  const client = await pool.connect()
  try {
    const res = await client.query(`
      SELECT 
        e.id as experience_id,
        e.slug as experience_slug,
        e.title as experience_title,
        s._order as stay_order,
        s.nights,
        o._order as option_order,
        o.id as option_id,
        a.id as property_id,
        a.name as property_name,
        o.room_category,
        o.board_basis,
        o.pricing_unit
      FROM experiences e
      LEFT JOIN experiences_accommodations s ON s._parent_id = e.id
      LEFT JOIN experiences_accommodations_options o ON o._parent_id = s.id
      LEFT JOIN accommodations a ON a.id = o.property_id
      ORDER BY e.id, s._order, o._order
    `)
    console.log('=== ACCOMMODATIONS FOR ALL EXPERIENCES IN DB ===')
    console.table(res.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

check().catch(console.error)
