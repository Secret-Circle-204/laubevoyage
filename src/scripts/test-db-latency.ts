import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'

async function run() {
  console.log('--- DB & Payload Performance Profiler ---')
  const t0 = Date.now()
  const payload = await getPayload({ config })
  console.log(`Payload init: ${Date.now() - t0}ms`)

  // 1. Raw Bookings counts
  const tCount = Date.now()
  const bCount = await payload.count({ collection: 'bookings' })
  const pCount = await payload.count({ collection: 'bookings', where: { status: { equals: 'pending_admin_review' } } })
  const cCount = await payload.count({ collection: 'bookings', where: { status: { equals: 'confirmed' } } })
  const oCount = await payload.count({ collection: 'bookings', where: { paymentStatus: { in: ['unpaid', 'partially_paid'] } } })
  console.log('EXACT_DATABASE_COUNTS:', {
    total: bCount.totalDocs,
    pending: pCount.totalDocs,
    confirmed: cCount.totalDocs,
    outstanding: oCount.totalDocs,
  })

  // 2. Bookings find depth:0 (what Payload Server List View does)
  const tB0 = Date.now()
  const b0 = await payload.find({
    collection: 'bookings',
    depth: 0,
    limit: 10,
    overrideAccess: true,
  })
  console.log(`Bookings find depth:0 (10 docs): ${Date.now() - tB0}ms`)

  // 3. Bookings find depth:1
  const tB1 = Date.now()
  const b1 = await payload.find({
    collection: 'bookings',
    depth: 1,
    limit: 10,
    overrideAccess: true,
  })
  console.log(`Bookings find depth:1 (10 docs): ${Date.now() - tB1}ms`)

  // 4. Experiences find depth:0
  const tE0 = Date.now()
  const e0 = await payload.find({
    collection: 'experiences',
    depth: 0,
    limit: 10,
    overrideAccess: true,
  })
  console.log(`Experiences find depth:0 (10 docs): ${Date.now() - tE0}ms`)

  // 5. Experiences find depth:1
  const tE1 = Date.now()
  const e1 = await payload.find({
    collection: 'experiences',
    depth: 1,
    limit: 10,
    overrideAccess: true,
  })
  console.log(`Experiences find depth:1 (10 docs): ${Date.now() - tE1}ms`)

  // 6. Direct SQL query via pg pool to measure pure PostgreSQL latency
  try {
    const db = (payload.db as any)
    if (db && db.drizzle) {
      const tSql = Date.now()
      const res = await db.drizzle.execute('SELECT COUNT(*) FROM bookings;')
      console.log(`Pure PostgreSQL SELECT COUNT(*) FROM bookings: ${Date.now() - tSql}ms`)
    }
  } catch (err) {
    console.log('Direct SQL check skipped:', err)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
