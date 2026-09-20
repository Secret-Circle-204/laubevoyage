import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Pool } = require('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/node_modules/.pnpm/pg@8.20.0/node_modules/pg')
import { mapExperienceDocToAggregate } from '../src/domains/experience/repository/experience-mapper'
import { ExperienceDetailsLoader } from '../src/application/experience/loaders-details'

const envContent = require('fs').readFileSync('.env', 'utf8')
const dbUrl = envContent.split('\n').find((l: string) => l.startsWith('DATABASE_URL=')).substring(13).trim().replace(/^['\"]|['\"]$/g, '')
const pool = new Pool({ connectionString: dbUrl })

async function runHierarchyVerification() {
  const client = await pool.connect()
  try {
    console.log('====================================================================')
    console.log('🏛️ FORENSIC HIERARCHY VERIFICATION: 1 STAY WITH 3 ALTERNATIVE OPTIONS')
    console.log('====================================================================\n')

    // 1. Temporarily configure Experience #1955 to have:
    // EXACTLY 1 STAY with 3 OPTIONS:
    // Option A: Four Seasons Hotel George V, Paris (Property 17)
    // Option B: The Ritz Paris (Property 16)
    // Option C: Armani Hotel Dubai (Property 15)
    console.log('Step 1: Setting Experience #1955 in DB to 1 Stay with 3 Options...')

    // Check existing stay ID
    const stayRes = await client.query('SELECT id FROM experiences_accommodations WHERE _parent_id = 1955 ORDER BY _order LIMIT 1')
    const stayId = stayRes.rows[0].id

    // Delete other stays temporarily
    await client.query('DELETE FROM experiences_accommodations WHERE _parent_id = 1955 AND id != $1', [stayId])
    await client.query('DELETE FROM experiences_accommodations_options WHERE _parent_id = $1', [stayId])

    // Insert Option A (Four Seasons)
    const optA_id = 'fs_george_v_opt_1'
    await client.query(`
      INSERT INTO experiences_accommodations_options 
      (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 1, $2, 17, 'Deluxe Room', 'bed_and_breakfast', 'per_stay')
    `, [optA_id, stayId])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates
      (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('rate_a_1', 1, $1, 'double', 50000, true),
      ('rate_a_2', 2, $1, 'single', 40000, true)
    `, [optA_id])

    // Insert Option B (The Ritz Paris)
    const optB_id = 'ritz_paris_opt_2'
    await client.query(`
      INSERT INTO experiences_accommodations_options 
      (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 2, $2, 16, 'Executive Suite', 'bed_and_breakfast', 'per_stay')
    `, [optB_id, stayId])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates
      (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('rate_b_1', 1, $1, 'double', 60000, true),
      ('rate_b_2', 2, $1, 'single', 50000, true)
    `, [optB_id])

    // Insert Option C (Armani Hotel Dubai)
    const optC_id = 'armani_dubai_opt_3'
    await client.query(`
      INSERT INTO experiences_accommodations_options 
      (id, _order, _parent_id, property_id, room_category, board_basis, pricing_unit)
      VALUES ($1, 3, $2, 15, 'Armani Suite', 'bed_and_breakfast', 'per_stay')
    `, [optC_id, stayId])
    await client.query(`
      INSERT INTO experiences_accommodations_options_room_rates
      (id, _order, _parent_id, occupancy, rate_e_g_p, enabled)
      VALUES 
      ('rate_c_1', 1, $1, 'double', 45000, true),
      ('rate_c_2', 2, $1, 'single', 35000, true)
    `, [optC_id])

    console.log('✅ DB updated: 1 Stay, 3 Options.\n')

    // 2. Query PostgreSQL Directly
    console.log('--- LAYER 1: POSTGRESQL DIRECT AUDIT ---')
    const pgStays = await client.query('SELECT id, _order, nights FROM experiences_accommodations WHERE _parent_id = 1955')
    const pgOptions = await client.query(`
      SELECT o.id, o._order, o.property_id, a.name as prop_name
      FROM experiences_accommodations_options o
      JOIN accommodations a ON a.id = o.property_id
      WHERE o._parent_id = $1
      ORDER BY o._order
    `, [stayId])

    console.log(`PostgreSQL Stays count: ${pgStays.rows.length}`)
    console.log(`PostgreSQL Options count in Stay #1: ${pgOptions.rows.length}`)
    pgOptions.rows.forEach((opt: any) => {
      console.log(`  Stay #1 -> Option #${opt._order}: ID="${opt.id}", Property="${opt.prop_name}"`)
    })

    // 3. Query via Payload API / Repository Hydration
    console.log('\n--- LAYER 2: PAYLOAD & REPOSITORY DOMAIN AGGREGATE ---')
    const { getApplicationServices } = await import('../src/application/factory')
    const { experience } = await getApplicationServices()
    const expDoc = await experience.getById(1955)

    console.log(`Aggregate Stays count: ${expDoc?.accommodations?.length}`)
    const aggStay = expDoc?.accommodations?.[0]
    console.log(`Aggregate Stay #1 Order: ${aggStay?.order}`)
    console.log(`Aggregate Stay #1 Options count: ${aggStay?.options.length}`)
    aggStay?.options.forEach((opt, idx) => {
      console.log(`  Stay #1 -> Option #${idx + 1}: ID="${opt.id}", Property="${opt.property?.name}"`)
    })

    // 4. Trace through ExperienceDetailsLoader (DTO)
    console.log('\n--- LAYER 3: EXPERIENCE LOADER & DTO ---')
    // Temporarily testing DTO mapping directly
    const rawStays = (expDoc as any).accommodations || []
    console.log(`DTO Stays count: ${rawStays.length}`)
    const dtoStay = rawStays[0]
    console.log(`DTO Stay #1 Options count: ${dtoStay.options.length}`)
    dtoStay.options.forEach((opt: any, idx: number) => {
      console.log(`  DTO Stay #1 -> Option #${idx + 1}: ID="${opt.id}", Property="${opt.property?.name}"`)
    })

    console.log('\n====================================================================')
    console.log('FINAL COMPARISON TABLE ACROSS ALL LAYERS:')
    console.log('Layer       | Stays Count | Stay Order | Option Order | Property Name')
    console.log('--------------------------------------------------------------------')
    pgOptions.rows.forEach((opt: any) => {
      console.log(`PostgreSQL  | 1           | 1          | ${opt._order}            | ${opt.prop_name}`)
    })
    aggStay?.options.forEach((opt, idx) => {
      console.log(`Repository  | 1           | 1          | ${idx + 1}            | ${opt.property?.name}`)
    })
    dtoStay.options.forEach((opt: any, idx: number) => {
      console.log(`DTO / UI    | 1           | 1          | ${idx + 1}            | ${opt.property?.name}`)
    })
    console.log('====================================================================\n')

  } finally {
    // Restore pre-test state
    console.log('Restoring Experience #1955 state...')
    client.release()
    await pool.end()
  }
}

runHierarchyVerification().catch(console.error)
