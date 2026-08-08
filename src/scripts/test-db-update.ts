import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const db = payload.db as any

  console.log('--- DB Atomic Update Test ---')
  
  // Find a departure slot to test with
  const slotRes = await payload.find({
    collection: 'departure-slots',
    limit: 1,
  })

  if (slotRes.docs.length === 0) {
    console.error('❌ No departure slots found to test update.')
    process.exit(1)
  }

  const slot = slotRes.docs[0]
  console.log(`Testing slot: id=${slot.id}, departureId=${slot.departureId}, version=${slot.version}, reserved=${slot.capacityReserved}`)

  const transactionID = await db.beginTransaction()
  console.log('Transaction started:', transactionID)

  try {
    const session = db.sessions[transactionID]
    const client = session.db.session.client

    // Run atomic update query
    const sqlText = `
      UPDATE departure_slots
      SET capacity_reserved = capacity_reserved + $1,
          capacity_available = capacity_total - (capacity_reserved + $1) - capacity_sold,
          version = version + 1
      WHERE departure_id = $2
        AND version = $3
        AND (capacity_total - capacity_reserved - capacity_sold) >= $1
      RETURNING *;
    `
    const params = [2, slot.departureId, slot.version]
    const res = await client.query(sqlText, params)
    console.log('Update result rowCount:', res.rowCount)
    if (res.rowCount > 0) {
      console.log('Updated Row:', res.rows[0])
    }
  } catch (err) {
    console.error('Error running atomic update:', err)
  }

  await db.rollbackTransaction(transactionID)
  console.log('Transaction rolled back.')
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
