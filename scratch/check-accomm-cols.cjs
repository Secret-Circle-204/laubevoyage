const fs = require('fs')
const { Pool } = require('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/node_modules/.pnpm/pg@8.20.0/node_modules/pg')
const envContent = fs.readFileSync('.env', 'utf8')
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL=')).substring(13).trim().replace(/^['\"]|['\"]$/g, '')
const pool = new Pool({ connectionString: dbUrl })

async function check() {
  const client = await pool.connect()
  try {
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'experiences_accommodations'")
    console.log('Columns:', cols.rows.map(r => r.column_name))
    const sample = await client.query("SELECT * FROM experiences_accommodations WHERE _parent_id = 1952 LIMIT 1")
    console.log('Sample 1952 row:', sample.rows[0])
  } finally {
    client.release()
    await pool.end()
  }
}
check().catch(console.error)
