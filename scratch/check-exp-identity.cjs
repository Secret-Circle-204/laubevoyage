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
      SELECT id, title, slug, type 
      FROM experiences 
      WHERE id = 1955 OR slug LIKE '%transcontinental%' OR slug LIKE '%nile%' OR slug LIKE '%luxor%'
    `)
    console.log('=== EXPERIENCES MATCHING 1955 OR KEYWORDS ===')
    console.table(res.rows)

    const allExps = await client.query('SELECT id, title, slug, type FROM experiences ORDER BY id')
    console.log('=== ALL EXPERIENCES IN DATABASE ===')
    console.table(allExps.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

check().catch(console.error)
