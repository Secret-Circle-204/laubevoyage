import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Pool } = require('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/node_modules/.pnpm/pg@8.20.0/node_modules/pg')

const envContent = require('fs').readFileSync('.env', 'utf8')
const dbUrl = envContent.split('\n').find((l: string) => l.startsWith('DATABASE_URL=')).substring(13).trim().replace(/^['\"]|['\"]$/g, '')
const pool = new Pool({ connectionString: dbUrl })

async function restore1955() {
  const client = await pool.connect()
  try {
    console.log('Restoring Experience #1955 to 3 Stays (Multi-Option on Stay 1)...')
    await client.query('DELETE FROM experiences_accommodations WHERE _parent_id = 1955')

    // Stay 1: 5 nights, 2 options
    const stay1_id = '6aaee7a51b85d681a43b397f'
    await client.query(`
      INSERT INTO experiences_accommodations (id, _order, "order", _parent_id, nights)
      VALUES ($1, 1, 1, 1955, 5)
    `, [stay1_id])

    // Stay 1 Option 1: Four Seasons George V (Property 17)
    const opt1_id = '6aaee7a51b85d681a43b3979'
    await client.query(`
      INSERT INTO experiences_accommodations_options (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 1, $2, 17, 'Classic Room', 'bed_and_breakfast', 'per_stay')
    `, [opt1_id, stay1_id])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('6aaee7a51b85d681a43b3975', 1, $1, 'single', 0, false),
      ('6aaee7a51b85d681a43b3976', 2, $1, 'double', 5000, true),
      ('6aaee7a51b85d681a43b3977', 3, $1, 'triple', 0, false),
      ('6aaee7a51b85d681a43b3978', 4, $1, 'quad', 0, false)
    `, [opt1_id])

    // Stay 1 Option 2: Four Seasons Alexandria (Property 13)
    const opt2_id = '6aaee7a51b85d681a43b397e'
    await client.query(`
      INSERT INTO experiences_accommodations_options (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 2, $2, 13, '', 'bed_and_breakfast', 'per_stay')
    `, [opt2_id, stay1_id])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('6aaee7a51b85d681a43b397a', 1, $1, 'single', 6546544, true),
      ('6aaee7a51b85d681a43b397b', 2, $1, 'double', 0, true),
      ('6aaee7a51b85d681a43b397c', 3, $1, 'triple', 0, false),
      ('6aaee7a51b85d681a43b397d', 4, $1, 'quad', 0, false)
    `, [opt2_id])

    // Stay 2: 3 nights, 1 option
    const stay2_id = '6aaee7a51b85d681a43b3985'
    await client.query(`
      INSERT INTO experiences_accommodations (id, _order, "order", _parent_id, nights)
      VALUES ($1, 2, 2, 1955, 3)
    `, [stay2_id])
    const opt3_id = '6aaee7a51b85d681a43b3984'
    await client.query(`
      INSERT INTO experiences_accommodations_options (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 1, $2, 17, 'Classic Room', 'bed_and_breakfast', 'per_stay')
    `, [opt3_id, stay2_id])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('6aaee7a51b85d681a43b3980', 1, $1, 'single', 0, false),
      ('6aaee7a51b85d681a43b3981', 2, $1, 'double', 5000, true),
      ('6aaee7a51b85d681a43b3982', 3, $1, 'triple', 0, false),
      ('6aaee7a51b85d681a43b3983', 4, $1, 'quad', 0, false)
    `, [opt3_id])

    // Stay 3: 1 night, 1 option
    const stay3_id = '6aaee7a51b85d681a43b398b'
    await client.query(`
      INSERT INTO experiences_accommodations (id, _order, "order", _parent_id, nights)
      VALUES ($1, 3, 3, 1955, 1)
    `, [stay3_id])
    const opt4_id = '6aaee7a51b85d681a43b398a'
    await client.query(`
      INSERT INTO experiences_accommodations_options (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 1, $2, 17, '', 'bed_and_breakfast', 'per_stay')
    `, [opt4_id, stay3_id])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('6aaee7a51b85d681a43b3986', 1, $1, 'single', 0, true),
      ('6aaee7a51b85d681a43b3987', 2, $1, 'double', 0, true),
      ('6aaee7a51b85d681a43b3988', 3, $1, 'triple', 0, false),
      ('6aaee7a51b85d681a43b3989', 4, $1, 'quad', 0, false)
    `, [opt4_id])

    console.log('✅ Experience #1955 restored to original 3-stay state.')
  } finally {
    client.release()
    await pool.end()
  }
}

restore1955().catch(console.error)
